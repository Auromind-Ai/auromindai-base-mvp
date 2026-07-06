import json
import uuid
from datetime import datetime, timezone, timedelta
from decimal import Decimal
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, validator
from sqlalchemy import func, or_, desc, String
from sqlalchemy.orm import Session

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
from jose import jwt
from app.core.config import settings
from app.core.admin_security import verify_admin_workspace

router = APIRouter()


class WorkspaceSearchRequest(BaseModel):
    query: str


class AdjustCreditsRequest(BaseModel):
    credits: float
    reason: str


class AdjustWalletRequest(BaseModel):
    amount: float
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
        # 1. Multi-product Isolated Revenue Calculation
        credit_pack_ref_keys = db.query(TokenLedger.reference_key).filter(TokenLedger.entry_type == "purchase", TokenLedger.status == "posted").all()
        credit_pack_payment_db_ids = [ref[0].split(":")[-1] for ref in credit_pack_ref_keys if ref[0] and ":" in ref[0]]
        
        paid_payments = db.query(Payment).filter(Payment.status == PaymentStatus.paid).all()
        sub_revenue = 0.0
        ai_pack_revenue = 0.0
        for p in paid_payments:
            p_id_str = str(p.id)
            p_prov_id_str = str(p.provider_payment_id or "")
            if p_id_str in credit_pack_payment_db_ids or p_prov_id_str in credit_pack_payment_db_ids:
                ai_pack_revenue += float(p.amount)
            else:
                sub_revenue += float(p.amount)

        wcc_revenue = float(db.query(func.coalesce(func.sum(WCCRechargeLog.amount), 0)).filter(WCCRechargeLog.status == "success").scalar() or 0)
        flow_revenue = float(db.query(func.coalesce(func.sum(FlowPackPurchase.amount_paid), 0)).filter(FlowPackPurchase.status == "success").scalar() or 0)
        
        total_revenue = sub_revenue + ai_pack_revenue + wcc_revenue + flow_revenue
        
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
        
        # Today's Revenue
        now = datetime.now(timezone.utc)
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        today_sub = float(db.query(func.coalesce(func.sum(Payment.amount), 0)).filter(Payment.status == PaymentStatus.paid, Payment.created_at >= today_start).scalar() or 0)
        today_wcc = float(db.query(func.coalesce(func.sum(WCCRechargeLog.amount), 0)).filter(WCCRechargeLog.status == "success", WCCRechargeLog.created_at >= today_start).scalar() or 0)
        today_flow = float(db.query(func.coalesce(func.sum(FlowPackPurchase.amount_paid), 0)).filter(FlowPackPurchase.status == "success", FlowPackPurchase.created_at >= today_start).scalar() or 0)
        todays_revenue = today_sub + today_wcc + today_flow

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
                func.coalesce(func.sum(Payment.amount), 0).label("total")
            )
            .group_by(Payment.provider, Payment.status)
            .all()
        )
        gateway_breakdown = {}
        for r in gateway_stats_query:
            prov = r.provider or "razorpay"
            if prov not in gateway_breakdown:
                gateway_breakdown[prov] = {"success_count": 0, "failed_count": 0, "pending_count": 0, "success_amount": 0.0}
            if r.status == PaymentStatus.paid:
                gateway_breakdown[prov]["success_count"] += r.count
                gateway_breakdown[prov]["success_amount"] += float(r.total)
            elif r.status == PaymentStatus.failed:
                gateway_breakdown[prov]["failed_count"] += r.count
            elif r.status == PaymentStatus.pending:
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
    
    return {
        "workspace": {
            "id": str(ws.id),
            "name": ws.name,
            "owner_email": owner.email if owner else None,
            "owner_name": owner.full_name if owner else None
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
        wallet = WCCWallet(workspace_id=ws_uuid, balance=0.0)
        db.add(wallet)
        db.flush()
        
    old_bal = float(wallet.balance)
    wallet.balance += payload.amount
    db.commit()
    
    new_bal = float(wallet.balance)
    
    if payload.amount >= 0:
        log_entry = WCCRechargeLog(
            workspace_id=ws_uuid,
            amount=payload.amount,
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
            debit_amount=abs(payload.amount),
            rate_applied=0.0
        )
        db.add(log_entry)
        
    db.commit()
    
    log_audit(
        db=db,
        admin_user=admin_user,
        action="WALLET_ADJUSTED",
        workspace_id=ws_uuid,
        old_value={"balance": old_bal},
        new_value={"balance": new_bal, "adjustment": payload.amount},
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
        
    new_sub = Subscription(
        workspace_id=ws_uuid,
        plan_id=plan.id,
        status=SubscriptionStatus.active if payload.status == "active" else SubscriptionStatus.pending,
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
        status=PaymentStatus.paid,
        provider="manual",
        provider_payment_id=f"manual_override_{uuid.uuid4()}",
        provider_order_id=f"manual_override_{uuid.uuid4()}",
    )
    db.add(payment)
    db.flush()
    
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
        wallet.balance = 0.0
    else:
        wallet = WCCWallet(workspace_id=ws_uuid, balance=0.0)
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
        recharges_sum = db.query(func.sum(WCCRechargeLog.amount)).filter(WCCRechargeLog.workspace_id == w.workspace_id, WCCRechargeLog.status == "success").scalar() or 0.0
        debits_sum = db.query(func.sum(WCCTransaction.debit_amount)).filter(WCCTransaction.workspace_id == w.workspace_id, WCCTransaction.status == "success").scalar() or 0.0
        w.balance = recharges_sum - debits_sum
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
    
    recharges_sum = db.query(func.sum(WCCRechargeLog.amount)).filter(
        WCCRechargeLog.workspace_id == ws_uuid,
        WCCRechargeLog.status == "success"
    ).scalar() or 0.0
    
    debits_sum = db.query(func.sum(WCCTransaction.debit_amount)).filter(
        WCCTransaction.workspace_id == ws_uuid,
        WCCTransaction.status == "success"
    ).scalar() or 0.0
    
    wallet.balance = recharges_sum - debits_sum
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
        recharges_sum = db.query(func.sum(WCCRechargeLog.amount)).filter(
            WCCRechargeLog.workspace_id == w.workspace_id,
            WCCRechargeLog.status == "success"
        ).scalar() or Decimal("0.00")
        
        debits_sum = db.query(func.sum(WCCTransaction.debit_amount)).filter(
            WCCTransaction.workspace_id == w.workspace_id,
            WCCTransaction.status == "success"
        ).scalar() or Decimal("0.00")
        
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
        
        recharges_sum = db.query(func.sum(WCCRechargeLog.amount)).filter(
            WCCRechargeLog.workspace_id == workspace_id,
            WCCRechargeLog.status == "success"
        ).scalar() or Decimal("0.00")
        
        debits_sum = db.query(func.sum(WCCTransaction.debit_amount)).filter(
            WCCTransaction.workspace_id == workspace_id,
            WCCTransaction.status == "success"
        ).scalar() or Decimal("0.00")
        
        wallet.balance = recharges_sum - debits_sum
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
        recharges_sum = db.query(func.sum(WCCRechargeLog.amount)).filter(
            WCCRechargeLog.workspace_id == ws_id,
            WCCRechargeLog.status == "success"
        ).scalar() or Decimal("0.00")
        
        debits_sum = db.query(func.sum(WCCTransaction.debit_amount)).filter(
            WCCTransaction.workspace_id == ws_id,
            WCCTransaction.status == "success"
        ).scalar() or Decimal("0.00")
        
        wallet.balance = recharges_sum - debits_sum
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
    allow_wcc_recharge: bool
    included_credit_reset_policy: str
    included_wallet_reset_policy: str
    feature_flags: Dict[str, Any]

    @validator("flow")
    def validate_flow_quota(cls, v):
        if v < 0:
            raise ValueError("Flow quota must be a non-negative integer")
        return v


@router.get("/plan-entitlements")
async def get_plan_entitlements_admin(db: Session = Depends(get_db)):
    plans = db.query(Plan).all()
    entitlements_list = []
    
    for plan in plans:
        ent = db.query(PlanEntitlement).filter(PlanEntitlement.plan_id == plan.id).first()
        if not ent:
            # Seed default entitlement for this plan
            ent = PlanEntitlement(
                plan_id=plan.id,
                included_ai_credits=0,
                included_wcc_wallet=Decimal("0.00"),
                storage_limit_mb=500,
                team_limit=2,
                knowledge_base_limit=5,
                gmail_limit=1,
                lead_limit=100,
                meeting_limit=10,
                automation_limit=2,
                flow=5,
                allow_ai_topup=True,
                allow_wcc_recharge=True,
                included_credit_reset_policy="EXPIRE",
                included_wallet_reset_policy="EXPIRE",
                feature_flags={}
            )
            db.add(ent)
            db.commit()
            db.refresh(ent)
            
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
            "allow_wcc_recharge": ent.allow_wcc_recharge,
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
        "allow_wcc_recharge": ent.allow_wcc_recharge,
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
    ent.allow_wcc_recharge = payload.allow_wcc_recharge
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
        "allow_wcc_recharge": ent.allow_wcc_recharge,
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
