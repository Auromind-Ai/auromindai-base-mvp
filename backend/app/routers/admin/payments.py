from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import PaymentSettings as PaymentSettingsModel
from app.schemas import PaymentSettings, PaymentSettingsResponse
from app.utils.crypto import encrypt_value  # 🔐 add this

router = APIRouter()


@router.get("/payments", response_model=PaymentSettingsResponse)
def get_payment_settings(db: Session = Depends(get_db)):
    """Retrieve current payment gateway settings (NO secrets exposed)."""

    settings = db.query(PaymentSettingsModel).first()

    if not settings:
        settings = PaymentSettingsModel(
            razorpay_key="",
            razorpay_secret="",
            paypal_client="",
            paypal_secret=""
        )
        db.add(settings)
        db.commit()
        db.refresh(settings)

    return PaymentSettingsResponse(
        razorpay_key=settings.razorpay_key,
        razorpay_secret="********",   # 🔒 masked
        paypal_client=settings.paypal_client,
        paypal_secret="********",     # 🔒 masked
    )


@router.post("/payments", status_code=status.HTTP_200_OK)
def save_payment_settings(
    data: PaymentSettings,
    db: Session = Depends(get_db),
):
    """Create or update payment gateway settings (encrypted storage)."""

    try:
        settings = db.query(PaymentSettingsModel).first()

        if settings:
            # ✅ update only if value provided
            if data.razorpay_key is not None:
                settings.razorpay_key = data.razorpay_key

            if data.razorpay_secret:
                settings.razorpay_secret = encrypt_value(data.razorpay_secret)

            if data.paypal_client is not None:
                settings.paypal_client = data.paypal_client

            if data.paypal_secret:
                settings.paypal_secret = encrypt_value(data.paypal_secret)

        else:
            settings = PaymentSettingsModel(
                razorpay_key=data.razorpay_key,
                razorpay_secret=encrypt_value(data.razorpay_secret) if data.razorpay_secret else None,
                paypal_client=data.paypal_client,
                paypal_secret=encrypt_value(data.paypal_secret) if data.paypal_secret else None,
            )
            db.add(settings)

        db.commit()
        db.refresh(settings)

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save payment settings.",
        ) from e

    return {"message": "Payment settings saved successfully."}