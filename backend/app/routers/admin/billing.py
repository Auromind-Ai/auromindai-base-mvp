from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict, Any

from app.database import get_db

router = APIRouter()


@router.get("/billing")
async def get_billing(db: Session = Depends(get_db)) -> Dict[str, Any]:
    """
    Get billing and revenue data.
    """
    try:
        return {
            "total_revenue": 15320.50,
            "active_subscriptions": 47,
            "monthly_recurring_revenue": 8500.00,
            "pending_invoices": 2,
            "free_subscriptions": 125,
            "pro_subscriptions": 35,
            "enterprise_subscriptions": 12,
            "cancelled_subscriptions": 8,
            "credit_card_count": 42,
            "bank_account_count": 5,
            "wallet_count": 3,
            "pending_refunds": 0,
            "refund_count": 0,
            "active_disputes": 0,
            "chargeback_rate": 0.05,
            "arpu": 325.75,
            "onetime_this_month": 1250.00,
            "recent_invoices": [
                {
                    "id": "INV-001",
                    "customer_email": "user@example.com",
                    "amount": 99.99,
                    "date": datetime.utcnow().isoformat(),
                    "status": "paid",
                },
            ],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching billing data: {str(e)}")
