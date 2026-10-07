"""CRM flow attribution, including completed flows and workspace isolation."""
import unittest
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from sqlalchemy import ForeignKeyConstraint, MetaData, create_engine, event
from sqlalchemy.orm import Session

from app.models.automation import AutomationFlow
from app.models.conversation import Conversation
from app.models.flow_execution import FlowExecutionState, FlowExecutionTrace
from app.services.crm.lead_flow import get_lead_flow_names


class LeadFlowNamesTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite:///:memory:")
        metadata = MetaData()
        for model in (Conversation, AutomationFlow, FlowExecutionState, FlowExecutionTrace):
            table = model.__table__.to_metadata(metadata)
            for constraint in list(table.constraints):
                if isinstance(constraint, ForeignKeyConstraint):
                    table.constraints.remove(constraint)
            table.foreign_keys.clear()
        metadata.create_all(self.engine)
        self.db = Session(self.engine)
        self.addCleanup(self.engine.dispose)
        self.addCleanup(self.db.close)
        self.workspace_id = uuid4()
        self.conversation_id = uuid4()
        self.active_id, self.older_id, self.latest_id = uuid4(), uuid4(), uuid4()
        self.db.execute(Conversation.__table__.insert(), {
            "id": self.conversation_id, "workspace_id": self.workspace_id,
        })
        self.db.execute(AutomationFlow.__table__.insert(), [
            {"id": flow_id, "workspace_id": self.workspace_id, "name": name}
            for flow_id, name in ((self.active_id, "Active flow"),
                                  (self.older_id, "Older flow"), (self.latest_id, "Latest flow"))
        ])
        now = datetime.now(timezone.utc)
        self.db.execute(FlowExecutionTrace.__table__.insert(), [
            {"id": uuid4(), "conversation_id": self.conversation_id, "flow_id": flow_id,
             "event_type": "flow_completed", "created_at": timestamp}
            for flow_id, timestamp in ((self.older_id, now - timedelta(days=1)),
                                       (self.latest_id, now), (None, now + timedelta(seconds=1)))
        ])
        self.db.commit()

    def resolve(self):
        return get_lead_flow_names(self.db, self.workspace_id, [self.conversation_id])

    def test_active_flow_takes_precedence(self):
        self.db.execute(FlowExecutionState.__table__.insert(), {
            "conversation_id": self.conversation_id, "active_flow_id": self.active_id,
        })
        self.assertEqual(self.resolve(), {self.conversation_id: "Active flow"})

    def test_completed_flow_uses_latest_non_null_trace(self):
        self.db.execute(FlowExecutionState.__table__.insert(), {
            "conversation_id": self.conversation_id, "active_flow_id": None,
        })
        self.assertEqual(self.resolve(), {self.conversation_id: "Latest flow"})

    def test_history_without_state(self):
        self.assertEqual(self.resolve(), {self.conversation_id: "Latest flow"})

    def test_missing_or_deleted_flow_has_no_name(self):
        self.db.execute(AutomationFlow.__table__.delete().where(AutomationFlow.id == self.latest_id))
        self.assertEqual(self.resolve(), {})

    def test_no_history_has_no_name(self):
        self.db.execute(FlowExecutionTrace.__table__.delete())
        self.assertEqual(self.resolve(), {})

    def test_other_workspace_conversation_is_excluded(self):
        self.assertEqual(get_lead_flow_names(self.db, uuid4(), [self.conversation_id]), {})

    def test_other_workspace_flow_is_excluded(self):
        self.db.execute(AutomationFlow.__table__.update().where(
            AutomationFlow.id == self.latest_id).values(workspace_id=uuid4()))
        self.assertEqual(self.resolve(), {})

    def test_batch_uses_one_query_and_empty_list_uses_none(self):
        statements = []
        event.listen(self.engine, "before_cursor_execute", lambda *args: statements.append(args[2]))
        self.assertEqual(get_lead_flow_names(self.db, self.workspace_id, [None]), {})
        self.assertEqual(len(statements), 0)
        result = get_lead_flow_names(self.db, self.workspace_id,
                                     [self.conversation_id, self.conversation_id, uuid4(), None])
        self.assertEqual(result, {self.conversation_id: "Latest flow"})
        self.assertEqual(len(statements), 1)
