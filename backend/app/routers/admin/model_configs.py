
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.schemas.admin import ModelConfigCreate, ModelConfigUpdate
from app.services.model_config_service import ModelConfigService

router = APIRouter(prefix="/model-configs")



# Dependency to get database session (replace with your actual DB session)
def get_db():
    # TODO: Replace with your actual database session logic
    from app.database import SessionLocal
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("")
async def get_all_configs(
    active_only: bool = False,
    db: Session = Depends(get_db)
):
    """
    Get all model configurations
    Query params:
    - active_only: if True, return only active configurations
    """
    try:
        service = ModelConfigService(db)
        configs = service.get_all_configs(active_only=active_only)
        return {
            "success": True,
            "count": len(configs),
            "data": configs
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching configurations: {str(e)}"
        )

@router.get("/name/{config_name}")
async def get_config_by_name(
    config_name: str,
    db: Session = Depends(get_db)
):
    """Get a specific model configuration by name"""
    try:
        service = ModelConfigService(db)
        config = service.get_config_by_name(config_name)
        
        if not config:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Configuration '{config_name}' not found"
            )
        
        return {
            "success": True,
            "data": config
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching configuration: {str(e)}"
        )



@router.get("/{config_id}")
async def get_config_by_id(
    config_id: int,
    db: Session = Depends(get_db)
):
    """Get a specific model configuration by ID"""
    try:
        service = ModelConfigService(db)
        config = service.get_config_by_id(config_id)
        
        if not config:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Configuration with ID {config_id} not found"
            )
        
        return {
            "success": True,
            "data": config
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching configuration: {str(e)}"
        )
    
@router.post("", status_code=status.HTTP_201_CREATED)
async def create_config(
    config: ModelConfigCreate,
    db: Session = Depends(get_db)
):
    """Create a new model configuration"""
    try:
        service = ModelConfigService(db)
        new_config = service.create_config(config.dict())
        
        return {
            "success": True,
            "message": "Configuration created successfully",
            "data": new_config
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating configuration: {str(e)}"
        )

@router.put("/{config_id}")
async def update_config(
    config_id: int,
    config: ModelConfigUpdate,
    db: Session = Depends(get_db)
):
    """Update an existing model configuration"""
    try:
        service = ModelConfigService(db)
        # Only include non-None values in the update
        update_data = {k: v for k, v in config.dict().items() if v is not None}
        
        updated_config = service.update_config(config_id, update_data)
        
        return {
            "success": True,
            "message": "Configuration updated successfully",
            "data": updated_config
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating configuration: {str(e)}"
        )

@router.delete("/{config_id}")
async def delete_config(
    config_id: int,
    db: Session = Depends(get_db)
):
    """Delete a model configuration"""
    try:
        service = ModelConfigService(db)
        service.delete_config(config_id)
        
        return {
            "success": True,
            "message": "Configuration deleted successfully"
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting configuration: {str(e)}"
        )

@router.patch("/{config_id}/toggle")
async def toggle_config_status(
    config_id: int,
    db: Session = Depends(get_db)
):
    """Toggle the active status of a model configuration"""
    try:
        service = ModelConfigService(db)
        updated_config = service.toggle_active_status(config_id)
        
        return {
            "success": True,
            "message": f"Configuration {'activated' if updated_config['is_active'] else 'deactivated'} successfully",
            "data": updated_config
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error toggling configuration status: {str(e)}"
        )

@router.post("/seed")
async def seed_default_configs(db: Session = Depends(get_db)):
    """Seed database with default model configurations"""
    try:
        service = ModelConfigService(db)
        service.seed_default_configs()
        
        return {
            "success": True,
            "message": "Default configurations seeded successfully"
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error seeding configurations: {str(e)}"
        )