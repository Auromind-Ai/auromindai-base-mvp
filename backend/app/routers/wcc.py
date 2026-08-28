import logging
from fastapi import APIRouter, Depends, HTTPException, Request, Header, Query, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.routers.auth import CurrentUser, get_current_user
from app.core.security import verify_workspace_access, to_uuid
from app.core.sanitizer import sanitize_user_message
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
from app.core.pagination import PaginationParams, paginate_query

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
    if not isinstance(ws_id, uuid.UUID):
        try:
            uuid.UUID(str(ws_id))
        except (ValueError, TypeError, AttributeError):
            raise HTTPException(
                status_code=400,
                detail=f"Invalid workspace_id UUID format: '{ws_id}'"
            )

    return verify_workspace_access(current_user, db, ws_id)


def _safe_error(exc: Exception, status_code: int = 400, default: str = "An error occurred. Please try again.") -> HTTPException:
    
    safe_msg = sanitize_user_message(str(exc), status_code=status_code, default_message=default)
    return HTTPException(status_code=status_code, detail=safe_msg)


router = APIRouter(prefix="/wallet/wcc", tags=["wcc"])
logger = logging.getLogger(__name__)

_ALLOWED_SORT_VALUES = {"asc", "desc"}
_ALLOWED_RECHARGE_STATUSES = {"success", "failed", "pending", "created", "refunded"}



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
        fuel_data = WCCService.get_fuel_gauge_data(db, resolved_ws_id)
        db.commit()  # Commit auto-created wallet if any
        return WCCBalanceResponse(**fuel_data)
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error fetching WCC balance for workspace={workspace_id}: {e}")
        raise _safe_error(e, status_code=500, default="Unable to fetch wallet balance. Please try again.")


