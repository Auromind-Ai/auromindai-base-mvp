from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from app.database import get_db
from app.models.plan_entitlement import PlanEntitlement
from app.models.plan import Plan
from app.schemas.plan_entitlement import (
    PlanEntitlementCreate,
    PlanEntitlementUpdate,
    PlanEntitlementResponse
)
from app.services.billing.entitlement_service import EntitlementService

router = APIRouter(prefix="/entitlements", tags=["Admin Entitlements"])


@router.post("/seed", status_code=status.HTTP_200_OK)
def seed_entitlements(db: Session = Depends(get_db)):
    """Seed default entitlements for all plans in the database."""
    try:
        return EntitlementService.seed_default_entitlements(db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("", response_model=List[PlanEntitlementResponse])
def list_entitlements(db: Session = Depends(get_db)):
    """Retrieve all plan entitlements with plan names joined."""
    entitlements = db.query(PlanEntitlement).all()
    results = []
    for ent in entitlements:
        plan = db.query(Plan).filter(Plan.id == ent.plan_id).first()
        res = PlanEntitlementResponse.from_orm(ent)
        res.plan_name = plan.name if plan else "unknown"
        results.append(res)
    return results


@router.get("/{id}", response_model=PlanEntitlementResponse)
def get_entitlement(id: UUID, db: Session = Depends(get_db)):
    """Fetch specific plan entitlement configuration by ID."""
    ent = db.query(PlanEntitlement).filter(PlanEntitlement.id == id).first()
    if not ent:
        raise HTTPException(status_code=404, detail="Plan entitlement not found")
    plan = db.query(Plan).filter(Plan.id == ent.plan_id).first()
    res = PlanEntitlementResponse.from_orm(ent)
    res.plan_name = plan.name if plan else "unknown"
    return res


@router.post("", response_model=PlanEntitlementResponse, status_code=status.HTTP_201_CREATED)
def create_entitlement(payload: PlanEntitlementCreate, db: Session = Depends(get_db)):
    """Create a new plan entitlement mapping."""
    # Check if plan exists
    plan = db.query(Plan).filter(Plan.id == payload.plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail=f"Plan with ID {payload.plan_id} not found")

    # Check unique constraint
    existing = db.query(PlanEntitlement).filter(PlanEntitlement.plan_id == payload.plan_id).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Entitlement for plan {plan.name} already exists")

    try:
        ent = PlanEntitlement(**payload.dict())
        db.add(ent)
        db.commit()
        db.refresh(ent)
        res = PlanEntitlementResponse.from_orm(ent)
        res.plan_name = plan.name
        return res
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{id}", response_model=PlanEntitlementResponse)
def update_entitlement(id: UUID, payload: PlanEntitlementUpdate, db: Session = Depends(get_db)):
    """Update existing plan entitlement configurations."""
    ent = db.query(PlanEntitlement).filter(PlanEntitlement.id == id).first()
    if not ent:
        raise HTTPException(status_code=404, detail="Plan entitlement not found")

    try:
        update_data = payload.dict(exclude_unset=True)
        for key, val in update_data.items():
            setattr(ent, key, val)
        db.commit()
        db.refresh(ent)
        plan = db.query(Plan).filter(Plan.id == ent.plan_id).first()
        res = PlanEntitlementResponse.from_orm(ent)
        res.plan_name = plan.name if plan else "unknown"
        return res
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_entitlement(id: UUID, db: Session = Depends(get_db)):
    """Remove a plan entitlement config mapping."""
    ent = db.query(PlanEntitlement).filter(PlanEntitlement.id == id).first()
    if not ent:
        raise HTTPException(status_code=404, detail="Plan entitlement not found")

    try:
        db.delete(ent)
        db.commit()
        return None
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
