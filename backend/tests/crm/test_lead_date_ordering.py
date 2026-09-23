"""Unit tests verifying lead date ordering and repeat lead return date updates.

Run with:
python -m unittest discover -s tests/crm -p test_lead_date_ordering.py
"""
import unittest
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from sqlalchemy import ForeignKeyConstraint, MetaData, create_engine
from sqlalchemy.orm import Session

from app.models.ai_action import Lead
from app.models.conversation import Conversation, ChannelType
from app.models.lead_scoring import TemplateLog
from app.services.crm.lead_scoring_service import get_workspace_lead_scores
from app.services.inbox.webhook_service import upsert_lead


class LeadDateOrderingTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite:///:memory:")
        metadata = MetaData()

        for model in (Lead, Conversation, TemplateLog):
            table = model.__table__.to_metadata(metadata)
            for constraint in list(table.constraints):
                if isinstance(constraint, ForeignKeyConstraint):
                    table.constraints.remove(constraint)
            table.foreign_keys.clear()

        metadata.create_all(self.engine)
        self.db = Session(self.engine)
        self.workspace_id = uuid4()

        self.addCleanup(self.engine.dispose)
        self.addCleanup(self.db.close)

    def test_default_sort_orders_by_most_recent_date(self):
        now = datetime.now(timezone.utc)
        older_time = now - timedelta(days=5)
        oldest_time = now - timedelta(days=10)

        # Lead 1: High score, but oldest activity
        lead_old = Lead(
            id=uuid4(),
            workspace_id=self.workspace_id,
            name="Old High Score Lead",
            score=90,
            created_at=oldest_time,
            last_activity_at=oldest_time,
        )
        # Lead 2: Medium score, medium activity
        lead_mid = Lead(
            id=uuid4(),
            workspace_id=self.workspace_id,
            name="Mid Score Lead",
            score=50,
            created_at=older_time,
            last_activity_at=older_time,
        )
        # Lead 3: Low score, but newest activity (e.g. today)
        lead_new = Lead(
            id=uuid4(),
            workspace_id=self.workspace_id,
            name="Today's Lead",
            score=10,
            created_at=now,
            last_activity_at=now,
        )

        self.db.add_all([lead_old, lead_mid, lead_new])
        self.db.commit()

        # Default query (sort_by="recent")
        res = get_workspace_lead_scores(
            workspace_id=self.workspace_id,
            db=self.db,
        )

        items = res["items"]
        self.assertEqual(len(items), 3)
        # Today's lead must be first, despite having lowest score
        self.assertEqual(items[0]["lead_id"], str(lead_new.id))
        self.assertEqual(items[1]["lead_id"], str(lead_mid.id))
        self.assertEqual(items[2]["lead_id"], str(lead_old.id))

    def test_returning_lead_moves_to_top(self):
        now = datetime.now(timezone.utc)
        earlier = now - timedelta(days=3)

        # Existing lead created 3 days ago
        conv1 = Conversation(
            id=uuid4(),
            workspace_id=self.workspace_id,
            channel=ChannelType.WHATSAPP,
            phone="919345660030",
        )
        lead_existing = Lead(
            id=uuid4(),
            workspace_id=self.workspace_id,
            conversation_id=conv1.id,
            name="Dharun",
            phone="919345660030",
            score=40,
            created_at=earlier,
            last_activity_at=earlier,
        )

        # Another lead created today
        lead_today = Lead(
            id=uuid4(),
            workspace_id=self.workspace_id,
            name="Today New Lead",
            score=20,
            created_at=now - timedelta(hours=1),
            last_activity_at=now - timedelta(hours=1),
        )

        self.db.add_all([conv1, lead_existing, lead_today])
        self.db.commit()

        # Before return: lead_today is first
        res_before = get_workspace_lead_scores(
            workspace_id=self.workspace_id,
            db=self.db,
        )
        self.assertEqual(res_before["items"][0]["lead_id"], str(lead_today.id))

        # Suppose existing lead returns again now via upsert_lead
        updated_lead = upsert_lead(
            workspace_id=self.workspace_id,
            conversation_id=conv1.id,
            phone="919345660030",
            source="whatsapp",
            db=self.db,
        )
        self.db.commit()

        # Verify last_activity_at was updated to ~now
        last_act = updated_lead.last_activity_at
        if last_act.tzinfo is None:
            last_act = last_act.replace(tzinfo=timezone.utc)
        self.assertGreater(last_act, earlier)

        # After return: lead_existing moves to the top!
        res_after = get_workspace_lead_scores(
            workspace_id=self.workspace_id,
            db=self.db,
        )
        self.assertEqual(res_after["items"][0]["lead_id"], str(lead_existing.id))


if __name__ == "__main__":
    unittest.main()
