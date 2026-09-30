"""Page grants include feature actions without requiring an admin role."""
import unittest
import asyncio
import uuid
from types import SimpleNamespace
from unittest.mock import MagicMock, patch
from fastapi import HTTPException
from app.routers import billing, wcc, auth
from app.services.auth_service import AuthService


class PageFeatureAccessTests(unittest.TestCase):
    def setUp(self):
        self.ws_id = uuid.uuid4()
        self.user = SimpleNamespace(id=uuid.uuid4())

    def db_for(self, permissions, active=True):
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = SimpleNamespace(
            workspace_id=self.ws_id, role="member", permissions=permissions, is_active=active,
        )
        return db

    def test_member_credit_purchase_reaches_service(self):
        payload = SimpleNamespace(pack_id="pack", provider="razorpay", workspace_id=str(self.ws_id))
        service = MagicMock()
        service.initiate_credit_pack_purchase.return_value = {"gateway_order_id": "test-order"}
        with patch.object(billing, "get_billing_service", return_value=service), patch(
            "app.services.billing.entitlement_service.EntitlementService.get_workspace_entitlement",
            return_value=SimpleNamespace(allow_ai_topup=True),
        ):
            result = billing.purchase_credit_pack(payload, str(self.ws_id), None,
                                                  self.db_for({"credits": ["view"]}), self.user)
        self.assertEqual(result["gateway_order_id"], "test-order")
        self.assertEqual(service.initiate_credit_pack_purchase.call_args.kwargs["workspace_id"], str(self.ws_id))

    def test_denied_purchase_preserves_403_without_initializing_payment(self):
        payload = SimpleNamespace(pack_id="pack", provider="razorpay", workspace_id=str(self.ws_id))
        with patch.object(billing, "get_billing_service") as factory:
            with self.assertRaises(HTTPException) as error:
                billing.purchase_credit_pack(payload, str(self.ws_id), None, self.db_for({}), self.user)
        self.assertEqual(error.exception.status_code, 403)
        factory.assert_not_called()

    def test_wallet_and_billing_use_their_page_grants(self):
        self.assertEqual(wcc.resolve_and_verify_workspace(self.user, self.db_for({"credits": ["view"]}), str(self.ws_id)), str(self.ws_id))
        self.assertEqual(billing.resolve_and_verify_workspace(self.user, self.db_for({"billing": ["manage"]}), str(self.ws_id)), str(self.ws_id))
        with self.assertRaises(HTTPException):
            billing.resolve_and_verify_workspace(self.user, self.db_for({"credits": ["view"]}), str(self.ws_id))
        with self.assertRaises(HTTPException):
            wcc.resolve_and_verify_workspace(self.user, self.db_for({"credits": ["view"]}, active=False), str(self.ws_id))

    def test_workspace_response_identifies_owned_and_assigned_workspaces(self):
        own = SimpleNamespace(id=uuid.uuid4(), created_by=self.user.id, name="Own", created_at=None)
        shared = SimpleNamespace(id=self.ws_id, created_by=uuid.uuid4(), name="Shared", created_at=None)
        db = MagicMock()
        db.query.return_value.join.return_value.filter.return_value.all.return_value = [(own, "founder"), (shared, "member")]
        result = AuthService.get_user_workspaces(db, self.user.id)
        self.assertTrue(result[0]["is_owner"])
        self.assertFalse(result[1]["is_owner"])

    def test_workspace_api_excludes_personal_workspace_for_invited_member(self):
        own = {"id": "own", "name": "Personal", "is_owner": True}
        assigned = {"id": "shared", "name": "Assigned", "is_owner": False}
        with patch.object(AuthService, "get_user_workspaces", return_value=[own, assigned]):
            result = asyncio.run(auth.get_workspaces(self.user, MagicMock()))
        self.assertEqual(result["workspaces"], [assigned])
        self.assertEqual(result["hidden_personal_workspace_ids"], ["own"])

    def test_workspace_api_keeps_personal_workspace_for_owner_without_assignments(self):
        own = {"id": "own", "is_owner": True}
        with patch.object(AuthService, "get_user_workspaces", return_value=[own]):
            result = asyncio.run(auth.get_workspaces(self.user, MagicMock()))
        self.assertEqual(result["workspaces"], [own])
        self.assertEqual(result["hidden_personal_workspace_ids"], [])


if __name__ == "__main__":
    unittest.main()
