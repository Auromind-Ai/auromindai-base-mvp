
import uuid
from datetime import datetime, timezone, timedelta
from decimal import Decimal
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, validator
from sqlalchemy import func, or_, desc, String
from sqlalchemy.orm import Session
from app.routers.auth import get_current_user, CurrentUser
from app.core.enums import PlatformRole
from app.core.security import oauth2_scheme
from fastapi.security import OAuth2PasswordBearer


from app.database import get_db
from app.core.enums import SubscriptionStatus, PaymentStatus, InvoiceStatus
from app.models.billing import Payment
from app.models.subscription import Subscription
from app.models.workspace import Workspace
from app.models.user import User
from app.models.credit_pack import CreditPack
from app.models.plan import Plan
from app.models.plan_entitlement import PlanEntitlement
from app.models.feature_billing_rule import FeatureBillingRule
from app.models.token_ledger import TokenLedger
from app.models.invoice import Invoice
from app.models.wcc import WCCWallet, WCCRateCard, WCCTransaction, WCCRechargeLog
from app.models.webhook_event import WebhookEvent
from app.models.admin_audit_log import AdminAuditLog
from app.models.flow_pack import FlowPack, FlowPackPurchase
from app.services.billing import BillingService
from app.services.billing.entitlement_service import EntitlementService
from jose import jwt
from app.core.config import settings
from app.core.admin_security import verify_admin_workspace
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


class WorkspaceSearchRequest(BaseModel):
    query: str


class AdjustCreditsRequest(BaseModel):
    credits: float
    reason: str


class AdjustWalletRequest(BaseModel):
    amount: Decimal
    reason: str


class OverrideSubscriptionRequest(BaseModel):
    plan_name: str
    status: str
    reason: str


def get_admin_identity(request: Request) -> str:
    token = request.cookies.get("admin_session")
    if token:
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
            return payload.get("sub", "platform_admin")
        except Exception:
            pass
    return "platform_admin"


def log_audit(
    db: Session,
    admin_user: str,
    action: str,
    workspace_id: Optional[uuid.UUID],
    old_value: Optional[Dict],
    new_value: Optional[Dict],
    reason: Optional[str],
    request: Request
):
    x_forwarded_for = request.headers.get("x-forwarded-for") if request else None
    ip = x_forwarded_for.split(",")[0].strip() if x_forwarded_for else request.client.host if (request and request.client) else "unknown"
    
    log = AdminAuditLog(
        admin_user_id=admin_user,
        action=action,
        workspace_id=workspace_id,
        old_value=old_value,
        new_value=new_value,
        reason=reason,
        ip_address=ip
    )
    db.add(log)
    db.commit()