@router.get("/rates", response_model=List[WCCRateItem])
def get_wcc_rates(
    workspace_id: str | None = None,
    x_workspace_id: str | None = Header(None),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    try:
        resolve_and_verify_workspace(
            current_user, db, workspace_id, x_workspace_id
        )
        rates = WCCService.get_rates(db)
        return [
            WCCRateItem(
                category=r.category,
                region=r.region,
                rate_per_message=r.customer_price,
                customer_price=r.customer_price,
                is_active=r.is_active
            )
            for r in rates
        ]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching WCC rates: {e}")
        raise _safe_error(e, status_code=500, default="Unable to retrieve messaging rates. Please try again.")


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
    except HTTPException:
        db.rollback()
        raise
    except ValueError as val_err:
        db.rollback()
        logger.warning(f"Validation error estimating WCC campaign: {val_err}")
        raise _safe_error(val_err, status_code=400, default="Invalid campaign estimate parameters.")
    except Exception as e:
        db.rollback()
        logger.error(f"Error estimating WCC campaign: {e}")
        raise _safe_error(e, status_code=500, default="Campaign cost estimation failed. Please try again.")


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
        from app.services.billing.entitlement_service import EntitlementService
        ent = EntitlementService.get_workspace_entitlement(db, to_uuid(resolved_ws_id))
        if not ent.allow_wcc_recharge:
            raise HTTPException(
                status_code=403,
                detail="WhatsApp Wallet recharge is not available for your current plan. Please upgrade to Pro."
            )
        result = WCCService.initiate_recharge(
            db=db,
            workspace_id=resolved_ws_id,
            amount=payload.amount
        )
        db.commit()  # Commit order creation log
        return WCCRechargeInitiateResponse(
            gateway_order_id=result["gateway_order_id"],
            amount=result["amount"],
            currency=result["currency"],
            public_key=result["public_key"],
            recharge_log_id=result["recharge_log_id"]
        )
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error initiating WCC recharge: {e}")
        raise _safe_error(e, status_code=500, default="Unable to initiate wallet recharge. Please try again.")


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
    except HTTPException:
        db.rollback()
        raise
    except ValueError as val_err:
        db.rollback()
        logger.warning(f"Validation error verifying WCC recharge: {val_err}")
        raise _safe_error(val_err, status_code=400, default="Payment verification failed. Please check your payment details.")
    except Exception as e:
        db.rollback()
        logger.error(f"Error verifying WCC recharge: {e}")
        raise _safe_error(e, status_code=500, default="Payment verification could not be completed. Please try again.")


@router.post("/recharge/webhook")
async def wcc_recharge_webhook(
    request: Request,
    x_razorpay_signature: str = Header(..., alias="x-razorpay-signature"),
    db: Session = Depends(get_db),
):
    body = await request.body()
    try:
        if not x_razorpay_signature or not x_razorpay_signature.strip():
            raise HTTPException(status_code=400, detail="Missing or empty webhook signature.")

        result = WCCService.process_recharge_webhook(
            db=db,
            body=body,
            signature=x_razorpay_signature
        )
        db.commit()  # Commit wallet credit on success
        return result
    except HTTPException:
        db.rollback()
        raise
    except ValueError as val_err:
        db.rollback()
        logger.warning(f"Validation error in WCC recharge webhook: {val_err}")
        raise _safe_error(val_err, status_code=400, default="Webhook payload validation failed.")
    except Exception as e:
        db.rollback()
        logger.error(f"Error processing WCC recharge webhook: {e}")
        raise _safe_error(e, status_code=500, default="Webhook processing failed. Please try again.")


@router.get("/sessions", response_model=WCCSessionHistoryResponse)
def get_wcc_sessions(
    pagination: PaginationParams = Depends(),
    workspace_id: str | None = None,
    x_workspace_id: str | None = Header(None),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    try:
        resolved_ws_id = resolve_and_verify_workspace(
            current_user, db, workspace_id, x_workspace_id
        )

        query = db.query(WCCTransaction).filter(WCCTransaction.workspace_id == resolved_ws_id)
        total_count = query.count()
        query = query.order_by(WCCTransaction.created_at.desc())

        transactions = paginate_query(query, pagination).all()

        sessions = [
            WCCSessionItem(
                date=tx.created_at.isoformat(),
                session_id=tx.meta_session_id,
                category=tx.category,
                status=tx.status,
                message_count=tx.message_count,
                debit_amount=tx.customer_price_applied if tx.customer_price_applied is not None else tx.debit_amount,
                rate_applied=tx.customer_price_applied if tx.customer_price_applied is not None else tx.rate_applied
            )
            for tx in transactions
        ]

        return WCCSessionHistoryResponse(
            sessions=sessions,
            total_count=total_count,
            page=pagination.page,
            limit=pagination.limit
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching WCC sessions: {e}")
        raise _safe_error(e, status_code=500, default="Unable to load session history. Please try again.")


@router.get("/recharges")
def get_user_wcc_recharges(
    page: int = Query(default=1, ge=1, le=1000, description="Page number"),
    limit: int = Query(default=10, ge=1, le=100, description="Records per page"),
    search: str | None = Query(default=None, max_length=100, description="Search by payment ID or order ID"),
    status_filter: str | None = Query(default=None, alias="status", max_length=50, description="Filter by recharge status"),
    sort: str = Query(default="desc", pattern="^(asc|desc)$", description="Sort order: asc or desc"),
    workspace_id: str | None = None,
    x_workspace_id: str | None = Header(None),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    # Validate status against allowlist if provided
    if status_filter is not None:
        status_clean = status_filter.strip().lower()
        if status_clean not in _ALLOWED_RECHARGE_STATUSES:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Invalid status filter '{status_clean}'. Allowed values: {', '.join(sorted(_ALLOWED_RECHARGE_STATUSES))}."
            )
    else:
        status_clean = None

    try:
        from sqlalchemy import or_, desc, asc
        from app.models.wcc import WCCRechargeLog

        resolved_ws_id = resolve_and_verify_workspace(
            current_user, db, workspace_id, x_workspace_id
        )
        ws_uuid = to_uuid(resolved_ws_id)

        query = db.query(WCCRechargeLog).filter(WCCRechargeLog.workspace_id == ws_uuid)

        if status_clean:
            query = query.filter(WCCRechargeLog.status == status_clean)

        if search:
            # Strip and sanitize search — only allow alphanumeric + dash/underscore to prevent wildcard injection
            search_clean = search.strip()
            pattern = f"%{search_clean}%"
            query = query.filter(
                or_(
                    WCCRechargeLog.gateway_payment_id.ilike(pattern),
                    WCCRechargeLog.gateway_order_id.ilike(pattern),
                )
            )

        if sort == "asc":
            query = query.order_by(asc(WCCRechargeLog.created_at))
        else:
            query = query.order_by(desc(WCCRechargeLog.created_at))

        total = query.count()
        offset = (page - 1) * limit
        recharges = query.offset(offset).limit(limit).all()

        data = [
            {
                "id": str(r.id),
                "date": r.created_at.isoformat() if r.created_at else None,
                "amount": float(r.amount),
                "currency": r.currency,
                "status": r.status,
                "payment_id": r.gateway_payment_id or r.gateway_order_id or "N/A",
                "gateway_order_id": r.gateway_order_id,
                "gateway_payment_id": r.gateway_payment_id,
                "payment_type": "wallet_recharge",
                "payment_method": getattr(r, 'payment_method', None) or "online",
                "provider": "razorpay",
                "description": f"WhatsApp Wallet Recharge (₹{r.amount})",
                "invoice_available": r.status == "success",
            }
            for r in recharges
        ]

        pages = (total + limit - 1) // limit if limit > 0 else 1

        return {
            "recharges": data,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "pages": max(pages, 1),
            },
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching user WCC recharges: {e}")
        raise _safe_error(e, status_code=500, default="Unable to load recharge history. Please try again.")
