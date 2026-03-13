from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import PaymentSettings as payments
from app.schemas import  PaymentSettings

router = APIRouter()


@router.get("/payments")
def get_payment_settings(db: Session = Depends(get_db)):

    settings = db.query(payments).first()

    if not settings:
        return {
            "razorpay_key": "",
            "razorpay_secret": "",
            "paypal_client": "",
            "paypal_secret": ""
        }

    return settings


@router.post("/payments")
def save_payment_settings(
    data: PaymentSettings,
    db: Session = Depends(get_db)
):

    settings = db.query(payments).first()

    if settings:
        settings.razorpay_key = data.razorpay_key
        settings.razorpay_secret = data.razorpay_secret
        settings.paypal_client = data.paypal_client
        settings.paypal_secret = data.paypal_secret
    else:
        settings = payments(**data.model_dump())
        db.add(settings)

    db.commit()

    return {"message": "Payment settings saved"}