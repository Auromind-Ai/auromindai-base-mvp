import logging
import uuid
from fastapi import APIRouter, Depends, Header, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database import get_db
from fastapi.responses import Response
from app.models.invoice import Invoice
from app.services.storage.service import get_storage
from sqlalchemy import func
from app.services.billing.entitlement_service import EntitlementService
from app.models.plan import Plan
from app.models.brain import BrainEntry
from app.models.media import MediaFile
from app.models.ai_action import Lead
from app.models.integration import Integration
from app.models.automation import AutomationFlow
from app.models.subscription import Subscription
from app.models.wcc import WCCRechargeLog
from app.models.flow_pack import FlowPackPurchase
from app.services.wcc_service import WCCService
from app.core.enums import SubscriptionStatus
from app.routers.auth import CurrentUser, get_current_user
from app.services.billing import BillingService
from app.schemas import (
    CreditsPurchaseRequest,
    CreditsVerifyRequest,
    UnifiedBillingItem,
    UnifiedBillingResponse,
    UpdateBillingProfileRequest,
    CreateSubscriptionRequest,
    VerifyPaymentRequest,
    ReportPaymentFailureRequest,
    PlanPurchaseRequest,
    PlanVerifyRequest,
    PlanEntitlementResponse,
    FeatureBillingRuleResponse,
    EntitlementCheckRequest,
    EntitlementCheckResponse,
)
from app.core.security import verify_workspace_access, to_uuid

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
    if not isinstance(ws_id, uuid.UUID):
        try:
            uuid.UUID(str(ws_id))
        except (ValueError, AttributeError):
            raise HTTPException(
                status_code=400,
                detail=f"Invalid workspace_id UUID format: '{ws_id}'"
            )

    return verify_workspace_access(current_user, db, ws_id)


def _safe_to_uuid(val):
    if not val:
        return None
    if isinstance(val, uuid.UUID):
        return val
    try:
        return uuid.UUID(str(val).strip())
    except Exception:
        return None


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
            billing_cycle=getattr(payload, "billing_cycle", "monthly") or "monthly",
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
            billing_cycle=getattr(payload, "billing_cycle", "monthly") or "monthly",
            provider=payload.provider,
            subscription_id=payload.subscription_id,
            payment_id=payload.payment_id,
            signature=payload.signature,
        )

    except ValueError as exc:
        logger.error(f"[PAYMENT VERIFY ERROR] {str(exc)}")
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/plan/purchase")
def purchase_plan(
    payload: PlanPurchaseRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
    workspace_id: str | None = None,
    x_workspace_id: str | None = Header(None),
):
    try:
        resolved_ws_id = resolve_and_verify_workspace(
            current_user, db, workspace_id, x_workspace_id, payload
        )
        logger.info(f"[PLAN PURCHASE] user={current_user.email} workspace={resolved_ws_id} plan={payload.plan}")

        service = get_billing_service()
        return service.initiate_plan_purchase(
            db=db,
            workspace_id=resolved_ws_id,
            user_id=str(current_user.id),
            user_email=current_user.email,
            user_name=current_user.full_name,
            plan_key=payload.plan,
            billing_cycle=payload.billing_cycle or "monthly",
            provider=payload.provider,
        )

    except ValueError as exc:
        logger.error(f"[PLAN PURCHASE ERROR] {str(exc)}")
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as e:
        logger.error(f"[PLAN PURCHASE ERROR] {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to initialize plan purchase. Please try again.")


@router.post("/plan/verify")
def verify_plan(
    payload: PlanVerifyRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
    workspace_id: str | None = None,
    x_workspace_id: str | None = Header(None),
):
    try:
        resolved_ws_id = resolve_and_verify_workspace(
            current_user, db, workspace_id, x_workspace_id, payload
        )
        order_id = payload.razorpay_order_id or payload.order_id
        payment_id = payload.razorpay_payment_id or payload.payment_id
        signature = payload.razorpay_signature or payload.signature

        if not order_id or not payment_id or not signature:
            raise HTTPException(
                status_code=400,
                detail="razorpay_order_id, razorpay_payment_id, and razorpay_signature are required",
            )

        logger.info(f"[PLAN VERIFY] user={current_user.email} workspace={resolved_ws_id} order={order_id}")

        service = get_billing_service()
        return service.verify_plan_payment(
            db=db,
            workspace_id=resolved_ws_id,
            user_id=str(current_user.id),
            plan_key=payload.plan,
            billing_cycle=payload.billing_cycle or "monthly",
            order_id=order_id,
            payment_id=payment_id,
            signature=signature,
            provider=payload.provider,
        )

    except ValueError as exc:
        logger.error(f"[PLAN VERIFY ERROR] {str(exc)}")
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as e:
        logger.error(f"[PLAN VERIFY ERROR] {str(e)}")
        raise HTTPException(status_code=500, detail="Plan purchase verification failed. Please try again.")