@router.get("/billing")
async def get_billing(db: Session = Depends(get_db)) -> Dict[str, Any]:
    try:
        credit_pack_ref_keys = db.query(TokenLedger.reference_key).filter(TokenLedger.entry_type == "purchase", TokenLedger.status == "posted").all()
        credit_pack_payment_db_ids = set(ref[0].split(":")[-1] for ref in credit_pack_ref_keys if ref[0] and ":" in ref[0])
        
        paid_payments = db.query(Payment).filter(Payment.status == PaymentStatus.paid).all()
        sub_gross = 0.0
        sub_net = 0.0
        sub_gst = 0.0
        
        ai_pack_gross = 0.0
        ai_pack_net = 0.0
        ai_pack_gst = 0.0
        
        manual_collections = 0.0
        razorpay_collections = 0.0

        for p in paid_payments:
            p_id_str = str(p.id)
            p_prov_id_str = str(p.provider_payment_id or "")
            is_ai_pack = (p_id_str in credit_pack_payment_db_ids or p_prov_id_str in credit_pack_payment_db_ids)
            
            p_gross = float(p.total_amount if p.total_amount is not None else (p.amount or 0.0))
            p_refund = float(p.refund_amount or 0.0)
            p_gst = float(p.gst_amount if p.gst_amount is not None else 0.0)
            p_sub = float(p.subtotal if p.subtotal is not None else (p.taxable_amount if p.taxable_amount is not None else (p_gross - p_gst)))
            p_net = max(0.0, p_sub - p_refund)

            prov = (p.provider or "razorpay").lower()
            if prov in ["manual", "admin", "offline", "bank_transfer"]:
                manual_collections += p_gross
            else:
                razorpay_collections += p_gross

            if is_ai_pack:
                ai_pack_gross += p_gross
                ai_pack_net += p_net
                ai_pack_gst += p_gst
            else:
                sub_gross += p_gross
                sub_net += p_net
                sub_gst += p_gst

        # WCC Recharges
        wcc_logs = db.query(WCCRechargeLog).filter(WCCRechargeLog.status == "success").all()
        wcc_gross = 0.0
        wcc_net = 0.0
        wcc_gst = 0.0
        for w in wcc_logs:
            w_net = float(w.subtotal if w.subtotal is not None else w.amount)
            w_gst = float(w.gst_amount if w.gst_amount is not None else 0.0)
            w_total = float(w.total_amount if w.total_amount is not None else (w_net + w_gst))
            wcc_gross += w_total
            wcc_net += w_net
            wcc_gst += w_gst

        # Flow Packs
        flow_purchases = db.query(FlowPackPurchase).filter(FlowPackPurchase.status == "success").all()
        flow_gross = 0.0
        flow_net = 0.0
        flow_gst = 0.0
        for f in flow_purchases:
            f_net = float(f.subtotal if f.subtotal is not None else (f.taxable_amount if f.taxable_amount is not None else f.amount_paid))
            f_gst = float(f.gst_amount if f.gst_amount is not None else 0.0)
            f_total = float(f.total_amount if f.total_amount is not None else (f_net + f_gst))
            flow_gross += f_total
            flow_net += f_net
            flow_gst += f_gst

        razorpay_collections += wcc_gross + flow_gross
        gross_collections = sub_gross + ai_pack_gross + wcc_gross + flow_gross
        net_platform_revenue = sub_net + ai_pack_net + wcc_net + flow_net
        gst_liability = sub_gst + ai_pack_gst + wcc_gst + flow_gst
        total_revenue = net_platform_revenue

        sub_revenue = sub_net
        ai_pack_revenue = ai_pack_net
        wcc_revenue = wcc_net
        flow_revenue = flow_net
        
        # Calculate MRR & ARR (Normalized for Annual Billing Cycles)
        from sqlalchemy import case
        mrr_query = (
            db.query(
                func.coalesce(
                    func.sum(
                        case(
                            (or_(Subscription.billing_cycle == "yearly", Plan.billing_cycle == "yearly"), Plan.price / 12.0),
                            else_=Plan.price
                        )
                    ), 0
                )
            )
            .select_from(Subscription)
            .join(Plan, Subscription.plan_id == Plan.id)
            .filter(Subscription.status == SubscriptionStatus.active, Plan.price > 0)
            .scalar() or 0
        )
        mrr = float(mrr_query)
        arr = mrr * 12.0
       
        from datetime import timezone, timedelta
        ist_offset = timedelta(hours=5, minutes=30)
        now_utc = datetime.now(timezone.utc)
        now = now_utc
        now_ist = now_utc + ist_offset
        today_start_ist_utc = (now_ist.replace(hour=0, minute=0, second=0, microsecond=0)) - ist_offset

        today_sub_gross = float(db.query(func.coalesce(func.sum(func.coalesce(Payment.total_amount, Payment.amount)), 0)).filter(Payment.status == PaymentStatus.paid, Payment.created_at >= today_start_ist_utc).scalar() or 0)
        today_wcc_gross = float(db.query(func.coalesce(func.sum(func.coalesce(WCCRechargeLog.total_amount, WCCRechargeLog.amount)), 0)).filter(WCCRechargeLog.status == "success", WCCRechargeLog.created_at >= today_start_ist_utc).scalar() or 0)
        today_flow_gross = float(db.query(func.coalesce(func.sum(func.coalesce(FlowPackPurchase.total_amount, FlowPackPurchase.amount_paid)), 0)).filter(FlowPackPurchase.status == "success", FlowPackPurchase.created_at >= today_start_ist_utc).scalar() or 0)
        todays_revenue = today_sub_gross + today_wcc_gross + today_flow_gross

        # 2. Subscription Breakdown & Workspace Lifecycle Audit
        active_subscriptions = db.query(func.count(Subscription.id)).filter(Subscription.status == SubscriptionStatus.active).scalar() or 0
        pending_subscriptions = db.query(func.count(Subscription.id)).filter(Subscription.status == SubscriptionStatus.pending).scalar() or 0
        expired_subscriptions = db.query(func.count(Subscription.id)).filter(Subscription.status.in_([SubscriptionStatus.expired, SubscriptionStatus.past_due])).scalar() or 0
        cancelled_subscriptions = db.query(func.count(Subscription.id)).filter(Subscription.status == SubscriptionStatus.cancelled).scalar() or 0
        total_unique_workspaces = db.query(func.count(func.distinct(Subscription.workspace_id))).scalar() or 0
        
        # Plan Breakdown (Explicitly includes 0 count for Enterprise/inactive tiers)
        all_active_plans = db.query(Plan).filter(Plan.is_active == True).all()
        plan_breakdown = {p.name.lower(): 0 for p in all_active_plans}
        
        plan_dist_query = (
            db.query(Plan.name, func.count(Subscription.id))
            .join(Subscription, Subscription.plan_id == Plan.id)
            .filter(Subscription.status == SubscriptionStatus.active)
            .group_by(Plan.name)
            .all()
        )
        for name, count in plan_dist_query:
            plan_breakdown[name.lower()] = count

        # 3. AI Credits Issued / Consumed / Purchased
        credits_issued = float(db.query(func.coalesce(func.sum(TokenLedger.credits_delta), 0)).filter(TokenLedger.credits_delta > 0, TokenLedger.status == "posted").scalar() or 0)
        credits_consumed = abs(float(db.query(func.coalesce(func.sum(TokenLedger.credits_delta), 0)).filter(TokenLedger.credits_delta < 0, TokenLedger.status == "posted").scalar() or 0))
        credits_purchased = float(db.query(func.coalesce(func.sum(TokenLedger.credits_delta), 0)).filter(TokenLedger.credits_delta > 0, TokenLedger.entry_type == "purchase", TokenLedger.status == "posted").scalar() or 0)
        net_credit_balance = float(db.query(func.coalesce(func.sum(TokenLedger.credits_delta), 0)).filter(TokenLedger.status == "posted").scalar() or 0)

        # 4. WCC Wallet Balance & Usage
        wcc_wallet_balance = float(db.query(func.coalesce(func.sum(WCCWallet.balance), 0)).scalar() or 0.0)
        wcc_session_debits = float(db.query(func.coalesce(func.sum(WCCTransaction.debit_amount), 0)).filter(WCCTransaction.status == "success").scalar() or 0.0)

        # 5. Payment Gateway Breakdown
        failed_payments = db.query(func.count(Payment.id)).filter(Payment.status == PaymentStatus.failed).scalar() or 0
        pending_payments = db.query(func.count(Payment.id)).filter(Payment.status == PaymentStatus.pending).scalar() or 0
        refund_count = db.query(func.count(Payment.id)).filter(Payment.refund_amount > 0).scalar() or 0

        gateway_stats_query = (
            db.query(
                Payment.provider,
                Payment.status,
                func.count(Payment.id).label("count"),
                func.coalesce(func.sum(func.coalesce(Payment.total_amount, Payment.amount)), 0).label("total")
            )
            .group_by(Payment.provider, Payment.status)
            .all()
        )
        gateway_breakdown = {}
        for r in gateway_stats_query:
            prov = (r.provider or "razorpay").lower()
            if prov not in gateway_breakdown:
                gateway_breakdown[prov] = {"success_count": 0, "failed_count": 0, "pending_count": 0, "success_amount": 0.0}
            if r.status == PaymentStatus.paid:
                gateway_breakdown[prov]["success_count"] += r.count
                gateway_breakdown[prov]["success_amount"] += float(r.total)
            elif r.status == PaymentStatus.failed:
                gateway_breakdown[prov]["failed_count"] += r.count
            elif r.status == PaymentStatus.pending:
                gateway_breakdown[prov]["pending_count"] += r.count

        # Include WCC Recharge Logs in Gateway Telemetry
        wcc_recharge_stats = (
            db.query(
                WCCRechargeLog.status,
                func.count(WCCRechargeLog.id).label("count"),
                func.coalesce(func.sum(func.coalesce(WCCRechargeLog.total_amount, WCCRechargeLog.amount)), 0).label("total")
            )
            .group_by(WCCRechargeLog.status)
            .all()
        )
        if "razorpay" not in gateway_breakdown:
            gateway_breakdown["razorpay"] = {"success_count": 0, "failed_count": 0, "pending_count": 0, "success_amount": 0.0}

        for r in wcc_recharge_stats:
            if r.status == "success":
                gateway_breakdown["razorpay"]["success_count"] += r.count
                gateway_breakdown["razorpay"]["success_amount"] += float(r.total)
            elif r.status == "failed":
                gateway_breakdown["razorpay"]["failed_count"] += r.count
            elif r.status == "pending":
                gateway_breakdown["razorpay"]["pending_count"] += r.count

        # Include Flow Pack Purchases in Gateway Telemetry
        flow_purchase_stats = (
            db.query(
                FlowPackPurchase.provider,
                FlowPackPurchase.status,
                func.count(FlowPackPurchase.id).label("count"),
                func.coalesce(func.sum(func.coalesce(FlowPackPurchase.total_amount, FlowPackPurchase.amount_paid)), 0).label("total")
            )
            .group_by(FlowPackPurchase.provider, FlowPackPurchase.status)
            .all()
        )
        for r in flow_purchase_stats:
            prov = (r.provider or "razorpay").lower()
            if prov not in gateway_breakdown:
                gateway_breakdown[prov] = {"success_count": 0, "failed_count": 0, "pending_count": 0, "success_amount": 0.0}
            if r.status == "success":
                gateway_breakdown[prov]["success_count"] += r.count
                gateway_breakdown[prov]["success_amount"] += float(r.total)
            elif r.status == "failed":
                gateway_breakdown[prov]["failed_count"] += r.count
            elif r.status == "pending":
                gateway_breakdown[prov]["pending_count"] += r.count

        # 6. Flow Pack Sales
        flow_pack_sales_count = db.query(func.count(FlowPackPurchase.id)).filter(FlowPackPurchase.status == "success").scalar() or 0
        top_flow_packs_query = (
            db.query(FlowPack.name, func.count(FlowPackPurchase.id).label("sales"), func.coalesce(func.sum(FlowPackPurchase.amount_paid), 0).label("revenue"))
            .join(FlowPackPurchase, FlowPackPurchase.flow_pack_id == FlowPack.id)
            .filter(FlowPackPurchase.status == "success")
            .group_by(FlowPack.name)
            .order_by(desc("sales"))
            .limit(5)
            .all()
        )
        top_flow_packs = [{"name": r.name, "sales": r.sales, "revenue": float(r.revenue)} for r in top_flow_packs_query]

        # 7. System Diagnostics Quick Summary
        failed_webhooks_cnt = db.query(func.count(WebhookEvent.id)).filter(WebhookEvent.processed == False).scalar() or 0
        one_hour_ago = now - timedelta(hours=1)
        pending_recharges_cnt = db.query(func.count(WCCRechargeLog.id)).filter(WCCRechargeLog.status == "pending", WCCRechargeLog.created_at < one_hour_ago).scalar() or 0

        # Recent Payments Stream (Join with Workspace to prevent N+1 queries)
        recent_payments = (
            db.query(Payment, Workspace.name.label("workspace_name"))
            .outerjoin(Workspace, Payment.workspace_id == Workspace.id)
            .order_by(desc(Payment.created_at))
            .limit(10)
            .all()
        )
        recent_transactions_list = []
        for p, ws_name in recent_payments:
            recent_transactions_list.append({
                "id": str(p.id),
                "workspace_name": ws_name or "Deleted Workspace",
                "amount": float(p.amount),
                "currency": p.currency,
                "status": p.status.value.upper(),
                "provider": p.provider,
                "payment_id": p.provider_payment_id or "N/A",
                "date": p.created_at.isoformat() if p.created_at else None
            })

        # Chart Trends
        monthly_rev_query = (
            db.query(
                func.to_char(Payment.created_at, 'YYYY-MM').label('month'),
                func.sum(Payment.amount).label('total')
            )
            .filter(Payment.status == PaymentStatus.paid)
            .group_by('month')
            .order_by('month')
            .all()
        )
        monthly_revenue = [{"month": r.month, "amount": float(r.total or 0)} for r in monthly_rev_query]

        thirty_days_ago = now - timedelta(days=30)
        daily_credit_query = (
            db.query(
                func.to_char(TokenLedger.created_at, 'YYYY-MM-DD').label('day'),
                func.sum(TokenLedger.credits_delta).label('total')
            )
            .filter(
                TokenLedger.created_at >= thirty_days_ago,
                TokenLedger.credits_delta < 0,
                TokenLedger.status == "posted"
            )
            .group_by('day')
            .order_by('day')
            .all()
        )
        daily_credits = [{"day": r.day, "credits": abs(float(r.total or 0))} for r in daily_credit_query]

        daily_wcc_query = (
            db.query(
                func.to_char(WCCTransaction.created_at, 'YYYY-MM-DD').label('day'),
                func.sum(WCCTransaction.debit_amount).label('total')
            )
            .filter(
                WCCTransaction.created_at >= thirty_days_ago,
                WCCTransaction.status == "success"
            )
            .group_by('day')
            .order_by('day')
            .all()
        )
        wcc_usage = [{"day": r.day, "amount": float(r.total or 0.0)} for r in daily_wcc_query]

        sub_growth_query = (
            db.query(
                func.to_char(Subscription.created_at, 'YYYY-MM').label('month'),
                func.count(Subscription.id).label('count')
            )
            .group_by('month')
            .order_by('month')
            .all()
        )
        sub_growth = []
        cumulative = 0
        for r in sub_growth_query:
            cumulative += r.count
            sub_growth.append({"month": r.month, "active": cumulative})

        payment_stats = (
            db.query(
                Payment.status.label('status'),
                func.count(Payment.id).label('count')
            )
            .group_by(Payment.status)
            .all()
        )
        success_vs_failure = [{"status": r.status.value, "count": r.count} for r in payment_stats]

        return {
            # Structured modern fields
            "revenue_overview": {
                "total_revenue": total_revenue,
                "gross_collections": gross_collections,
                "razorpay_collections": razorpay_collections,
                "manual_collections": manual_collections,
                "net_platform_revenue": net_platform_revenue,
                "gst_liability": gst_liability,
                "outstanding_gst_liability": gst_liability,
                "subscription_revenue": sub_revenue,
                "ai_credit_pack_revenue": ai_pack_revenue,
                "wcc_recharge_revenue": wcc_revenue,
                "flow_pack_revenue": flow_revenue,
                "monthly_recurring_revenue": mrr,
                "annual_recurring_revenue": arr,
                "todays_revenue": todays_revenue,
            },
            "subscriptions_summary": {
                "active": active_subscriptions,
                "pending": pending_subscriptions,
                "expired": expired_subscriptions,
                "cancelled": cancelled_subscriptions,
                "total_unique_workspaces": total_unique_workspaces,
                "plan_breakdown": plan_breakdown
            },
            "gateways": gateway_breakdown,
            "ai_credits": {
                "credits_issued": credits_issued,
                "credits_consumed": credits_consumed,
                "credits_purchased": credits_purchased,
                "net_credit_balance": net_credit_balance
            },
            "wcc": {
                "wallet_balance": wcc_wallet_balance,
                "recharge_revenue": wcc_revenue,
                "session_debits": wcc_session_debits
            },
            "flow_packs": {
                "sales_count": flow_pack_sales_count,
                "revenue": flow_revenue,
                "top_packs": top_flow_packs
            },
            "diagnostics_summary": {
                "failed_webhooks": failed_webhooks_cnt,
                "pending_recharges": pending_recharges_cnt,
                "has_warnings": (failed_webhooks_cnt > 0 or pending_recharges_cnt > 0)
            },
            "recent_transactions": recent_transactions_list,

            # Legacy compatibility fields
            "total_revenue": total_revenue,
            "monthly_recurring_revenue": mrr,
            "onetime_this_month": wcc_revenue + flow_revenue,
            "arpu": total_revenue / active_subscriptions if active_subscriptions > 0 else 0.0,
            "active_subscriptions": active_subscriptions,
            "pending_checkouts": pending_subscriptions,
            "expired_subscriptions": expired_subscriptions,
            "free_subscriptions": plan_breakdown.get("free", 0),
            "pro_subscriptions": plan_breakdown.get("pro", 0),
            "enterprise_subscriptions": plan_breakdown.get("enterprise", 0),
            "cancelled_subscriptions": cancelled_subscriptions,
            "ai_credits_issued": credits_issued,
            "ai_credits_consumed": credits_consumed,
            "purchased_credits": credits_purchased,
            "wcc_wallet_balance": wcc_wallet_balance,
            "wallet_recharge_revenue": wcc_revenue,
            "failed_payments": failed_payments,
            "pending_payments": pending_payments,
            "pending_invoices": 0,
            "refund_count": refund_count,
            "recent_invoices": [],
            "charts": {
                "monthly_revenue": monthly_revenue,
                "daily_credits": daily_credits,
                "wcc_usage": wcc_usage,
                "subscription_growth": sub_growth,
                "success_vs_failure": success_vs_failure
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching platform billing metrics: {str(e)}")


@router.post("/billing/workspaces/search")
async def search_workspaces(payload: WorkspaceSearchRequest, db: Session = Depends(get_db)):
    q = payload.query.strip()
    if not q:
        return []
    
    workspaces = (
        db.query(Workspace)
        .outerjoin(User, Workspace.created_by == User.id)
        .filter(
            or_(
                Workspace.name.ilike(f"%{q}%"),
                User.email.ilike(f"%{q}%"),
                User.full_name.ilike(f"%{q}%")
            )
        )
        .limit(20)
        .all()
    )
    
    results = []
    for ws in workspaces:
        sub = db.query(Subscription).filter(
            Subscription.workspace_id == ws.id,
            Subscription.status == SubscriptionStatus.active
        ).first()
        
        plan_name = "free"
        if sub:
            plan = db.query(Plan).filter(Plan.id == sub.plan_id).first()
            if plan:
                plan_name = plan.name
                
        credit_service = BillingService().token_service
        balance = credit_service.get_token_balance(db, str(ws.id))
        
        wallet = db.query(WCCWallet).filter(WCCWallet.workspace_id == ws.id).first()
        wallet_balance = float(wallet.balance) if wallet else 0.0
        
        results.append({
            "id": str(ws.id),
            "name": ws.name,
            "plan_type": plan_name.lower(),
            "subscription_status": sub.status.value.upper() if sub else "FREE",
            "credits_balance": float(balance.balance),
            "wallet_balance": wallet_balance,
            "created_at": ws.created_at.isoformat() if ws.created_at else None
        })
        
    return results


@router.get("/billing/workspaces/{workspace_id}")
async def get_workspace_billing_detail(
    workspace_id: uuid.UUID,
    db: Session = Depends(get_db),
    admin_user: str = Depends(get_admin_identity)
):
    ws_uuid = verify_admin_workspace(db, workspace_id)
    ws_id = str(ws_uuid)
    ws = db.query(Workspace).filter(Workspace.id == ws_uuid).first()
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
        
    owner = db.query(User).filter(User.id == ws.created_by).first()
    
    sub = db.query(Subscription).filter(
        Subscription.workspace_id == ws.id,
        Subscription.status == SubscriptionStatus.active
    ).first()
    
    plan_name = "free"
    billing_cycle = "monthly"
    if sub:
        plan = db.query(Plan).filter(Plan.id == sub.plan_id).first()
        if plan:
            plan_name = plan.name
        billing_cycle = sub.billing_cycle
        
    credit_service = BillingService().token_service
    balance = credit_service.get_token_balance(db, str(ws.id))
    
    wallet = db.query(WCCWallet).filter(WCCWallet.workspace_id == ws.id).first()
    wallet_balance = float(wallet.balance) if wallet else 0.0
    
    recharges = (
        db.query(WCCRechargeLog)
        .filter(WCCRechargeLog.workspace_id == ws.id)
        .order_by(desc(WCCRechargeLog.created_at))
        .limit(20)
        .all()
    )
    
    invoices = (
        db.query(Invoice)
        .filter(Invoice.workspace_id == ws.id)
        .order_by(desc(Invoice.created_at))
        .limit(20)
        .all()
    )
    
    payments = (
        db.query(Payment)
        .filter(Payment.workspace_id == ws.id)
        .order_by(desc(Payment.created_at))
        .limit(20)
        .all()
    )
   
    eff_ent = EntitlementService.get_workspace_entitlement(db, ws.id)

    return {
        "workspace": {
            "id": str(ws.id),
            "name": ws.name,
            "owner_email": owner.email if owner else None,
            "owner_name": owner.full_name if owner else None,
            "override_allow_purchased_ai_usage": ws.override_allow_purchased_ai_usage,
            "override_allow_purchased_wcc_usage": ws.override_allow_purchased_wcc_usage,
            "override_allow_purchased_flow_usage": ws.override_allow_purchased_flow_usage,
        },
        "effective_permissions": {
            "allow_purchased_ai_usage": eff_ent.allow_purchased_ai_usage,
            "allow_purchased_wcc_usage": eff_ent.allow_purchased_wcc_usage,
            "allow_purchased_flow_usage": eff_ent.allow_purchased_flow_usage,
            "allow_ai_topup": eff_ent.allow_ai_topup,
            "allow_wcc_recharge": eff_ent.allow_wcc_recharge,
            "allow_flow_addon": eff_ent.allow_flow_addon,
        },
        "plan": plan_name.lower(),
        "subscription_status": sub.status.value.upper() if sub else "FREE",
        "billing_cycle": billing_cycle,
        "credits": {
            "balance": float(balance.balance),
            "added": float(balance.tokens_added),
            "used": float(balance.tokens_used),
            "reserved": float(balance.tokens_reserved)
        },
        "wallet_balance": wallet_balance,
        "recharges": [
            {
                "id": str(r.id),
                "amount": float(r.amount),
                "currency": r.currency,
                "status": r.status,
                "created_at": r.created_at.isoformat() if r.created_at else None,
                "payment_id": r.gateway_payment_id
            } for r in recharges
        ],
        "invoices": [
            {
                "id": str(inv.id),
                "amount": float(inv.amount) / 100.0,
                "status": inv.status.value.upper(),
                "created_at": inv.created_at.isoformat() if inv.created_at else None,
                "pdf_url": inv.pdf_url
            } for inv in invoices
        ],
        "payments": [
            {
                "id": str(p.id),
                "amount": float(p.amount) / 100.0,
                "status": p.status.value.upper(),
                "created_at": p.created_at.isoformat() if p.created_at else None,
                "payment_id": p.provider_payment_id
            } for p in payments
        ]
    }


class WorkspaceResourceOverridesRequest(BaseModel):
    override_allow_purchased_ai_usage: Optional[bool] = None
    override_allow_purchased_wcc_usage: Optional[bool] = None
    override_allow_purchased_flow_usage: Optional[bool] = None


@router.post("/billing/workspaces/{workspace_id}/resource-overrides")
async def update_workspace_resource_overrides(
    workspace_id: uuid.UUID,
    payload: WorkspaceResourceOverridesRequest,
    db: Session = Depends(get_db),
    admin_user: str = Depends(get_admin_identity),
    request: Request = None
):
    ws_uuid = verify_admin_workspace(db, workspace_id)
    ws = db.query(Workspace).filter(Workspace.id == ws_uuid).first()
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")

    old_val = {
        "override_allow_purchased_ai_usage": ws.override_allow_purchased_ai_usage,
        "override_allow_purchased_wcc_usage": ws.override_allow_purchased_wcc_usage,
        "override_allow_purchased_flow_usage": ws.override_allow_purchased_flow_usage,
    }

    ws.override_allow_purchased_ai_usage = payload.override_allow_purchased_ai_usage
    ws.override_allow_purchased_wcc_usage = payload.override_allow_purchased_wcc_usage
    ws.override_allow_purchased_flow_usage = payload.override_allow_purchased_flow_usage

    db.commit()
    db.refresh(ws)

    new_val = {
        "override_allow_purchased_ai_usage": ws.override_allow_purchased_ai_usage,
        "override_allow_purchased_wcc_usage": ws.override_allow_purchased_wcc_usage,
        "override_allow_purchased_flow_usage": ws.override_allow_purchased_flow_usage,
    }

    try:
        log_audit(
            db=db,
            admin_user=admin_user,
            action="WORKSPACE_RESOURCE_OVERRIDES_UPDATE",
            workspace_id=ws.id,
            old_value=old_val,
            new_value=new_val,
            reason="Resource overrides update",
            request=request,
        )
    except Exception as e:
        logger.warning(f"Failed to record audit log for resource overrides: {str(e)}")

    from app.services.billing.entitlement_service import EntitlementService
    eff_ent = EntitlementService.get_workspace_entitlement(db, ws.id)

    return {
        "workspace_id": str(ws.id),
        "resource_overrides": new_val,
        "effective_permissions": {
            "allow_purchased_ai_usage": eff_ent.allow_purchased_ai_usage,
            "allow_purchased_wcc_usage": eff_ent.allow_purchased_wcc_usage,
            "allow_purchased_flow_usage": eff_ent.allow_purchased_flow_usage,
            "allow_ai_topup": eff_ent.allow_ai_topup,
            "allow_wcc_recharge": eff_ent.allow_wcc_recharge,
            "allow_flow_addon": eff_ent.allow_flow_addon,
        }
    }


@router.post("/billing/workspaces/{workspace_id}/adjust-credits")
async def adjust_credits(
    workspace_id: uuid.UUID,
    payload: AdjustCreditsRequest,
    db: Session = Depends(get_db),
    admin_user: str = Depends(get_admin_identity),
    request: Request = None
):
    ws_uuid = verify_admin_workspace(db, workspace_id)
    ws_id = str(ws_uuid)
        
    credit_service = BillingService().token_service
    old_bal = float(credit_service.get_token_balance(db, ws_id).balance)
    
    tokens_delta = int(payload.credits * 1000)
    entry_type = "token_grant" if payload.credits >= 0 else "deduction"
    
    ledger_entry = TokenLedger(
        workspace_id=ws_uuid,
        entry_type=entry_type,
        status="posted",
        tokens_delta=tokens_delta,
        credits_delta=payload.credits,
        reference_key=f"admin_adjust:{uuid.uuid4()}",
        description=f"Admin Adjustment ({admin_user}): {payload.reason}"
    )
    db.add(ledger_entry)
    db.commit()
    
    new_bal = float(credit_service.get_token_balance(db, ws_id).balance)
    
    log_audit(
        db=db,
        admin_user=admin_user,
        action="CREDITS_GRANTED" if payload.credits >= 0 else "CREDITS_DEDUCTED",
        workspace_id=ws_uuid,
        old_value={"balance": old_bal},
        new_value={"balance": new_bal, "adjustment": payload.credits},
        reason=payload.reason,
        request=request
    )
    
    return {"message": "Credits adjusted successfully", "new_balance": new_bal}


@router.post("/billing/workspaces/{workspace_id}/adjust-wallet")
async def adjust_wallet(
    workspace_id: uuid.UUID,
    payload: AdjustWalletRequest,
    db: Session = Depends(get_db),
    admin_user: str = Depends(get_admin_identity),
    request: Request = None
):
    ws_uuid = verify_admin_workspace(db, workspace_id)
    ws_id = str(ws_uuid)
        
    wallet = db.query(WCCWallet).filter(WCCWallet.workspace_id == ws_uuid).first()
    if not wallet:
        wallet = WCCWallet(workspace_id=ws_uuid, balance=Decimal("0.00"))
        db.add(wallet)
        db.flush()
        
    old_bal = float(wallet.balance)
    adjustment_decimal = Decimal(str(payload.amount))
    wallet.purchased_balance = (wallet.purchased_balance or Decimal("0.00")) + adjustment_decimal
    wallet.balance = (wallet.included_balance or Decimal("0.00")) + (wallet.purchased_balance or Decimal("0.00"))
    db.commit()
    
    new_bal = float(wallet.balance)
    
    if payload.amount >= 0:
        log_entry = WCCRechargeLog(
            workspace_id=ws_uuid,
            amount=adjustment_decimal,
            currency="INR",
            gateway_order_id=f"admin_adjust_{uuid.uuid4()}",
            gateway_payment_id=f"admin_adjust_{uuid.uuid4()}",
            status="success"
        )
        db.add(log_entry)
    else:
        log_entry = WCCTransaction(
            workspace_id=ws_uuid,
            meta_session_id=f"admin_adjust_{uuid.uuid4()}",
            category="service",
            status="success",
            message_count=1,
            debit_amount=abs(adjustment_decimal),
            rate_applied=Decimal("0.00")
        )
        db.add(log_entry)
        
    db.commit()
    
    log_audit(
        db=db,
        admin_user=admin_user,
        action="WALLET_ADJUSTED",
        workspace_id=ws_uuid,
        old_value={"balance": old_bal},
        new_value={"balance": new_bal, "adjustment": float(payload.amount)},
        reason=payload.reason,
        request=request
    )
    
    return {"message": "Wallet adjusted successfully", "new_balance": new_bal}


@router.post("/billing/workspaces/{workspace_id}/override-subscription")
async def override_subscription(
    workspace_id: uuid.UUID,
    payload: OverrideSubscriptionRequest,
    db: Session = Depends(get_db),
    admin_user: str = Depends(get_admin_identity),
    request: Request = None
):
    ws_uuid = verify_admin_workspace(db, workspace_id)
    ws_id = str(ws_uuid)
        
    sub = db.query(Subscription).filter(
        Subscription.workspace_id == ws_uuid,
        Subscription.status == SubscriptionStatus.active
    ).first()
    
    plan = db.query(Plan).filter(func.lower(Plan.name) == payload.plan_name.lower()).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
        
    old_plan_name = "free"
    old_sub_id = None
    if sub:
        old_sub_id = sub.id
        old_plan = db.query(Plan).filter(Plan.id == sub.plan_id).first()
        old_plan_name = old_plan.name if old_plan else "free"
        
        sub.status = SubscriptionStatus.cancelled
        sub.canceled_at = datetime.now(timezone.utc)
        
    req_status = (payload.status or "active").strip().lower()
    if req_status == "active":
        sub_status = SubscriptionStatus.active
        pay_status = PaymentStatus.paid
    elif req_status == "pending":
        sub_status = SubscriptionStatus.pending
        pay_status = PaymentStatus.pending
    elif req_status in {"cancelled", "canceled"}:
        sub_status = SubscriptionStatus.cancelled
        pay_status = PaymentStatus.failed
    elif req_status == "expired":
        sub_status = SubscriptionStatus.expired
        pay_status = PaymentStatus.failed
    elif req_status in {"past_due", "pastdue"}:
        sub_status = SubscriptionStatus.past_due
        pay_status = PaymentStatus.pending
    else:
        sub_status = SubscriptionStatus.active
        pay_status = PaymentStatus.paid

    new_sub = Subscription(
        workspace_id=ws_uuid,
        plan_id=plan.id,
        status=sub_status,
        billing_cycle="monthly",
        is_admin_override=True,
        start_date=datetime.now(timezone.utc),
        current_period_start=datetime.now(timezone.utc),
        current_period_end=datetime.now(timezone.utc) + timedelta(days=30),
        provider="manual"
    )
    db.add(new_sub)
    db.flush()
    
    payment = Payment(
        workspace_id=ws_uuid,
        subscription_id=new_sub.id,
        amount=plan.price,
        currency=plan.currency,
        status=pay_status,
        provider="manual",
        provider_payment_id=f"manual_override_{uuid.uuid4()}",
        provider_order_id=f"manual_override_{uuid.uuid4()}",
    )
    db.add(payment)
    db.flush()
    
    if sub_status == SubscriptionStatus.active:
        EntitlementOrchestrator.renew_subscription(db, ws_uuid, payment)
    db.commit()
    
    log_audit(
        db=db,
        admin_user=admin_user,
        action="SUBSCRIPTION_OVERRIDDEN",
        workspace_id=ws_uuid,
        old_value={"plan": old_plan_name, "subscription_id": str(old_sub_id) if old_sub_id else None},
        new_value={"plan": plan.name.lower(), "subscription_id": str(new_sub.id)},
        reason=payload.reason,
        request=request
    )
    
    return {"message": f"Subscription successfully overridden to {plan.name}"}


@router.post("/billing/workspaces/{workspace_id}/reset-credits")
async def reset_credits(
    workspace_id: uuid.UUID,
    db: Session = Depends(get_db),
    admin_user: str = Depends(get_admin_identity),
    request: Request = None
):
    ws_uuid = verify_admin_workspace(db, workspace_id)
    ws_id = str(ws_uuid)
        
    credit_service = BillingService().token_service
    old_bal = float(credit_service.get_token_balance(db, ws_id).balance)
    
    ledger_entry = TokenLedger(
        workspace_id=ws_uuid,
        entry_type="deduction",
        status="posted",
        tokens_delta=int(-old_bal * 1000),
        credits_delta=-old_bal,
        reference_key=f"admin_reset:{uuid.uuid4()}",
        description=f"Admin Credit Reset ({admin_user})"
    )
    db.add(ledger_entry)
    db.commit()
    
    log_audit(
        db=db,
        admin_user=admin_user,
        action="CREDITS_RESET",
        workspace_id=ws_uuid,
        old_value={"balance": old_bal},
        new_value={"balance": 0.0},
        reason="Admin Reset Limits",
        request=request
    )
    
    return {"message": "Credits reset successfully"}


@router.post("/billing/workspaces/{workspace_id}/reset-wallet")
async def reset_wallet(
    workspace_id: uuid.UUID,
    db: Session = Depends(get_db),
    admin_user: str = Depends(get_admin_identity),
    request: Request = None
):
    ws_uuid = verify_admin_workspace(db, workspace_id)
    ws_id = str(ws_uuid)
        
    wallet = db.query(WCCWallet).filter(WCCWallet.workspace_id == ws_uuid).first()
    old_bal = float(wallet.balance) if wallet else 0.0
    
    if wallet:
        wallet.balance = Decimal("0.00")
    else:
        wallet = WCCWallet(workspace_id=ws_uuid, balance=Decimal("0.00"))
        db.add(wallet)
        
    db.commit()
    
    log_audit(
        db=db,
        admin_user=admin_user,
        action="WALLET_RESET",
        workspace_id=ws_uuid,
        old_value={"balance": old_bal},
        new_value={"balance": 0.0},
        reason="Admin Reset Wallet",
        request=request
    )
    
    return {"message": "Wallet reset successfully"}


@router.get("/billing/audit-logs")
async def get_audit_logs(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db)
):
    offset = (page - 1) * limit
    logs = db.query(AdminAuditLog).order_by(desc(AdminAuditLog.created_at)).offset(offset).limit(limit).all()
    total = db.query(AdminAuditLog).count()
    
    return {
        "logs": [
            {
                "id": str(l.id),
                "admin_user_id": l.admin_user_id,
                "action": l.action,
                "workspace_id": str(l.workspace_id) if l.workspace_id else None,
                "old_value": l.old_value,
                "new_value": l.new_value,
                "reason": l.reason,
                "ip_address": l.ip_address,
                "created_at": l.created_at.isoformat() if l.created_at else None
            } for l in logs
        ],
        "total": total,
        "page": page,
        "limit": limit
    }


@router.get("/billing/transactions")
async def get_transactions(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db)
):
    offset = (page - 1) * limit
    payments = db.query(Payment).order_by(desc(Payment.created_at)).offset(offset).limit(limit).all()
    total = db.query(Payment).count()
    
    tx_list = []
    for p in payments:
        ws = db.query(Workspace).filter(Workspace.id == p.workspace_id).first()
        sub = db.query(Subscription).filter(Subscription.id == p.subscription_id).first()
        plan_name = "unknown"
        if sub:
            plan = db.query(Plan).filter(Plan.id == sub.plan_id).first()
            if plan:
                plan_name = plan.name
                
        tx_list.append({
            "id": str(p.id),
            "workspace_id": str(p.workspace_id),
            "workspace_name": ws.name if ws else "Deleted Workspace",
            "type": "subscription_payment" if p.subscription_id else "credit_purchase",
            "plan": plan_name.lower(),
            "amount": float(p.amount) / 100.0,
            "currency": p.currency,
            "status": p.status.value.upper(),
            "payment_id": p.provider_payment_id,
            "order_id": p.provider_order_id,
            "date": p.created_at.isoformat() if p.created_at else None
        })
        
    return {
        "transactions": tx_list,
        "total": total,
        "page": page,
        "limit": limit
    }


