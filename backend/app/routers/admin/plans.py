import logging
from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.plan import Plan
from app.models.plan_entitlement import PlanEntitlement
from app.schemas.plan import PlanCreate, PlanUpdate, PlanResponse
import uuid

router = APIRouter(prefix="/plans", tags=["Admin Plans"])
logger = logging.getLogger(__name__)


@router.get("", response_model=List[PlanResponse])
def list_plans(db: Session = Depends(get_db)):
    """Retrieve all plans ordered by display_order."""
    try:
        plans = db.query(Plan).order_by(Plan.display_order.asc(), Plan.created_at.asc()).all()
        return plans
    except Exception as e:
        logger.error(f"[ADMIN PLANS] Error listing plans: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error listing plans: {str(e)}")


@router.post("", response_model=PlanResponse, status_code=status.HTTP_201_CREATED)
def create_plan(payload: PlanCreate, db: Session = Depends(get_db)):
    """Create a new plan and automatically provision safe default entitlements."""
    plan_key = payload.name.lower().strip()
    
    # Check if plan already exists
    existing = db.query(Plan).filter(Plan.name == plan_key).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Plan with key '{plan_key}' already exists.")

    try:
        display_name = payload.display_name or payload.name.title()
        
        # 1. Create the Plan row
        new_plan = Plan(
            id=uuid.uuid4(),
            name=plan_key,
            display_name=display_name,
            price=payload.monthly_price,
            monthly_price=payload.monthly_price,
            yearly_price=payload.yearly_price,
            description=payload.description or "",
            features=payload.features or [],
            display_order=payload.display_order,
            is_featured=payload.is_featured,
            is_active=payload.is_active,
            currency=payload.currency or "INR",
            token_limit=payload.token_limit or 1000000,
        )
        db.add(new_plan)
        db.flush()

        # 2. Automatically create safe default PlanEntitlement if not exists
        from app.services.billing.entitlement_service import EntitlementService
        EntitlementService.ensure_plan_entitlement(db, new_plan)
        db.commit()
        db.refresh(new_plan)
        return new_plan
    except Exception as e:
        db.rollback()
        logger.error(f"[ADMIN PLANS] Error creating plan: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error creating plan: {str(e)}")


@router.put("/{id}", response_model=PlanResponse)
def update_plan(id: UUID, payload: PlanUpdate, db: Session = Depends(get_db)):
    """Atomically update existing plan pricing, description, features, and entitlements."""
    plan = db.query(Plan).filter(Plan.id == id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    try:
        update_data = payload.dict(exclude_unset=True)
        if "monthly_price" in update_data and update_data["monthly_price"] is not None:
            plan.monthly_price = float(update_data["monthly_price"])
            plan.price = float(update_data["monthly_price"])
        if "yearly_price" in update_data and update_data["yearly_price"] is not None:
            plan.yearly_price = float(update_data["yearly_price"])
        if "display_name" in update_data and update_data["display_name"] is not None:
            plan.display_name = update_data["display_name"]
        if "description" in update_data and update_data["description"] is not None:
            plan.description = update_data["description"]
        if "features" in update_data and update_data["features"] is not None:
            plan.features = update_data["features"]
        if "display_order" in update_data and update_data["display_order"] is not None:
            plan.display_order = update_data["display_order"]
        if "is_featured" in update_data and update_data["is_featured"] is not None:
            plan.is_featured = update_data["is_featured"]
        if "is_active" in update_data and update_data["is_active"] is not None:
            plan.is_active = update_data["is_active"]
        if "token_limit" in update_data and update_data["token_limit"] is not None:
            plan.token_limit = update_data["token_limit"]

        # Atomic PlanEntitlement field sync if provided in payload
        from app.models.plan_entitlement import PlanEntitlement
        entitlement = db.query(PlanEntitlement).filter(PlanEntitlement.plan_id == id).first()
        if entitlement:
            ent_fields = ["included_ai_credits", "team_limit", "knowledge_base_limit", "storage_limit_mb", "gmail_limit", "lead_limit", "automation_limit"]
            for field in ent_fields:
                if field in update_data and update_data[field] is not None:
                    setattr(entitlement, field, update_data[field])

        db.commit()
        db.refresh(plan)

        from app.services.platform_settings_service import clear_settings_cache
        clear_settings_cache()

        return plan
    except Exception as e:
        db.rollback()
        logger.error(f"[ADMIN PLANS] Error updating plan {id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error updating plan: {str(e)}")


@router.delete("/{id}")
def delete_plan(id: UUID, db: Session = Depends(get_db)):
    """Delete a plan and its entitlements. Blocked with 409 Conflict if active subscriptions exist."""
    plan = db.query(Plan).filter(Plan.id == id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    try:
        from app.models.subscription import Subscription
        active_sub = db.query(Subscription).filter(
            Subscription.plan_id == id,
            Subscription.status.in_(["active", "pending"])
        ).first()

        if active_sub:
            raise HTTPException(
                status_code=409,
                detail=f"Cannot delete plan '{plan.display_name or plan.name}' because active or pending subscriptions exist."
            )

        from app.models.plan_entitlement import PlanEntitlement
        db.query(PlanEntitlement).filter(PlanEntitlement.plan_id == id).delete()
        db.delete(plan)
        db.commit()

        from app.services.platform_settings_service import clear_settings_cache
        clear_settings_cache()

        return {"success": True, "message": f"Plan '{plan.display_name or plan.name}' and its entitlements deleted successfully."}
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[ADMIN PLANS] Error deleting plan {id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
