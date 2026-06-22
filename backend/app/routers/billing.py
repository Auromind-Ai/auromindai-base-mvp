import logging
from fastapi import APIRouter, Depends, Header, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database import get_db


class CreditsPurchaseRequest(BaseModel):
    pack_id: str
    workspace_id: str | None = None
    provider: str = "razorpay"


class CreditsVerifyRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    workspace_id: str | None = None
    provider: str = "razorpay"
from app.routers.auth import CurrentUser, get_current_user
from app.services.billing import BillingService
from app.schemas import (
    CreateSubscriptionRequest,
    VerifyPaymentRequest,
    PlanEntitlementResponse,
    FeatureBillingRuleResponse,
    EntitlementCheckRequest,
    EntitlementCheckResponse
)
from app.core.security import verify_workspace_access

from typing import Any
router = APIRouter(prefix="/billing", tags=["billing"])
logger = logging.getLogger(__name__)


def get_billing_service() -> BillingService:
    return BillingService()


def resolve_and_verify_workspace(
    current_user,
    db: Session,
    workspace_id_query: str | None = None,
    x_workspace_id_header: str | None = None,
    payload: Any | None = None,
) -> str:
    ws_id = None
    if payload and hasattr(payload, "workspace_id") and getattr(payload, "workspace_id"):
        ws_id = str(payload.workspace_id)
    elif x_workspace_id_header:
        ws_id = x_workspace_id_header
    elif workspace_id_query:
        ws_id = workspace_id_query

    if not ws_id:
        raise HTTPException(
            status_code=400,
            detail="Missing workspace context. Please specify workspace_id query parameter, payload field, or X-Workspace-Id header."
        )

    import uuid
    try:
        uuid.UUID(ws_id)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid workspace_id UUID format: '{ws_id}'"
        )

    return verify_workspace_access(current_user, db, ws_id)