@router.get("/billing/gateway-health")
async def get_gateway_health(db: Session = Depends(get_db)):
    from app.services.platform_settings_service import get_setting
    
    rzp_key = get_setting(db, "razorpay_key")
    rzp_secret = get_setting(db, "razorpay_secret")
    payu_key = get_setting(db, "payu_merchant_key")
    payu_salt = get_setting(db, "payu_salt")
    
    last_webhook = db.query(WebhookEvent).order_by(desc(WebhookEvent.created_at)).first()
    last_payment = db.query(Payment).order_by(desc(Payment.created_at)).first()
    last_failure = db.query(Payment).filter(Payment.status == PaymentStatus.failed).order_by(desc(Payment.created_at)).first()
    
    return {
        "razorpay": {
            "configured": bool(rzp_key and rzp_secret),
            "status": "connected" if (rzp_key and rzp_secret) else "not_configured"
        },
        "payu": {
            "configured": bool(payu_key and payu_salt),
            "status": "connected" if (payu_key and payu_salt) else "not_configured"
        },
        "last_webhook_at": last_webhook.created_at.isoformat() if last_webhook else None,
        "last_payment_at": last_payment.created_at.isoformat() if last_payment else None,
        "last_failure_at": last_failure.created_at.isoformat() if last_failure else None,
        "webhook_health": "healthy" if last_webhook and (datetime.now(timezone.utc) - last_webhook.created_at.replace(tzinfo=timezone.utc) < timedelta(days=2)) else "degraded"
    }


