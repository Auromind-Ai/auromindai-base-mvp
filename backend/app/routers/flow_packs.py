import logging
import uuid
from typing import Any, Dict, List
from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.routers.auth import CurrentUser, get_current_user
from app.routers.admin.billing import get_admin_identity
from app.core.security import verify_workspace_access
from app.services.billing.flow_pack_service import FlowPackService
from app.services.billing.entitlement_service import EntitlementService
from app.models.automation import AutomationFlow
from app.models.flow_pack import FlowPack, FlowPackPurchase, PurchaseStatus

router = APIRouter(prefix="/flow-packs", tags=["flow-packs"])
admin_router = APIRouter(prefix="/admin/flow-packs", tags=["admin-flow-packs"])
logger = logging.getLogger(__name__)

class FlowPackPurchaseRequest(BaseModel):
    pack_id: str
    workspace_id: str | None = None
    provider: str = "razorpay"

class FlowPackVerifyRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    workspace_id: str | None = None
    provider: str = "razorpay"

# Pydantic schemas for Admin CRUD
class FlowPackCreateRequest(BaseModel):
    pack_id: str
    name: str
    description: str | None = None
    flows_count: int
    price: float
    currency: str = "INR"
    provider: str = "razorpay"
    is_active: bool = True
    display_order: int = 0
    badge: str | None = None
    extra_metadata: dict | None = None

class FlowPackUpdateRequest(BaseModel):
    pack_id: str | None = None
    name: str | None = None
    description: str | None = None
    flows_count: int | None = None
    price: float | None = None
    currency: str | None = None
    provider: str | None = None
    is_active: bool | None = None
    display_order: int | None = None
    badge: str | None = None
    extra_metadata: dict | None = None

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
            detail="Missing workspace context."
        )

    try:
        uuid.UUID(ws_id)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid workspace_id UUID format: '{ws_id}'"
        )

    return verify_workspace_access(current_user, db, ws_id)

# ----------------- User Routes -----------------

@router.get("/options")
def get_options(
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    service = FlowPackService()
    packs = service.list_options(db)
    # Format response dynamically based on DB catalog fields
    return [
        {
            "id": str(p.id),
            "pack_id": p.pack_id,
            "name": p.name,
            "description": p.description,
            "flows_count": p.flows_count,
            "price": float(p.price),
            "currency": p.currency,
            "badge": p.badge,
            "provider": p.provider
        }
        for p in packs
    ]

@router.post("/purchase/initiate")
def initiate_purchase(
    payload: FlowPackPurchaseRequest,
    workspace_id: str | None = None,
    x_workspace_id: str | None = Header(None),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    try:
        resolved_ws_id = resolve_and_verify_workspace(
            current_user, db, workspace_id, x_workspace_id, payload
        )
        service = FlowPackService()
        return service.initiate_purchase(
            db=db,
            workspace_id=resolved_ws_id,
            user_id=str(current_user.id),
            pack_id=payload.pack_id,
            provider=payload.provider,
        )
    except ValueError as exc:
        logger.error(f"[FLOW PACK INITIATE ERROR] {str(exc)}")
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as e:
        logger.error(f"[FLOW PACK INITIATE ERROR] {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/purchase/verify")
def verify_purchase(
    payload: FlowPackVerifyRequest,
    workspace_id: str | None = None,
    x_workspace_id: str | None = Header(None),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    try:
        resolved_ws_id = resolve_and_verify_workspace(
            current_user, db, workspace_id, x_workspace_id, payload
        )
        service = FlowPackService()
        return service.verify_purchase(
            db=db,
            workspace_id=resolved_ws_id,
            user_id=str(current_user.id),
            order_id=payload.razorpay_order_id,
            payment_id=payload.razorpay_payment_id,
            signature=payload.razorpay_signature,
            provider=payload.provider,
        )
    except ValueError as exc:
        logger.error(f"[FLOW PACK VERIFY ERROR] {str(exc)}")
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as e:
        logger.error(f"[FLOW PACK VERIFY ERROR] {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/quota")
def get_quota(
    workspace_id: str | None = None,
    x_workspace_id: str | None = Header(None),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    try:
        resolved_ws_id = resolve_and_verify_workspace(
            current_user, db, workspace_id, x_workspace_id
        )
        entitlement = EntitlementService.get_workspace_entitlement(db, resolved_ws_id)
        plan_base = getattr(entitlement, "flow", 5)

        purchased = db.query(func.sum(FlowPackPurchase.flows_count)).filter(
            FlowPackPurchase.workspace_id == uuid.UUID(resolved_ws_id),
            FlowPackPurchase.status == PurchaseStatus.SUCCESS.value
        ).scalar() or 0

        total = -1 if plan_base == -1 else (plan_base + purchased)

        used = db.query(AutomationFlow).filter(
            AutomationFlow.workspace_id == uuid.UUID(resolved_ws_id),
            AutomationFlow.status == "Active"
        ).count()

        return {
            "plan_base": plan_base,
            "purchased": purchased,
            "total": total,
            "used": used,
        }
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

# Admin CRUD Routes moved to backend/app/routers/admin/flow_packs.py
