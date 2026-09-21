"""Run directly with CRM_TEST_DATABASE_URL pointing at PostgreSQL.

All fixtures live in a random schema inside a rolled-back transaction. No existing
tables or customer records are read or changed. Deliberately independent of the
repository-wide SQLite fixtures, since production JSON filters require Postgres.
"""
import csv
import io
import os
from pathlib import Path
import sys
import unittest
from datetime import datetime, timedelta, timezone
from uuid import uuid4

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from sqlalchemy import ForeignKeyConstraint, MetaData, create_engine, text
from sqlalchemy.orm import Session
from pydantic import ValidationError
from openpyxl import load_workbook

from app.models.ai_action import Lead
from app.models.lead_scoring import LeadScoreHistory, TemplateLog
from app.models.message import Message, SenderType
from app.models.user import User
from app.models.workspace import WorkspaceMember
from app.schemas.crm_filters import LeadFilters, LeadExportRequest
from app.services.crm.lead_query import lead_query
from app.services.crm.lead_reporting import analytics, export_file


@unittest.skipUnless(os.environ.get("CRM_TEST_DATABASE_URL"), "Set CRM_TEST_DATABASE_URL to run PostgreSQL integration tests")
class CrmIntegrationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.engine = create_engine(os.environ["CRM_TEST_DATABASE_URL"])
        cls.connection = cls.engine.connect()
        cls.transaction = cls.connection.begin()
        cls.schema = "crm_test_" + uuid4().hex
        cls.connection.execute(text(f'CREATE SCHEMA "{cls.schema}"'))
        cls.connection.execute(text(f'SET LOCAL search_path TO "{cls.schema}"'))
        metadata = MetaData()
        for model in (Lead, LeadScoreHistory, TemplateLog, Message, User, WorkspaceMember):
            table = model.__table__.to_metadata(metadata)
            # Only relevant tables are needed; all real query columns retain their types.
            for constraint in list(table.constraints):
                if isinstance(constraint, ForeignKeyConstraint):
                    table.constraints.remove(constraint)
            table.foreign_keys.clear()
        metadata.create_all(cls.connection)
        cls.db = Session(cls.connection, join_transaction_mode="create_savepoint")
        cls.workspace, cls.other_workspace, cls.agent = uuid4(), uuid4(), uuid4()
        cls.now = datetime(2026, 9, 18, 10, tzinfo=timezone.utc)
        cls.db.add(User(id=cls.agent, email="agent@example.test", full_name="Sales Agent", is_active=True))
        cls.db.add(WorkspaceMember(workspace_id=cls.workspace, user_id=cls.agent, role="owner"))
        def lead(name, **kwargs):
            values = dict(id=uuid4(), workspace_id=cls.workspace, name=name, status="new", score=20,
                          lead_tier="cold", source="manual", created_at=cls.now,
                          last_activity_at=cls.now, conversation_id=uuid4(), labels=[], intent_signals={}, is_converted=False)
            values.update(kwargs)
            item = Lead(**values)
            cls.db.add(item)
            return item
        cls.hot = lead("Hot buyer", source="whatsapp", score=85, lead_tier="hot", assigned_to=cls.agent,
                       phone="+919876543210", email="buyer@example.test", is_favorite=True,
                       labels=["Interested", "High Priority"], intent_signals={"pricing_intent": {"value": True}})
        cls.warm = lead("Warm buyer", source="instagram", status="active", score=60, lead_tier="warm",
                        created_at=cls.now - timedelta(days=5), intent_signals={"payment_intent": True})
        cls.converted = lead("=SUM(1,2)", source="sms", status="converted", score=40, lead_tier="warm",
                             is_converted=True, conversion_amount=1500, converted_product="Consulting",
                             converted_at=cls.now, created_at=cls.now - timedelta(days=40))
        cls.cold = lead("Cold buyer", email="cold@example.test", score=0)
        cls.foreign = lead("Other tenant", workspace_id=cls.other_workspace, source="whatsapp", score=99, lead_tier="hot")
        cls.db.flush()
        cls.db.add_all([
            LeadScoreHistory(lead_id=cls.hot.id, score_before=70, score_after=85, reason="intent", created_at=cls.now),
            LeadScoreHistory(lead_id=cls.warm.id, score_before=70, score_after=60, reason="decay", created_at=cls.now),
            LeadScoreHistory(lead_id=cls.cold.id, score_before=0, score_after=0, reason="manual_creation", created_at=cls.now),
            Message(conversation_id=cls.hot.conversation_id, sender_type=SenderType.USER, content="price?", is_read=False, timestamp=cls.now),
            Message(conversation_id=cls.warm.conversation_id, sender_type=SenderType.USER, content="hello", is_read=True, timestamp=cls.now),
            Message(conversation_id=cls.warm.conversation_id, sender_type=SenderType.AGENT, content="How can I help?", is_read=True, timestamp=cls.now + timedelta(seconds=1)),
        ])
        cls.db.flush()

    @classmethod
    def tearDownClass(cls):
        cls.db.close()
        cls.transaction.rollback()
        cls.connection.close()
        cls.engine.dispose()

    def query(self, **filters):
        return lead_query(self.db, self.workspace, LeadFilters(**filters), self.agent)

    def assert_leads(self, expected, **filters):
        self.assertEqual({lead.id for lead in self.query(**filters).all()}, {lead.id for lead in expected})

    def test_no_filters_and_empty_results(self):
        self.assert_leads([self.hot, self.warm, self.converted, self.cold])
        self.assert_leads([], min_score=100)

    def test_date_and_exclusive_end(self):
        self.assert_leads([self.hot, self.warm, self.cold], created_from=self.now - timedelta(days=7))
        self.assert_leads([self.warm, self.converted], created_to=self.now)
        self.assert_leads([self.converted], converted_from=self.now)
        self.assert_leads([], activity_to=self.now)

    def test_score_source_multi_source_status_tier(self):
        self.assert_leads([self.hot, self.warm], min_score=60, max_score=90)
        self.assert_leads([self.hot], sources=["whatsapp"])
        self.assert_leads([self.hot, self.warm], sources=["whatsapp", "instagram"])
        self.assert_leads([self.converted], sources=["twilio"])
        self.assert_leads([self.warm], statuses=["active"])
        self.assert_leads([self.hot], tiers=["hot"])

    def test_intent_formats_and_labels(self):
        self.assert_leads([self.hot], intents=["pricing_intent"])
        self.assert_leads([self.warm], intents=["payment_intent"])
        self.assert_leads([self.hot, self.warm], intents=["pricing_intent", "payment_intent"])
        self.assert_leads([self.hot], labels=["Follow Up", "Interested"])

    def test_assignment(self):
        self.assert_leads([self.hot], assignment="mine")
        self.assert_leads([self.hot], assigned_to=self.agent)
        self.assert_leads([self.warm, self.converted, self.cold], assignment="unassigned")

    def test_combined_filters_and_pagination(self):
        self.assert_leads([self.hot], min_score=60, sources=["whatsapp", "instagram"], converted=False,
                          labels=["Interested"], assignment="mine", created_from=self.now - timedelta(days=7))
        q = self.query(sources=["whatsapp", "instagram"]).order_by(Lead.score.desc(), Lead.id)
        self.assertEqual(q.count(), 2)
        self.assertEqual(q.limit(1).one().id, self.hot.id)
        self.assertEqual(q.offset(1).limit(1).one().id, self.warm.id)

    def test_engagement_and_score_changes(self):
        self.assert_leads([self.hot], unread=True, waiting="customer", min_messages=1, max_messages=1)
        self.assert_leads([self.warm], waiting="agent", min_messages=2)
        for value, lead in [("increased", self.hot), ("decreased", self.warm), ("unchanged", self.cold)]:
            self.assert_leads([lead], score_changed=value)

    def test_revenue_contact_search_favorite(self):
        self.assert_leads([self.converted], min_value=1000, max_value=2000, product="consult", converted=True)
        self.assert_leads([self.hot], has_phone=True, has_email=True, favorite=True)
        self.assert_leads([self.hot], search="buyer@example.test")
        self.assert_leads([], search="%")

    def test_csv_all_filtered_selected_and_isolation(self):
        columns = ["name", "phone", "assigned_agent"]
        def names(q):
            with export_file(q, columns, "csv") as output:
                return list(csv.reader(io.StringIO(output.read().decode("utf-8-sig")) ))
        all_rows = names(self.query())
        self.assertEqual(len(all_rows), 5)
        self.assertNotIn("Other tenant", str(all_rows))
        self.assertIn("'=SUM(1,2)", str(all_rows))
        filtered = names(self.query(min_score=75, sources=["whatsapp"]))
        self.assertEqual(filtered[1], ["Hot buyer", "'+919876543210", "Sales Agent"])
        selected = names(self.query().filter(Lead.id.in_([self.hot.id, self.foreign.id])))
        self.assertEqual(len(selected), 2)

    def test_xlsx_roundtrip(self):
        with export_file(self.query(), ["name", "score", "conversion_amount"], "xlsx") as output:
            book = load_workbook(output, read_only=True)
            rows = list(book.active.values)
            self.assertEqual(len(rows), 5)
            self.assertEqual(rows[0], ("Name", "Lead Score", "Deal Value"))
            self.assertTrue(any(row[2] == 1500 for row in rows[1:]))
            self.assertTrue(all(cell.data_type != "f" for row in book.active for cell in row))
            book.close()

    def test_analytics_date_and_isolation(self):
        data = analytics(self.db, self.workspace, LeadFilters(), self.agent)
        self.assertEqual((data["total"], data["qualified"], data["hot"], data["converted"], data["revenue"]), (4, 3, 1, 1, 1500))
        self.assertEqual(sum(v["count"] for v in data["distribution"]), 4)
        self.assertEqual(data["conversion_rate"], 25)
        recent = analytics(self.db, self.workspace, LeadFilters(created_from=self.now - timedelta(days=7)), self.agent)
        self.assertEqual((recent["total"], recent["revenue"]), (3, 0))
        empty = analytics(self.db, self.workspace, LeadFilters(min_score=100), self.agent)
        self.assertEqual((empty["total"], empty["conversion_rate"]), (0, 0))

    def test_validation(self):
        for invalid in [dict(min_score=90, max_score=10), dict(min_value=-1), dict(tiers=["invented"]), dict(city="unsupported")]:
            with self.assertRaises(ValidationError):
                LeadFilters(**invalid)
        with self.assertRaises(ValidationError):
            LeadExportRequest(scope="selected", columns=["name"])
        with self.assertRaises(ValueError):
            export_file(self.query(), ["workspace_id"], "csv")

    def test_api_list_export_history_and_workspace_authorization(self):
        import json
        from fastapi import FastAPI
        from fastapi.testclient import TestClient
        from app.database import get_db
        from app.routers.auth import get_current_user
        from app.routers.lead_scoring import router
        application = FastAPI()
        application.include_router(router)
        application.dependency_overrides[get_db] = lambda: self.db
        application.dependency_overrides[get_current_user] = lambda: self.db.get(User, self.agent)
        with TestClient(application) as client:
            params = {"workspace_id": str(self.workspace)}
            filters = {"sources": ["whatsapp", "instagram"], "min_score": 60}
            response = client.get("/lead-scoring/leads", params={**params, "filters": json.dumps(filters), "limit": 1})
            self.assertEqual(response.status_code, 200, response.text)
            self.assertEqual(response.json()["total"], 2)
            self.assertEqual(len(response.json()["items"]), 1)
            # Legacy clients still use status/search/min_score query arguments.
            legacy = client.get("/lead-scoring/leads", params={**params, "status": "active", "min_score": 50})
            self.assertEqual(legacy.status_code, 200, legacy.text)
            self.assertEqual(legacy.json()["total"], 1)
            for scope, expected in [("all", 5), ("filtered", 3), ("selected", 2)]:
                result = client.post("/lead-scoring/export", params=params, json={
                    "scope": scope, "format": "csv", "columns": ["name"], "filters": filters,
                    "selected_ids": [str(self.hot.id), str(self.foreign.id)]})
                self.assertEqual(result.status_code, 200, result.text)
                self.assertEqual(len(list(csv.reader(io.StringIO(result.content.decode("utf-8-sig"))))), expected)
                self.assertNotIn("Other tenant", result.text)
            history = client.get("/lead-scoring/history", params={**params, "limit": 1})
            self.assertEqual(history.status_code, 200, history.text)
            self.assertEqual(history.json()["total"], 3)
            options = client.get("/lead-scoring/filter-options", params=params)
            self.assertEqual(options.status_code, 200, options.text)
            self.assertEqual(options.json()["agents"][0]["id"], str(self.agent))
            for endpoint in ["leads", "analytics", "filter-options", "history"]:
                denied = client.get(f"/lead-scoring/{endpoint}", params={"workspace_id": str(self.other_workspace)})
                self.assertEqual(denied.status_code, 403, denied.text)
            denied = client.post("/lead-scoring/export", params={"workspace_id": str(self.other_workspace)}, json={"scope": "all", "columns": ["name"]})
            self.assertEqual(denied.status_code, 403, denied.text)
            invalid = client.get("/lead-scoring/leads", params={**params, "filters": '{"min_score":90,"max_score":20}'})
            self.assertEqual(invalid.status_code, 422)
            application.dependency_overrides.pop(get_current_user)
            unauthenticated = client.get("/lead-scoring/leads", params=params)
            self.assertIn(unauthenticated.status_code, [401, 403])


if __name__ == "__main__":
    unittest.main(verbosity=2)
