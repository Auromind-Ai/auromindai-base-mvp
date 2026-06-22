from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from app.database import get_db
from app.models.feature_billing_rule import FeatureBillingRule
from app.schemas.feature_billing_rule import (
    FeatureBillingRuleCreate,
    FeatureBillingRuleUpdate,
    FeatureBillingRuleResponse
)
from app.services.billing.feature_billing_service import FeatureBillingService

router = APIRouter(prefix="/feature-rules", tags=["Admin Feature Billing Rules"])


@router.get("", response_model=List[FeatureBillingRuleResponse])
def list_rules(db: Session = Depends(get_db)):
    """Retrieve all feature billing rules."""
    try:
        return FeatureBillingService.list_rules(db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{id}", response_model=FeatureBillingRuleResponse)
def get_rule(id: UUID, db: Session = Depends(get_db)):
    """Fetch specific feature billing rule by ID."""
    rule = db.query(FeatureBillingRule).filter(FeatureBillingRule.id == id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Feature billing rule not found")
    return rule


@router.post("", response_model=FeatureBillingRuleResponse, status_code=status.HTTP_201_CREATED)
def create_rule(payload: FeatureBillingRuleCreate, db: Session = Depends(get_db)):
    """Create a new feature billing rule."""
    # Check unique constraint on feature_key
    existing = db.query(FeatureBillingRule).filter(FeatureBillingRule.feature_key == payload.feature_key).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Billing rule for feature key '{payload.feature_key}' already exists")

    try:
        rule = FeatureBillingRule(**payload.dict())
        FeatureBillingService.validate_rule(rule)
        db.add(rule)
        db.commit()
        db.refresh(rule)
        return rule
    except ValueError as val_err:
        raise HTTPException(status_code=400, detail=str(val_err))
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{id}", response_model=FeatureBillingRuleResponse)
def update_rule(id: UUID, payload: FeatureBillingRuleUpdate, db: Session = Depends(get_db)):
    """Update existing feature billing rule configurations."""
    rule = db.query(FeatureBillingRule).filter(FeatureBillingRule.id == id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Feature billing rule not found")

    try:
        update_data = payload.dict(exclude_unset=True)
        for key, val in update_data.items():
            setattr(rule, key, val)
        FeatureBillingService.validate_rule(rule)
        db.commit()
        db.refresh(rule)
        return rule
    except ValueError as val_err:
        raise HTTPException(status_code=400, detail=str(val_err))
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_rule(id: UUID, db: Session = Depends(get_db)):
    """Remove a feature billing rule configuration."""
    rule = db.query(FeatureBillingRule).filter(FeatureBillingRule.id == id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Feature billing rule not found")

    try:
        db.delete(rule)
        db.commit()
        return None
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