@router.post("/report-failure")
def report_payment_failure(
    payload: ReportPaymentFailureRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
    workspace_id: str | None = None,
    x_workspace_id: str | None = Header(None),
):
    try:
        resolved_ws_id = None
        try:
            resolved_ws_id = resolve_and_verify_workspace(
                current_user, db, workspace_id, x_workspace_id, payload
            )
        except Exception:
            resolved_ws_id = None

        if not resolved_ws_id and payload.order_id:
          
            wcc_log = db.query(WCCRechargeLog).filter(WCCRechargeLog.gateway_order_id == payload.order_id).first()
            if wcc_log:
                resolved_ws_id = str(wcc_log.workspace_id)
            else:
                flow_log = db.query(FlowPackPurchase).filter(FlowPackPurchase.gateway_order_id == payload.order_id).first()
                if flow_log:
                    resolved_ws_id = str(flow_log.workspace_id)

        if not resolved_ws_id and payload.subscription_id:
            sub = db.query(Subscription).filter(Subscription.provider_subscription_id == payload.subscription_id).first()
            if sub:
                resolved_ws_id = str(sub.workspace_id)

        if not resolved_ws_id and getattr(current_user, "workspace_id", None):
            resolved_ws_id = str(current_user.workspace_id)

        if not resolved_ws_id:
            from app.models.workspace import WorkspaceMember
            member = db.query(WorkspaceMember).filter(WorkspaceMember.user_id == current_user.id).first()
            if member:
                resolved_ws_id = str(member.workspace_id)

        logger.info(f"[PAYMENT FAILURE REPORTED] user={current_user.email} workspace={resolved_ws_id} payment_id={payload.payment_id}")

        service = get_billing_service()
        # Build canonical failure entity to reuse webhook service logic
        failure_id = payload.payment_id or f"pay_fail_{uuid.uuid4().hex[:10]}"
        failure_reason = payload.error_description or payload.error_reason or "Payment declined at checkout"

        entity = {
            "payment": {
                "id": failure_id,
                "order_id": payload.order_id,
                "subscription_id": payload.subscription_id,
                "amount": payload.amount,
                "currency": payload.currency or "INR",
                "status": "failed",
                "error_code": payload.error_code,
                "error_description": failure_reason,
                "error_reason": payload.error_reason,
                "email": current_user.email,
                "notes": {
                    "workspace_id": str(resolved_ws_id),
                    "user_id": str(current_user.id),
                    "plan": payload.plan,
                    "plan_key": payload.plan,
                    "billing_cycle": getattr(payload, "billing_cycle", None) or "monthly",
                    "plan_label": getattr(payload, "plan_label", None),
                    "pack_id": payload.pack_id,
                    "type": "plan_purchase" if payload.plan else ("credit_pack_purchase" if payload.pack_id else None),
                }
            },
            "subscription": {
                "id": payload.subscription_id,
                "notes": {
                    "workspace_id": str(resolved_ws_id),
                    "user_id": str(current_user.id),
                    "plan": payload.plan,
                    "billing_cycle": getattr(payload, "billing_cycle", None) or "monthly",
                }
            } if payload.subscription_id else None
        }

        service.webhook_service._handle_payment_failed(
            db=db,
            provider=payload.provider,
            entity=entity
        )
        db.commit()
        return {"status": "ok", "message": "Payment failure recorded and notification processed"}
    except Exception as exc:
        logger.error(f"[PAYMENT FAILURE REPORT ERROR] {str(exc)}")
        db.rollback()
        return {"status": "error", "detail": str(exc)}


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

  

    ws_uuid = to_uuid(resolved_ws_id)
    ent = EntitlementService.get_workspace_entitlement(db, ws_uuid)

    plan = db.query(Plan).filter(Plan.id == ent.plan_id).first() if ent else None
    plan_name = plan.display_name if plan and plan.display_name else (plan.name.title() if plan else "Free")

    # Subscription cycle start
    active_sub = db.query(Subscription).filter(
        Subscription.workspace_id == ws_uuid,
        Subscription.status == SubscriptionStatus.active
    ).first()
    cycle_start = active_sub.current_period_start if active_sub else None

    # AI Credits
    service = get_billing_service()
    ai_used = int(round(service.token_service.get_cycle_usage(db, ws_uuid, cycle_start)))
    ai_limit = int(ent.included_ai_credits)

    # WCC Wallet
    wallet = WCCService.get_balance(db, ws_uuid)
    wcc_balance = float(wallet.balance) if wallet else 0.0

    # Knowledge Base
    kb_used = db.query(BrainEntry).filter(BrainEntry.workspace_id == ws_uuid).count()
    kb_limit = int(ent.knowledge_base_limit)

    # Storage in MB
    total_bytes = db.query(func.sum(MediaFile.file_size)).filter(MediaFile.workspace_id == ws_uuid).scalar() or 0
    storage_mb_used = int(total_bytes // (1024 * 1024))
    storage_mb_limit = int(ent.storage_limit_mb)

    # Leads
    leads_used = db.query(Lead).filter(Lead.workspace_id == ws_uuid).count()
    leads_limit = int(ent.lead_limit)

    # Gmail accounts
    gmail_used = db.query(Integration).filter(
        Integration.workspace_id == ws_uuid,
        Integration.integration_type.in_(["google_gmail", "gmail"]),
        Integration.is_active == True
    ).count()
    gmail_limit = int(ent.gmail_limit)

    # Automations (Active count)
    automations_used = db.query(AutomationFlow).filter(
        AutomationFlow.workspace_id == ws_uuid,
        AutomationFlow.status == "Active"
    ).count()
    automations_limit = int(ent.automation_limit)

    return {
        "plan_name": plan_name,
        "ai_credits": { "used": ai_used, "limit": ai_limit },
        "wcc_wallet": { "balance_inr": wcc_balance },
        "knowledge_base": { "used": kb_used, "limit": kb_limit },
        "storage_mb": { "used": storage_mb_used, "limit": storage_mb_limit },
        "leads": { "used": leads_used, "limit": leads_limit },
        "gmail_accounts": { "used": gmail_used, "limit": gmail_limit },
        "automations": { "used": automations_used, "limit": automations_limit },
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
@router.get("/credit-summary")
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
        from app.services.billing.entitlement_service import EntitlementService
        import uuid
        ent = EntitlementService.get_workspace_entitlement(db, to_uuid(resolved_ws_id))
        if not ent.allow_ai_topup:
            raise HTTPException(
                status_code=403,
                detail="AI Credit top-up is not available for your current plan. Please upgrade to Pro."
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
        logger.error(f"[CREDITS PURCHASE ERROR] {str(exc)}", exc_info=True)
        err_msg = str(exc)
        if any(tech in err_msg.lower() for tech in ["codec", "latin", "ordinal", "razorpay", "gateway", "client"]):
            raise HTTPException(status_code=503, detail="Payment gateway is currently unavailable. Please try again later or contact support.")
        raise HTTPException(status_code=400, detail=err_msg)
    except Exception as e:
        logger.error(f"[CREDITS PURCHASE ERROR] {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to initialize credit purchase. Please try again.")


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
        raise HTTPException(status_code=500, detail="Credit pack purchase verification failed. Please try again.")


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
        ws_uuid = to_uuid(resolved_ws_id)
        ent = EntitlementService.get_workspace_entitlement(db, ws_uuid)
        plan_id = getattr(ent, "plan_id", None)
        plan = db.query(Plan).filter(Plan.id == plan_id).first() if plan_id else None
        res = PlanEntitlementResponse.from_orm(ent)
        res.plan_name = plan.name if plan else "unknown"
        return res
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as e:
        logger.error(f"[GET ENTITLEMENTS ERROR] {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to retrieve workspace entitlements. Please try again.")


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
        raise HTTPException(status_code=500, detail="Failed to retrieve billing rules. Please try again.")


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
        ws_uuid = to_uuid(resolved_ws_id)
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
        raise HTTPException(status_code=500, detail="Entitlement verification check failed. Please try again.")


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
        ws_uuid = to_uuid(resolved_ws_id)
        return EntitlementService.check_entitlement(
            db, ws_uuid, payload.resource, payload.value
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Entitlement verification check failed. Please try again.")


@router.get("/invoices", response_model=UnifiedBillingResponse)
def get_user_invoices(
    page: int = 1,
    limit: int = 10,
    search: str | None = None,
    type: str | None = None,
    sort: str = "desc",
    workspace_id: str | None = None,
    x_workspace_id: str | None = Header(None),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    try:
        import uuid
        from sqlalchemy import or_
        from app.models.invoice import Invoice
        from app.core.enums import InvoiceStatus

        resolved_ws_id = resolve_and_verify_workspace(
            current_user, db, workspace_id, x_workspace_id
        )
        ws_uuid = to_uuid(resolved_ws_id)

        invoice_query = db.query(Invoice).filter(Invoice.workspace_id == ws_uuid)

        if search:
            search_pattern = f"%{search.strip()}%"
            invoice_query = invoice_query.filter(
                or_(
                    Invoice.invoice_number.ilike(search_pattern),
                    Invoice.customer_name.ilike(search_pattern),
                    Invoice.product_type.ilike(search_pattern),
                )
            )

        if type:
            if type in ["subscription", "plan_upgrade"]:
                invoice_query = invoice_query.filter(
                    or_(
                        Invoice.product_type.in_(["subscription", "plan_upgrade"]),
                        Invoice.product_type.ilike("%subscription%"),
                        Invoice.product_type.ilike("%upgrade%"),
                        Invoice.product_type.ilike("%plan%")
                    )
                )
            elif type in ["ai_credit_recharge", "ai_credits"]:
                invoice_query = invoice_query.filter(
                    or_(
                        Invoice.product_type.in_(["ai_credit_recharge", "ai_credits"]),
                        Invoice.product_type.ilike("%ai%credit%"),
                        Invoice.product_type.ilike("%credit_recharge%"),
                        Invoice.product_type.ilike("%topup%")
                    )
                )
            elif type in ["flow_packs", "flow_purchase", "flow_pack"]:
                invoice_query = invoice_query.filter(
                    or_(
                        Invoice.product_type.in_(["flow_packs", "flow_purchase", "flow_pack"]),
                        Invoice.product_type.ilike("%flow%")
                    )
                )
            elif type in ["wallet_recharge", "wcc_recharge"]:
                invoice_query = invoice_query.filter(
                    or_(
                        Invoice.product_type.in_(["wcc_recharge", "wallet_recharge"]),
                        Invoice.product_type.ilike("%wcc%"),
                        Invoice.product_type.ilike("%wallet%")
                    )
                )
            elif type in ["credit_note", "refund"]:
                invoice_query = invoice_query.filter(Invoice.invoice_type == "credit_note")

        if sort == "asc":
            invoice_query = invoice_query.order_by(Invoice.issued_at.asc())
        else:
            invoice_query = invoice_query.order_by(Invoice.issued_at.desc())

        total = invoice_query.count()
        offset = (page - 1) * limit
        invoices = invoice_query.offset(offset).limit(limit).all()
        items = []

        desc_mapping = {
            "subscription": "Auromind SaaS Platform Subscription",
            "plan_upgrade": "Auromind SaaS Platform Subscription",
            "ai_credits": "AI Token Credit Pack Recharge",
            "ai_credit_recharge": "AI Token Credit Pack Recharge",
            "flow_packs": "AI Automation Flow Pack",
            "flow_purchase": "AI Automation Flow Pack",
            "flow_pack": "AI Automation Flow Pack",
            "wcc_recharge": "WhatsApp Conversation Cloud Wallet Recharge",
            "wallet_recharge": "WhatsApp Conversation Cloud Wallet Recharge"
        }

        for inv in invoices:
            desc = desc_mapping.get(inv.product_type, f"Auromind Purchase ({inv.product_type})")
            if inv.invoice_type == "credit_note":
                desc = f"Refund Credit Note - {desc}"

            items.append({
                "id": str(inv.id),
                "date": inv.issued_at.isoformat() if inv.issued_at else "N/A",
                "amount": float(inv.total_amount or 0.0),
                "status": inv.status.value.upper() if hasattr(inv.status, "value") else str(inv.status).upper(),
                "payment_id": inv.invoice_number,
                "payment_type": inv.product_type or "subscription",
                "payment_method": "payment_gateway",
                "provider": "razorpay",
                "description": desc,
                "invoice_available": bool(inv.pdf_url),
                "invoice_number": inv.invoice_number,
                "pdf_url": inv.pdf_url,
                "taxable_amount": float(inv.taxable_amount or 0.0),
                "gst_amount": float(inv.gst_amount or 0.0),
                "total_amount": float(inv.total_amount or 0.0)
            })

        pages = (total + limit - 1) // limit if limit > 0 else 1

        return {
            "payments": items,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "pages": max(pages, 1),
            },
        }
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as e:
        logger.error(f"[INVOICES ERROR] {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/invoices/{invoice_id}/download")
def download_invoice(
    invoice_id: str,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    
    try:
        inv_uuid = to_uuid(invoice_id)
        invoice = db.query(Invoice).filter(Invoice.id == inv_uuid).first()
        if not invoice:
            raise HTTPException(status_code=404, detail="Invoice not found")

        # Verify workspace access
        verify_workspace_access(current_user, db, str(invoice.workspace_id))

        if not invoice.pdf_url:
            raise HTTPException(status_code=404, detail="Invoice PDF not generated yet")

        # Reconstruct canonical file path from invoice ID — never trust pdf_url directly
        file_path = f"invoices/{invoice.id}.pdf"
        safe_name = (invoice.invoice_number or str(invoice.id)).replace("/", "-")

        try:
            pdf_bytes = get_storage().get_file_bytes(file_path)
        except FileNotFoundError:
            raise HTTPException(status_code=404, detail="Invoice PDF file not found in storage")
        except Exception as fetch_err:
            logger.error(f"[INVOICE DOWNLOAD] Storage fetch failed for {invoice.id}: {fetch_err}")
            raise HTTPException(status_code=502, detail="Failed to retrieve invoice PDF from storage")

        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{safe_name}.pdf"'},
        )

    except (ValueError, AttributeError) as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("/admin/sales-register")
def get_sales_register(
    month: int | None = None,
    year: int | None = None,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    from app.core.enums import PlatformRole
    if current_user.user.platform_role != PlatformRole.PLATFORM_ADMIN:
        raise HTTPException(status_code=403, detail="Admin permissions required")
        
    from app.models.invoice import Invoice
    from sqlalchemy import func
    query = db.query(Invoice)
    if month:
        query = query.filter(func.extract('month', Invoice.issued_at) == month)
    if year:
        query = query.filter(func.extract('year', Invoice.issued_at) == year)
        
    invoices = query.order_by(Invoice.issued_at.desc()).all()
    return [
        {
            "invoice_number": inv.invoice_number,
            "issued_at": inv.issued_at.isoformat() if inv.issued_at else None,
            "invoice_type": inv.invoice_type,
            "product_type": inv.product_type,
            "customer_name": inv.customer_name,
            "customer_gstin": inv.customer_gstin,
            "place_of_supply": inv.place_of_supply,
            "subtotal": float(inv.subtotal or 0.0),
            "gst_rate": float(inv.gst_rate or 0.0),
            "gst_amount": float(inv.gst_amount or 0.0),
            "cgst": float(inv.cgst or 0.0),
            "sgst": float(inv.sgst or 0.0),
            "igst": float(inv.igst or 0.0),
            "total_amount": float(inv.total_amount or 0.0),
            "status": inv.status.value if hasattr(inv.status, "value") else str(inv.status)
        }
        for inv in invoices
    ]


@router.get("/admin/tax-summary")
def get_tax_summary(
    year: int | None = None,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    from app.core.enums import PlatformRole
    if current_user.user.platform_role != PlatformRole.PLATFORM_ADMIN:
        raise HTTPException(status_code=403, detail="Admin permissions required")
        
    from app.models.invoice import Invoice
    from sqlalchemy import func
    
    query = db.query(
        func.extract('month', Invoice.issued_at).label('month'),
        func.sum(Invoice.subtotal).label('total_subtotal'),
        func.sum(Invoice.cgst).label('total_cgst'),
        func.sum(Invoice.sgst).label('total_sgst'),
        func.sum(Invoice.igst).label('total_igst'),
        func.sum(Invoice.gst_amount).label('total_gst'),
        func.sum(Invoice.total_amount).label('total_collected')
    )
    
    if year:
        query = query.filter(func.extract('year', Invoice.issued_at) == year)
        
    summary = query.group_by('month').order_by('month').all()
    return [
        {
            "month": int(row.month),
            "total_subtotal": float(row.total_subtotal or 0.0),
            "total_cgst": float(row.total_cgst or 0.0),
            "total_sgst": float(row.total_sgst or 0.0),
            "total_igst": float(row.total_igst or 0.0),
            "total_gst": float(row.total_gst or 0.0),
            "total_collected": float(row.total_collected or 0.0)
        }
        for row in summary
    ]


@router.get("/workspace/{workspace_id}/profile")
def get_workspace_billing_profile(
    workspace_id: str,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    try:
        resolved_ws_id = resolve_and_verify_workspace(
            current_user, db, workspace_id
        )
        import uuid
        ws_uuid = to_uuid(resolved_ws_id)
        
        from app.models.workspace import Workspace
        workspace = db.query(Workspace).filter(Workspace.id == ws_uuid).first()
        if not workspace:
            raise HTTPException(status_code=404, detail="Workspace not found")
            
        return {
            "billing_name": workspace.name,
            "billing_contact_name": workspace.billing_contact_name,
            "billing_email": workspace.billing_email,
            "billing_phone": workspace.billing_phone,
            "billing_address": workspace.billing_address,
            "billing_city": workspace.billing_city,
            "billing_state": workspace.billing_state,
            "billing_country": workspace.billing_country or "IN",
            "billing_postal_code": workspace.billing_postal_code,
            "has_gst_registration": bool(workspace.has_gst_registration),
            "billing_gstin": workspace.billing_gstin,
            "legal_business_name": workspace.legal_business_name,
            "business_type": workspace.business_type
        }
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.patch("/workspace/{workspace_id}/profile")
def update_workspace_billing_profile(
    workspace_id: str,
    payload: UpdateBillingProfileRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    try:
        resolved_ws_id = resolve_and_verify_workspace(
            current_user, db, workspace_id
        )
        import uuid
        ws_uuid = to_uuid(resolved_ws_id)
        
        from app.models.workspace import Workspace
        workspace = db.query(Workspace).filter(Workspace.id == ws_uuid).first()
        if not workspace:
            raise HTTPException(status_code=404, detail="Workspace not found")
            
        if payload.billing_name is not None:
            workspace.name = payload.billing_name
        if payload.billing_contact_name is not None:
            workspace.billing_contact_name = payload.billing_contact_name
        if payload.billing_email is not None:
            workspace.billing_email = payload.billing_email
        if payload.billing_phone is not None:
            workspace.billing_phone = payload.billing_phone
        if payload.billing_address is not None:
            workspace.billing_address = payload.billing_address
        if payload.billing_city is not None:
            workspace.billing_city = payload.billing_city
        if payload.billing_state is not None:
            workspace.billing_state = payload.billing_state
        if payload.billing_country is not None:
            workspace.billing_country = payload.billing_country
        if payload.billing_postal_code is not None:
            workspace.billing_postal_code = payload.billing_postal_code
        if payload.has_gst_registration is not None:
            workspace.has_gst_registration = payload.has_gst_registration
            if not payload.has_gst_registration:
                workspace.billing_gstin = None
        if payload.billing_gstin is not None:
            workspace.billing_gstin = payload.billing_gstin.strip().upper() if payload.billing_gstin and payload.billing_gstin.strip() else None
        if payload.legal_business_name is not None:
            workspace.legal_business_name = payload.legal_business_name
        if payload.business_type is not None:
            workspace.business_type = payload.business_type
            
        db.commit()
        return {
            "status": "success",
            "message": "Billing profile updated successfully",
            "billing_name": workspace.name,
            "billing_contact_name": workspace.billing_contact_name,
            "billing_email": workspace.billing_email,
            "billing_phone": workspace.billing_phone,
            "billing_address": workspace.billing_address,
            "billing_city": workspace.billing_city,
            "billing_state": workspace.billing_state,
            "billing_country": workspace.billing_country,
            "billing_postal_code": workspace.billing_postal_code,
            "has_gst_registration": bool(workspace.has_gst_registration),
            "billing_gstin": workspace.billing_gstin,
            "legal_business_name": workspace.legal_business_name,
            "business_type": workspace.business_type
        }
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

