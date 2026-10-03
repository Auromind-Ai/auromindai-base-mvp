"""Invitation eligibility regressions; no database or email server required."""
import asyncio
import unittest
import uuid
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from fastapi import HTTPException

from app.routers import workspace as routes
from app.schemas.workspace import InviteMemberRequest


def fake_db(*rows):
    db = MagicMock()
    query = db.query.return_value
    query.filter.return_value = query
    query.first.side_effect = rows
    return db


class InviteEligibilityTests(unittest.TestCase):
    def setUp(self):
        self.user = SimpleNamespace(id=uuid.uuid4(), email="owner@example.com", full_name="Owner",
                                    user=SimpleNamespace(platform_role=None))
        self.workspace = SimpleNamespace(id=uuid.uuid4(), created_by=self.user.id, name="Team")
        self.target = SimpleNamespace(id=uuid.uuid4())

    def test_new_email_and_account_without_workspace_are_allowed(self):
        for rows in ((None,), (self.target, None, None)):
            with self.subTest(rows=rows):
                routes._ensure_invitee_has_no_workspace(fake_db(*rows), "new@example.com", self.workspace.id)

    def test_existing_workspace_is_rejected_for_all_membership_roles_and_statuses(self):
        for role in ("founder", "owner", "admin", "member"):
            for active in (True, False):
                with self.subTest(role=role, active=active):
                    membership = SimpleNamespace(workspace_id=uuid.uuid4(), role=role, is_active=active)
                    with self.assertRaises(HTTPException) as error:
                        routes._ensure_invitee_has_no_workspace(
                            fake_db(self.target, membership), "member@example.com", self.workspace.id)
                    self.assertEqual(error.exception.status_code, 409)
                    self.assertIn("This email already has a workspace", error.exception.detail)

    def test_owner_without_membership_is_rejected(self):
        with self.assertRaises(HTTPException) as error:
            routes._ensure_invitee_has_no_workspace(
                fake_db(self.target, None, self.workspace), "owner@example.com", self.workspace.id)
        self.assertEqual(error.exception.status_code, 409)

    def test_same_workspace_keeps_existing_message_and_normalizes_email(self):
        membership = SimpleNamespace(workspace_id=self.workspace.id)
        with self.assertRaises(HTTPException) as error:
            routes._ensure_invitee_has_no_workspace(
                fake_db(self.target, membership), "  MEMBER@Example.com  ", self.workspace.id)
        self.assertEqual(error.exception.detail, "member@example.com is already a member of this workspace.")

    def test_create_rejects_before_saving_reserving_seat_or_sending_email(self):
        for role in ("admin", "member", "team_member"):
            with self.subTest(role=role):
                membership = SimpleNamespace(workspace_id=uuid.uuid4())
                db = fake_db(None, self.target, membership)
                with patch.object(routes, "verify_workspace_access", return_value=str(self.workspace.id)), \
                     patch.object(routes, "lock_workspace", return_value=self.workspace), \
                     patch.object(routes, "ensure_member_seat") as seat, \
                     patch.object(routes.EmailService, "send_email") as send:
                    with self.assertRaises(HTTPException) as error:
                        asyncio.run(routes.invite_workspace_member(
                            str(self.workspace.id), InviteMemberRequest(email="member@example.com", role=role), self.user, db))
                self.assertEqual(error.exception.status_code, 409)
                db.add.assert_not_called()
                db.commit.assert_not_called()
                seat.assert_not_called()
                send.assert_not_called()

    def test_valid_new_invite_still_saves_and_sends(self):
        for role in ("admin", "member"):
            with self.subTest(role=role):
                db = fake_db(None, None, None)
                with patch.object(routes, "verify_workspace_access", return_value=str(self.workspace.id)), \
                     patch.object(routes, "lock_workspace", return_value=self.workspace), \
                     patch.object(routes, "ensure_member_seat") as seat, \
                     patch.object(routes.EmailService, "send_email", return_value={"status": "success"}) as send:
                    result = asyncio.run(routes.invite_workspace_member(
                        str(self.workspace.id), InviteMemberRequest(email="new@example.com", role=role), self.user, db))
                self.assertTrue(result.email_sent)
                db.add.assert_called_once()
                db.commit.assert_called_once()
                send.assert_called_once()
                self.assertEqual(seat.call_count, int(role == "member"))

    def test_resend_rejects_without_refreshing_existing_invitation(self):
        for invite_status in ("pending", "expired"):
            with self.subTest(status=invite_status):
                expiry = datetime.now(timezone.utc) + timedelta(days=1)
                invitation = SimpleNamespace(id=uuid.uuid4(), email="member@example.com", role="member",
                                             status=invite_status, token="original", expires_at=expiry)
                db = fake_db(invitation, self.target, None, self.workspace)
                with patch.object(routes, "verify_workspace_access", return_value=str(self.workspace.id)), \
                     patch.object(routes, "lock_workspace", return_value=self.workspace), \
                     patch.object(routes, "ensure_member_seat") as seat, \
                     patch.object(routes.EmailService, "send_email") as send:
                    with self.assertRaises(HTTPException):
                        asyncio.run(routes.resend_workspace_invitation(
                            str(self.workspace.id), str(invitation.id), self.user, db))
                self.assertEqual((invitation.status, invitation.token, invitation.expires_at),
                                 (invite_status, "original", expiry))
                db.commit.assert_not_called()
                seat.assert_not_called()
                send.assert_not_called()


if __name__ == "__main__":
    unittest.main()
