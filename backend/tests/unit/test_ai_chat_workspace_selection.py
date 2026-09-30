"""Isolated workspace chat and billing regressions. Run using unittest discovery.

No configured database, Redis, AI provider or payment gateway is used.
"""
import asyncio
import unittest
import uuid
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

from fastapi import HTTPException
from sqlalchemy import create_engine, func
from sqlalchemy.orm import Session
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.compiler import compiles

from app.core.chat_access import resolve_chat_access
from app.routers import chat as routes
from app.schemas.chat import ChatStreamRequest, StopChatRequest
from app.models.token_ledger import TokenLedger
from app.models.wcc import WCCWallet, WCCTransaction
from app.services.billing.token_service import TokenService
from app.services.billing.feature_billing_service import FeatureBillingService
from app.services.wcc_service import WCCService


@compiles(JSONB, "sqlite")
def sqlite_jsonb(element, compiler, **kw):
    return "JSON"


class ChatWorkspaceTests(unittest.TestCase):
    def setUp(self):
        self.personal, self.shared, self.sid = uuid.uuid4(), uuid.uuid4(), uuid.uuid4()
        self.user = SimpleNamespace(id=uuid.uuid4(), workspace_id=self.personal)
        self.db = MagicMock()
        self.service = SimpleNamespace(
            stop_generation=AsyncMock(),
            validate_and_reserve_stream_tokens=AsyncMock(return_value={"status": "ok"}),
            handle_stream_chat=MagicMock(return_value=iter([])),
        )
        self.lookup = self.enterContext(patch(
            "app.core.chat_access.SessionService.get_session_by_id_and_user",
            return_value=SimpleNamespace(id=self.sid, workspace_id=self.shared)))
        self.verify = self.enterContext(patch(
            "app.core.chat_access.verify_workspace_access", side_effect=lambda u, db, ws, **kw: ws))
        self.enterContext(patch("app.routers.chat.verify_chat_rate_limit"))

    def test_selected_workspace_overrides_token_workspace(self):
        actual, _ = resolve_chat_access(self.user, self.db, self.shared)
        self.assertEqual(actual, self.shared)
        self.verify.assert_called_once_with(self.user, self.db, self.shared, required_permission="ai.chat")

    def test_missing_workspace_does_not_fall_back_to_personal(self):
        with self.assertRaises(HTTPException) as error:
            resolve_chat_access(self.user, self.db)
        self.assertEqual(error.exception.status_code, 400)
        self.verify.assert_not_called()

    def test_session_without_explicit_workspace_uses_session_workspace(self):
        actual, _ = resolve_chat_access(self.user, self.db, session_id=self.sid)
        self.assertEqual(actual, self.shared)

    def test_invalid_ids_are_rejected(self):
        for args in ({"workspace_id": "bad"}, {"session_id": "bad"}):
            with self.subTest(args=args), self.assertRaises(HTTPException) as error:
                resolve_chat_access(self.user, self.db, **args)
            self.assertEqual(error.exception.status_code, 400)
        self.lookup.assert_not_called()
        self.verify.assert_not_called()

    def test_session_lookup_rejects_invalid_workspace_filter(self):
        from app.services.inbox.session_service import SessionService
        with self.assertRaises(HTTPException) as error:
            SessionService.get_session_or_404(self.db, self.sid, str(self.user.id), "invalid")
        self.assertEqual(error.exception.status_code, 400)

    def test_foreign_session_cannot_be_stopped(self):
        self.lookup.return_value = None
        with self.assertRaises(HTTPException) as error:
            asyncio.run(routes.stop_chat_stream(
                StopChatRequest(session_id=str(self.sid), workspace_id=str(self.shared)),
                self.db, self.user, self.service))
        self.assertEqual(error.exception.status_code, 404)
        self.service.stop_generation.assert_not_awaited()

    def test_mismatched_workspace_cannot_be_stopped(self):
        with self.assertRaises(HTTPException) as error:
            asyncio.run(routes.stop_chat_stream(
                StopChatRequest(session_id=str(self.sid), workspace_id=str(self.personal)),
                self.db, self.user, self.service))
        self.assertEqual(error.exception.status_code, 403)
        self.service.stop_generation.assert_not_awaited()

    def test_revoked_permission_cannot_stop_session(self):
        self.verify.side_effect = HTTPException(403, "Permission denied")
        with self.assertRaises(HTTPException):
            asyncio.run(routes.stop_chat_stream(
                StopChatRequest(session_id=str(self.sid), workspace_id=str(self.shared)),
                self.db, self.user, self.service))
        self.service.stop_generation.assert_not_awaited()

    def test_owned_authorized_session_can_be_stopped(self):
        asyncio.run(routes.stop_chat_stream(
            StopChatRequest(session_id=str(self.sid), workspace_id=str(self.shared)),
            self.db, self.user, self.service))
        self.service.stop_generation.assert_awaited_once_with(session_id=str(self.sid), user_id=str(self.user.id))

    def test_stream_reservation_and_execution_use_same_shared_workspace(self):
        asyncio.run(routes.stream_chat(
            ChatStreamRequest(message="hello", session_id=str(self.sid), workspace_id=str(self.shared)),
            MagicMock(), self.db, self.user, self.service))
        self.assertEqual(self.service.validate_and_reserve_stream_tokens.await_args.kwargs["workspace_id"], str(self.shared))
        self.assertEqual(self.service.handle_stream_chat.call_args.kwargs["workspace_id"], str(self.shared))

    def test_mismatched_session_cannot_reserve_credits(self):
        with self.assertRaises(HTTPException):
            asyncio.run(routes.stream_chat(
                ChatStreamRequest(message="hello", session_id=str(self.sid), workspace_id=str(self.personal)),
                MagicMock(), self.db, self.user, self.service))
        self.service.validate_and_reserve_stream_tokens.assert_not_awaited()


class SharedWorkspaceBillingTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite:///:memory:")
        for table in (TokenLedger.__table__, WCCWallet.__table__, WCCTransaction.__table__):
            table.create(self.engine)
        self.db = Session(self.engine)
        self.addCleanup(self.engine.dispose)
        self.addCleanup(self.db.close)
        self.personal, self.shared = uuid.uuid4(), uuid.uuid4()

    def test_final_ai_charge_debits_shared_workspace_once(self):
        for ws, amount in ((self.personal, 1000), (self.shared, 5000)):
            self.db.add(TokenLedger(workspace_id=ws, entry_type="grant", status="posted",
                tokens_delta=0, credits_delta=amount, balance_source="PURCHASED", reference_key=str(ws)))
        reservation = TokenLedger(workspace_id=self.shared, entry_type="usage_reservation",
            status="reserved", tokens_delta=0, credits_delta=-20, reference_key="shared-chat")
        self.db.add(reservation)
        self.db.commit()
        service = TokenService(MagicMock())
        with patch.object(service, "_lock_workspace"), patch.object(service, "_get_active_subscription", return_value=None), patch.object(service, "_check_usage_quota_warnings"), patch.object(FeatureBillingService, "get_rule", return_value=SimpleNamespace(billing_type="TOKEN")), patch.object(FeatureBillingService, "calculate_cost", return_value=Decimal("7")):
            for _ in range(2):
                service.settle_from_provider_usage(self.db, reservation.id,
                    {"total_tokens": 700, "prompt_tokens": 500, "completion_tokens": 200}, "chat", "execution-test")
        def balance(ws):
            return self.db.query(func.sum(TokenLedger.credits_delta)).filter(
                TokenLedger.workspace_id == ws, TokenLedger.status == "posted").scalar()
        self.assertEqual(balance(self.personal), Decimal("1000"))
        self.assertEqual(balance(self.shared), Decimal("4993"))
        self.assertEqual(reservation.workspace_id, self.shared)
        self.assertEqual(reservation.status, "posted")
        self.assertEqual(reservation.total_tokens, 700)

    def test_whatsapp_charge_debits_shared_wallet_once(self):
        for ws, amount in ((self.personal, 100), (self.shared, 200)):
            self.db.add(WCCWallet(workspace_id=ws, purchased_balance=amount, included_balance=0, balance=amount))
        self.db.commit()
        with patch.object(WCCService, "check_wcc_entitlement", return_value={"spending_allowed": True}), patch.object(WCCService, "_check_wcc_quota_warnings"):
            for _ in range(2):
                tx = WCCService.debit_conversation_charge(self.db, self.shared, "meta-test-session",
                    "marketing", Decimal("5"), Decimal("7"), {})
                self.db.commit()
        self.assertEqual(tx.workspace_id, self.shared)
        wallets = {w.workspace_id: w.balance for w in self.db.query(WCCWallet).all()}
        self.assertEqual(wallets[self.personal], Decimal("100"))
        self.assertEqual(wallets[self.shared], Decimal("193"))
        self.assertEqual(self.db.query(WCCTransaction).count(), 1)


if __name__ == "__main__":
    unittest.main()
