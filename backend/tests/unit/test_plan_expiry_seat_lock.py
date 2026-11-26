"""Unit tests for Option A: plan-expiry member seat locking and renewal auto-unlock."""
import asyncio
import unittest
import uuid
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from fastapi import HTTPException

from app.core.security import verify_workspace_access
from app.routers import workspace as routes
from app.schemas.workspace import UpdateMemberRequest
from app.services import workspace_access_service as seats
from app.workers import billing_worker


def make_member(workspace_id, *, role="member", is_active=True, locked_reason=None, offset_mins=0):
    return SimpleNamespace(
        id=uuid.uuid4(),
        workspace_id=workspace_id,
        user_id=uuid.uuid4(),
        name="Member",
        role=role,
        permissions={"inbox": ["conversations"]},
        is_active=is_active,
        locked_reason=locked_reason,
        created_at=datetime(2026, 1, 1, tzinfo=timezone.utc) + timedelta(minutes=offset_mins),
    )


class PlanExpirySeatLockTests(unittest.TestCase):
    def setUp(self):
        self.owner_id = uuid.uuid4()
        self.ws = SimpleNamespace(
            id=uuid.uuid4(),
            created_by=self.owner_id,
            name="Acme WS",
            plan_type="starter",
        )

    def _reconcile_db(self, members):
        db = MagicMock()
        q = db.query.return_value
        q.filter.return_value = q
        q.order_by.return_value = q
        q.first.return_value = self.ws
        q.all.return_value = members
        return db

    def test_expiry_locks_excess_members_and_preserves_manual_deactivation(self):
        m1 = make_member(self.ws.id, offset_mins=1)
        m2 = make_member(self.ws.id, offset_mins=2)
        m3 = make_member(self.ws.id, offset_mins=3)
        manual_inactive = make_member(self.ws.id, is_active=False, locked_reason=None, offset_mins=0)
        db = self._reconcile_db([manual_inactive, m1, m2, m3])

        with patch.object(seats, "member_seat_limit", return_value=1):
            res = seats.reconcile_workspace_member_seats(db, self.ws.id, workspace=self.ws)

        self.assertTrue(res["changed"])
        self.assertTrue(m1.is_active)
        self.assertIsNone(m1.locked_reason)
        self.assertFalse(m2.is_active)
        self.assertEqual(m2.locked_reason, seats.PLAN_EXPIRED_LOCK_REASON)
        self.assertFalse(m3.is_active)
        self.assertEqual(m3.locked_reason, seats.PLAN_EXPIRED_LOCK_REASON)
        self.assertFalse(manual_inactive.is_active)
        self.assertIsNone(manual_inactive.locked_reason)
        self.assertEqual(set(res["locked_user_ids"]), {str(m2.user_id), str(m3.user_id)})
        db.flush.assert_called_once()

    def test_renewal_auto_unlocks_only_plan_expired_members(self):
        m1 = make_member(self.ws.id, is_active=True, locked_reason=None, offset_mins=1)
        m2 = make_member(self.ws.id, is_active=False, locked_reason=seats.PLAN_EXPIRED_LOCK_REASON, offset_mins=2)
        m3 = make_member(self.ws.id, is_active=False, locked_reason=seats.PLAN_EXPIRED_LOCK_REASON, offset_mins=3)
        manual_inactive = make_member(self.ws.id, is_active=False, locked_reason=None, offset_mins=0)
        db = self._reconcile_db([manual_inactive, m1, m2, m3])

        with patch.object(seats, "member_seat_limit", return_value=3):
            res = seats.reconcile_workspace_member_seats(db, self.ws.id, workspace=self.ws)

        self.assertTrue(res["changed"])
        self.assertTrue(m2.is_active)
        self.assertIsNone(m2.locked_reason)
        self.assertTrue(m3.is_active)
        self.assertIsNone(m3.locked_reason)
        self.assertFalse(manual_inactive.is_active)
        self.assertIsNone(manual_inactive.locked_reason)
        self.assertEqual(set(res["unlocked_user_ids"]), {str(m2.user_id), str(m3.user_id)})

    def test_unlimited_plan_unlocks_all_plan_expired_members(self):
        m1 = make_member(self.ws.id, is_active=False, locked_reason=seats.PLAN_EXPIRED_LOCK_REASON, offset_mins=1)
        m2 = make_member(self.ws.id, is_active=False, locked_reason=seats.PLAN_EXPIRED_LOCK_REASON, offset_mins=2)
        db = self._reconcile_db([m1, m2])

        with patch.object(seats, "member_seat_limit", return_value=-1):
            res = seats.reconcile_workspace_member_seats(db, self.ws.id, workspace=self.ws)

        self.assertTrue(res["changed"])
        self.assertTrue(m1.is_active and m2.is_active)
        self.assertIsNone(m1.locked_reason)
        self.assertIsNone(m2.locked_reason)

    def test_locked_member_gets_plan_expired_403_in_verify_workspace_access(self):
        locked_member = make_member(
            self.ws.id, is_active=False, locked_reason=seats.PLAN_EXPIRED_LOCK_REASON
        )
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = locked_member
        user = SimpleNamespace(id=locked_member.user_id)

        with self.assertRaises(HTTPException) as err:
            verify_workspace_access(user, db, self.ws.id)
        self.assertEqual(err.exception.status_code, 403)
        self.assertIn("workspace plan expired", err.exception.detail.lower())

    def test_manual_reactivation_clears_locked_reason_when_seat_available(self):
        locked_member = make_member(
            self.ws.id, is_active=False, locked_reason=seats.PLAN_EXPIRED_LOCK_REASON
        )
        caller_member = SimpleNamespace(user_id=self.owner_id, role="founder", is_active=True, permissions={})
        owner_user = SimpleNamespace(
            id=self.owner_id, email="owner@example.com", user=SimpleNamespace(platform_role=None)
        )
        db = MagicMock()
        q = db.query.return_value
        q.filter.return_value = q
        q.first.side_effect = [locked_member, caller_member]

        with patch.object(routes, "verify_workspace_access", return_value=str(self.ws.id)), \
             patch.object(routes, "lock_workspace", return_value=self.ws), \
             patch.object(routes, "ensure_member_seat") as seat_check, \
             patch.object(routes, "publish_to_user"):
            res = asyncio.run(
                routes.update_workspace_member(
                    str(self.ws.id),
                    str(locked_member.id),
                    UpdateMemberRequest(is_active=True),
                    owner_user,
                    db,
                )
            )

        seat_check.assert_called_once_with(db, self.ws, exclude_member_id=locked_member.id)
        self.assertTrue(locked_member.is_active)
        self.assertIsNone(locked_member.locked_reason)
        self.assertTrue(res["is_active"])

    def test_cleanup_expired_subscriptions_reconciles_and_notifies(self):
        sub = SimpleNamespace(workspace_id=self.ws.id, status="active")
        db = MagicMock()
        q = db.query.return_value
        q.filter.return_value = q
        q.all.return_value = [sub]
        seat_res = {"locked_user_ids": ["u1"], "unlocked_user_ids": [], "changed": True}

        with patch.object(billing_worker, "SessionLocal", return_value=db), \
             patch("app.services.workspace_access_service.reconcile_workspace_member_seats", return_value=seat_res) as rec, \
             patch("app.services.workspace_access_service.notify_seat_changes") as notif:
            out = billing_worker.cleanup_expired_subscriptions()

        self.assertEqual(out, {"expired_count": 1})
        self.assertEqual(sub.status, billing_worker.SubscriptionStatus.expired)
        rec.assert_called_once_with(db, self.ws.id)
        db.commit.assert_called_once()
        notif.assert_called_once_with(self.ws.id, seat_res)

    def test_get_workspace_seats_lazily_reconciles_over_limit_and_reports_summary(self):
        m1 = make_member(self.ws.id, offset_mins=1)
        m2 = make_member(self.ws.id, offset_mins=2)
        m3 = make_member(self.ws.id, offset_mins=3)
        viewer = SimpleNamespace(user_id=self.owner_id, role="founder", permissions={}, is_active=True)
        user_obj = SimpleNamespace(email="m@example.com", full_name="Member")
        db = MagicMock()
        q = db.query.return_value
        q.outerjoin.return_value = q
        q.filter.return_value = q
        q.order_by.return_value = q
        q.first.side_effect = [self.ws, viewer]
        q.all.side_effect = [[(m1, user_obj), (m2, user_obj), (m3, user_obj)], []]

        def fake_reconcile(_db, _ws_id, workspace=None):
            m2.is_active = False
            m2.locked_reason = seats.PLAN_EXPIRED_LOCK_REASON
            m3.is_active = False
            m3.locked_reason = seats.PLAN_EXPIRED_LOCK_REASON
            return {"locked_user_ids": [str(m2.user_id), str(m3.user_id)], "unlocked_user_ids": [], "changed": True}

        owner_user = SimpleNamespace(id=self.owner_id, email="owner@example.com")
        with patch.object(routes, "verify_workspace_access", return_value=str(self.ws.id)), \
             patch.object(routes, "_get_dynamic_seat_limits", return_value=1), \
             patch.object(routes, "reconcile_workspace_member_seats", side_effect=fake_reconcile) as rec, \
             patch.object(routes, "notify_seat_changes") as notif, \
             patch.object(routes, "is_workspace_plan_expired", return_value=True):
            res = asyncio.run(routes.get_workspace_seats_and_members(str(self.ws.id), owner_user, db))

        rec.assert_called_once()
        notif.assert_called_once()
        db.commit.assert_called_once()
        self.assertEqual(res.total_member_seats, 1)
        self.assertEqual(res.used_member_seats, 1)
        self.assertEqual(res.locked_member_seats, 2)
        self.assertTrue(res.plan_expired)


if __name__ == "__main__":
    unittest.main()
