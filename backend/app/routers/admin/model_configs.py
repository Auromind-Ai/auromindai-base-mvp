from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.schemas.admin import ModelConfigCreate, ModelConfigUpdate
from app.services.model_config_service import ModelConfigService
from app.database import  get_db
from anthropic import Anthropic
import google.generativeai as genai
from openai import OpenAI
router = APIRouter(prefix="/model-configs")

@router.get("")
async def get_all_configs(
    active_only: bool = False,
    db: Session = Depends(get_db)
):
    
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

@router.get("/providers/{provider}/models")
async def get_provider_models(provider: str):
    from app.services.config_service import config_service
    
    provider_lower = provider.lower()
    
    # Standard fallback lists
    fallback_models = {
        "openai": ["gpt-4o", "gpt-4o-mini", "o1", "o1-mini", "o3-mini", "gpt-4-turbo"],
        "claude": ["claude-3-5-sonnet-20241022", "claude-3-5-haiku-20241022", "claude-3-opus-20240229", "claude-3-sonnet-20240229"],
        "anthropic": ["claude-3-5-sonnet-20241022", "claude-3-5-haiku-20241022", "claude-3-opus-20240229", "claude-3-sonnet-20240229"],
        "groq": ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "mixtral-8x7b-32768", "gemma2-9b-it"],
        "gemini": ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-2.0-flash-exp"],
        "google": ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-2.0-flash-exp"]
    }
    
    try:
        if provider_lower in ["openai"]:
            key = config_service.get("openai_api_key")
            if key:
               
                client = OpenAI(api_key=key)
                models = client.models.list()
                return {"success": True, "models": [m.id for m in models.data if "gpt" in m.id or "o1" in m.id or "o3" in m.id]}
                
        elif provider_lower in ["claude", "anthropic"]:
            key = config_service.get("anthropic_api_key")
            if key:
                client = Anthropic(api_key=key)
                models = client.models.list()
                return {"success": True, "models": [m.id for m in models.data]}
                
        elif provider_lower in ["groq"]:
            key = config_service.get("groq_api_key")
            if key:
                from groq import Groq
                client = Groq(api_key=key)
                models = client.models.list()
                return {"success": True, "models": [m.id for m in models.data]}
                
        elif provider_lower in ["gemini", "google"]:
            key = config_service.get("google_api_key")
            if key:
                genai.configure(api_key=key)
                models = genai.list_models()
                return {"success": True, "models": [m.name.replace("models/", "") for m in models]}
                
    except Exception as e:
        # Fallback to local known models list on any error (like network or bad key)
        pass
        
    return {
        "success": True,
        "models": fallback_models.get(provider_lower, [])
    }