@router.post("/billing/operations/retry-payment")
async def retry_payment_op(
    payload: dict,
    db: Session = Depends(get_db),
    admin_user: str = Depends(get_admin_identity),
    request: Request = None
):
    payment_id = payload.get("target_id")
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment record not found")
        
    old_status = payment.status.value
    payment.status = PaymentStatus.pending
    db.commit()
    
    log_audit(
        db=db,
        admin_user=admin_user,
        action="PAYMENT_RETRY_TRIGGERED",
        workspace_id=payment.workspace_id,
        old_value={"status": old_status},
        new_value={"status": "pending"},
        reason=payload.get("reason"),
        request=request
    )
    return {"message": "Payment retry initiated"}


@router.post("/billing/operations/replay-webhook")
async def replay_webhook_op(
    payload: dict,
    db: Session = Depends(get_db),
    admin_user: str = Depends(get_admin_identity),
    request: Request = None
):
    event_id = payload.get("target_id")
    event = db.query(WebhookEvent).filter(WebhookEvent.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Webhook event not found")
        
    event.processed = False
    event.processed_at = None
    db.commit()
    
    log_audit(
        db=db,
        admin_user=admin_user,
        action="WEBHOOK_REPLAY_TRIGGERED",
        workspace_id=None,
        old_value={"processed": True},
        new_value={"processed": False},
        reason=payload.get("reason"),
        request=request
    )
    return {"message": "Webhook replay initiated"}


@router.post("/billing/operations/recalculate-balances")
async def recalculate_balances_op(
    payload: dict,
    db: Session = Depends(get_db),
    admin_user: str = Depends(get_admin_identity),
    request: Request = None
):
    wallets = db.query(WCCWallet).all()
    for w in wallets:
        recharges_raw = db.query(func.sum(WCCRechargeLog.amount)).filter(WCCRechargeLog.workspace_id == w.workspace_id, WCCRechargeLog.status == "success").scalar()
        debits_raw = db.query(func.sum(WCCTransaction.debit_amount)).filter(WCCRechargeLog.workspace_id == w.workspace_id, WCCTransaction.status == "success").scalar()
        w.balance = Decimal(str(recharges_raw or "0.00")) - Decimal(str(debits_raw or "0.00"))
    db.commit()
    
    log_audit(
        db=db,
        admin_user=admin_user,
        action="LEDGER_BALANCES_RECALCULATED",
        workspace_id=None,
        old_value=None,
        new_value=None,
        reason=payload.get("reason"),
        request=request
    )
    return {"message": "Recalculated all workspace wallet balances successfully"}


# ==========================================
# BILLING OPERATIONS & DIAGNOSTICS ENDPOINTS
# ==========================================

from app.services.wcc_service import WCCService
from app.services.billing.entitlement_orchestrator import EntitlementOrchestrator
from app.services.billing.entitlement_service import EntitlementService


@router.get("/billing/workspaces/{workspace_id}/ledger")
async def get_workspace_ledger(
    workspace_id: uuid.UUID,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    admin_user: str = Depends(get_admin_identity)
):
    ws_uuid = verify_admin_workspace(db, workspace_id)
    ws_id = str(ws_uuid)
    offset = (page - 1) * limit
    total = db.query(TokenLedger).filter(TokenLedger.workspace_id == ws_uuid).count()
    entries = (
        db.query(TokenLedger)
        .filter(TokenLedger.workspace_id == ws_uuid)
        .order_by(desc(TokenLedger.created_at))
        .offset(offset)
        .limit(limit)
        .all()
    )
    return {
        "entries": [
            {
                "id": str(e.id),
                "entry_type": e.entry_type,
                "status": e.status,
                "credits_delta": float(e.credits_delta),
                "tokens_delta": e.tokens_delta,
                "balance_source": e.balance_source,
                "reference_key": e.reference_key,
                "description": e.description,
                "created_at": e.created_at.isoformat() if e.created_at else None,
            }
            for e in entries
        ],
        "total": total,
        "page": page,
        "limit": limit
    }


@router.post("/billing/workspaces/{workspace_id}/renew-plan-credits")
async def renew_plan_credits_op(
    workspace_id: uuid.UUID,
    db: Session = Depends(get_db),
    admin_user: str = Depends(get_admin_identity),
    request: Request = None
):
    ws_uuid = verify_admin_workspace(db, workspace_id)
    ws_id = str(ws_uuid)
    EntitlementOrchestrator.renew_subscription(db, ws_uuid)
    db.commit()
    
    credit_service = BillingService().token_service
    new_bal = float(credit_service.get_token_balance(db, ws_id).balance)
    
    log_audit(
        db=db,
        admin_user=admin_user,
        action="PLAN_CREDIT_RENEWAL_TRIGGERED",
        workspace_id=ws_uuid,
        old_value=None,
        new_value={"balance": new_bal},
        reason="Manual Admin Triggered Renewal",
        request=request
    )
    return {"message": "Plan credits renewed successfully", "new_balance": new_bal}


@router.post("/billing/workspaces/{workspace_id}/expire-credits")
async def expire_credits_op(
    workspace_id: uuid.UUID,
    db: Session = Depends(get_db),
    admin_user: str = Depends(get_admin_identity),
    request: Request = None
):
    ws_uuid = verify_admin_workspace(db, workspace_id)
    ws_id = str(ws_uuid)
    
    # Get current included pool balance
    included_pool = db.query(func.coalesce(func.sum(TokenLedger.credits_delta), 0)).filter(
        TokenLedger.workspace_id == ws_uuid,
        TokenLedger.status == "posted",
        TokenLedger.balance_source == "INCLUDED"
    ).scalar() or 0.0
    
    included_pool_val = float(included_pool)
    if included_pool_val > 0:
        expire_entry = TokenLedger(
            workspace_id=ws_uuid,
            entry_type="token_expiration",
            status="posted",
            tokens_delta=0,
            credits_delta=-included_pool,
            balance_source="INCLUDED",
            reference_key=f"token_expire:{ws_uuid}:manual:{datetime.now(timezone.utc).timestamp()}",
            description="Expired unused plan credits manually"
        )
        db.add(expire_entry)
        db.commit()
        
    credit_service = BillingService().token_service
    new_bal = float(credit_service.get_token_balance(db, ws_id).balance)
    
    log_audit(
        db=db,
        admin_user=admin_user,
        action="CREDITS_EXPIRED",
        workspace_id=ws_uuid,
        old_value={"expired_credits": included_pool_val},
        new_value={"balance": new_bal},
        reason="Manual Admin Triggered Credit Expiry",
        request=request
    )
    return {"message": "Remaining credits expired successfully", "expired_amount": included_pool_val, "new_balance": new_bal}


@router.post("/billing/workspaces/{workspace_id}/recalculate-credits")
async def recalculate_credits_op(
    workspace_id: uuid.UUID,
    db: Session = Depends(get_db),
    admin_user: str = Depends(get_admin_identity),
    request: Request = None
):
    ws_uuid = verify_admin_workspace(db, workspace_id)
    ws_id = str(ws_uuid)
    
    # Release expired reservations (> TTL of 1 hour)
    now = datetime.now(timezone.utc)
    expired_reservations = db.query(TokenLedger).filter(
        TokenLedger.workspace_id == ws_uuid,
        TokenLedger.status == "reserved",
        TokenLedger.expires_at < now
    ).all()
    
    released_count = len(expired_reservations)
    for res in expired_reservations:
        res.status = "released"
        res.description = "Auto-released by recalculate operation due to TTL expiry"
    db.commit()
    
    credit_service = BillingService().token_service
    balance_info = credit_service.get_token_balance(db, ws_id)
    
    log_audit(
        db=db,
        admin_user=admin_user,
        action="CREDITS_RECALCULATED",
        workspace_id=ws_uuid,
        old_value=None,
        new_value={"balance": balance_info.balance, "released_reservations": released_count},
        reason="Manual Recalculate AI Credits",
        request=request
    )
    return {
        "message": "AI Credit balance recalculated successfully",
        "balance": balance_info.balance,
        "released_reservations": released_count
    }


@router.get("/billing/workspaces/{workspace_id}/wcc-recharge-logs")
async def get_workspace_wcc_recharge_logs(
    workspace_id: uuid.UUID,
    db: Session = Depends(get_db),
    admin_user: str = Depends(get_admin_identity)
):
    ws_uuid = verify_admin_workspace(db, workspace_id)
    ws_id = str(ws_uuid)
    logs = (
        db.query(WCCRechargeLog)
        .filter(WCCRechargeLog.workspace_id == ws_uuid)
        .order_by(desc(WCCRechargeLog.created_at))
        .all()
    )
    return [
        {
            "id": str(r.id),
            "amount": float(r.amount),
            "currency": r.currency,
            "status": r.status,
            "gateway_order_id": r.gateway_order_id,
            "gateway_payment_id": r.gateway_payment_id,
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "updated_at": r.updated_at.isoformat() if r.updated_at else None
        }
        for r in logs
    ]


@router.get("/billing/workspaces/{workspace_id}/wcc-transactions")
async def get_workspace_wcc_transactions(
    workspace_id: uuid.UUID,
    db: Session = Depends(get_db),
    admin_user: str = Depends(get_admin_identity)
):
    ws_uuid = verify_admin_workspace(db, workspace_id)
    ws_id = str(ws_uuid)
    transactions = (
        db.query(WCCTransaction)
        .filter(WCCTransaction.workspace_id == ws_uuid)
        .order_by(desc(WCCTransaction.created_at))
        .all()
    )
    return [
        {
            "id": str(t.id),
            "meta_session_id": t.meta_session_id,
            "category": t.category,
            "status": t.status,
            "message_count": t.message_count,
            "debit_amount": float(t.debit_amount),
            "rate_applied": float(t.rate_applied),
            "created_at": t.created_at.isoformat() if t.created_at else None
        }
        for t in transactions
    ]


@router.post("/billing/workspaces/{workspace_id}/recalculate-wallet")
async def recalculate_wallet_op(
    workspace_id: uuid.UUID,
    db: Session = Depends(get_db),
    admin_user: str = Depends(get_admin_identity),
    request: Request = None
):
    ws_uuid = verify_admin_workspace(db, workspace_id)
    ws_id = str(ws_uuid)
    
    wallet = db.query(WCCWallet).filter(WCCWallet.workspace_id == ws_uuid).first()
    if not wallet:
        wallet = WCCService.get_balance(db, ws_id)
        
    old_bal = float(wallet.balance)
    
    recharges_raw = db.query(func.sum(WCCRechargeLog.amount)).filter(
        WCCRechargeLog.workspace_id == ws_uuid,
        WCCRechargeLog.status == "success"
    ).scalar()
    
    debits_raw = db.query(func.sum(WCCTransaction.debit_amount)).filter(
        WCCTransaction.workspace_id == ws_uuid,
        WCCTransaction.status == "success"
    ).scalar()
    
    wallet.balance = Decimal(str(recharges_raw or "0.00")) - Decimal(str(debits_raw or "0.00"))
    db.commit()
    new_bal = float(wallet.balance)
    
    log_audit(
        db=db,
        admin_user=admin_user,
        action="WALLET_RECALCULATED",
        workspace_id=ws_uuid,
        old_value={"balance": old_bal},
        new_value={"balance": new_bal},
        reason="Manual Recalculate Wallet Balance",
        request=request
    )
    return {"message": "Wallet balance recalculated successfully", "new_balance": new_bal}


@router.post("/billing/operations/verify-payment-manually")
async def verify_payment_manually_op(
    payload: dict,
    db: Session = Depends(get_db),
    admin_user: str = Depends(get_admin_identity),
    request: Request = None
):
    payment_id = payload.get("payment_id")
    if not payment_id:
        raise HTTPException(status_code=400, detail="payment_id is required")
        
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment record not found")
        
    old_status = payment.status.value
    payment.status = PaymentStatus.paid
    db.commit()
    
    # Trigger entitlement renewal
    EntitlementOrchestrator.renew_subscription(db, payment.workspace_id, payment)
    db.commit()
    
    log_audit(
        db=db,
        admin_user=admin_user,
        action="PAYMENT_VERIFIED_MANUALLY",
        workspace_id=payment.workspace_id,
        old_value={"status": old_status},
        new_value={"status": "paid"},
        reason=payload.get("reason", "Manual Admin Verification"),
        request=request
    )
    return {"message": "Payment verified manually and subscription renewed successfully"}


@router.post("/billing/operations/retry-recharge")
async def retry_recharge_op(
    payload: dict,
    db: Session = Depends(get_db),
    admin_user: str = Depends(get_admin_identity),
    request: Request = None
):
    recharge_log_id = payload.get("recharge_log_id")
    if not recharge_log_id:
        raise HTTPException(status_code=400, detail="recharge_log_id is required")
        
    recharge = db.query(WCCRechargeLog).filter(WCCRechargeLog.id == recharge_log_id).first()
    if not recharge:
        raise HTTPException(status_code=404, detail="Recharge log not found")
        
    if recharge.status == "success":
        return {"message": "Recharge already marked as success"}
        
    # Mark recharge as success and update wallet
    recharge.status = "success"
    
    wallet = db.query(WCCWallet).filter(WCCWallet.workspace_id == recharge.workspace_id).first()
    if not wallet:
        wallet = WCCService.get_balance(db, recharge.workspace_id)
        
    old_bal = float(wallet.balance)
    wallet.balance += recharge.amount
    db.commit()
    new_bal = float(wallet.balance)
    
    log_audit(
        db=db,
        admin_user=admin_user,
        action="RECHARGE_RETRY_SUCCESS",
        workspace_id=recharge.workspace_id,
        old_value={"balance": old_bal, "status": "pending"},
        new_value={"balance": new_bal, "status": "success"},
        reason=payload.get("reason", "Manual Retry Recharge Override"),
        request=request
    )
    return {"message": "Recharge retried successfully and credited to wallet", "new_balance": new_bal}


@router.post("/billing/operations/retry-credit-purchase")
async def retry_credit_purchase_op(
    payload: dict,
    db: Session = Depends(get_db),
    admin_user: str = Depends(get_admin_identity),
    request: Request = None
):
    payment_id = payload.get("payment_id")
    if not payment_id:
        raise HTTPException(status_code=400, detail="payment_id is required")
        
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment record not found")
        
    if payment.status == PaymentStatus.paid:
        return {"message": "Payment already paid"}
        
    # Locate credit pack from orders/metadata
    # Search webhook/notes
    pack_id = "credits_custom"
    credits = 100.0
    
    # Try finding pack_id from gateway data
    if payment.raw_payload:
        notes = payment.raw_payload.get("notes", {})
        pack_id = notes.get("pack_id", pack_id)
        
    pack = db.query(CreditPack).filter(CreditPack.pack_id == pack_id).first()
    if pack:
        credits = float(pack.credits)
        
    old_status = payment.status.value
    payment.status = PaymentStatus.paid
    db.commit()
    
    # Grant credits
    credit_service = BillingService().token_service
    credit_service.grant_purchased_credits(
        db=db,
        workspace_id=str(payment.workspace_id),
        credits=credits,
        payment_id=str(payment.id),
        gateway_order_id=payment.provider_order_id or "manual",
        description=f"Admin Manual Repair Credit Pack: {pack.name if pack else pack_id}"
    )
    db.commit()
    
    new_bal = float(credit_service.get_token_balance(db, str(payment.workspace_id)).balance)
    
    log_audit(
        db=db,
        admin_user=admin_user,
        action="CREDIT_PURCHASE_RETRY_SUCCESS",
        workspace_id=payment.workspace_id,
        old_value={"status": old_status},
        new_value={"status": "paid", "balance": new_bal},
        reason=payload.get("reason", "Manual Credit Purchase Verify"),
        request=request
    )
    return {"message": "Credit purchase verified manually and credits granted", "new_balance": new_bal}


@router.get("/billing/diagnostics")
async def get_billing_diagnostics(db: Session = Depends(get_db)):
    one_hour_ago = datetime.now(timezone.utc) - timedelta(hours=1)
    
    # 1. Pending Recharge Logs
    pending_recharges = (
        db.query(WCCRechargeLog)
        .filter(WCCRechargeLog.status == "pending", WCCRechargeLog.created_at < one_hour_ago)
        .order_by(desc(WCCRechargeLog.created_at))
        .all()
    )
    
    # 2. Pending Credit Purchases
    pending_credit_purchases = (
        db.query(Payment)
        .filter(Payment.status == PaymentStatus.pending, Payment.subscription_id.is_(None))
        .order_by(desc(Payment.created_at))
        .all()
    )
    
    # 3. Failed Payment Verifications
    failed_payments = (
        db.query(Payment)
        .filter(Payment.status == PaymentStatus.failed)
        .order_by(desc(Payment.created_at))
        .all()
    )
    
    # 4. Failed Webhooks
    failed_webhooks = (
        db.query(WebhookEvent)
        .filter(WebhookEvent.processed == False)
        .order_by(desc(WebhookEvent.created_at))
        .all()
    )
    
    # 5. Duplicate Ledger Detection
    duplicate_ledger_raw = (
        db.query(TokenLedger.reference_key, func.count(TokenLedger.id).label("cnt"))
        .filter(TokenLedger.reference_key.isnot(None), TokenLedger.status == "posted")
        .group_by(TokenLedger.reference_key)
        .having(func.count(TokenLedger.id) > 1)
        .all()
    )
    duplicate_ledgers = []
    for dup in duplicate_ledger_raw:
        item = db.query(TokenLedger).filter(TokenLedger.reference_key == dup.reference_key).first()
        duplicate_ledgers.append({
            "reference_key": dup.reference_key,
            "count": dup.cnt,
            "workspace_id": str(item.workspace_id) if item else None,
            "description": item.description if item else None
        })
        
    # 6. Wallet / Ledger mismatch
    wallet_ledger_mismatch = []
    wallets = db.query(WCCWallet).all()
    for w in wallets:
        recharges_raw = db.query(func.sum(WCCRechargeLog.amount)).filter(
            WCCRechargeLog.workspace_id == w.workspace_id,
            WCCRechargeLog.status == "success"
        ).scalar()
        
        debits_raw = db.query(func.sum(WCCTransaction.debit_amount)).filter(
            WCCTransaction.workspace_id == w.workspace_id,
            WCCTransaction.status == "success"
        ).scalar()
        
        recharges_sum = Decimal(str(recharges_raw or "0.00"))
        debits_sum = Decimal(str(debits_raw or "0.00"))
        expected_balance = recharges_sum - debits_sum
        if abs(w.balance - expected_balance) > Decimal("0.01"):
            ws = db.query(Workspace).filter(Workspace.id == w.workspace_id).first()
            wallet_ledger_mismatch.append({
                "workspace_id": str(w.workspace_id),
                "workspace_name": ws.name if ws else "Deleted Workspace",
                "wallet_balance": float(w.balance),
                "expected_balance": float(expected_balance)
            })
            
    # 7. Missing Subscription
    # Workspaces with no active subscription
    active_sub_ws_ids = db.query(Subscription.workspace_id).filter(Subscription.status == SubscriptionStatus.active).subquery()
    missing_subscription_raw = db.query(Workspace).filter(~Workspace.id.in_(active_sub_ws_ids)).limit(20).all()
    missing_subscription = [
        {"workspace_id": str(ws.id), "workspace_name": ws.name} for ws in missing_subscription_raw
    ]
    
    # 8. Missing Entitlement
    missing_entitlement = []
    active_subs = db.query(Subscription).filter(Subscription.status == SubscriptionStatus.active).all()
    for sub in active_subs:
        ent = db.query(PlanEntitlement).filter(PlanEntitlement.plan_id == sub.plan_id).first()
        if not ent:
            ws = db.query(Workspace).filter(Workspace.id == sub.workspace_id).first()
            missing_entitlement.append({
                "workspace_id": str(sub.workspace_id),
                "workspace_name": ws.name if ws else "Deleted Workspace",
                "subscription_id": str(sub.id)
            })
            
    # 9. Missing Wallet
    missing_wallet = []
    all_ws = db.query(Workspace).limit(100).all()
    for ws in all_ws:
        w = db.query(WCCWallet).filter(WCCWallet.workspace_id == ws.id).first()
        if not w:
            missing_wallet.append({"workspace_id": str(ws.id), "workspace_name": ws.name})
            
    # 10. Missing Token Ledger
    missing_token_ledger = []
    for ws in all_ws:
        cnt = db.query(TokenLedger).filter(TokenLedger.workspace_id == ws.id).count()
        if cnt == 0:
            missing_token_ledger.append({"workspace_id": str(ws.id), "workspace_name": ws.name})
            
    return {
        "pending_recharges": [
            {
                "id": str(r.id),
                "workspace_id": str(r.workspace_id),
                "amount": float(r.amount),
                "created_at": r.created_at.isoformat()
            } for r in pending_recharges
        ],
        "pending_credit_purchases": [
            {
                "id": str(p.id),
                "workspace_id": str(p.workspace_id),
                "amount": float(p.amount) / 100.0,
                "created_at": p.created_at.isoformat()
            } for p in pending_credit_purchases
        ],
        "failed_payments": [
            {
                "id": str(p.id),
                "workspace_id": str(p.workspace_id),
                "amount": float(p.amount) / 100.0,
                "created_at": p.created_at.isoformat()
            } for p in failed_payments
        ],
        "failed_webhooks": [
            {
                "id": str(w.id),
                "provider": w.provider,
                "event_type": w.event_type,
                "created_at": w.created_at.isoformat()
            } for w in failed_webhooks
        ],
        "duplicate_ledgers": duplicate_ledgers,
        "wallet_ledger_mismatch": wallet_ledger_mismatch,
        "missing_subscription": missing_subscription,
        "missing_entitlement": missing_entitlement,
        "missing_wallet": missing_wallet,
        "missing_token_ledger": missing_token_ledger
    }


@router.post("/billing/diagnostics/repair")
async def repair_billing_op(
    payload: dict,
    db: Session = Depends(get_db),
    admin_user: str = Depends(get_admin_identity),
    request: Request = None
):
    issue_type = payload.get("issue_type")
    workspace_id_str = payload.get("workspace_id")
    metadata = payload.get("metadata") or {}
    
    workspace_id = None
    if workspace_id_str:
        try:
            workspace_id = uuid.UUID(workspace_id_str)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid workspace UUID format")
            
    repaired_details = {}
    
    if issue_type == "missing_wallet":
        if not workspace_id:
            raise HTTPException(status_code=400, detail="workspace_id required")
        wallet = WCCService.get_balance(db, workspace_id)
        repaired_details = {"wallet_id": str(wallet.id), "balance": float(wallet.balance)}
        log_audit(db, admin_user, "REPAIR_MISSING_WALLET", workspace_id, None, repaired_details, "One-click diagnostics repair", request)
        
    elif issue_type == "missing_subscription":
        if not workspace_id:
            raise HTTPException(status_code=400, detail="workspace_id required")
        EntitlementOrchestrator.on_workspace_created(db, workspace_id)
        db.commit()
        repaired_details = {"repaired": True}
        log_audit(db, admin_user, "REPAIR_MISSING_SUBSCRIPTION", workspace_id, None, repaired_details, "One-click diagnostics repair", request)
        
    elif issue_type == "missing_entitlement":
        if not workspace_id:
            raise HTTPException(status_code=400, detail="workspace_id required")
        sub = db.query(Subscription).filter(Subscription.workspace_id == str(workspace_id), Subscription.status == SubscriptionStatus.active).first()
        if not sub:
            sub = db.query(Subscription).filter(Subscription.workspace_id == str(workspace_id)).order_by(Subscription.created_at.desc()).first()
        if not sub:
            raise HTTPException(status_code=400, detail="No subscription found for workspace to apply entitlements")
            
        entitlement = db.query(PlanEntitlement).filter(PlanEntitlement.plan_id == sub.plan_id).first()
        if not entitlement:
            plan = db.query(Plan).filter(Plan.id == sub.plan_id).first()
            raise HTTPException(status_code=400, detail=f"No entitlement config found for plan {plan.name if plan else sub.plan_id}")
            
        EntitlementOrchestrator.provision_resources(db, workspace_id, entitlement)
        db.commit()
        repaired_details = {"plan_id": str(sub.plan_id)}
        log_audit(db, admin_user, "REPAIR_MISSING_ENTITLEMENT", workspace_id, None, repaired_details, "One-click diagnostics repair", request)
        
    elif issue_type == "missing_token_ledger":
        if not workspace_id:
            raise HTTPException(status_code=400, detail="workspace_id required")
        ws = db.query(Workspace).filter(Workspace.id == workspace_id).first()
        plan_name = ws.plan_type or "free"
        plan = db.query(Plan).filter(func.lower(Plan.name) == plan_name.lower()).first()
        if not plan:
            plan = db.query(Plan).filter(Plan.name == "free").first()
        if not plan:
            raise HTTPException(status_code=400, detail="No plan configuration found")
            
        entitlement = db.query(PlanEntitlement).filter(PlanEntitlement.plan_id == plan.id).first()
        if not entitlement:
            raise HTTPException(status_code=400, detail="Plan entitlement config missing")
            
        ref_key = f"token_grant:{workspace_id}:manual_repair:{datetime.now(timezone.utc).timestamp()}"
        grant = TokenLedger(
            workspace_id=str(workspace_id),
            entry_type="token_grant",
            status="posted",
            tokens_delta=0,
            credits_delta=entitlement.included_ai_credits,
            balance_source="INCLUDED",
            reference_key=ref_key,
            description="Initial credits manually provisioned via repair console"
        )
        db.add(grant)
        db.commit()
        repaired_details = {"credits_delta": float(entitlement.included_ai_credits)}
        log_audit(db, admin_user, "REPAIR_MISSING_TOKEN_LEDGER", workspace_id, None, repaired_details, "One-click diagnostics repair", request)
        
    elif issue_type == "wallet_ledger_mismatch":
        if not workspace_id:
            raise HTTPException(status_code=400, detail="workspace_id required")
        wallet = db.query(WCCWallet).filter(WCCWallet.workspace_id == workspace_id).first()
        if not wallet:
            wallet = WCCService.get_balance(db, workspace_id)
        old_val = {"balance": float(wallet.balance)}
        
        recharges_raw = db.query(func.sum(WCCRechargeLog.amount)).filter(
            WCCRechargeLog.workspace_id == workspace_id,
            WCCRechargeLog.status == "success"
        ).scalar()
        
        debits_raw = db.query(func.sum(WCCTransaction.debit_amount)).filter(
            WCCTransaction.workspace_id == workspace_id,
            WCCTransaction.status == "success"
        ).scalar()
        
        wallet.balance = Decimal(str(recharges_raw or "0.00")) - Decimal(str(debits_raw or "0.00"))
        db.commit()
        
        new_val = {"balance": float(wallet.balance)}
        repaired_details = new_val
        log_audit(db, admin_user, "REPAIR_WALLET_LEDGER_MISMATCH", workspace_id, old_val, new_val, "One-click diagnostics repair", request)
        
    elif issue_type == "failed_webhook":
        event_id_str = metadata.get("event_id")
        if not event_id_str:
            raise HTTPException(status_code=400, detail="event_id metadata required")
        event_id = uuid.UUID(event_id_str)
        event = db.query(WebhookEvent).filter(WebhookEvent.id == event_id).first()
        if not event:
            raise HTTPException(status_code=404, detail="Webhook event not found")
        event.processed = False
        event.processed_at = None
        db.commit()
        repaired_details = {"replayed_event_id": event_id_str}
        log_audit(db, admin_user, "WEBHOOK_REPLAY_TRIGGERED", None, {"processed": True}, {"processed": False}, "One-click diagnostics repair", request)
        
    elif issue_type == "failed_payment":
        payment_id_str = metadata.get("payment_id")
        if not payment_id_str:
            raise HTTPException(status_code=400, detail="payment_id metadata required")
        payment_id = uuid.UUID(payment_id_str)
        payment = db.query(Payment).filter(Payment.id == payment_id).first()
        if not payment:
            raise HTTPException(status_code=404, detail="Payment record not found")
        old_status = payment.status.value
        payment.status = PaymentStatus.pending
        db.commit()
        repaired_details = {"payment_id": payment_id_str, "status": "pending"}
        log_audit(db, admin_user, "PAYMENT_RETRY_TRIGGERED", payment.workspace_id, {"status": old_status}, {"status": "pending"}, "One-click diagnostics repair", request)
        
    elif issue_type == "retry_recharge":
        recharge_log_id_str = metadata.get("recharge_log_id")
        if not recharge_log_id_str:
            raise HTTPException(status_code=400, detail="recharge_log_id metadata required")
        try:
            recharge_log_id = uuid.UUID(recharge_log_id_str)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid recharge_log_id UUID format")
        recharge = db.query(WCCRechargeLog).filter(WCCRechargeLog.id == recharge_log_id).first()
        if not recharge:
            raise HTTPException(status_code=404, detail="Recharge log not found")
        if recharge.status != "success":
            recharge.status = "success"
            wallet = db.query(WCCWallet).filter(WCCWallet.workspace_id == recharge.workspace_id).first()
            if not wallet:
                wallet = WCCService.get_balance(db, recharge.workspace_id)
            old_bal = float(wallet.balance)
            wallet.balance += recharge.amount
            db.commit()
            new_bal = float(wallet.balance)
            repaired_details = {"recharge_id": recharge_log_id_str, "new_balance": new_bal}
            log_audit(db, admin_user, "RECHARGE_RETRY_SUCCESS", recharge.workspace_id, {"balance": old_bal, "status": "pending"}, {"balance": new_bal, "status": "success"}, "One-click diagnostics repair", request)
        else:
            repaired_details = {"message": "Recharge already marked as success"}

    elif issue_type == "retry_credit_purchase":
        payment_id_str = metadata.get("payment_id")
        if not payment_id_str:
            raise HTTPException(status_code=400, detail="payment_id metadata required")
        try:
            payment_id = uuid.UUID(payment_id_str)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid payment_id UUID format")
        payment = db.query(Payment).filter(Payment.id == payment_id).first()
        if not payment:
            raise HTTPException(status_code=404, detail="Payment record not found")
        if payment.status != PaymentStatus.paid:
            pack_id = "credits_custom"
            credits = 100.0
            if payment.raw_payload:
                notes = payment.raw_payload.get("notes", {})
                pack_id = notes.get("pack_id", pack_id)
            pack = db.query(CreditPack).filter(CreditPack.pack_id == pack_id).first()
            if pack:
                credits = float(pack.credits)
            old_status = payment.status.value
            payment.status = PaymentStatus.paid
            db.commit()

            credit_service = BillingService().token_service
            credit_service.grant_purchased_credits(
                db=db,
                workspace_id=str(payment.workspace_id),
                credits=credits,
                payment_id=str(payment.id),
                gateway_order_id=payment.provider_order_id or "manual",
                description=f"Admin Manual Repair Credit Pack: {pack.name if pack else pack_id}"
            )
            db.commit()
            new_bal = float(credit_service.get_token_balance(db, str(payment.workspace_id)).balance)
            repaired_details = {"payment_id": payment_id_str, "new_balance": new_bal}
            log_audit(db, admin_user, "CREDIT_PURCHASE_RETRY_SUCCESS", payment.workspace_id, {"status": old_status}, {"status": "paid", "balance": new_bal}, "One-click diagnostics repair", request)
        else:
            repaired_details = {"message": "Payment already paid"}

    elif issue_type == "duplicate_ledger":
        ref_key = metadata.get("reference_key")
        if not ref_key:
            raise HTTPException(status_code=400, detail="reference_key metadata required")
        entries = db.query(TokenLedger).filter(TokenLedger.reference_key == ref_key).order_by(TokenLedger.created_at.asc()).all()
        if len(entries) <= 1:
            repaired_details = {"message": "No duplicates found for reference key"}
        else:
            deleted_ids = []
            for item in entries[1:]:
                db.delete(item)
                deleted_ids.append(str(item.id))
            db.commit()
            repaired_details = {"deleted_ids": deleted_ids}
            log_audit(db, admin_user, "REPAIR_DUPLICATE_LEDGER", None, {"count": len(entries)}, {"count": 1}, f"Deleted duplicate entries for {ref_key}", request)

    else:
        raise HTTPException(status_code=400, detail=f"Unsupported issue_type: {issue_type}")
        
    return {"status": "success", "repaired_details": repaired_details}


@router.post("/billing/workspaces/{workspace_id}/provision/{action}")
async def manual_provision_op(
    workspace_id: uuid.UUID,
    action: str,
    db: Session = Depends(get_db),
    admin_user: str = Depends(get_admin_identity),
    request: Request = None
):
    ws_uuid = verify_admin_workspace(db, workspace_id)
    ws_id = str(ws_uuid)
    repaired_details = {}
    
    if action == "run-orchestrator":
        EntitlementOrchestrator.on_workspace_created(db, uuid.UUID(ws_id))
        db.commit()
        repaired_details = {"orchestrator_executed": True}
        log_audit(db, admin_user, "PROVISION_RUN_ORCHESTRATOR", uuid.UUID(ws_id), None, repaired_details, "Manual Provisioning Action", request)
        
    elif action == "recreate-credits":
        db.query(TokenLedger).filter(
            TokenLedger.workspace_id == ws_id,
            TokenLedger.entry_type != "purchase"
        ).delete()
        
        ws = db.query(Workspace).filter(Workspace.id == ws_id).first()
        plan_name = ws.plan_type or "free"
        plan = db.query(Plan).filter(func.lower(Plan.name) == plan_name.lower()).first()
        if not plan:
            plan = db.query(Plan).filter(Plan.name == "free").first()
            
        if plan:
            ent = db.query(PlanEntitlement).filter(PlanEntitlement.plan_id == plan.id).first()
            if ent:
                ref_key = f"token_grant:{ws_id}:manual_recreate:{datetime.now(timezone.utc).timestamp()}"
                grant = TokenLedger(
                    workspace_id=ws_id,
                    entry_type="token_grant",
                    status="posted",
                    tokens_delta=0,
                    credits_delta=ent.included_ai_credits,
                    balance_source="INCLUDED",
                    reference_key=ref_key,
                    description="Recreated initial plan credits"
                )
                db.add(grant)
                
        db.commit()
        repaired_details = {"credits_recreated": True}
        log_audit(db, admin_user, "PROVISION_RECREATE_CREDITS", uuid.UUID(ws_id), None, repaired_details, "Manual Provisioning Action", request)
        
    elif action == "recreate-wallet":
        wallet = db.query(WCCWallet).filter(WCCWallet.workspace_id == ws_id).first()
        if wallet:
            wallet.balance = Decimal("0.00")
        else:
            wallet = WCCWallet(workspace_id=ws_id, balance=Decimal("0.00"))
            db.add(wallet)
            
        db.query(WCCRechargeLog).filter(WCCRechargeLog.workspace_id == ws_id).delete()
        db.query(WCCTransaction).filter(WCCTransaction.workspace_id == ws_id).delete()
        db.commit()
        
        repaired_details = {"wallet_recreated": True}
        log_audit(db, admin_user, "PROVISION_RECREATE_WALLET", uuid.UUID(ws_id), None, repaired_details, "Manual Provisioning Action", request)
        
    elif action == "reapply-plan-entitlements":
        ent = EntitlementService.get_workspace_entitlement(db, uuid.UUID(ws_id))
        EntitlementOrchestrator.provision_resources(db, uuid.UUID(ws_id), ent)
        db.commit()
        repaired_details = {"entitlements_reapplied": True, "plan_id": str(ent.plan_id)}
        log_audit(db, admin_user, "PROVISION_REAPPLY_ENTITLEMENTS", uuid.UUID(ws_id), None, repaired_details, "Manual Provisioning Action", request)
        
    elif action == "sync-subscription":
        sub = db.query(Subscription).filter(Subscription.workspace_id == ws_id, Subscription.status == SubscriptionStatus.active).first()
        if not sub:
            sub = db.query(Subscription).filter(Subscription.workspace_id == ws_id).order_by(Subscription.created_at.desc()).first()
            
        if not sub:
            raise HTTPException(status_code=400, detail="No subscription found to sync")
            
        if sub.provider in {"system", "manual"}:
            repaired_details = {"synced": False, "message": "Local subscription is system/manual managed"}
        else:
            try:
                gateway = BillingService()._resolve_gateway(sub.provider)
                gateway_sub = gateway.fetch_subscription(sub.provider_subscription_id)
                
                sub.status = SubscriptionStatus[gateway_sub.status.lower()] if gateway_sub.status.lower() in [s.value for s in SubscriptionStatus] else sub.status
                if gateway_sub.raw:
                    sub.current_period_start = datetime.fromtimestamp(gateway_sub.raw.get("current_start"), timezone.utc) if gateway_sub.raw.get("current_start") else sub.current_period_start
                    sub.current_period_end = datetime.fromtimestamp(gateway_sub.raw.get("current_end"), timezone.utc) if gateway_sub.raw.get("current_end") else sub.current_period_end
                db.commit()
                repaired_details = {"synced": True, "status": sub.status.value}
            except Exception as ex:
                raise HTTPException(status_code=500, detail=f"Gateway sync failed: {str(ex)}")
                
        log_audit(db, admin_user, "PROVISION_SYNC_SUBSCRIPTION", uuid.UUID(ws_id), None, repaired_details, "Manual Provisioning Action", request)
        
    elif action == "repair-workspace-billing":
        # Missing Wallet check
        wallet = db.query(WCCWallet).filter(WCCWallet.workspace_id == ws_id).first()
        if not wallet:
            wallet = WCCService.get_balance(db, ws_id)
            
        # Missing Subscription check
        sub = db.query(Subscription).filter(Subscription.workspace_id == ws_id, Subscription.status == SubscriptionStatus.active).first()
        if not sub:
            EntitlementOrchestrator.on_workspace_created(db, uuid.UUID(ws_id))
            db.commit()
            sub = db.query(Subscription).filter(Subscription.workspace_id == ws_id, Subscription.status == SubscriptionStatus.active).first()
            
        # Missing Entitlements check
        if sub:
            ent = db.query(PlanEntitlement).filter(PlanEntitlement.plan_id == sub.plan_id).first()
            if ent:
                EntitlementOrchestrator.provision_resources(db, uuid.UUID(ws_id), ent)
                db.commit()
                
        # Missing Token Ledger check
        ledger_cnt = db.query(TokenLedger).filter(TokenLedger.workspace_id == ws_id).count()
        if ledger_cnt == 0 and sub:
            ent = db.query(PlanEntitlement).filter(PlanEntitlement.plan_id == sub.plan_id).first()
            if ent:
                ref_key = f"token_grant:{ws_id}:manual_repair:{datetime.now(timezone.utc).timestamp()}"
                grant = TokenLedger(
                    workspace_id=ws_id,
                    entry_type="token_grant",
                    status="posted",
                    tokens_delta=0,
                    credits_delta=ent.included_ai_credits,
                    balance_source="INCLUDED",
                    reference_key=ref_key,
                    description="Recreated initial plan credits via workspace repair"
                )
                db.add(grant)
                db.commit()
                
        # Recalculate balances
        recharges_raw = db.query(func.sum(WCCRechargeLog.amount)).filter(
            WCCRechargeLog.workspace_id == ws_id,
            WCCRechargeLog.status == "success"
        ).scalar()
        
        debits_raw = db.query(func.sum(WCCTransaction.debit_amount)).filter(
            WCCTransaction.workspace_id == ws_id,
            WCCTransaction.status == "success"
        ).scalar()
        
        wallet.balance = Decimal(str(recharges_raw or "0.00")) - Decimal(str(debits_raw or "0.00"))
        db.commit()
        
        repaired_details = {"repaired_workspace_billing": True, "new_balance": float(wallet.balance)}
        log_audit(db, admin_user, "PROVISION_REPAIR_WORKSPACE_BILLING", uuid.UUID(ws_id), None, repaired_details, "Manual Provisioning Action", request)
        
    else:
        raise HTTPException(status_code=400, detail=f"Unknown provisioning action: {action}")
        
    return {"status": "success", "details": repaired_details}


@router.get("/billing/credit-packs")
async def get_credit_packs_admin(db: Session = Depends(get_db)):
    packs = db.query(CreditPack).order_by(CreditPack.amount.asc()).all()
    return [
        {
            "id": str(pack.id),
            "pack_id": pack.pack_id,
            "name": pack.name,
            "amount": float(pack.amount),
            "credits": pack.credits,
            "currency": pack.currency,
            "is_active": pack.is_active,
            "created_at": pack.created_at.isoformat() if pack.created_at else None
        }
        for pack in packs
    ]


class CreditPackCreateRequest(BaseModel):
    pack_id: str
    name: str
    amount: float
    credits: int
    currency: str = "INR"
    is_active: bool = True


@router.post("/billing/credit-packs")
async def create_credit_pack_admin(
    payload: CreditPackCreateRequest,
    db: Session = Depends(get_db),
    admin_user: str = Depends(get_admin_identity),
    request: Request = None
):
    existing = db.query(CreditPack).filter(CreditPack.pack_id == payload.pack_id).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Credit pack with ID '{payload.pack_id}' already exists")
        
    pack = CreditPack(
        pack_id=payload.pack_id,
        name=payload.name,
        amount=payload.amount,
        credits=payload.credits,
        currency=payload.currency,
        is_active=payload.is_active
    )
    db.add(pack)
    db.commit()
    db.refresh(pack)
    
    log_audit(
        db=db,
        admin_user=admin_user,
        action="CREDIT_PACK_CREATED",
        workspace_id=None,
        old_value=None,
        new_value=payload.dict(),
        reason="Admin Created Credit Pack",
        request=request
    )
    return {"message": "Credit pack created successfully", "pack_id": pack.pack_id}


class CreditPackUpdateRequest(BaseModel):
    name: Optional[str] = None
    amount: Optional[float] = None
    credits: Optional[int] = None
    currency: Optional[str] = None
    is_active: Optional[bool] = None


@router.put("/billing/credit-packs/{id}")
async def update_credit_pack_admin(
    id: uuid.UUID,
    payload: CreditPackUpdateRequest,
    db: Session = Depends(get_db),
    admin_user: str = Depends(get_admin_identity),
    request: Request = None
):
    pack = db.query(CreditPack).filter(CreditPack.id == id).first()
    if not pack:
        raise HTTPException(status_code=404, detail="Credit pack not found")
        
    old_val = {
        "name": pack.name,
        "amount": float(pack.amount),
        "credits": pack.credits,
        "currency": pack.currency,
        "is_active": pack.is_active
    }
    
    update_data = payload.dict(exclude_unset=True)
    for key, val in update_data.items():
        setattr(pack, key, val)
        
    db.commit()
    db.refresh(pack)
    
    new_val = {
        "name": pack.name,
        "amount": float(pack.amount),
        "credits": pack.credits,
        "currency": pack.currency,
        "is_active": pack.is_active
    }
    
    log_audit(
        db=db,
        admin_user=admin_user,
        action="CREDIT_PACK_UPDATED",
        workspace_id=None,
        old_value=old_val,
        new_value=new_val,
        reason="Admin Updated Credit Pack",
        request=request
    )
    return {"message": "Credit pack updated successfully"}


@router.delete("/billing/credit-packs/{id}")
async def delete_credit_pack_admin(
    id: uuid.UUID,
    db: Session = Depends(get_db),
    admin_user: str = Depends(get_admin_identity),
    request: Request = None
):
    pack = db.query(CreditPack).filter(CreditPack.id == id).first()
    if not pack:
        raise HTTPException(status_code=404, detail="Credit pack not found")
        
    old_val = {"pack_id": pack.pack_id, "name": pack.name}
    db.delete(pack)
    db.commit()
    
    log_audit(
        db=db,
        admin_user=admin_user,
        action="CREDIT_PACK_DELETED",
        workspace_id=None,
        old_value=old_val,
        new_value=None,
        reason="Admin Deleted Credit Pack",
        request=request
    )
    return {"message": "Credit pack deleted successfully"}


@router.get("/billing/wcc/rate-cards")
async def get_wcc_rate_cards(db: Session = Depends(get_db)):
    cards = db.query(WCCRateCard).order_by(WCCRateCard.category.asc()).all()
    
    if not cards:
        categories = [
            ("marketing", Decimal("1.09"), Decimal("1.25")),
            ("utility", Decimal("0.145"), Decimal("0.18")),
            ("authentication", Decimal("0.145"), Decimal("0.18")),
            ("service", Decimal("0.00"), Decimal("0.05"))
        ]
        for cat, meta, cust in categories:
            card = WCCRateCard(
                category=cat,
                region="IN",
                rate_per_message=cust,
                meta_cost=meta,
                customer_price=cust,
                is_active=True
            )
            db.add(card)
        db.commit()
        cards = db.query(WCCRateCard).order_by(WCCRateCard.category.asc()).all()
        
    return [
        {
            "id": str(c.id),
            "category": c.category,
            "region": c.region,
            "rate_per_message": float(c.customer_price),
            "meta_cost": float(c.meta_cost),
            "customer_price": float(c.customer_price),
            "profit": float(c.customer_price - c.meta_cost),
            "margin_percent": float(((c.customer_price - c.meta_cost) / c.customer_price) * 100) if c.customer_price > 0 else 0.0,
            "is_active": c.is_active,
            "created_at": c.created_at.isoformat() if c.created_at else None
        }
        for c in cards
    ]


class WCCRateCardUpdateRequest(BaseModel):
    meta_cost: float
    customer_price: float
    is_active: Optional[bool] = None

    @validator("customer_price")
    def validate_customer_markup(cls, customer_price, values):
        meta_cost = values.get("meta_cost")
        if meta_cost is not None and customer_price < meta_cost:
            raise ValueError("Customer Price must be greater than or equal to Meta Cost")
        if customer_price <= 0:
            raise ValueError("Customer Price must be strictly positive")
        if meta_cost is not None and meta_cost < 0:
            raise ValueError("Meta Cost must be non-negative")
        if customer_price > 1000.0 or (meta_cost is not None and meta_cost > 1000.0):
            raise ValueError("Pricing values cannot exceed ₹1000.00")
        return customer_price


@router.put("/billing/wcc/rate-cards/{id}")
async def update_wcc_rate_card(
    id: uuid.UUID,
    payload: WCCRateCardUpdateRequest,
    db: Session = Depends(get_db),
    admin_user: str = Depends(get_admin_identity),
    request: Request = None
):
    card = db.query(WCCRateCard).filter(WCCRateCard.id == id).first()
    if not card:
        raise HTTPException(status_code=404, detail="WCC Rate card not found")
        
    old_val = {
        "category": card.category,
        "meta_cost": float(card.meta_cost or 0.0),
        "customer_price": float(card.customer_price or 0.0),
        "is_active": card.is_active
    }
    
    card.meta_cost = Decimal(str(payload.meta_cost))
    card.customer_price = Decimal(str(payload.customer_price))
    card.rate_per_message = Decimal(str(payload.customer_price))
    if payload.is_active is not None:
        card.is_active = payload.is_active
        
    db.commit()
    db.refresh(card)
    
    new_val = {
        "category": card.category,
        "meta_cost": float(card.meta_cost),
        "customer_price": float(card.customer_price),
        "is_active": card.is_active
    }
    
    log_audit(
        db=db,
        admin_user=admin_user,
        action="WCC_RATE_CARD_UPDATED",
        workspace_id=None,
        old_value=old_val,
        new_value=new_val,
        reason="Admin Updated WCC Rate",
        request=request
    )
    return {"message": "WCC Rate card updated successfully"}


@router.get("/billing/wcc/analytics")
async def get_wcc_analytics(
    workspace_id: Optional[uuid.UUID] = None,
    db: Session = Depends(get_db),
    admin_user: str = Depends(get_admin_identity)
):
    """
    Returns platform-wide or workspace-specific WCC financial analytics:
    Revenue (sum of customer_price_applied), Meta Cost (sum of meta_cost_applied),
    Profit (dynamic sum), and Margin %.
    """
    query = db.query(
        func.sum(WCCTransaction.customer_price_applied).label("revenue"),
        func.sum(WCCTransaction.meta_cost_applied).label("meta_cost")
    ).filter(WCCTransaction.status == "success")
    
    if workspace_id:
        query = query.filter(WCCTransaction.workspace_id == workspace_id)
        
    result = query.first()
    
    revenue = Decimal(str(result.revenue or "0.00"))
    meta_cost = Decimal(str(result.meta_cost or "0.00"))
    profit = revenue - meta_cost
    margin_percent = (profit / revenue) * Decimal("100.00") if revenue > 0 else Decimal("0.00")
    
    return {
        "revenue": float(revenue),
        "meta_cost": float(meta_cost),
        "profit": float(profit),
        "margin_percent": float(margin_percent)
    }


class PlanEntitlementUpdateRequest(BaseModel):
    included_ai_credits: int
    included_wcc_wallet: float
    storage_limit_mb: int
    team_limit: int
    knowledge_base_limit: int
    gmail_limit: int
    lead_limit: int
    meeting_limit: int
    automation_limit: int
    flow: int
    allow_ai_topup: bool
    allow_purchased_ai_usage: bool
    allow_wcc_recharge: bool
    allow_purchased_wcc_usage: bool
    allow_flow_addon: bool
    allow_purchased_flow_usage: bool
    included_credit_reset_policy: str
    included_wallet_reset_policy: str
    feature_flags: Dict[str, Any]

    @validator("included_ai_credits")
    def validate_included_ai_credits(cls, v):
        if v < 0:
            raise ValueError("included_ai_credits must be a non-negative integer")
        return v

    @validator("included_wcc_wallet")
    def validate_included_wcc_wallet(cls, v):
        if v < 0:
            raise ValueError("included_wcc_wallet must be a non-negative number")
        return v

    @validator(
        "storage_limit_mb",
        "team_limit",
        "knowledge_base_limit",
        "gmail_limit",
        "lead_limit",
        "meeting_limit",
        "automation_limit",
        "flow",
    )
    def validate_limits(cls, v):
        if v < 0 and v != -1:
            raise ValueError("Limit must be a non-negative integer or -1 for unlimited")
        return v

    @validator("included_credit_reset_policy", "included_wallet_reset_policy")
    def validate_reset_policies(cls, v):
        if v is not None:
            v_upper = v.upper()
            if v_upper not in ("EXPIRE", "ROLLOVER"):
                raise ValueError("Reset policy must be 'EXPIRE' or 'ROLLOVER'")
            return v_upper
        return v


@router.get("/plan-entitlements")
async def get_plan_entitlements_admin(db: Session = Depends(get_db)):
    plans = db.query(Plan).all()
    entitlements_list = []
    
    for plan in plans:
        from app.services.billing.entitlement_service import EntitlementService
        ent = EntitlementService.ensure_plan_entitlement(db, plan)
        db.commit()
            
        entitlements_list.append({
            "id": str(ent.id),
            "plan_id": str(plan.id),
            "plan_name": plan.name,
            "included_ai_credits": ent.included_ai_credits,
            "included_wcc_wallet": float(ent.included_wcc_wallet),
            "storage_limit_mb": ent.storage_limit_mb,
            "team_limit": ent.team_limit,
            "knowledge_base_limit": ent.knowledge_base_limit,
            "gmail_limit": ent.gmail_limit,
            "lead_limit": ent.lead_limit,
            "meeting_limit": ent.meeting_limit,
            "automation_limit": ent.automation_limit,
            "flow": ent.flow,
            "allow_ai_topup": ent.allow_ai_topup,
            "allow_purchased_ai_usage": ent.allow_purchased_ai_usage,
            "allow_wcc_recharge": ent.allow_wcc_recharge,
            "allow_purchased_wcc_usage": ent.allow_purchased_wcc_usage,
            "allow_flow_addon": ent.allow_flow_addon,
            "allow_purchased_flow_usage": ent.allow_purchased_flow_usage,
            "included_credit_reset_policy": ent.included_credit_reset_policy,
            "included_wallet_reset_policy": ent.included_wallet_reset_policy,
            "feature_flags": ent.feature_flags,
            "created_at": ent.created_at.isoformat() if ent.created_at else None,
            "updated_at": ent.updated_at.isoformat() if ent.updated_at else None
        })
        
    return entitlements_list


@router.put("/plan-entitlements/{plan_id}")
async def update_plan_entitlement_admin(
    plan_id: uuid.UUID,
    payload: PlanEntitlementUpdateRequest,
    db: Session = Depends(get_db),
    admin_user: str = Depends(get_admin_identity),
    request: Request = None
):
    ent = db.query(PlanEntitlement).filter(PlanEntitlement.plan_id == plan_id).first()
    if not ent:
        raise HTTPException(status_code=404, detail="Plan entitlement not found")
        
    plan = db.query(Plan).filter(Plan.id == plan_id).first()
    plan_name = plan.name if plan else "Unknown Plan"

    # Capture before values for audit logging
    old_val = {
        "plan_name": plan_name,
        "included_ai_credits": ent.included_ai_credits,
        "included_wcc_wallet": float(ent.included_wcc_wallet),
        "storage_limit_mb": ent.storage_limit_mb,
        "team_limit": ent.team_limit,
        "knowledge_base_limit": ent.knowledge_base_limit,
        "gmail_limit": ent.gmail_limit,
        "lead_limit": ent.lead_limit,
        "meeting_limit": ent.meeting_limit,
        "automation_limit": ent.automation_limit,
        "flow": ent.flow,
        "allow_ai_topup": ent.allow_ai_topup,
        "allow_purchased_ai_usage": ent.allow_purchased_ai_usage,
        "allow_wcc_recharge": ent.allow_wcc_recharge,
        "allow_purchased_wcc_usage": ent.allow_purchased_wcc_usage,
        "allow_flow_addon": ent.allow_flow_addon,
        "allow_purchased_flow_usage": ent.allow_purchased_flow_usage,
        "included_credit_reset_policy": ent.included_credit_reset_policy,
        "included_wallet_reset_policy": ent.included_wallet_reset_policy,
        "feature_flags": ent.feature_flags
    }

    # Update values
    ent.included_ai_credits = payload.included_ai_credits
    ent.included_wcc_wallet = Decimal(str(payload.included_wcc_wallet))
    ent.storage_limit_mb = payload.storage_limit_mb
    ent.team_limit = payload.team_limit
    ent.knowledge_base_limit = payload.knowledge_base_limit
    ent.gmail_limit = payload.gmail_limit
    ent.lead_limit = payload.lead_limit
    ent.meeting_limit = payload.meeting_limit
    ent.automation_limit = payload.automation_limit
    ent.flow = payload.flow
    ent.allow_ai_topup = payload.allow_ai_topup
    ent.allow_purchased_ai_usage = payload.allow_purchased_ai_usage
    ent.allow_wcc_recharge = payload.allow_wcc_recharge
    ent.allow_purchased_wcc_usage = payload.allow_purchased_wcc_usage
    ent.allow_flow_addon = payload.allow_flow_addon
    ent.allow_purchased_flow_usage = payload.allow_purchased_flow_usage
    ent.included_credit_reset_policy = payload.included_credit_reset_policy
    ent.included_wallet_reset_policy = payload.included_wallet_reset_policy
    ent.feature_flags = payload.feature_flags

    db.commit()
    db.refresh(ent)

    # Capture after values
    new_val = {
        "plan_name": plan_name,
        "included_ai_credits": ent.included_ai_credits,
        "included_wcc_wallet": float(ent.included_wcc_wallet),
        "storage_limit_mb": ent.storage_limit_mb,
        "team_limit": ent.team_limit,
        "knowledge_base_limit": ent.knowledge_base_limit,
        "gmail_limit": ent.gmail_limit,
        "lead_limit": ent.lead_limit,
        "meeting_limit": ent.meeting_limit,
        "automation_limit": ent.automation_limit,
        "flow": ent.flow,
        "allow_ai_topup": ent.allow_ai_topup,
        "allow_purchased_ai_usage": ent.allow_purchased_ai_usage,
        "allow_wcc_recharge": ent.allow_wcc_recharge,
        "allow_purchased_wcc_usage": ent.allow_purchased_wcc_usage,
        "allow_flow_addon": ent.allow_flow_addon,
        "allow_purchased_flow_usage": ent.allow_purchased_flow_usage,
        "included_credit_reset_policy": ent.included_credit_reset_policy,
        "included_wallet_reset_policy": ent.included_wallet_reset_policy,
        "feature_flags": ent.feature_flags
    }

    # Log to AdminAuditLog
    log_audit(
        db=db,
        admin_user=admin_user,
        action="PLAN_ENTITLEMENT_UPDATED",
        workspace_id=None,
        old_value=old_val,
        new_value=new_val,
        reason=f"Admin Updated Plan Entitlements for plan {plan_name}",
        request=request
    )

    return {"message": "Plan entitlement updated successfully"}



def _require_platform_admin(request: Request, db: Session) -> str:

    # Try JWT bearer token first (standard API auth)
    try:
        token = request.cookies.get("access_token") or (
            request.headers.get("Authorization", "").removeprefix("Bearer ").strip() or None
        )
        if token:
            from app.core.config import settings
            from jose import jwt as _jwt
            payload = _jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
            sub = payload.get("sub")
            if sub:
                from app.models.user import User
                user = db.query(User).filter(User.id == sub).first()
                if user and user.platform_role == PlatformRole.PLATFORM_ADMIN:
                    return str(user.email or sub)
                raise HTTPException(status_code=403, detail="Platform admin permissions required")
    except HTTPException:
        raise
    except Exception:
        pass

    # Fallback: admin_session cookie (admin console flow)
    admin_id = get_admin_identity(request)
    if admin_id == "platform_admin":
        # No token resolved — check admin_session cookie
        token_cookie = request.cookies.get("admin_session")
        if not token_cookie:
            raise HTTPException(status_code=403, detail="Platform admin authentication required")
    return admin_id


@router.post("/invoices/{invoice_id}/regenerate-pdf")
async def admin_regenerate_invoice_pdf(
    invoice_id: str,
    request: Request,
    db: Session = Depends(get_db),
):
    
    admin_id = _require_platform_admin(request, db)

    from app.services.billing.invoice_service import InvoiceService
    from app.services.storage.service import get_storage

    try:
        inv_uuid = uuid.UUID(invoice_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid invoice_id UUID")

    invoice = db.query(Invoice).filter(Invoice.id == inv_uuid).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    old_url = invoice.pdf_url
    try:
        pdf_bytes = InvoiceService.generate_pdf_invoice(invoice)
        file_name = f"invoices/{invoice.id}.pdf"
        pdf_url = get_storage().provider._save_file_sync(file_name, pdf_bytes, "application/pdf")
        invoice.pdf_url = pdf_url
        db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"[ADMIN REGEN] Failed to regenerate PDF for invoice {invoice_id}: {e}")
        raise HTTPException(status_code=500, detail=f"PDF regeneration failed: {str(e)}")

    # Audit log
    log_audit(
        db=db,
        admin_user=admin_id,
        action="INVOICE_PDF_REGENERATED",
        workspace_id=invoice.workspace_id,
        old_value={"pdf_url": old_url},
        new_value={"pdf_url": pdf_url, "invoice_number": invoice.invoice_number},
        reason=f"Admin manually regenerated PDF for invoice {invoice.invoice_number}",
        request=request,
    )

    return {
        "status": "success",
        "invoice_id": str(invoice.id),
        "invoice_number": invoice.invoice_number,
        "pdf_url": pdf_url,
    }


@router.post("/invoices/regenerate-missing-pdfs")
async def admin_regenerate_missing_pdfs(
    request: Request,
    db: Session = Depends(get_db),
    limit: int = Query(default=50, ge=1, le=200, description="Max invoices to process per call"),
    dry_run: bool = Query(default=False, description="Preview count without actually regenerating"),
):
   
    admin_id = _require_platform_admin(request, db)

    from app.services.billing.invoice_service import InvoiceService
    from app.services.storage.service import get_storage

    missing = (
        db.query(Invoice)
        .filter(Invoice.pdf_url == None)  # noqa: E711
        .order_by(Invoice.issued_at.asc())
        .limit(limit)
        .all()
    )

    total_missing = db.query(Invoice).filter(Invoice.pdf_url == None).count()  # noqa: E711

    if dry_run:
        return {
            "dry_run": True,
            "total_missing": total_missing,
            "would_process": len(missing),
            "limit": limit,
        }

    results: Dict[str, Any] = {
        "total_missing_before": total_missing,
        "processed": len(missing),
        "success": 0,
        "failed": 0,
        "errors": [],
    }

    for invoice in missing:
        try:
            pdf_bytes = InvoiceService.generate_pdf_invoice(invoice)
            file_name = f"invoices/{invoice.id}.pdf"
            pdf_url = get_storage().provider._save_file_sync(file_name, pdf_bytes, "application/pdf")
            invoice.pdf_url = pdf_url
            # Commit each invoice individually so partial success is preserved
            db.commit()
            results["success"] += 1
        except Exception as e:
            db.rollback()
            results["failed"] += 1
            results["errors"].append({
                "invoice_id": str(invoice.id),
                "invoice_number": invoice.invoice_number,
                "error": str(e),
            })
            logger.error(f"[ADMIN BATCH REGEN] Failed invoice {invoice.id}: {e}")

    remaining_missing = db.query(Invoice).filter(Invoice.pdf_url == None).count()  # noqa: E711
    results["remaining_missing"] = remaining_missing

    # Single audit log for the entire batch
    log_audit(
        db=db,
        admin_user=admin_id,
        action="INVOICE_PDF_BATCH_REGENERATED",
        workspace_id=None,
        old_value={"total_missing": total_missing},
        new_value={
            "success": results["success"],
            "failed": results["failed"],
            "remaining_missing": remaining_missing,
        },
        reason=f"Admin batch regenerated missing invoice PDFs (limit={limit})",
        request=request,
    )

    return results

