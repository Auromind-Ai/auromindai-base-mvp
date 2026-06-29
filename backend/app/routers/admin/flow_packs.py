import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.routers.admin.billing import get_admin_identity, log_audit
from app.models.flow_pack import FlowPack

router = APIRouter(prefix="/flow-packs", tags=["admin-flow-packs"])


@router.get("")
async def get_flow_packs_admin(
    db: Session = Depends(get_db),
    admin_user: str = Depends(get_admin_identity)
):
    packs = db.query(FlowPack).order_by(FlowPack.display_order.asc()).all()
    return [
        {
            "id": str(pack.id),
            "pack_id": pack.pack_id,
            "name": pack.name,
            "flows_count": pack.flows_count,
            "price": float(pack.price),
            "currency": pack.currency,
            "is_active": pack.is_active,
            "display_order": pack.display_order,
            "created_at": pack.created_at.isoformat() if pack.created_at else None
        }
        for pack in packs
    ]


class FlowPackCreateRequest(BaseModel):
    pack_id: str
    name: str
    flows_count: int
    price: float
    currency: str = "INR"
    display_order: int = 0
    is_active: bool = True


@router.post("")
async def create_flow_pack_admin(
    payload: FlowPackCreateRequest,
    db: Session = Depends(get_db),
    admin_user: str = Depends(get_admin_identity),
    request: Request = None
):
    existing = db.query(FlowPack).filter(FlowPack.pack_id == payload.pack_id).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Flow pack with ID '{payload.pack_id}' already exists"
        )
        
    pack = FlowPack(
        pack_id=payload.pack_id,
        name=payload.name,
        flows_count=payload.flows_count,
        price=payload.price,
        currency=payload.currency,
        display_order=payload.display_order,
        is_active=payload.is_active
    )
    db.add(pack)
    db.commit()
    db.refresh(pack)
    
    log_audit(
        db=db,
        admin_user=admin_user,
        action="FLOW_PACK_CREATED",
        workspace_id=None,
        old_value=None,
        new_value=payload.dict(),
        reason="Admin Created Flow Pack",
        request=request
    )
    return {"message": "Flow pack created successfully", "pack_id": pack.pack_id}


class FlowPackUpdateRequest(BaseModel):
    name: Optional[str] = None
    flows_count: Optional[int] = None
    price: Optional[float] = None
    currency: Optional[str] = None
    display_order: Optional[int] = None
    is_active: Optional[bool] = None


@router.patch("/{id}")
async def update_flow_pack_admin(
    id: uuid.UUID,
    payload: FlowPackUpdateRequest,
    db: Session = Depends(get_db),
    admin_user: str = Depends(get_admin_identity),
    request: Request = None
):
    pack = db.query(FlowPack).filter(FlowPack.id == id).first()
    if not pack:
        raise HTTPException(status_code=404, detail="Flow pack not found")
        
    old_val = {
        "name": pack.name,
        "flows_count": pack.flows_count,
        "price": float(pack.price) if pack.price is not None else None,
        "currency": pack.currency,
        "display_order": pack.display_order,
        "is_active": pack.is_active
    }
    
    update_data = payload.dict(exclude_unset=True)
    for key, val in update_data.items():
        setattr(pack, key, val)
        
    db.commit()
    db.refresh(pack)
    
    new_val = {
        "name": pack.name,
        "flows_count": pack.flows_count,
        "price": float(pack.price) if pack.price is not None else None,
        "currency": pack.currency,
        "display_order": pack.display_order,
        "is_active": pack.is_active
    }
    
    log_audit(
        db=db,
        admin_user=admin_user,
        action="FLOW_PACK_UPDATED",
        workspace_id=None,
        old_value=old_val,
        new_value=new_val,
        reason="Admin Updated Flow Pack",
        request=request
    )
    return {"message": "Flow pack updated successfully"}


@router.delete("/{id}")
async def delete_flow_pack_admin(
    id: uuid.UUID,
    db: Session = Depends(get_db),
    admin_user: str = Depends(get_admin_identity),
    request: Request = None
):
    pack = db.query(FlowPack).filter(FlowPack.id == id).first()
    if not pack:
        raise HTTPException(status_code=404, detail="Flow pack not found")
        
    old_val = {"pack_id": pack.pack_id, "name": pack.name}
    db.delete(pack)
    db.commit()
    
    log_audit(
        db=db,
        admin_user=admin_user,
        action="FLOW_PACK_DELETED",
        workspace_id=None,
        old_value=old_val,
        new_value=None,
        reason="Admin Deleted Flow Pack",
        request=request
    )
    return {"message": "Flow pack deleted successfully"}
