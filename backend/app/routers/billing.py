from fastapi import APIRouter, Depends, Header, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.routers.auth import CurrentUser, get_current_user
from app.services.billing import BillingService
from app.schemas import CreateSubscriptionRequest, LegacyCreateOrderRequest,LegacyUpgradePlanRequest, VerifyPaymentRequest

router = APIRouter(prefix="/billing", tags=["billing"])




def get_billing_service() -> BillingService:
    return BillingService()


@router.post("/create-subscription")
def create_subscription(
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
def verify_payment(
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
def get_billing_status(
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
        print(" BILLING ERROR:", str(exc))
        raise HTTPException(status_code=400, detail=str(exc)) from exc



@router.get("/usage")
def get_usage(
    workspace_id: str,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    status = get_billing_status(
        workspace_id=workspace_id,
        db=db,
        current_user=current_user,
    )
    print(f"Usage for workspace {workspace_id}: {status['tokens_used']} tokens used out of {status['token_remaining']} token remaining.")
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
    workspace_id: str,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    status = get_billing_status(
        workspace_id=workspace_id,
        db=db,
        current_user=current_user,
    )
    return {
        "plan_type": status["current_plan"],
        "subscription_status": status["billing_status"],
        "token_limit": status["token_limit"],
        "tokens_remaining": status["tokens_remaining"],
    }



@router.post("/create-order")
def create_order_compat(
    payload: LegacyCreateOrderRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    if payload.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be greater than zero")

    return create_subscription(
        CreateSubscriptionRequest(workspace_id=payload.workspace_id, plan="pro"),
        db=db,
        current_user=current_user,
    )



@router.post("/upgrade")
def legacy_upgrade_plan(
    payload: LegacyUpgradePlanRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    return create_subscription(
        CreateSubscriptionRequest(
            workspace_id=payload.workspace_id,
            plan=payload.plan,
        ),
        db=db,
        current_user=current_user,
    )
