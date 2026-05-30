import logging
from fastapi import APIRouter, Depends, Header, HTTPException, Request
from sqlalchemy.orm import Session
from app.database import get_db
from app.routers.auth import CurrentUser, get_current_user
from app.services.billing import BillingService
from app.schemas import (
    CreateSubscriptionRequest,
    VerifyPaymentRequest
)
from app.core.security import verify_workspace_access

router = APIRouter(prefix="/billing", tags=["billing"])
logger = logging.getLogger(__name__)


def get_billing_service() -> BillingService:
    return BillingService()


@router.post("/create-subscription")
def create_subscription(
    payload: CreateSubscriptionRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    try:
        workspace_id = verify_workspace_access(current_user, db)
        logger.info(f"[SUBSCRIPTION] user={current_user.email} workspace={workspace_id} plan={payload.plan}")

        service = get_billing_service()
        return service.create_subscription(
            db=db,
            workspace_id=workspace_id,
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
):
    try:
        workspace_id = verify_workspace_access(current_user, db)
        logger.info(f"[PAYMENT VERIFY] user={current_user.email} workspace={workspace_id} provider={payload.provider}")

        service = get_billing_service()
        return service.verify_payment(
            db=db,
            workspace_id=workspace_id,
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
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    try:
        workspace_id = verify_workspace_access(current_user, db)
        logger.info(f"[STATUS] user={current_user.email} workspace={workspace_id}")

        service = get_billing_service()
        return service.get_status(
            db=db,
            workspace_id=workspace_id,
            user_id=str(current_user.id),
        )

    except ValueError as exc:
        logger.error(f"[STATUS ERROR] {str(exc)}")
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("/usage")
def get_usage(
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    workspace_id = verify_workspace_access(current_user, db)
    logger.info(f"[USAGE] user={current_user.email} workspace={workspace_id}")

    status = get_billing_status(
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
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    workspace_id = verify_workspace_access(current_user, db)
    logger.info(f"[PLAN] user={current_user.email} workspace={workspace_id}")

    status = get_billing_status(
        db=db,
        current_user=current_user,
    )

    return {
        "plan_type": status["current_plan"],
        "subscription_status": status["billing_status"],
        "token_limit": status["token_limit"],
        "tokens_remaining": status["tokens_remaining"],
    }