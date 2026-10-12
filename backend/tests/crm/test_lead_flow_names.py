"""CRM flow attribution, including completed flows and workspace isolation."""
import unittest
import csv
import io
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from sqlalchemy import ForeignKeyConstraint, MetaData, create_engine, event
from sqlalchemy.orm import Session

from app.models.automation import AutomationFlow
from app.models.ai_action import Lead
from app.models.user import User
from app.models.workspace import WorkspaceMember
from app.models.conversation import Conversation
from app.models.flow_execution import FlowExecutionState, FlowExecutionTrace
from app.services.crm.lead_flow import get_lead_flow_names
from app.schemas.crm_filters import LeadFilters, CrmSavedViewCreate
from app.services.crm.lead_query import lead_query
from app.services.crm.lead_reporting import export_file
from openpyxl import load_workbook


class LeadFlowNamesTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite:///:memory:")
        metadata = MetaData()
        for model in (Conversation, AutomationFlow, FlowExecutionState, FlowExecutionTrace,
                      Lead, User, WorkspaceMember):
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

    def seed_leads(self):
        self.db.add_all([
            Lead(workspace_id=self.workspace_id, conversation_id=self.conversation_id, name="Flow lead"),
            Lead(workspace_id=self.workspace_id, name="Manual lead"),
        ])
        self.db.commit()

    def test_filter_matches_displayed_flow_not_older_history(self):
        self.seed_leads()
        def names(ids):
            return [lead.name for lead in lead_query(
                self.db, self.workspace_id, LeadFilters(flow_ids=ids)).all()]
        self.assertEqual(names([self.latest_id]), ["Flow lead"])
        self.assertEqual(names([self.older_id]), [])
        self.assertEqual(names([uuid4()]), [])
        self.db.execute(FlowExecutionState.__table__.insert(), {
            "conversation_id": self.conversation_id, "active_flow_id": self.active_id,
        })
        self.assertEqual(names([self.latest_id]), [])
        self.assertEqual(names([self.active_id, self.older_id]), ["Flow lead"])

    def test_export_flow_names_csv_xlsx_and_filtered_scope(self):
        self.seed_leads()
        for format in ("csv", "xlsx"):
            for filtered in (False, True):
                with self.subTest(format=format, filtered=filtered):
                    query = lead_query(self.db, self.workspace_id,
                                       LeadFilters(flow_ids=[self.latest_id] if filtered else []))
                    output = export_file(query, ["name", "flow_name"], format)
                    try:
                        if format == "csv":
                            rows = list(csv.reader(io.StringIO(output.read().decode("utf-8-sig"))))
                        else:
                            book = load_workbook(output, read_only=True)
                            rows = list(book.active.values)
                            book.close()
                        self.assertEqual(list(rows[0]), ["Name", "Flow Name"])
                        values = {row[0]: row[1] or "" for row in rows[1:]}
                        expected = {"Flow lead": "Latest flow"}
                        if not filtered:
                            expected["Manual lead"] = ""
                        self.assertEqual(values, expected)
                    finally:
                        output.close()

    def test_renamed_flow_and_saved_filter_keep_same_id(self):
        self.seed_leads()
        view = CrmSavedViewCreate(name="Flow leads", filters={"flow_ids": [str(self.latest_id)]})
        self.db.execute(AutomationFlow.__table__.update().where(
            AutomationFlow.id == self.latest_id).values(name="Renamed flow"))
        self.assertEqual(self.resolve(), {self.conversation_id: "Renamed flow"})
        self.assertEqual(lead_query(self.db, self.workspace_id, view.filters).count(), 1)

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
