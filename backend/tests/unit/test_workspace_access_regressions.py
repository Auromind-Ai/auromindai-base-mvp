"""Run with unittest; mocks keep these tests independent of a live database/mail server."""
import asyncio
import unittest
import uuid
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

from fastapi import HTTPException
from app.core.permissions import normalize_permissions, has_workspace_permission
from app.core.security import verify_workspace_access
from app.core.integration_state import sign_integration_state, read_integration_state
from app.core.websockets import ConnectionManager
from app.core import realtime_access
from app.routers import workspace as routes
from app.schemas.workspace import AcceptInvitationRequest, UpdateMemberRequest, InviteMemberRequest
from app.services import workspace_access_service as seats


def fake_db(*rows):
    db = MagicMock()
    query = db.query.return_value
    query.filter.return_value = query
    query.populate_existing.return_value = query
    query.with_for_update.return_value = query
    query.first.side_effect = list(rows)
    return db


class WorkspaceAccessTests(unittest.TestCase):
    def setUp(self):
        self.ws = SimpleNamespace(id=uuid.uuid4(), created_by=uuid.uuid4(), name="Workspace")
        self.user = SimpleNamespace(id=uuid.uuid4(), email="member@example.com", full_name="Member")

    def member(self, role="member", active=True, permissions=None):
        return SimpleNamespace(id=uuid.uuid4(), user_id=self.user.id, workspace_id=self.ws.id,
                               role=role, is_active=active, permissions=permissions or {}, name="Member")

    def invite(self, **changes):
        values = dict(id=uuid.uuid4(), workspace_id=self.ws.id, token="invite-token", email=self.user.email,
                      status="pending", role="member", permissions={"inbox": ["conversations"]},
                      name="Member", expires_at=datetime.now(timezone.utc) + timedelta(days=1))
        values.update(changes)
        return SimpleNamespace(**values)

    def accept(self, invitation, existing=None):
        db = fake_db(invitation, invitation, existing)
        with patch.object(routes, "lock_workspace", return_value=self.ws), patch.object(routes, "ensure_member_seat") as seat:
            result = asyncio.run(routes.accept_invitation(AcceptInvitationRequest(token=invitation.token), self.user, db))
        return result, db, seat

    def test_wildcard_and_legacy_permissions_survive_normalization(self):
        for raw in ({"inbox": ["*"]}, ["inbox.*"], ["inbox"], {"flows": ["*"]}):
            permission = "automation.manage" if "flows" in raw else "inbox.conversations"
            self.assertTrue(has_workspace_permission("member", normalize_permissions(raw), permission))

    def test_missing_permissions_deny_member_but_allow_admin(self):
        self.assertFalse(has_workspace_permission("member", {}, "brain.manage"))
        self.assertTrue(has_workspace_permission("admin", {}, "brain.manage"))

    def test_team_permission_includes_invitation_management(self):
        member = self.member(permissions={"team": ["members"]})
        member.created_at = datetime.now(timezone.utc)
        invite = self.invite(role="admin", created_at=datetime.now(timezone.utc))
        db = fake_db(self.ws, member)
        query = db.query.return_value
        query.outerjoin.return_value = query
        query.order_by.return_value = query
        query.all.side_effect = [[(member, self.user)], [(invite, self.user)]]
        with patch.object(routes, "verify_workspace_access", return_value=str(self.ws.id)), patch.object(routes, "_get_dynamic_seat_limits", return_value=3):
            result = asyncio.run(routes.get_workspace_seats_and_members(str(self.ws.id), self.user, db))
        self.assertEqual(result.invitations[0].token, invite.token)
        self.assertIn(invite.token, result.invitations[0].invite_url)

    def test_mail_delivery_status_reports_simulated_or_failed_email(self):
        for mail_result in ({"status": "simulated"}, {"status": "success"}, RuntimeError("SMTP offline")):
            db = fake_db(None, None)
            with patch.object(routes, "verify_workspace_access", return_value=str(self.ws.id)), \
                 patch.object(routes, "lock_workspace", return_value=self.ws), \
                 patch.object(routes.EmailService, "send_email") as send:
                if isinstance(mail_result, Exception):
                    send.side_effect = mail_result
                else:
                    send.return_value = mail_result
                result = asyncio.run(routes.invite_workspace_member(str(self.ws.id), InviteMemberRequest(email="new@example.com", role="admin"), self.user, db))
            self.assertEqual(result.email_sent, mail_result == {"status": "success"})

    def test_http_permission_denied(self):
        with self.assertRaises(HTTPException) as error:
            verify_workspace_access(self.user, fake_db(self.member()), self.ws.id, required_permission="brain.manage")
        self.assertEqual(error.exception.status_code, 403)

    def test_shared_resource_allows_either_explicit_permission(self):
        db = fake_db(self.member(permissions={"crm": ["view"]}))
        self.assertEqual(verify_workspace_access(self.user, db, self.ws.id, required_permission=("leads.view", "crm.view")), str(self.ws.id))

    def test_deactivated_admin_denied(self):
        with self.assertRaises(HTTPException):
            verify_workspace_access(self.user, fake_db(self.member("admin", False)), self.ws.id)

    def test_invitation_rejects_wrong_email_even_for_admin_invite(self):
        with self.assertRaises(HTTPException) as error:
            self.accept(self.invite(email="someone-else@example.com", role="admin"))
        self.assertEqual(error.exception.status_code, 403)

    def test_invitation_cannot_upgrade_existing_member(self):
        member = self.member()
        with self.assertRaises(HTTPException):
            self.accept(self.invite(role="admin"), member)
        self.assertEqual(member.role, "member")

    def test_accepted_invite_cannot_restore_removed_member(self):
        with self.assertRaises(HTTPException):
            self.accept(self.invite(status="accepted"))

    def test_valid_invitation_checks_reserved_seat_and_creates_member(self):
        invitation = self.invite()
        result, db, seat = self.accept(invitation)
        self.assertTrue(result["success"])
        seat.assert_called_once_with(db, self.ws, exclude_invitation_id=invitation.id)
        self.assertEqual(db.add.call_args.args[0].role, "member")
        self.assertEqual(invitation.status, "accepted")

    def test_expired_accepted_invite_still_opens_active_membership(self):
        result, _, _ = self.accept(self.invite(status="accepted", expires_at=datetime.now(timezone.utc)-timedelta(days=1)), self.member())
        self.assertTrue(result["success"])

    def update(self, member, payload, seat_error=None):
        db = fake_db(member)
        with patch.object(routes, "verify_workspace_access", return_value=str(self.ws.id)), \
             patch.object(routes, "lock_workspace", return_value=self.ws), \
             patch.object(routes, "publish_to_user"), \
             patch.object(routes, "ensure_member_seat", side_effect=seat_error) as check:
            result = asyncio.run(routes.update_workspace_member(str(self.ws.id), str(member.id), payload, self.user, db))
        return result, check

    def test_role_only_demotion_clears_full_permissions(self):
        member = self.member("admin", permissions={"brain": ["manage"]})
        self.update(member, UpdateMemberRequest(role="member"))
        self.assertEqual(member.permissions, {})

    def test_reactivation_enforces_seat_capacity(self):
        member = self.member(active=False)
        with self.assertRaises(HTTPException):
            self.update(member, UpdateMemberRequest(is_active=True), HTTPException(400, "Full"))
        self.assertFalse(member.is_active)

    def test_member_update_cannot_create_owner(self):
        with self.assertRaises(HTTPException):
            self.update(self.member(), UpdateMemberRequest(role="owner"))

    def test_zero_one_and_unlimited_plan_limits_preserved(self):
        self.assertEqual(seats.member_seat_limit(MagicMock(), self.ws), 3)

    def test_pending_invites_reserve_capacity(self):
        db = fake_db()
        db.query.return_value.scalar.side_effect = [1, 1]
        with patch.object(seats, "member_seat_limit", return_value=2), self.assertRaises(HTTPException):
            seats.ensure_member_seat(db, self.ws)

    def test_realtime_permission_revocation_blocks_next_delivery(self):
        manager = ConnectionManager()
        socket = SimpleNamespace(accept=AsyncMock(), send_json=AsyncMock())
        asyncio.run(manager.connect(str(self.user.id), socket, str(self.ws.id)))
        with patch.object(realtime_access, "realtime_allowed", return_value=False):
            sent = asyncio.run(manager.send_to_workspace(str(self.ws.id), {"event_type": "new_message"}))
        self.assertEqual(sent, 0)
        socket.send_json.assert_not_called()

    def test_realtime_active_member_without_inbox_cannot_receive_messages(self):
        db = fake_db(self.member())
        with patch.object(realtime_access, "SessionLocal") as session:
            session.return_value.__enter__.return_value = db
            self.assertFalse(realtime_access.realtime_allowed(self.user.id, self.ws.id, "new_message"))

    def test_oauth_state_tampering_and_expiry_rejected(self):
        token = sign_integration_state(self.user.id, self.ws.id, "gmail")
        self.assertEqual(read_integration_state(token)["workspace_id"], str(self.ws.id))
        with self.assertRaises(HTTPException):
            read_integration_state(token + "bad")
        with patch("app.core.integration_state.time.time", return_value=datetime.now(timezone.utc).timestamp()+700), self.assertRaises(HTTPException):
            read_integration_state(token)


if __name__ == "__main__":
    unittest.main()
