from app.services.billing.gateway.base import PaymentGateway
from app.services.billing.gateway.payu import PayUGateway
from app.services.billing.gateway.razorpay import RazorpayGateway


def get_gateway(provider: str = "razorpay") -> PaymentGateway:
    normalized = (provider or "razorpay").lower()
    if normalized == "razorpay":
        return RazorpayGateway.from_env()
    if normalized == "payu":
        return PayUGateway.from_env()
    raise ValueError(f"Unsupported payment provider: {provider}")