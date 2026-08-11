import logging
import uuid
from fastapi import APIRouter, Depends, Header, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database import get_db
from fastapi.responses import Response
from app.models.invoice import Invoice
from app.services.storage.service import get_storage

class CreditsPurchaseRequest(BaseModel):
    pack_id: str
    workspace_id: str | None = None
    provider: str = "razorpay"


class CreditsVerifyRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    workspace_id: str | None = None
    provider: str = "razorpay"


class UnifiedBillingItem(BaseModel):
    id: str
    date: str
    amount: float
    status: str
    payment_id: str | None = None
    payment_type: str
    payment_method: str | None = None
    provider: str
    description: str
    invoice_available: bool
    invoice_number: str | None = None
    pdf_url: str | None = None
    taxable_amount: float | None = None
    gst_amount: float | None = None
    total_amount: float | None = None


class UnifiedBillingResponse(BaseModel):
    payments: list[UnifiedBillingItem]
    pagination: dict[str, int]


class UpdateBillingProfileRequest(BaseModel):
    billing_name: str | None = None
    billing_contact_name: str | None = None
    billing_email: str | None = None
    billing_phone: str | None = None
    billing_address: str | None = None
    billing_city: str | None = None
    billing_state: str | None = None
    billing_country: str | None = None
    billing_postal_code: str | None = None
    has_gst_registration: bool | None = None
    billing_gstin: str | None = None
    legal_business_name: str | None = None
    business_type: str | None = None


from app.routers.auth import CurrentUser, get_current_user
from app.services.billing import BillingService
from app.schemas import (
    CreateSubscriptionRequest,
    VerifyPaymentRequest,
    PlanEntitlementResponse,
    FeatureBillingRuleResponse,
    EntitlementCheckRequest,
    EntitlementCheckResponse
)
from app.core.security import verify_workspace_access

from typing import Any
router = APIRouter(prefix="/billing", tags=["billing"])
logger = logging.getLogger(__name__)


def get_billing_service() -> BillingService:
    return BillingService()


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


