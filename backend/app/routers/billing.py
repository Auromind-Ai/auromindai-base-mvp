from fastapi import APIRouter, Depends, Header, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.routers.auth import CurrentUser, get_current_user
from app.services.billing_service import BillingService
router = APIRouter(prefix="/billing", tags=["billing"])


class CreateSubscriptionRequest(BaseModel):
    workspace_id: str
    plan: str
    provider: str = "razorpay"


class VerifyPaymentRequest(BaseModel):
    workspace_id: str
    plan: str
    provider: str = "razorpay"
    payment_id: str | None = None
    subscription_id: str | None = None
    signature: str | None = None


class LegacyCreateOrderRequest(BaseModel):
    workspace_id: str
    amount: int


class LegacyUpgradePlanRequest(BaseModel):
    workspace_id: str
    plan: str


def get_billing_service() -> BillingService:
    return BillingService()


@router.post("/create-subscription")
async def create_subscription(
    payload: CreateSubscriptionRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    try:
        service = get_billing_service()
   
        return service.create_subscription(
            db=db,
            workspace_id=payload.workspace_id,
            user_id=str(current_user.id),
            user_email=current_user.email,
            user_name=current_user.full_name,
            plan_key=payload.plan,
            provider=payload.provider,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/verify-payment")
async def verify_payment(
    payload: VerifyPaymentRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    try:
        service = get_billing_service()
        print(f"Verifying payment for workspace {payload.workspace_id}, user {current_user.email}, plan {payload.plan}, provider {payload.provider}, payment_id {payload.payment_id}, subscription_id {payload.subscription_id}") 
        return service.verify_payment(
            db=db,
            workspace_id=payload.workspace_id,
            user_id=str(current_user.id),
            plan_key=payload.plan,
            provider=payload.provider,
            subscription_id=payload.subscription_id,
            payment_id=payload.payment_id,
            signature=payload.signature,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc




@router.post("/webhook/razorpay")
async def razorpay_webhook(
    request: Request,
    x_razorpay_signature: str = Header(...),
    db: Session = Depends(get_db),
):
    body = await request.body()
    try:
        service = get_billing_service()
      
        return service.handle_webhook(
            db=db,
            body=body,
            signature=x_razorpay_signature,
            provider="razorpay",
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/webhook/payu")
async def payu_webhook(
    request: Request,
    x_payu_signature: str = Header(...),
    db: Session = Depends(get_db),
):
    body = await request.body()
    try:
        service = get_billing_service()
        return service.handle_webhook(
            db=db,
            body=body,
            signature=x_payu_signature,
            provider="payu",
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/status")
async def get_billing_status(
    workspace_id: str,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    try:
        service = get_billing_service()
        print(f"Fetching billing status for workspace {workspace_id} and user {current_user.email}")
        return service.get_status(
            db=db,
            workspace_id=workspace_id,
            user_id=str(current_user.id),
        )
    except ValueError as exc:
        print("🔥 BILLING ERROR:", str(exc))
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/usage")
async def get_usage(
    workspace_id: str,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    status = await get_billing_status(
        workspace_id=workspace_id,
        db=db,
        current_user=current_user,
    )
    return {
        "credits_remaining": status["credits_remaining"],
        "credits_used": status["credits_used"],
        "total_limit": status["total_limit"],
        "percent_used": status["percent_used"],
    }


@router.get("/plan")
async def get_plan(
    workspace_id: str,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    status = await get_billing_status(
        workspace_id=workspace_id,
        db=db,
        current_user=current_user,
    )
    return {
        "plan_type": status["current_plan"],
        "subscription_status": status["billing_status"],
        "credits": status["credits_remaining"],
        "total_limit": status["total_limit"],
    }


@router.post("/create-order")
async def create_order_compat(
    payload: LegacyCreateOrderRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    if payload.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be greater than zero")

    return await create_subscription(
        CreateSubscriptionRequest(workspace_id=payload.workspace_id, plan="pro"),
        db=db,
        current_user=current_user,
    )


@router.post("/upgrade")
async def legacy_upgrade_plan(
    payload: LegacyUpgradePlanRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    return await create_subscription(
        CreateSubscriptionRequest(
            workspace_id=payload.workspace_id,
            plan=payload.plan,
        ),
        db=db,
        current_user=current_user,
    )
