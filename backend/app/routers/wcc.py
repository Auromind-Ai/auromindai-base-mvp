import logging
from fastapi import APIRouter, Depends, HTTPException, Request, Header
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.routers.auth import CurrentUser, get_current_user
from app.core.security import verify_workspace_access
from app.services.wcc_service import WCCService
from app.schemas.wcc import (
    WCCBalanceResponse,
    WCCEstimateRequest,
    WCCEstimateResponse,
    WCCRechargeInitiateRequest,
    WCCRechargeInitiateResponse,
    WCCRechargeVerifyRequest,
    WCCSessionHistoryResponse,
    WCCSessionItem,
    WCCRateItem
)
from app.models.wcc import WCCTransaction

from typing import Any


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


router = APIRouter(prefix="/wallet/wcc", tags=["wcc"])
logger = logging.getLogger(__name__)


@router.get("/balance", response_model=WCCBalanceResponse)
def get_wcc_balance(
    workspace_id: str | None = None,
    x_workspace_id: str | None = Header(None),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    try:
        resolved_ws_id = resolve_and_verify_workspace(
            current_user, db, workspace_id, x_workspace_id
        )
        wallet = WCCService.get_balance(db, resolved_ws_id)
        db.commit()  # Request handler commits the session changes (auto-created wallet)
        return WCCBalanceResponse(balance=wallet.balance, currency=wallet.currency)
    except Exception as e:
        db.rollback()
        logger.error(f"Error fetching WCC balance: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/rates", response_model=List[WCCRateItem])
def get_wcc_rates(
    workspace_id: str | None = None,
    x_workspace_id: str | None = Header(None),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    try:
        # Check workspace access first
        resolve_and_verify_workspace(
            current_user, db, workspace_id, x_workspace_id
        )
        rates = WCCService.get_rates(db)
        return [WCCRateItem.from_orm(r) for r in rates]
    except Exception as e:
        logger.error(f"Error fetching WCC rates: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/estimate", response_model=WCCEstimateResponse)
def estimate_wcc_campaign(
    payload: WCCEstimateRequest,
    workspace_id: str | None = None,
    x_workspace_id: str | None = Header(None),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    try:
        resolved_ws_id = resolve_and_verify_workspace(
            current_user, db, workspace_id, x_workspace_id, payload
        )
        result = WCCService.calculate_estimate(
            db=db,
            workspace_id=resolved_ws_id,
            audience_size=payload.audience_size,
            category=payload.category
        )
        db.commit()  # Commit potential wallet auto-creation
        return WCCEstimateResponse(
            estimated_cost=result["estimated_cost"],
            balance_sufficient=result["balance_sufficient"],
            rate_applied=result["rate_applied"]
        )
    except ValueError as val_err:
        db.rollback()
        logger.error(f"Validation error estimating WCC campaign: {str(val_err)}")
        raise HTTPException(status_code=400, detail=str(val_err))
    except Exception as e:
        db.rollback()
        logger.error(f"Error estimating WCC campaign: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/recharge/initiate", response_model=WCCRechargeInitiateResponse)
def initiate_wcc_recharge(
    payload: WCCRechargeInitiateRequest,
    workspace_id: str | None = None,
    x_workspace_id: str | None = Header(None),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    try:
        resolved_ws_id = resolve_and_verify_workspace(
            current_user, db, workspace_id, x_workspace_id, payload
        )
        result = WCCService.initiate_recharge(
            db=db,
            workspace_id=resolved_ws_id,
            amount=payload.amount
        )
        db.commit()  # Router commits order creation log
        return WCCRechargeInitiateResponse(
            gateway_order_id=result["gateway_order_id"],
            amount=result["amount"],
            currency=result["currency"],
            public_key=result["public_key"],
            recharge_log_id=result["recharge_log_id"]
        )
    except Exception as e:
        db.rollback()
        logger.error(f"Error initiating WCC recharge: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/recharge/verify")
def verify_wcc_recharge(
    payload: WCCRechargeVerifyRequest,
    workspace_id: str | None = None,
    x_workspace_id: str | None = Header(None),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    try:
        resolved_ws_id = resolve_and_verify_workspace(
            current_user, db, workspace_id, x_workspace_id, payload
        )
        result = WCCService.verify_recharge(
            db=db,
            workspace_id=resolved_ws_id,
            order_id=payload.razorpay_order_id,
            payment_id=payload.razorpay_payment_id,
            signature=payload.razorpay_signature
        )
        db.commit()
        return result
    except ValueError as val_err:
        db.rollback()
        logger.error(f"Validation error verifying WCC recharge: {str(val_err)}")
        raise HTTPException(status_code=400, detail=str(val_err))
    except Exception as e:
        db.rollback()
        logger.error(f"Error verifying WCC recharge: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/recharge/webhook")
async def wcc_recharge_webhook(
    request: Request,
    x_razorpay_signature: str = Header(..., alias="x-razorpay-signature"),
    db: Session = Depends(get_db),
):
    body = await request.body()
    try:
        if not x_razorpay_signature:
            raise HTTPException(status_code=400, detail="Missing signature")
        
        result = WCCService.process_recharge_webhook(
            db=db,
            body=body,
            signature=x_razorpay_signature
        )
        db.commit()  # Webhook handler commits success status and wallet credit
        return result
    except ValueError as val_err:
        db.rollback()
        logger.error(f"Validation error in WCC recharge webhook: {str(val_err)}")
        raise HTTPException(status_code=400, detail=str(val_err))
    except Exception as e:
        db.rollback()
        logger.error(f"Error processing WCC recharge webhook: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/sessions", response_model=WCCSessionHistoryResponse)
def get_wcc_sessions(
    page: int = 1,
    limit: int = 10,
    workspace_id: str | None = None,
    x_workspace_id: str | None = Header(None),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    try:
        resolved_ws_id = resolve_and_verify_workspace(
            current_user, db, workspace_id, x_workspace_id
        )
        if page < 1:
            page = 1
        if limit < 1 or limit > 100:
            limit = 10
            
        query = db.query(WCCTransaction).filter(WCCTransaction.workspace_id == resolved_ws_id)
        total_count = query.count()
        transactions = (
            query.order_by(WCCTransaction.created_at.desc())
            .offset((page - 1) * limit)
            .limit(limit)
            .all()
        )
        
        sessions = [
            WCCSessionItem(
                date=tx.created_at.isoformat(),
                session_id=tx.meta_session_id,
                category=tx.category,
                status=tx.status,
                message_count=tx.message_count,
                debit_amount=tx.debit_amount,
                rate_applied=tx.rate_applied
            )
            for tx in transactions
        ]
        
        return WCCSessionHistoryResponse(
            sessions=sessions,
            total_count=total_count,
            page=page,
            limit=limit
        )
    except Exception as e:
        logger.error(f"Error fetching WCC sessions: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