@router.post("/create-subscription")
def create_subscription(
    payload: CreateSubscriptionRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
    workspace_id: str | None = None,
    x_workspace_id: str | None = Header(None),
):
    try:
        resolved_ws_id = resolve_and_verify_workspace(
            current_user, db, workspace_id, x_workspace_id, payload
        )
        logger.info(f"[SUBSCRIPTION] user={current_user.email} workspace={resolved_ws_id} plan={payload.plan}")

        service = get_billing_service()
        return service.create_subscription(
            db=db,
            workspace_id=resolved_ws_id,
            user_id=str(current_user.id),
            user_email=current_user.email,
            user_name=current_user.full_name,
            plan_key=payload.plan,
            billing_cycle=getattr(payload, "billing_cycle", "monthly") or "monthly",
            provider=payload.provider,
        )

    except ValueError as exc:
        logger.error(f"[SUBSCRIPTION ERROR] {str(exc)}")
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/verify-payment")
def verify_payment(
    payload: VerifyPaymentRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
    workspace_id: str | None = None,
    x_workspace_id: str | None = Header(None),
):
    try:
        resolved_ws_id = resolve_and_verify_workspace(
            current_user, db, workspace_id, x_workspace_id, payload
        )
        logger.info(f"[PAYMENT VERIFY] user={current_user.email} workspace={resolved_ws_id} provider={payload.provider}")

        service = get_billing_service()
        return service.verify_payment(
            db=db,
            workspace_id=resolved_ws_id,
            user_id=str(current_user.id),
            plan_key=payload.plan,
            billing_cycle=getattr(payload, "billing_cycle", "monthly") or "monthly",
            provider=payload.provider,
            subscription_id=payload.subscription_id,
            payment_id=payload.payment_id,
            signature=payload.signature,
        )

    except ValueError as exc:
        logger.error(f"[PAYMENT VERIFY ERROR] {str(exc)}")
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/webhook/razorpay")
async def razorpay_webhook(
    request: Request,
    x_razorpay_signature: str = Header(...),
    db: Session = Depends(get_db),
):
    body = await request.body()

    try:
        if not x_razorpay_signature:
            logger.warning("[RAZORPAY WEBHOOK] Missing signature")
            raise HTTPException(status_code=400, detail="Missing signature")

        logger.info("[RAZORPAY WEBHOOK] Received")

        service = get_billing_service()
        return service.handle_webhook(
            db=db,
            body=body,
            signature=x_razorpay_signature,
            provider="razorpay",
        )

    except ValueError as exc:
        logger.error(f"[RAZORPAY WEBHOOK ERROR] {str(exc)}")
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/webhook/payu")
async def payu_webhook(
    request: Request,
    x_payu_signature: str = Header(...),
    db: Session = Depends(get_db),
):
    body = await request.body()

    try:
        logger.info("[PAYU WEBHOOK] Received")

        service = get_billing_service()
        return service.handle_webhook(
            db=db,
            body=body,
            signature=x_payu_signature,
            provider="payu",
        )

    except ValueError as exc:
        logger.error(f"[PAYU WEBHOOK ERROR] {str(exc)}")
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("/status")
def get_billing_status(
    workspace_id: str | None = None,
    x_workspace_id: str | None = Header(None),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    try:
        resolved_ws_id = resolve_and_verify_workspace(
            current_user, db, workspace_id, x_workspace_id
        )
        logger.info(f"[STATUS] user={current_user.email} workspace={resolved_ws_id}")

        service = get_billing_service()
        return service.get_status(
            db=db,
            workspace_id=resolved_ws_id,
            user_id=str(current_user.id),
        )

    except ValueError as exc:
        logger.error(f"[STATUS ERROR] {str(exc)}")
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("/usage")
def get_usage(
    workspace_id: str | None = None,
    x_workspace_id: str | None = Header(None),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    resolved_ws_id = resolve_and_verify_workspace(
        current_user, db, workspace_id, x_workspace_id
    )
    logger.info(f"[USAGE] user={current_user.email} workspace={resolved_ws_id}")

    status = get_billing_status(
        workspace_id=resolved_ws_id,
         x_workspace_id=None,
        db=db,
        current_user=current_user,
    )

    return {
        "token_limit": status["token_limit"],
        "tokens_used": status["tokens_used"],
        "tokens_remaining": status["tokens_remaining"],
        "percent_used": status["percent_used"],
        "overage_tokens": status["overage_tokens"],
        "estimated_overage_cost": status["estimated_overage_cost"],
    }


@router.get("/plan")
def get_plan(
    workspace_id: str | None = None,
    x_workspace_id: str | None = Header(None),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    resolved_ws_id = resolve_and_verify_workspace(
        current_user, db, workspace_id, x_workspace_id
    )
    logger.info(f"[PLAN] user={current_user.email} workspace={resolved_ws_id}")

    status = get_billing_status(
        workspace_id=resolved_ws_id,
        x_workspace_id=None,
        db=db,
        current_user=current_user,
    )

    return {
        "plan_type": status["current_plan"],
        "subscription_status": status["billing_status"],
        "token_limit": status["token_limit"],
        "tokens_remaining": status["tokens_remaining"],
    }


@router.get("/credits/summary")
@router.get("/credit-summary")
def get_credit_summary(
    workspace_id: str | None = None,
    x_workspace_id: str | None = Header(None),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    try:
        resolved_ws_id = resolve_and_verify_workspace(
            current_user, db, workspace_id, x_workspace_id
        )
        service = get_billing_service()
        return service.get_credit_summary(
            db=db,
            workspace_id=resolved_ws_id,
            user_id=str(current_user.id),
        )
    except ValueError as exc:
        logger.error(f"[CREDITS SUMMARY ERROR] {str(exc)}")
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("/credits/history")
def get_credit_history(
    page: int = 1,
    limit: int = 20,
    workspace_id: str | None = None,
    x_workspace_id: str | None = Header(None),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    try:
        resolved_ws_id = resolve_and_verify_workspace(
            current_user, db, workspace_id, x_workspace_id
        )
        service = get_billing_service()
        return service.get_credit_history(
            db=db,
            workspace_id=resolved_ws_id,
            user_id=str(current_user.id),
            page=page,
            limit=limit,
        )
    except ValueError as exc:
        logger.error(f"[CREDITS HISTORY ERROR] {str(exc)}")
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/credits/purchase")
def purchase_credit_pack(
    payload: CreditsPurchaseRequest,
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
        import uuid
        ent = EntitlementService.get_workspace_entitlement(db, uuid.UUID(resolved_ws_id))
        if not ent.allow_ai_topup:
            raise HTTPException(
                status_code=403,
                detail="AI Credit top-up is not available for your current plan. Please upgrade to Pro."
            )
        service = get_billing_service()
        return service.initiate_credit_pack_purchase(
            db=db,
            workspace_id=resolved_ws_id,
            user_id=str(current_user.id),
            pack_id=payload.pack_id,
            provider=payload.provider,
        )
    except ValueError as exc:
        logger.error(f"[CREDITS PURCHASE ERROR] {str(exc)}")
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as e:
        logger.error(f"[CREDITS PURCHASE ERROR] {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/credits/verify")
def verify_credit_pack(
    payload: CreditsVerifyRequest,
    workspace_id: str | None = None,
    x_workspace_id: str | None = Header(None),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    try:
        resolved_ws_id = resolve_and_verify_workspace(
            current_user, db, workspace_id, x_workspace_id, payload
        )
        service = get_billing_service()
        return service.verify_credit_pack_payment(
            db=db,
            workspace_id=resolved_ws_id,
            user_id=str(current_user.id),
            order_id=payload.razorpay_order_id,
            payment_id=payload.razorpay_payment_id,
            signature=payload.razorpay_signature,
            provider=payload.provider,
        )
    except ValueError as exc:
        logger.error(f"[CREDITS VERIFY ERROR] {str(exc)}")
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as e:
        logger.error(f"[CREDITS VERIFY ERROR] {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/credits/daily-usage")
def get_daily_usage(
    days: int = 30,
    workspace_id: str | None = None,
    x_workspace_id: str | None = Header(None),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    try:
        resolved_ws_id = resolve_and_verify_workspace(
            current_user, db, workspace_id, x_workspace_id
        )
        service = get_billing_service()
        return service.token_service.get_daily_usage(db, resolved_ws_id, days)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("/credits/packs")
def list_credit_packs(
    workspace_id: str | None = None,
    x_workspace_id: str | None = Header(None),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    try:
        resolved_ws_id = resolve_and_verify_workspace(
            current_user, db, workspace_id, x_workspace_id
        )
        service = get_billing_service()
        return service.list_credit_packs(
            db=db,
            workspace_id=resolved_ws_id,
            user_id=str(current_user.id),
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("/entitlements", response_model=PlanEntitlementResponse)
def get_workspace_entitlements(
    workspace_id: str | None = None,
    x_workspace_id: str | None = Header(None),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    try:
        from app.services.billing.entitlement_service import EntitlementService
        from app.models.plan import Plan
        import uuid
        resolved_ws_id = resolve_and_verify_workspace(
            current_user, db, workspace_id, x_workspace_id
        )
        ws_uuid = uuid.UUID(resolved_ws_id)
        ent = EntitlementService.get_workspace_entitlement(db, ws_uuid)
        plan = db.query(Plan).filter(Plan.id == ent.plan_id).first()
        res = PlanEntitlementResponse.from_orm(ent)
        res.plan_name = plan.name if plan else "unknown"
        return res
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/feature-rules", response_model=list[FeatureBillingRuleResponse])
def list_active_rules(
    workspace_id: str | None = None,
    x_workspace_id: str | None = Header(None),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    try:
        from app.services.billing.feature_billing_service import FeatureBillingService
        resolve_and_verify_workspace(
            current_user, db, workspace_id, x_workspace_id
        )
        return FeatureBillingService.list_rules(db)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/entitlements/check")
def check_workspace_entitlement(
    resource: str,
    value: int = 1,
    workspace_id: str | None = None,
    x_workspace_id: str | None = Header(None),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    try:
        from app.services.billing.entitlement_service import EntitlementService
        import uuid
        resolved_ws_id = resolve_and_verify_workspace(
            current_user, db, workspace_id, x_workspace_id
        )
        ws_uuid = uuid.UUID(resolved_ws_id)
        res_dict = EntitlementService.check_entitlement(
            db, ws_uuid, resource, value
        )
        return {
            "workspace_id": resolved_ws_id,
            "resource": resource,
            "within_limit": res_dict["allowed"],
            "current_usage": res_dict["current"],
            "limit": res_dict["limit"],
        }
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/entitlements/check", response_model=EntitlementCheckResponse)
def check_workspace_entitlement_post(
    payload: EntitlementCheckRequest,
    workspace_id: str | None = None,
    x_workspace_id: str | None = Header(None),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    try:
        from app.services.billing.entitlement_service import EntitlementService
        import uuid
        resolved_ws_id = resolve_and_verify_workspace(
            current_user, db, workspace_id, x_workspace_id, payload
        )
        ws_uuid = uuid.UUID(resolved_ws_id)
        return EntitlementService.check_entitlement(
            db, ws_uuid, payload.resource, payload.value
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/invoices", response_model=UnifiedBillingResponse)
def get_user_invoices(
    page: int = 1,
    limit: int = 10,
    search: str | None = None,
    type: str | None = None,
    sort: str = "desc",
    workspace_id: str | None = None,
    x_workspace_id: str | None = Header(None),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    try:
        import uuid
        from sqlalchemy import or_
        from app.models.invoice import Invoice
        from app.core.enums import InvoiceStatus

        resolved_ws_id = resolve_and_verify_workspace(
            current_user, db, workspace_id, x_workspace_id
        )
        ws_uuid = uuid.UUID(resolved_ws_id)

        invoice_query = db.query(Invoice).filter(Invoice.workspace_id == ws_uuid)

        if search:
            search_pattern = f"%{search.strip()}%"
            invoice_query = invoice_query.filter(
                or_(
                    Invoice.invoice_number.ilike(search_pattern),
                    Invoice.customer_name.ilike(search_pattern),
                    Invoice.product_type.ilike(search_pattern),
                )
            )

        if type:
            if type == "subscription":
                invoice_query = invoice_query.filter(Invoice.product_type == "subscription")
            elif type == "ai_credit_recharge":
                invoice_query = invoice_query.filter(Invoice.product_type == "ai_credits")
            elif type == "flow_packs":
                invoice_query = invoice_query.filter(Invoice.product_type == "flow_packs")
            elif type == "wallet_recharge":
                invoice_query = invoice_query.filter(Invoice.product_type == "wcc_recharge")
            elif type == "credit_note":
                invoice_query = invoice_query.filter(Invoice.invoice_type == "credit_note")

        if sort == "asc":
            invoice_query = invoice_query.order_by(Invoice.issued_at.asc())
        else:
            invoice_query = invoice_query.order_by(Invoice.issued_at.desc())

        total = invoice_query.count()
        offset = (page - 1) * limit
        invoices = invoice_query.offset(offset).limit(limit).all()
        items = []

        desc_mapping = {
            "subscription": "Auromind SaaS Platform Subscription",
            "ai_credits": "AI Token Credit Pack Recharge",
            "flow_packs": "AI Automation Flow Pack",
            "wcc_recharge": "WhatsApp Conversation Cloud Wallet Recharge"
        }

        for inv in invoices:
            desc = desc_mapping.get(inv.product_type, f"Auromind Purchase ({inv.product_type})")
            if inv.invoice_type == "credit_note":
                desc = f"Refund Credit Note - {desc}"

            items.append({
                "id": str(inv.id),
                "date": inv.issued_at.isoformat() if inv.issued_at else "N/A",
                "amount": float(inv.total_amount or 0.0),
                "status": inv.status.value.upper() if hasattr(inv.status, "value") else str(inv.status).upper(),
                "payment_id": inv.invoice_number,
                "payment_type": inv.product_type or "subscription",
                "payment_method": "payment_gateway",
                "provider": "razorpay",
                "description": desc,
                "invoice_available": bool(inv.pdf_url),
                "invoice_number": inv.invoice_number,
                "pdf_url": inv.pdf_url,
                "taxable_amount": float(inv.taxable_amount or 0.0),
                "gst_amount": float(inv.gst_amount or 0.0),
                "total_amount": float(inv.total_amount or 0.0)
            })

        pages = (total + limit - 1) // limit if limit > 0 else 1

        return {
            "payments": items,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "pages": max(pages, 1),
            },
        }
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as e:
        logger.error(f"[INVOICES ERROR] {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/invoices/{invoice_id}/download")
def download_invoice(
    invoice_id: str,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    
    try:
        inv_uuid = uuid.UUID(invoice_id)
        invoice = db.query(Invoice).filter(Invoice.id == inv_uuid).first()
        if not invoice:
            raise HTTPException(status_code=404, detail="Invoice not found")

        # Verify workspace access
        verify_workspace_access(current_user, db, str(invoice.workspace_id))

        if not invoice.pdf_url:
            raise HTTPException(status_code=404, detail="Invoice PDF not generated yet")

        # Reconstruct canonical file path from invoice ID — never trust pdf_url directly
        file_path = f"invoices/{invoice.id}.pdf"
        safe_name = (invoice.invoice_number or str(invoice.id)).replace("/", "-")

        try:
            pdf_bytes = get_storage().get_file_bytes(file_path)
        except FileNotFoundError:
            raise HTTPException(status_code=404, detail="Invoice PDF file not found in storage")
        except Exception as fetch_err:
            logger.error(f"[INVOICE DOWNLOAD] Storage fetch failed for {invoice.id}: {fetch_err}")
            raise HTTPException(status_code=502, detail="Failed to retrieve invoice PDF from storage")

        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{safe_name}.pdf"'},
        )

    except (ValueError, AttributeError) as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("/admin/sales-register")
def get_sales_register(
    month: int | None = None,
    year: int | None = None,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    from app.core.enums import PlatformRole
    if current_user.user.platform_role != PlatformRole.PLATFORM_ADMIN:
        raise HTTPException(status_code=403, detail="Admin permissions required")
        
    from app.models.invoice import Invoice
    from sqlalchemy import func
    query = db.query(Invoice)
    if month:
        query = query.filter(func.extract('month', Invoice.issued_at) == month)
    if year:
        query = query.filter(func.extract('year', Invoice.issued_at) == year)
        
    invoices = query.order_by(Invoice.issued_at.desc()).all()
    return [
        {
            "invoice_number": inv.invoice_number,
            "issued_at": inv.issued_at.isoformat() if inv.issued_at else None,
            "invoice_type": inv.invoice_type,
            "product_type": inv.product_type,
            "customer_name": inv.customer_name,
            "customer_gstin": inv.customer_gstin,
            "place_of_supply": inv.place_of_supply,
            "subtotal": float(inv.subtotal or 0.0),
            "gst_rate": float(inv.gst_rate or 0.0),
            "gst_amount": float(inv.gst_amount or 0.0),
            "cgst": float(inv.cgst or 0.0),
            "sgst": float(inv.sgst or 0.0),
            "igst": float(inv.igst or 0.0),
            "total_amount": float(inv.total_amount or 0.0),
            "status": inv.status.value if hasattr(inv.status, "value") else str(inv.status)
        }
        for inv in invoices
    ]


@router.get("/admin/tax-summary")
def get_tax_summary(
    year: int | None = None,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    from app.core.enums import PlatformRole
    if current_user.user.platform_role != PlatformRole.PLATFORM_ADMIN:
        raise HTTPException(status_code=403, detail="Admin permissions required")
        
    from app.models.invoice import Invoice
    from sqlalchemy import func
    
    query = db.query(
        func.extract('month', Invoice.issued_at).label('month'),
        func.sum(Invoice.subtotal).label('total_subtotal'),
        func.sum(Invoice.cgst).label('total_cgst'),
        func.sum(Invoice.sgst).label('total_sgst'),
        func.sum(Invoice.igst).label('total_igst'),
        func.sum(Invoice.gst_amount).label('total_gst'),
        func.sum(Invoice.total_amount).label('total_collected')
    )
    
    if year:
        query = query.filter(func.extract('year', Invoice.issued_at) == year)
        
    summary = query.group_by('month').order_by('month').all()
    return [
        {
            "month": int(row.month),
            "total_subtotal": float(row.total_subtotal or 0.0),
            "total_cgst": float(row.total_cgst or 0.0),
            "total_sgst": float(row.total_sgst or 0.0),
            "total_igst": float(row.total_igst or 0.0),
            "total_gst": float(row.total_gst or 0.0),
            "total_collected": float(row.total_collected or 0.0)
        }
        for row in summary
    ]


@router.get("/workspace/{workspace_id}/profile")
def get_workspace_billing_profile(
    workspace_id: str,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    try:
        resolved_ws_id = resolve_and_verify_workspace(
            current_user, db, workspace_id
        )
        import uuid
        ws_uuid = uuid.UUID(resolved_ws_id)
        
        from app.models.workspace import Workspace
        workspace = db.query(Workspace).filter(Workspace.id == ws_uuid).first()
        if not workspace:
            raise HTTPException(status_code=404, detail="Workspace not found")
            
        return {
            "billing_name": workspace.name,
            "billing_contact_name": workspace.billing_contact_name,
            "billing_email": workspace.billing_email,
            "billing_phone": workspace.billing_phone,
            "billing_address": workspace.billing_address,
            "billing_city": workspace.billing_city,
            "billing_state": workspace.billing_state,
            "billing_country": workspace.billing_country or "IN",
            "billing_postal_code": workspace.billing_postal_code,
            "has_gst_registration": bool(workspace.has_gst_registration),
            "billing_gstin": workspace.billing_gstin,
            "legal_business_name": workspace.legal_business_name,
            "business_type": workspace.business_type
        }
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.patch("/workspace/{workspace_id}/profile")
def update_workspace_billing_profile(
    workspace_id: str,
    payload: UpdateBillingProfileRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    try:
        resolved_ws_id = resolve_and_verify_workspace(
            current_user, db, workspace_id
        )
        import uuid
        ws_uuid = uuid.UUID(resolved_ws_id)
        
        from app.models.workspace import Workspace
        workspace = db.query(Workspace).filter(Workspace.id == ws_uuid).first()
        if not workspace:
            raise HTTPException(status_code=404, detail="Workspace not found")
            
        if payload.billing_name is not None:
            workspace.name = payload.billing_name
        if payload.billing_contact_name is not None:
            workspace.billing_contact_name = payload.billing_contact_name
        if payload.billing_email is not None:
            workspace.billing_email = payload.billing_email
        if payload.billing_phone is not None:
            workspace.billing_phone = payload.billing_phone
        if payload.billing_address is not None:
            workspace.billing_address = payload.billing_address
        if payload.billing_city is not None:
            workspace.billing_city = payload.billing_city
        if payload.billing_state is not None:
            workspace.billing_state = payload.billing_state
        if payload.billing_country is not None:
            workspace.billing_country = payload.billing_country
        if payload.billing_postal_code is not None:
            workspace.billing_postal_code = payload.billing_postal_code
        if payload.has_gst_registration is not None:
            workspace.has_gst_registration = payload.has_gst_registration
            if not payload.has_gst_registration:
                workspace.billing_gstin = None
        if payload.billing_gstin is not None:
            workspace.billing_gstin = payload.billing_gstin.strip().upper() if payload.billing_gstin and payload.billing_gstin.strip() else None
        if payload.legal_business_name is not None:
            workspace.legal_business_name = payload.legal_business_name
        if payload.business_type is not None:
            workspace.business_type = payload.business_type
            
        db.commit()
        return {
            "status": "success",
            "message": "Billing profile updated successfully",
            "billing_name": workspace.name,
            "billing_contact_name": workspace.billing_contact_name,
            "billing_email": workspace.billing_email,
            "billing_phone": workspace.billing_phone,
            "billing_address": workspace.billing_address,
            "billing_city": workspace.billing_city,
            "billing_state": workspace.billing_state,
            "billing_country": workspace.billing_country,
            "billing_postal_code": workspace.billing_postal_code,
            "has_gst_registration": bool(workspace.has_gst_registration),
            "billing_gstin": workspace.billing_gstin,
            "legal_business_name": workspace.legal_business_name,
            "business_type": workspace.business_type
        }
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