@router.post("/create-subscription")
def create_subscription(
    payload: CreateSubscriptionRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
    workspace_id: str | None = None,
    x_workspace_id: str | None = Header(None),
):
    try:
        resolved_ws_id = resolve_and_verify_workspace(
            current_user, db, workspace_id, x_workspace_id, payload
        )
        logger.info(f"[SUBSCRIPTION] user={current_user.email} workspace={resolved_ws_id} plan={payload.plan}")

        service = get_billing_service()
        return service.create_subscription(
            db=db,
            workspace_id=resolved_ws_id,
            user_id=str(current_user.id),
            user_email=current_user.email,
            user_name=current_user.full_name,
            plan_key=payload.plan,
            provider=payload.provider,
        )

    except ValueError as exc:
        logger.error(f"[SUBSCRIPTION ERROR] {str(exc)}")
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/verify-payment")
def verify_payment(
    payload: VerifyPaymentRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
    workspace_id: str | None = None,
    x_workspace_id: str | None = Header(None),
):
    try:
        resolved_ws_id = resolve_and_verify_workspace(
            current_user, db, workspace_id, x_workspace_id, payload
        )
        logger.info(f"[PAYMENT VERIFY] user={current_user.email} workspace={resolved_ws_id} provider={payload.provider}")

        service = get_billing_service()
        return service.verify_payment(
            db=db,
            workspace_id=resolved_ws_id,
            user_id=str(current_user.id),
            plan_key=payload.plan,
            provider=payload.provider,
            subscription_id=payload.subscription_id,
            payment_id=payload.payment_id,
            signature=payload.signature,
        )

    except ValueError as exc:
        logger.error(f"[PAYMENT VERIFY ERROR] {str(exc)}")
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/webhook/razorpay")
async def razorpay_webhook(
    request: Request,
    x_razorpay_signature: str = Header(...),
    db: Session = Depends(get_db),
):
    body = await request.body()

    try:
        if not x_razorpay_signature:
            logger.warning("[RAZORPAY WEBHOOK] Missing signature")
            raise HTTPException(status_code=400, detail="Missing signature")

        logger.info("[RAZORPAY WEBHOOK] Received")

        service = get_billing_service()
        return service.handle_webhook(
            db=db,
            body=body,
            signature=x_razorpay_signature,
            provider="razorpay",
        )

    except ValueError as exc:
        logger.error(f"[RAZORPAY WEBHOOK ERROR] {str(exc)}")
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/webhook/payu")
async def payu_webhook(
    request: Request,
    x_payu_signature: str = Header(...),
    db: Session = Depends(get_db),
):
    body = await request.body()

    try:
        logger.info("[PAYU WEBHOOK] Received")

        service = get_billing_service()
        return service.handle_webhook(
            db=db,
            body=body,
            signature=x_payu_signature,
            provider="payu",
        )

    except ValueError as exc:
        logger.error(f"[PAYU WEBHOOK ERROR] {str(exc)}")
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("/status")
def get_billing_status(
    workspace_id: str | None = None,
    x_workspace_id: str | None = Header(None),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    try:
        resolved_ws_id = resolve_and_verify_workspace(
            current_user, db, workspace_id, x_workspace_id
        )
        logger.info(f"[STATUS] user={current_user.email} workspace={resolved_ws_id}")

        service = get_billing_service()
        return service.get_status(
            db=db,
            workspace_id=resolved_ws_id,
            user_id=str(current_user.id),
        )

    except ValueError as exc:
        logger.error(f"[STATUS ERROR] {str(exc)}")
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("/usage")
def get_usage(
    workspace_id: str | None = None,
    x_workspace_id: str | None = Header(None),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    resolved_ws_id = resolve_and_verify_workspace(
        current_user, db, workspace_id, x_workspace_id
    )
    logger.info(f"[USAGE] user={current_user.email} workspace={resolved_ws_id}")

    status = get_billing_status(
        workspace_id=resolved_ws_id,
         x_workspace_id=None,
        db=db,
        current_user=current_user,
    )

    return {
        "token_limit": status["token_limit"],
        "tokens_used": status["tokens_used"],
        "tokens_remaining": status["tokens_remaining"],
        "percent_used": status["percent_used"],
        "overage_tokens": status["overage_tokens"],
        "estimated_overage_cost": status["estimated_overage_cost"],
    }


@router.get("/plan")
def get_plan(
    workspace_id: str | None = None,
    x_workspace_id: str | None = Header(None),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    resolved_ws_id = resolve_and_verify_workspace(
        current_user, db, workspace_id, x_workspace_id
    )
    logger.info(f"[PLAN] user={current_user.email} workspace={resolved_ws_id}")

    status = get_billing_status(
        workspace_id=resolved_ws_id,
        x_workspace_id=None,
        db=db,
        current_user=current_user,
    )

    return {
        "plan_type": status["current_plan"],
        "subscription_status": status["billing_status"],
        "token_limit": status["token_limit"],
        "tokens_remaining": status["tokens_remaining"],
    }


@router.get("/credits/summary")
def get_credit_summary(
    workspace_id: str | None = None,
    x_workspace_id: str | None = Header(None),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    try:
        resolved_ws_id = resolve_and_verify_workspace(
            current_user, db, workspace_id, x_workspace_id
        )
        service = get_billing_service()
        return service.get_credit_summary(
            db=db,
            workspace_id=resolved_ws_id,
            user_id=str(current_user.id),
        )
    except ValueError as exc:
        logger.error(f"[CREDITS SUMMARY ERROR] {str(exc)}")
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("/credits/history")
def get_credit_history(
    page: int = 1,
    limit: int = 20,
    workspace_id: str | None = None,
    x_workspace_id: str | None = Header(None),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    try:
        resolved_ws_id = resolve_and_verify_workspace(
            current_user, db, workspace_id, x_workspace_id
        )
        service = get_billing_service()
        return service.get_credit_history(
            db=db,
            workspace_id=resolved_ws_id,
            user_id=str(current_user.id),
            page=page,
            limit=limit,
        )
    except ValueError as exc:
        logger.error(f"[CREDITS HISTORY ERROR] {str(exc)}")
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/credits/purchase")
def purchase_credit_pack(
    payload: CreditsPurchaseRequest,
    workspace_id: str | None = None,
    x_workspace_id: str | None = Header(None),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    try:
        resolved_ws_id = resolve_and_verify_workspace(
            current_user, db, workspace_id, x_workspace_id, payload
        )
        service = get_billing_service()
        return service.initiate_credit_pack_purchase(
            db=db,
            workspace_id=resolved_ws_id,
            user_id=str(current_user.id),
            pack_id=payload.pack_id,
            provider=payload.provider,
        )
    except ValueError as exc:
        logger.error(f"[CREDITS PURCHASE ERROR] {str(exc)}")
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as e:
        logger.error(f"[CREDITS PURCHASE ERROR] {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/credits/verify")
def verify_credit_pack(
    payload: CreditsVerifyRequest,
    workspace_id: str | None = None,
    x_workspace_id: str | None = Header(None),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    try:
        resolved_ws_id = resolve_and_verify_workspace(
            current_user, db, workspace_id, x_workspace_id, payload
        )
        service = get_billing_service()
        return service.verify_credit_pack_payment(
            db=db,
            workspace_id=resolved_ws_id,
            user_id=str(current_user.id),
            order_id=payload.razorpay_order_id,
            payment_id=payload.razorpay_payment_id,
            signature=payload.razorpay_signature,
            provider=payload.provider,
        )
    except ValueError as exc:
        logger.error(f"[CREDITS VERIFY ERROR] {str(exc)}")
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as e:
        logger.error(f"[CREDITS VERIFY ERROR] {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/credits/daily-usage")
def get_daily_usage(
    days: int = 30,
    workspace_id: str | None = None,
    x_workspace_id: str | None = Header(None),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    try:
        resolved_ws_id = resolve_and_verify_workspace(
            current_user, db, workspace_id, x_workspace_id
        )
        service = get_billing_service()
        return service.token_service.get_daily_usage(db, resolved_ws_id, days)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("/credits/packs")
def list_credit_packs(
    workspace_id: str | None = None,
    x_workspace_id: str | None = Header(None),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    try:
        resolved_ws_id = resolve_and_verify_workspace(
            current_user, db, workspace_id, x_workspace_id
        )
        service = get_billing_service()
        return service.list_credit_packs(
            db=db,
            workspace_id=resolved_ws_id,
            user_id=str(current_user.id),
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("/entitlements", response_model=PlanEntitlementResponse)
def get_workspace_entitlements(
    workspace_id: str | None = None,
    x_workspace_id: str | None = Header(None),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    try:
        from app.services.billing.entitlement_service import EntitlementService
        from app.models.plan import Plan
        import uuid
        resolved_ws_id = resolve_and_verify_workspace(
            current_user, db, workspace_id, x_workspace_id
        )
        ws_uuid = uuid.UUID(resolved_ws_id)
        ent = EntitlementService.get_workspace_entitlement(db, ws_uuid)
        plan = db.query(Plan).filter(Plan.id == ent.plan_id).first()
        res = PlanEntitlementResponse.from_orm(ent)
        res.plan_name = plan.name if plan else "unknown"
        return res
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/feature-rules", response_model=list[FeatureBillingRuleResponse])
def list_active_rules(
    workspace_id: str | None = None,
    x_workspace_id: str | None = Header(None),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    try:
        from app.services.billing.feature_billing_service import FeatureBillingService
        resolve_and_verify_workspace(
            current_user, db, workspace_id, x_workspace_id
        )
        return FeatureBillingService.list_rules(db)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/entitlements/check")
def check_workspace_entitlement(
    resource: str,
    value: int = 1,
    workspace_id: str | None = None,
    x_workspace_id: str | None = Header(None),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    try:
        from app.services.billing.entitlement_service import EntitlementService
        import uuid
        resolved_ws_id = resolve_and_verify_workspace(
            current_user, db, workspace_id, x_workspace_id
        )
        ws_uuid = uuid.UUID(resolved_ws_id)
        res_dict = EntitlementService.check_entitlement(
            db, ws_uuid, resource, value
        )
        return {
            "workspace_id": resolved_ws_id,
            "resource": resource,
            "within_limit": res_dict["allowed"],
            "current_usage": res_dict["current"],
            "limit": res_dict["limit"],
        }
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/entitlements/check", response_model=EntitlementCheckResponse)
def check_workspace_entitlement_post(
    payload: EntitlementCheckRequest,
    workspace_id: str | None = None,
    x_workspace_id: str | None = Header(None),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    try:
        from app.services.billing.entitlement_service import EntitlementService
        import uuid
        resolved_ws_id = resolve_and_verify_workspace(
            current_user, db, workspace_id, x_workspace_id, payload
        )
        ws_uuid = uuid.UUID(resolved_ws_id)
        return EntitlementService.check_entitlement(
            db, ws_uuid, payload.resource, payload.value
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
