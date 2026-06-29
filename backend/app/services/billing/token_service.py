import json
import uuid
from datetime import datetime, timezone, timedelta
from typing import Any
from decimal import Decimal
from sqlalchemy import case, func, cast, Date
from sqlalchemy.orm import Session
from app.models.plan import Plan
from app.models.subscription import Subscription
from app.models.token_ledger import TokenLedger
from app.models.usage import Usage
from app.services.billing.gateway.base import TokenBalance
from app.models.billing import Payment
from app.services.billing.feature_billing_service import FeatureBillingService
from .gateway.base import RESERVATION_MAX_PER_WORKSPACE, RESERVATION_TTL_MINUTES, TOKENS_PER_CREDIT


class TokenService:
    def __init__(self, usage_service):
        self.usage_service = usage_service

    def reserve_credits(
        self,
        db: Session,
        workspace_id: str,
        credits: float,
        reference_key: str,
        description: str,
    ) -> TokenLedger:
        if credits <= 0:
            raise ValueError("Credit reservation amount must be positive")

        with db.begin_nested():
            self._lock_workspace(db, workspace_id)

            # Limit concurrent pending reservations per workspace to prevent abuse/DoS
            active_count = (
                db.query(func.count(TokenLedger.id))
                .filter(
                    TokenLedger.workspace_id == workspace_id,
                    TokenLedger.status == "reserved",
                )
                .scalar() or 0
            )
            if int(active_count) >= RESERVATION_MAX_PER_WORKSPACE:
                raise ValueError("Too many concurrent pending operations for workspace")

            existing = (
                db.query(TokenLedger)
                .filter(TokenLedger.reference_key == reference_key)
                .with_for_update()
                .first()
            )
            if existing:
                if existing.status == "reserved":
                    return existing
                raise ValueError("Reference key has already been finalized")

            from app.services.billing.billing_service import enforce_execution_policy
            if not enforce_execution_policy(db, workspace_id, amount=credits):
                raise ValueError("Insufficient quota. Please upgrade your plan or enable overages.")

            active_subscription = self._get_active_subscription(db, workspace_id)
            reservation = TokenLedger(
                id=uuid.uuid4(),
                workspace_id=workspace_id,
                subscription_id=active_subscription.id if active_subscription else None,
                entry_type="usage_reservation",
                status="reserved",
                tokens_delta=0,
                credits_delta=-Decimal(str(credits)),
                reference_key=reference_key,
                description=description,
                expires_at=datetime.now(timezone.utc) + timedelta(minutes=RESERVATION_TTL_MINUTES),
            )
            db.add(reservation)
            db.flush()
            
        return reservation

    def reserve_tokens(
        self,
        db: Session,
        workspace_id: str,
        amount: int,
        reference_key: str,
        description: str,
    ) -> TokenLedger:
        credits = float(amount) / TOKENS_PER_CREDIT
        return self.reserve_credits(db, workspace_id, credits, reference_key, description)

    def settle_from_provider_usage(
        self,
        db: Session,
        reservation_id: str | uuid.UUID,
        usage: dict,
        feature_key: str,
        execution_id: str,
        request_id: str | None = None,
        commit: bool = True,
    ) -> TokenLedger:
      
     

        total_tokens      = int(usage.get("total_tokens", 0))
        prompt_tokens     = int(usage.get("prompt_tokens", 0))
        completion_tokens = int(usage.get("completion_tokens", 0))
        provider          = usage.get("provider", "unknown")
        model             = usage.get("model", "unknown")

        # Determine billing type for this feature
        rule = FeatureBillingService.get_rule(db, feature_key)
        if rule and rule.billing_type == "TOKEN":
            # credits = (total_tokens / unit_value) × credit_cost
            credits_used = float(FeatureBillingService.calculate_cost(db, feature_key, float(total_tokens)))
        elif rule and rule.billing_type == "FLAT":
            # Flat-rate features (e.g. per-request) ignore token count
            credits_used = float(FeatureBillingService.calculate_cost(db, feature_key, 1.0))
        else:
            # Unknown rule — use token count with TOKENS_PER_CREDIT default
            credits_used = float(total_tokens) / TOKENS_PER_CREDIT

        # Finalise the reservation to the REAL credit amount (not the estimate)
        ledger_row = self.finalize_credits(
            db=db,
            reservation_id=reservation_id,
            credits_used=credits_used,
            tokens_used=total_tokens,
        )

        # Stamp provider metadata — these are the single source of truth columns
        ledger_row.provider          = provider
        ledger_row.model             = model
        ledger_row.prompt_tokens     = prompt_tokens
        ledger_row.completion_tokens = completion_tokens
        ledger_row.total_tokens      = total_tokens
        ledger_row.execution_id      = execution_id
        ledger_row.request_id        = request_id
        ledger_row.feature_key       = feature_key

        db.flush()
        if commit:
            db.commit()

        return ledger_row

    def finalize_credits(
        self,
        db: Session,
        reservation_id: str | uuid.UUID,
        credits_used: float,
        tokens_used: int | None = None,
    ) -> TokenLedger:
        if isinstance(reservation_id, str):
            reservation_id = uuid.UUID(reservation_id)
        with db.begin_nested():
            reservation = (
                db.query(TokenLedger)
                .filter(TokenLedger.id == reservation_id)
                .with_for_update()
                .first()
            )
            if not reservation:
                raise ValueError("Billing reservation not found")
            
            workspace_id = reservation.workspace_id
            self._lock_workspace(db, workspace_id)

            if reservation.status == "posted":
                return reservation
            if reservation.status != "reserved":
                raise ValueError("Billing reservation is not active")

            # 1. Calculate pool balances excluding this reservation
            included_pool = db.query(func.coalesce(func.sum(TokenLedger.credits_delta), 0)).filter(
                TokenLedger.workspace_id == workspace_id,
                TokenLedger.status == "posted",
                TokenLedger.balance_source == "INCLUDED"
            ).scalar() or Decimal("0.0000")
            
            purchased_pool = db.query(func.coalesce(func.sum(TokenLedger.credits_delta), 0)).filter(
                TokenLedger.workspace_id == workspace_id,
                TokenLedger.status == "posted",
                TokenLedger.balance_source == "PURCHASED"
            ).scalar() or Decimal("0.0000")
            
            other_reservations_sum = db.query(func.coalesce(func.sum(TokenLedger.credits_delta), 0)).filter(
                TokenLedger.workspace_id == workspace_id,
                TokenLedger.status == "reserved",
                TokenLedger.id != reservation.id
            ).scalar() or Decimal("0.0000")
            
            other_reserved_abs = abs(Decimal(str(other_reservations_sum)))
            
            # Allocate other reservations against the pools in sequential priority
            included_available = max(Decimal(str(included_pool)) - other_reserved_abs, Decimal("0.0000"))
            rem_other = max(other_reserved_abs - Decimal(str(included_pool)), Decimal("0.0000"))
            purchased_available = max(Decimal(str(purchased_pool)) - rem_other, Decimal("0.0000"))
            
            credits_used_dec = Decimal(str(credits_used))
            
            # Determine how much is drawn from each pool
            drawn_included = min(credits_used_dec, included_available)
            rem_credits = credits_used_dec - drawn_included
            
            drawn_purchased = min(rem_credits, purchased_available)
            drawn_overage = rem_credits - drawn_purchased
            
            # Build list of non-zero draws
            draws = []
            if drawn_included > 0:
                draws.append(("INCLUDED", drawn_included))
            if drawn_purchased > 0:
                draws.append(("PURCHASED", drawn_purchased))
            if drawn_overage > 0:
                draws.append(("OVERAGE", drawn_overage))
                
            orig_ref = reservation.reference_key
            
            if not draws:
                # 0 credits consumed
                reservation.status = "posted"
                reservation.entry_type = "usage"
                reservation.credits_delta = Decimal("0.0000")
                reservation.tokens_delta = 0
                reservation.tokens_used = tokens_used or 0
                reservation.balance_source = "INCLUDED"
            else:
                # Update the original reservation row to be the first draw
                first_source, first_amount = draws[0]
                
                first_tokens = None
                if tokens_used is not None:
                    first_tokens = int(round(tokens_used * float(first_amount / credits_used_dec)))
                
                reservation.status = "posted"
                reservation.entry_type = "usage"
                reservation.credits_delta = -first_amount
                reservation.tokens_delta = 0
                reservation.balance_source = first_source
                reservation.reference_key = f"{orig_ref}:{first_source}"
                reservation.tokens_used = first_tokens
                
                # For remaining draws, insert new rows
                for source, amount in draws[1:]:
                    other_tokens = None
                    if tokens_used is not None:
                        other_tokens = int(round(tokens_used * float(amount / credits_used_dec)))
                        
                    split_entry = TokenLedger(
                        id=uuid.uuid4(),
                        workspace_id=reservation.workspace_id,
                        subscription_id=reservation.subscription_id,
                        entry_type="usage",
                        status="posted",
                        tokens_delta=0,
                        credits_delta=-amount,
                        balance_source=source,
                        reference_key=f"{orig_ref}:{source}",
                        description=reservation.description,
                        tokens_used=other_tokens,
                    )
                    db.add(split_entry)
                    
            # Update usage overage snapshot
            if tokens_used is not None:
                self.usage_service._record_usage_snapshot(
                    db=db,
                    workspace_id=reservation.workspace_id,
                    subscription_id=reservation.subscription_id,
                    tokens_used=tokens_used,
                )
            if drawn_overage > 0:
                self._update_usage_overage_snapshot(db, reservation, float(drawn_overage))
                
            db.flush()
            
        return reservation

    def finalize_token_usage(
        self,
        db: Session,
        reservation_id: str | uuid.UUID,
        tokens_used: int = 0,
    ) -> TokenLedger:
        # Determine credits consumed based on tokens_used
        try:
            reservation = db.query(TokenLedger).filter(TokenLedger.id == reservation_id).first()
            if not reservation:
                raise ValueError("Billing reservation not found")
            
            # If tokens_used is not specified, fall back to reservation amount
            if tokens_used > 0:
                credits_used = float(tokens_used) / TOKENS_PER_CREDIT
                actual_tokens = tokens_used
            else:
                credits_used = float(abs(reservation.credits_delta))
                actual_tokens = int(credits_used * TOKENS_PER_CREDIT)
                
            return self.finalize_credits(db, reservation_id, credits_used, tokens_used=actual_tokens)
        except Exception:
            db.rollback()
            raise

    def release_token_reservation(
        self,
        db: Session,
        reservation_id: str | uuid.UUID,
        reason: str,
    ) -> TokenLedger | None:
        if isinstance(reservation_id, str):
            reservation_id = uuid.UUID(reservation_id)
        with db.begin_nested():
            reservation = (
                db.query(TokenLedger)
                .filter(TokenLedger.id == reservation_id)
                .with_for_update()
                .first()
            )
            if reservation is None:
                return None
            if reservation.status != "reserved":
                return reservation

            reservation.status = "released"
            reservation.description = reason
            db.flush()
            
        return reservation

    def get_token_balance(self, db: Session, workspace_id: str) -> TokenBalance:
        return self._get_token_balance_locked(db, workspace_id)

    def _get_token_balance_locked(self, db: Session, workspace_id: str) -> TokenBalance:
        added_expr = func.coalesce(
            func.sum(
                case(
                    (
                        TokenLedger.status == "posted",
                        case((TokenLedger.credits_delta > 0, TokenLedger.credits_delta), else_=0),
                    ),
                    else_=0,
                )
            ),
            0,
        )
        used_expr = func.coalesce(
            func.sum(
                case(
                    (
                        TokenLedger.status == "posted",
                        case((TokenLedger.credits_delta < 0, -TokenLedger.credits_delta), else_=0),
                    ),
                    else_=0,
                )
            ),
            0,
        )
        reserved_expr = func.coalesce(
            func.sum(
                case(
                    (
                        TokenLedger.status == "reserved",
                        case((TokenLedger.credits_delta < 0, -TokenLedger.credits_delta), else_=0),
                    ),
                    else_=0,
                )
            ),
            0,
        )
        net_expr = func.coalesce(
            func.sum(
                case(
                    (TokenLedger.status.in_(["posted", "reserved"]), TokenLedger.credits_delta),
                    else_=0,
                )
            ),
            0,
        )
        added, used, reserved, net = (
            db.query(added_expr, used_expr, reserved_expr, net_expr)
            .filter(
                TokenLedger.workspace_id == workspace_id,
            )
            .one()
        )
        return TokenBalance(
            tokens_added=float(added or 0),
            tokens_used=float(used or 0),
            tokens_reserved=float(reserved or 0),
            balance=float(net or 0),
        )

    def _lock_workspace(self, db: Session, workspace_id: str, nowait: bool = False):
        if isinstance(workspace_id, str):
            workspace_id = uuid.UUID(workspace_id)
        from app.models.workspace import Workspace
        workspace = (
            db.query(Workspace)
            .filter(Workspace.id == workspace_id)
            .with_for_update(nowait=nowait)
            .first()
        )
        if workspace is None:
            raise ValueError("Workspace not found")
        return workspace

    def _get_active_subscription(self, db: Session, workspace_id: str):
        from app.models.subscription import Subscription
        from app.core.enums import SubscriptionStatus
        return (
            db.query(Subscription)
            .filter(
                Subscription.workspace_id == workspace_id,
                Subscription.status == SubscriptionStatus.active,
            )
            .order_by(Subscription.created_at.desc())
            .first()
        )

    def _update_usage_overage_snapshot(self, db: Session, reservation: TokenLedger, overage_credits: float) -> None:
        if reservation.subscription_id is None:
            return
        subscription = (
            db.query(Subscription)
            .filter(Subscription.id == reservation.subscription_id)
            .first()
        )
        if not subscription:
            return
        usage = self.usage_service._get_or_create_period_usage(
            db=db,
            workspace_id=reservation.workspace_id,
            subscription=subscription,
        )
        usage.overage_tokens = (usage.overage_tokens or 0) + int(overage_credits * 1000)

    def grant_plan_tokens(
        self,
        db: Session,
        workspace_id: str,
        subscription: Subscription,
        payment: Payment,
        plan_config: Any,
    ) -> Any:
        reference_key = f"token_grant:{payment.provider}:{payment.provider_payment_id}"

        existing = (
            db.query(TokenLedger)
            .filter(TokenLedger.reference_key == reference_key)
            .with_for_update()
            .first()
        )
        if existing:
            return existing

        try:
            with db.begin_nested():
                credits = float(plan_config.tokens) / TOKENS_PER_CREDIT
                entry = TokenLedger(
                    id=uuid.uuid4(),
                    workspace_id=workspace_id,
                    subscription_id=subscription.id,
                    payment_id=payment.id,
                    entry_type="token_grant",
                    status="posted",
                    tokens_delta=0,
                    credits_delta=Decimal(str(credits)),
                    balance_source="INCLUDED",
                    reference_key=reference_key,
                    description=f"{plan_config.label} subscription credits"
                )
                db.add(entry)
                db.flush()
            return entry

        except Exception:
            existing = (
                db.query(TokenLedger)
                .filter(TokenLedger.reference_key == reference_key)
                .first()
            )
            if not existing:
                raise RuntimeError(
                    f"Token grant failed after integrity conflict for {reference_key}"
                )
            return existing

    def get_transaction_history(self, db: Session, workspace_id: str, page: int = 1, limit: int = 20):
        offset = (page - 1) * limit
        total = (
            db.query(func.count(TokenLedger.id))
            .filter(
                TokenLedger.workspace_id == workspace_id,
                TokenLedger.status.in_(["posted", "released"]),
            )
            .scalar() or 0
        )
        entries = (
            db.query(TokenLedger)
            .filter(
                TokenLedger.workspace_id == workspace_id,
                TokenLedger.status.in_(["posted", "released"]),
            )
            .order_by(TokenLedger.created_at.desc())
            .offset(offset)
            .limit(limit)
            .all()
        )
        return {
            "total": int(total),
            "page": page,
            "limit": limit,
            "entries": [
                {
                    "id": str(e.id),
                    "entry_type": e.entry_type,
                    "status": e.status,
                    "tokens_delta": int(float(e.credits_delta) * 1000),
                    "credits_delta": float(e.credits_delta),
                    "description": e.description,
                    "created_at": e.created_at.isoformat() if e.created_at else None,
                }
                for e in entries
            ],
        }

    def get_daily_usage(self, db: Session, workspace_id: str, days: int = 30):
        cutoff = datetime.now(timezone.utc) - timedelta(days=days)
        rows = (
            db.query(
                cast(TokenLedger.created_at, Date).label("day"),
                func.sum(
                    case(
                        (TokenLedger.credits_delta < 0, -TokenLedger.credits_delta),
                        else_=0,
                    )
                ).label("credits_used"),
            )
            .filter(
                TokenLedger.workspace_id == workspace_id,
                TokenLedger.status == "posted",
                TokenLedger.entry_type == "usage",
                TokenLedger.created_at >= cutoff,
            )
            .group_by("day")
            .order_by("day")
            .all()
        )
        return [
            {
                "date": row.day.isoformat() if row.day else None,
                "tokens_used": int(float(row.credits_used or 0) * 1000),
                "credits_used": float(row.credits_used or 0),
            }
            for row in rows
        ]

    def get_burn_rate(self, db: Session, workspace_id: str) -> float:
        cutoff = datetime.now(timezone.utc) - timedelta(days=7)
        total_used = (
            db.query(
                func.sum(
                    case(
                        (TokenLedger.credits_delta < 0, -TokenLedger.credits_delta),
                        else_=0,
                    )
                )
            )
            .filter(
                TokenLedger.workspace_id == workspace_id,
                TokenLedger.status == "posted",
                TokenLedger.entry_type == "usage",
                TokenLedger.created_at >= cutoff,
            )
            .scalar() or 0
        )
        return float(total_used) / 7

    def reserve_feature_credits(
        self,
        db: Session,
        workspace_id: str,
        feature_key: str,
        unit_amount: float,
        reference_key: str,
        description: str,
    ) -> TokenLedger:
        if unit_amount <= 0:
            raise ValueError("Feature usage unit amount must be positive")

        with db.begin_nested():
            self._lock_workspace(db, workspace_id)

            active_count = (
                db.query(func.count(TokenLedger.id))
                .filter(
                    TokenLedger.workspace_id == workspace_id,
                    TokenLedger.status == "reserved",
                )
                .scalar() or 0
            )
            if int(active_count) >= RESERVATION_MAX_PER_WORKSPACE:
                raise ValueError("Too many concurrent pending operations for workspace")

            existing = (
                db.query(TokenLedger)
                .filter(TokenLedger.reference_key == reference_key)
                .with_for_update()
                .first()
            )
            if existing:
                if existing.status == "reserved":
                    return existing
                raise ValueError("Reference key has already been finalized")

            from app.services.billing.feature_billing_service import FeatureBillingService
            credits_cost = FeatureBillingService.calculate_cost(db, feature_key, unit_amount)

            from app.services.billing.billing_service import enforce_execution_policy
            if not enforce_execution_policy(db, workspace_id, amount=float(credits_cost)):
                raise ValueError("Insufficient quota. Please upgrade your plan or enable overages.")

            active_subscription = self._get_active_subscription(db, workspace_id)
            reservation = TokenLedger(
                id=uuid.uuid4(),
                workspace_id=workspace_id,
                subscription_id=active_subscription.id if active_subscription else None,
                entry_type="usage_reservation",
                status="reserved",
                tokens_delta=0,
                credits_delta=-Decimal(str(credits_cost)),
                reference_key=reference_key,
                description=description,
                expires_at=datetime.now(timezone.utc) + timedelta(minutes=RESERVATION_TTL_MINUTES),
                metadata_json=json.dumps({
                    "feature_key": feature_key,
                    "unit_amount": unit_amount
                })
            )
            db.add(reservation)
            db.flush()
            
        return reservation

    def finalize_feature_credits(
        self,
        db: Session,
        reservation_id: str | uuid.UUID,
        actual_units: float = 0.0,
    ) -> TokenLedger:
        if isinstance(reservation_id, str):
            reservation_id = uuid.UUID(reservation_id)
        reservation = (
            db.query(TokenLedger)
            .filter(TokenLedger.id == reservation_id)
            .with_for_update()
            .first()
        )
        if not reservation:
            raise ValueError("Billing reservation not found")
        if reservation.status == "posted":
            return reservation
        if reservation.status != "reserved":
            raise ValueError("Billing reservation is not active")

        feature_key = None
        orig_units = 1.0
        if reservation.metadata_json:
            try:
                meta = json.loads(reservation.metadata_json)
                feature_key = meta.get("feature_key")
                orig_units = float(meta.get("unit_amount", 1.0))
            except Exception:
                pass

        if not feature_key:
            raise ValueError("Feature key metadata missing from reservation")

        units = actual_units if actual_units > 0 else orig_units

        from app.services.billing.feature_billing_service import FeatureBillingService
        credits_cost = FeatureBillingService.calculate_cost(db, feature_key, units)

        tokens_used = int(float(credits_cost) * TOKENS_PER_CREDIT)
        return self.finalize_credits(db, reservation_id, float(credits_cost), tokens_used=tokens_used)

    def release_feature_reservation(
        self,
        db: Session,
        reservation_id: str | uuid.UUID,
        reason: str,
    ) -> TokenLedger | None:
        return self.release_token_reservation(db, reservation_id, reason)

    def grant_purchased_credits(
        self,
        db: Session,
        workspace_id: str,
        credits: float,
        payment_id: str,
        gateway_order_id: str,
        description: str = "Purchased AI Credit Pack",
    ) -> TokenLedger:
        reference_key = f"purchase:{workspace_id}:{payment_id}"
        existing = (
            db.query(TokenLedger)
            .filter(TokenLedger.reference_key == reference_key)
            .with_for_update()
            .first()
        )
        if existing:
            return existing

        try:
            with db.begin_nested():
                entry = TokenLedger(
                    id=uuid.uuid4(),
                    workspace_id=workspace_id,
                    entry_type="purchase",
                    status="posted",
                    tokens_delta=0,
                    credits_delta=Decimal(str(credits)),
                    balance_source="PURCHASED",
                    reference_key=reference_key,
                    description=description,
                    metadata_json=json.dumps({
                        "payment_id": payment_id,
                        "gateway_order_id": gateway_order_id,
                        "credits": credits
                    })
                )
                db.add(entry)
                db.flush()
            db.commit()
            return entry
        except Exception:
            db.rollback()
            existing = (
                db.query(TokenLedger)
                .filter(TokenLedger.reference_key == reference_key)
                .first()
            )
            if existing:
                return existing
            raise