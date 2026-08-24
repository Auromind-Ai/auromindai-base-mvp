import hashlib
import json
from typing import Any
import razorpay.errors as razorpay_errors
from decimal import Decimal, ROUND_HALF_UP
from app.models.workspace import Workspace
from app.utils.money import to_paise
from app.services.billing.gateway.base import BillingPlanConfig, GatewayPayment, GatewaySubscription, GatewayWebhookEvent, PaymentGateway


class RazorpayGateway(PaymentGateway):
    provider = "razorpay"

    def __init__(self, client: Any, webhook_secret: str | None, public_key: str | None):
        self.client = client
        self.webhook_secret = webhook_secret
        self.public_key = public_key

    @classmethod
    def from_env(cls) -> "RazorpayGateway":
        import razorpay
        from app.database import SessionLocal
        from app.services.platform_settings_service import get_setting

        from app.services.config_service import config_service
        key = config_service.get("razorpay_key")
        secret = config_service.get("razorpay_secret")
        webhook_secret = config_service.get("razorpay_webhook_secret")

        if not key or not secret:
            raise ValueError("Razorpay is not configured")

        client = razorpay.Client(auth=(key, secret))
        return cls(
            client=client,
            webhook_secret=webhook_secret,
            public_key=key,
        )

    def get_public_key(self) -> str | None:
        return self.public_key

    def create_customer(
        self,
        workspace: Workspace,
        user_email: str,
        user_name: str | None,
    ) -> str | None:
        try:
            existing = self.client.customer.all({
                "email": user_email
            })
            if existing.get("items"):
                return existing["items"][0]["id"]
        except Exception:
            pass

        try:
            customer = self.client.customer.create({
                "name": user_name or workspace.name,
                "email": user_email,
                "notes": {"workspace_id": str(workspace.id)},
            })
            return customer["id"]
        except razorpay_errors.BadRequestError as e:
            if "Customer already exists" in str(e):
                existing = self.client.customer.all({
                    "email": user_email
                })
                if existing.get("items"):
                    return existing["items"][0]["id"]
            raise ValueError(f"Razorpay customer creation failed: {str(e)}")
        except (razorpay_errors.GatewayError, razorpay_errors.ServerError) as e:
            raise ValueError(f"Razorpay gateway error: {str(e)}")
        except Exception as e:
            raise ValueError(f"Unexpected payment gateway error: {str(e)}")

    def _create_dynamic_plan(self, plan_config: BillingPlanConfig, workspace: Workspace) -> str:
        from app.services.billing.gst_service import GSTService
        from decimal import Decimal
        from app.database import SessionLocal
        from app.models.platform_setting import PlatformSetting
        from app.services.platform_settings_service import clear_settings_cache

        gst_calcs = GSTService.calculate_gst(
            amount=Decimal(str(plan_config.amount)),
            customer_state=workspace.billing_state,
            customer_country=workspace.billing_country or "IN",
            product_type="subscription",
            db=None
        )
        total_amount = gst_calcs["total_amount"]

        is_yearly = (plan_config.billing_cycle == "yearly")
        plan_period = "yearly" if is_yearly else "monthly"
        plan_data = self.client.plan.create(data={
            "period": plan_period,
            "interval": 1,
            "item": {
                "name": f"Auromind {plan_config.label} {'Annual' if is_yearly else 'Monthly'} Plan",
                "amount": to_paise(total_amount),
                "currency": "INR",
                "description": plan_config.description or f"Subscription for {plan_config.label}"
            }
        })
        plan_id = plan_data["id"]

        try:
            with SessionLocal() as db:
                suffix = "_yearly" if is_yearly else ""
                db_key = f"razorpay_{plan_config.key}{suffix}_plan_id"
                setting = db.query(PlatformSetting).filter(PlatformSetting.key == db_key).first()
                if setting:
                    setting.value = plan_id
                else:
                    setting = PlatformSetting(key=db_key, value=plan_id, value_type="string")
                    db.add(setting)
                db.commit()
            clear_settings_cache()
        except Exception as db_err:
            print(f"Warning: Failed to persist plan_id {plan_id} to settings DB: {db_err}")

        return plan_id

    def create_subscription(
        self,
        plan_config: BillingPlanConfig,
        workspace: Workspace,
        user_id: str,
        user_email: str,
        user_name: str | None,
    ) -> dict[str, Any]:
        if not self.public_key:
            raise ValueError("Razorpay public key not configured")

        plan_id = plan_config.provider_plan_ids.get(self.provider)
        if not plan_id:
            try:
                plan_id = self._create_dynamic_plan(plan_config, workspace)
            except Exception as e:
                raise ValueError(f"Razorpay plan is not configured for {plan_config.label} and dynamic creation failed: {str(e)}")

        is_yearly = (plan_config.billing_cycle == "yearly")
        payload = {
            "plan_id": plan_id,
            "total_count": 1 if is_yearly else 12,
            "quantity": 1,
            "customer_notify": 1,
            "notes": {
                "workspace_id": str(workspace.id),
                "plan_key": plan_config.key,
                "billing_cycle": plan_config.billing_cycle,
                "user_id": str(user_id),
            },
        }
        try:
            subscription_data = self.client.subscription.create(payload)
        except razorpay_errors.BadRequestError as e:
            err_msg = str(e).lower()
            # If the stored plan_id was stale/invalid on Razorpay, auto-heal by generating a new dynamic plan
            if "invalid" in err_msg or "could not be found" in err_msg or "id provided" in err_msg:
                try:
                    new_plan_id = self._create_dynamic_plan(plan_config, workspace)
                    payload["plan_id"] = new_plan_id
                    plan_id = new_plan_id
                    subscription_data = self.client.subscription.create(payload)
                except Exception as retry_err:
                    raise ValueError(f"Invalid subscription request and auto-creation failed: {str(retry_err)}")
            else:
                raise ValueError(f"Invalid subscription request: {str(e)}")
        except (razorpay_errors.GatewayError, razorpay_errors.ServerError) as e:
            raise ValueError(f"Razorpay gateway error: {str(e)}")
        except Exception as e:
            raise ValueError(f"Unexpected payment gateway error: {str(e)}")

        return {
            "provider": self.provider,
            "subscription_id": subscription_data["id"],
            "public_key": self.public_key,
            "plan_reference": plan_id,
            "prefill": {
                "email": user_email,
                "name": user_name or user_email,
            },
            "raw": subscription_data,
        }

    def verify_payment(self, payload: dict[str, Any]) -> dict[str, str]:
        if "order_id" in payload or "razorpay_order_id" in payload:
            order_id = payload.get("order_id") or payload.get("razorpay_order_id")
            payment_id = payload.get("payment_id") or payload.get("razorpay_payment_id")
            signature = payload.get("signature") or payload.get("razorpay_signature")
            verification = {
                "razorpay_order_id": order_id,
                "razorpay_payment_id": payment_id,
                "razorpay_signature": signature,
            }
            try:
                self.client.utility.verify_payment_signature(verification)
                return {
                    "payment_id": payment_id,
                    "order_id": order_id,
                    "signature": signature,
                }
            except razorpay_errors.SignatureVerificationError as e:
                raise ValueError(f"Invalid payment signature: {str(e)}")
            except Exception as e:
                raise ValueError(f"Payment verification failed: {str(e)}")

        verification = {
            "razorpay_payment_id": payload["payment_id"],
            "razorpay_subscription_id": payload["subscription_id"],
            "razorpay_signature": payload["signature"],
        }
        try:
            self.client.utility.verify_subscription_payment_signature(verification)
            return {
                "payment_id": payload["payment_id"],
                "subscription_id": payload["subscription_id"],
                "signature": payload["signature"],
            }
        except razorpay_errors.SignatureVerificationError as e:
            raise ValueError(f"Invalid payment signature: {str(e)}")
        except Exception as e:
            raise ValueError(f"Payment verification failed: {str(e)}")

    def handle_webhook(self, body: bytes, signature: str) -> GatewayWebhookEvent:
        if not self.webhook_secret:
            raise ValueError("Razorpay webhook secret not configured")

        try:
            self.client.utility.verify_webhook_signature(
                body.decode("utf-8"),
                signature,
                self.webhook_secret,
            )
        except razorpay_errors.SignatureVerificationError as e:
            raise ValueError(f"Invalid webhook signature: {str(e)}")
        except Exception as e:
            raise ValueError(f"Webhook signature check failed: {str(e)}")

        event = json.loads(body.decode("utf-8"))
        event_name = event.get("event", "")
        payload = event.get("payload", {})
        entity: dict[str, Any]

        if event_name.startswith("subscription."):
            entity = {
                "subscription": payload.get("subscription", {}).get("entity", {}),
                "payment": payload.get("payment", {}).get("entity", {}),
            }
        elif event_name in {"payment.captured", "payment.failed", "payment.refunded", "refund.created"}:
            entity = {
                "payment": payload.get("payment", {}).get("entity", {}),
                "refund": payload.get("refund", {}).get("entity", {}),
                "subscription": payload.get("subscription", {}).get("entity", {}),
            }
        else:
            entity = payload

        event_id = event.get("id") or hashlib.sha256(body).hexdigest()

        return GatewayWebhookEvent(
            provider=self.provider,
            event_id=event_id,
            event_type=event_name,
            entity=entity,
            raw_event=event,
        )

    def fetch_subscription(self, subscription_id: str) -> GatewaySubscription:
        try:
            data = self.client.subscription.fetch(subscription_id)
            return GatewaySubscription(
                provider=self.provider,
                subscription_id=data["id"],
                status=data.get("status", ""),
                customer_id=data.get("customer_id"),
                start_at=data.get("start_at"),
                end_at=data.get("end_at"),
                current_start=data.get("current_start"),
                current_end=data.get("current_end"),
                plan_reference=data.get("plan_id"),
                raw=data,
            )
        except razorpay_errors.BadRequestError as e:
            raise ValueError(f"Subscription fetch failed: {str(e)}")
        except (razorpay_errors.GatewayError, razorpay_errors.ServerError) as e:
            raise ValueError(f"Razorpay subscription fetch gateway error: {str(e)}")
        except Exception as e:
            raise ValueError(f"Unexpected subscription fetch error: {str(e)}")

    def fetch_payment(self, payment_id: str) -> GatewayPayment:
        try:
            data = self.client.payment.fetch(payment_id)
            return GatewayPayment(
                provider=self.provider,
                payment_id=data["id"],
                amount=int(data.get("amount") or 0),
                currency=(data.get("currency") or "INR").upper(),
                status=(data.get("status") or "").lower(),
                subscription_id=data.get("subscription_id"),
                customer_id=data.get("customer_id"),
                method=data.get("method"),
                raw=data,
            )
        except razorpay_errors.BadRequestError as e:
            raise ValueError(f"Payment fetch failed: {str(e)}")
        except (razorpay_errors.GatewayError, razorpay_errors.ServerError) as e:
            raise ValueError(f"Razorpay payment fetch gateway error: {str(e)}")
        except Exception as e:
            raise ValueError(f"Unexpected payment fetch error: {str(e)}")
