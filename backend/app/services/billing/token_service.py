import json
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy import case, func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.plan import Plan
from app.models.subscription import Subscription
from app.models.token_ledger import TokenLedger
from app.models.usage import Usage
from app.services.billing.gateway.base import TokenBalance
from app.models.billing import Payment

from .gateway.base import RESERVATION_MAX_PER_WORKSPACE, RESERVATION_TTL_MINUTES


class TokenService:
    def __init__(self, usage_service):
        self.usage_service = usage_service
    def reserve_tokens(
        self,
        db: Session,
        workspace_id: str,
        amount: int,
        reference_key: str,
        description: str,
    ) -> TokenLedger:
        """Reserve tokens for a workspace.
        """
        try:
            if amount <= 0:
                raise ValueError("Token reservation amount must be positive")

            self._lock_workspace(db, workspace_id)

            # Limit concurrent pending reservations per workspace to prevent abuse/DoS
            active_count = (
                db.query(func.count(TokenLedger.id))
                .filter(
                    TokenLedger.workspace_id == workspace_id,
                    TokenLedger.status == "reserved",
                )
                .scalar()
            )
            if active_count is None:
                active_count = 0
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
                    db.commit()
                    return existing
                raise ValueError("Reference key has already been finalized")

            from app.services.billing.billing_service import enforce_execution_policy
            if not enforce_execution_policy(db, workspace_id):
                raise ValueError("Insufficient quota. Please upgrade your plan or enable overages.")

            active_subscription = self._get_active_subscription(db, workspace_id)
            reservation = TokenLedger(
                id=uuid.uuid4(),
                workspace_id=workspace_id,
                subscription_id=active_subscription.id if active_subscription else None,
                entry_type="usage_reservation",
                status="reserved",
                tokens_delta=-amount,
                reference_key=reference_key,
                description=description,
                expires_at=datetime.now(timezone.utc) + timedelta(minutes=RESERVATION_TTL_MINUTES),
            )
            db.add(reservation)
            db.flush()
            db.commit()
            return reservation
        except Exception:
            db.rollback()
            raise

    def finalize_token_usage(
        self,
        db: Session,
        reservation_id: str | uuid.UUID,
        tokens_used: int = 0,
    ) -> TokenLedger:
        try:
            reservation = (
                db.query(TokenLedger)
                .filter(TokenLedger.id == reservation_id)
                .with_for_update()
                .first()
            )
            if not reservation:
                raise ValueError("Billing reservation not found")
            if reservation.status == "posted":
                db.commit()
                return reservation
            if reservation.status != "reserved":
                raise ValueError("Billing reservation is not active")

            reservation.status = "posted"
            reservation.entry_type = "usage"
            reservation.description = reservation.description or "AI usage"
            actual_tokens = tokens_used if tokens_used > 0 else abs(reservation.tokens_delta)
            reservation.tokens_delta = -actual_tokens
            usage = self.usage_service._record_usage_snapshot(
                db=db,
                workspace_id=reservation.workspace_id,
                subscription_id=reservation.subscription_id,
                tokens_used=actual_tokens,
            )
            self._apply_token_overage(db=db, reservation=reservation, usage=usage)
            db.flush()
            db.commit()
            return reservation
        except Exception:
            db.rollback()
            raise

    def release_token_reservation(
        self,
        db: Session,
        reservation_id: str | uuid.UUID,
        reason: str,
    ) -> TokenLedger | None:
        try:
            reservation = (
                db.query(TokenLedger)
                .filter(TokenLedger.id == reservation_id)
                .with_for_update()
                .first()
            )
            if reservation is None:
                db.commit()
                return None
            if reservation.status != "reserved":
                db.commit()
                return reservation

            reservation.status = "released"
            reservation.description = reason
            db.flush()
            db.commit()
            return reservation
        except Exception:
            db.rollback()
            raise

    def get_token_balance(self, db: Session, workspace_id: str) -> TokenBalance:
        return self._get_token_balance_locked(db, workspace_id)

    def _get_token_balance_locked(self, db: Session, workspace_id: str) -> TokenBalance:
        added_expr = func.coalesce(
            func.sum(
                case(
                    (
                        TokenLedger.status == "posted",
                        case((TokenLedger.tokens_delta > 0, TokenLedger.tokens_delta), else_=0),
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
                        case((TokenLedger.tokens_delta < 0, -TokenLedger.tokens_delta), else_=0),
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
                        case((TokenLedger.tokens_delta < 0, -TokenLedger.tokens_delta), else_=0),
                    ),
                    else_=0,
                )
            ),
            0,
        )
        net_expr = func.coalesce(
            func.sum(
                case(
                    (TokenLedger.status.in_(["posted", "reserved"]), TokenLedger.tokens_delta),
                    else_=0,
                )
            ),
            0,
        )
        added, used, reserved, net = (
            db.query(added_expr, used_expr, reserved_expr, net_expr)
            .filter(TokenLedger.workspace_id == workspace_id)
            .one()
        )
        return TokenBalance(
            tokens_added=int(added or 0),
            tokens_used=int(used or 0),
            tokens_reserved=int(reserved or 0),
            balance=int(net or 0),
        )

    def _lock_workspace(self, db: Session, workspace_id: str, nowait: bool = False):
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

   

    def _apply_token_overage(
        self,
        db: Session,
        reservation: TokenLedger,
        usage: Usage | None,
    ) -> TokenLedger | None:
        if usage is None or reservation.subscription_id is None:
            return None

        subscription = (
            db.query(Subscription)
            .filter(Subscription.id == reservation.subscription_id)
            .with_for_update()
            .first()
        )
        if subscription is None or subscription.plan_id is None:
            return None

        plan = db.query(Plan).filter(Plan.id == subscription.plan_id).first()
        if plan is None:
            return None

        token_limit = plan.token_limit
        price_per_extra_token = int(plan.price_per_extra_token or 0)
        current_tokens_used = int(usage.tokens_used or 0)
        if token_limit is None:
            total_overage_tokens = 0
        else:
            token_limit = int(token_limit)
            total_overage_tokens = max(current_tokens_used - token_limit, 0)
        
        previously_billed_overage = int(usage.overage_tokens or 0)
        incremental_overage_tokens = max(total_overage_tokens - previously_billed_overage, 0)

        usage.overage_tokens = total_overage_tokens
        if incremental_overage_tokens <= 0 or price_per_extra_token <= 0:
            db.flush()
            return None

        overage_cost = incremental_overage_tokens * price_per_extra_token
        period_start_ts = int(usage.period_start.timestamp()) if usage.period_start is not None else 0
        reference_key = f"overage:{period_start_ts}:{reservation.reference_key}"
        existing = (
            db.query(TokenLedger)
            .filter(TokenLedger.reference_key == reference_key)
            .with_for_update()
            .first()
        )
        if existing:
            return existing

        overage_entry = TokenLedger(
            id=uuid.uuid4(),
            workspace_id=reservation.workspace_id,
            subscription_id=reservation.subscription_id,
            payment_id=reservation.payment_id,
            entry_type="overage",
            status="posted",
            tokens_delta=-incremental_overage_tokens,
            reference_key=reference_key,
            description="Token overage charge",
            metadata_json=json.dumps(
                {
                    "reservation_reference_key": reservation.reference_key,
                    "incremental_overage_tokens": incremental_overage_tokens,
                    "total_overage_tokens": total_overage_tokens,
                    "price_per_extra_token": price_per_extra_token,
                    "overage_cost": overage_cost,
                }
            ),
        )
        db.add(overage_entry)
        db.flush()
        return overage_entry
    def grant_plan_tokens(
        self,
        db: Session,
        workspace_id: str,
        subscription: Subscription,
        payment: Payment,
        plan_config: Any,
    ) -> Any:
        from app.models.token_ledger import TokenLedger
        import uuid
        reference_key = f"token_grant:{payment.provider}:{payment.provider_payment_id}"

        #  1. TRY FETCH WITH LOCK
        existing = (
            db.query(TokenLedger)
            .filter(TokenLedger.reference_key == reference_key)
            .with_for_update()
            .first()
        )
        if existing:
            return existing

        #  2. TRY INSERT
        try:
            with db.begin_nested():
                entry = TokenLedger(
                    id=uuid.uuid4(),
                    workspace_id=workspace_id,
                    subscription_id=subscription.id,
                    payment_id=payment.id,
                    entry_type="token_grant",
                    status="posted",
                    tokens_delta=plan_config.tokens,
                    reference_key=reference_key,
                    description=f"{plan_config.label} subscription tokens"
                )
                db.add(entry)
                db.flush()
            return entry

        #  3. HANDLE RACE CONDITION (CRITICAL)
        except Exception:
            from sqlalchemy.exc import IntegrityError
            #  RE-FETCH (another thread inserted already)
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