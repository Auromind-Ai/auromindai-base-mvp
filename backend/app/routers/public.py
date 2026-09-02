from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import Dict, Any
from app.database import get_db
from app.services.platform_settings_service import get_all_settings, get_setting
from app.models.plan import Plan
from app.services.platform_settings_service import get_setting
from app.services.billing.entitlement_service import EntitlementService
    
router = APIRouter(prefix="/public", tags=["public"])

@router.get("/announcement")
async def get_announcement(db: Session = Depends(get_db)) -> Dict[str, Any]:
    
    settings = get_all_settings(db)
    return {
        "enabled": settings.get("announcement_enabled", False),
        "message": settings.get("announcement_message", ""),
    }

@router.get("/about")
async def get_about(db: Session = Depends(get_db)) -> Dict[str, Any]:
    app_name = get_setting(db, "app_name", "Auromind")
    return {
        "platform_version": get_setting(db, "platform_version", "v2.4.1"),
        "release_date": get_setting(db, "release_date", "June 05, 2026"),
        "copyright": get_setting(db, "copyright", f"@2026 {app_name}"),
        "last_updated": get_setting(db, "last_updated", "June 05, 2026, 10:30 AM")
    }

@router.get("/branding")
async def get_branding(db: Session = Depends(get_db)) -> Dict[str, Any]:
    return {
        "app_name": get_setting(db, "app_name", "Orbionagents"),
        "app_logo_url": get_setting(db, "app_logo_url", "/logo.png")
    }

@router.get("/pricing")
async def get_pricing(db: Session = Depends(get_db)) -> Dict[str, Any]:
   
    db_plans = db.query(Plan).filter(Plan.is_active == True).order_by(Plan.display_order.asc(), Plan.created_at.asc()).all()
    
    plans_list = []
    token_limits = {}
    
 

    for plan in db_plans:
        key = plan.name.lower()
        disp_name = plan.display_name or (key.title() if key != "solo" else "Solo Smart")
        tokens = plan.token_limit if plan.token_limit is not None else 1000000
        token_limits[key] = tokens
        
        ent = EntitlementService.ensure_plan_entitlement(db, plan)
        
        plans_list.append({
            "key": key,
            "name": disp_name,
            "display_name": disp_name,
            "monthly_price": plan.monthly_price if plan.monthly_price is not None else 0.0,
            "yearly_price": plan.yearly_price if plan.yearly_price is not None else 0.0,
            "amount": plan.monthly_price if plan.monthly_price is not None else 0.0,
            "description": plan.description or "",
            "features": plan.features or [],
            "token_limit": tokens,
            "credits": float(ent.included_ai_credits if ent else (tokens / 1000)),
            "included_ai_credits": ent.included_ai_credits if ent else int(tokens / 1000),
            "included_wcc_wallet": float(ent.included_wcc_wallet) if ent else 0.0,
            "automation_limit": ent.automation_limit if ent else 0,
            "flow": ent.flow if ent else 0,
            "knowledge_base_limit": ent.knowledge_base_limit if ent else 0,
            "storage_limit_mb": ent.storage_limit_mb if ent else 0,
            "lead_limit": ent.lead_limit if ent else 0,
            "meeting_limit": ent.meeting_limit if ent else 0,
            "gmail_limit": ent.gmail_limit if ent else 0,
            "team_limit": ent.team_limit if ent else 0,
            "allow_ai_topup": ent.allow_ai_topup if ent else False,
            "allow_wcc_recharge": ent.allow_wcc_recharge if ent else False,
            "allow_flow_addon": ent.allow_flow_addon if ent else False,
            "featured": plan.is_featured,
            "is_featured": plan.is_featured,
            "display_order": plan.display_order,
            "currency": plan.currency or "INR",
        })

    plan_map = {p["key"]: p for p in plans_list}

    
    gst_rate = float(get_setting(db, "gst_rate", 18.0))
    gst_enabled = bool(get_setting(db, "gst_enabled", True))
    supplier_state = get_setting(db, "supplier_state", "Tamil Nadu")

    return {
        "plans": plans_list,
        "token_limit_per_plan": token_limits,
        "gst_rate": gst_rate,
        "gst_enabled": gst_enabled,
        "supplier_state": supplier_state,
        
        # Backward compatibility for legacy flat keys
        "free_plan_price":              plan_map.get("free", {}).get("monthly_price", 0.0),
        "solo_plan_price":              plan_map.get("solo", {}).get("monthly_price", 999.0),
        "solo_yearly_plan_price":       plan_map.get("solo", {}).get("yearly_price", 9990.0),
        "pro_plan_price":               plan_map.get("pro", {}).get("monthly_price", 5999.0),
        "pro_yearly_plan_price":        plan_map.get("pro", {}).get("yearly_price", 59990.0),
        "enterprise_plan_price":        plan_map.get("enterprise", {}).get("monthly_price", 24999.0),
        "enterprise_yearly_plan_price": plan_map.get("enterprise", {}).get("yearly_price", 249990.0),
        
        "free_plan_name":         plan_map.get("free", {}).get("name", "Free"),
        "free_plan_desc":         plan_map.get("free", {}).get("description", "Try Orbion Agents for free and see the ROI yourself."),
        "free_plan_features":     plan_map.get("free", {}).get("features", ["1,000 AI Replies", "Basic Workflows", "Meta API Included"]),
        
        "solo_plan_name":         plan_map.get("solo", {}).get("name", "Solo Smart"),
        "solo_plan_desc":         plan_map.get("solo", {}).get("description", "RAG & custom knowledge base on a budget for solopreneurs."),
        "solo_plan_features":     plan_map.get("solo", {}).get("features", ["15,000 AI Replies", "RAG Knowledge Base Enabled", "1 Gmail Integration", "Basic Automations"]),
        
        "pro_plan_name":          plan_map.get("pro", {}).get("name", "Professional"),
        "pro_plan_desc":          plan_map.get("pro", {}).get("description", "Advanced features for growing teams and scalable workflows."),
        "pro_plan_features":      plan_map.get("pro", {}).get("features", ["100,000 AI Replies", "Advanced Workflows + RAG", "Priority Support", "Full Analytics"]),
        
        "enterprise_plan_name":   plan_map.get("enterprise", {}).get("name", "Business"),
        "enterprise_plan_desc":   plan_map.get("enterprise", {}).get("description", "Perfect for businesses starting with AI automation at scale."),
        "enterprise_plan_features": plan_map.get("enterprise", {}).get("features", ["500,000 AI Replies", "Dedicated Manager", "Custom API Access", "On-premise Options", "Global SLA"]),
    }
 