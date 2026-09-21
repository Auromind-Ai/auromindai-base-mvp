"""Run with python -m unittest discover -s tests/crm -p test_crm_follow_ups.py."""
import unittest
from types import SimpleNamespace
from unittest.mock import patch
from uuid import uuid4

from fastapi import HTTPException
from pydantic import ValidationError
from sqlalchemy import ForeignKeyConstraint, MetaData, create_engine
from sqlalchemy.orm import Session

from app.models.ai_action import Lead
from app.routers.lead_scoring import add_follow_up_leads, remove_follow_up_lead
from app.schemas.crm_filters import LeadFilters, LeadFollowUpRequest
from app.services.crm.lead_query import lead_query


class FollowUpTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine('sqlite:///:memory:')
        metadata = MetaData()
        table = Lead.__table__.to_metadata(metadata)
        for constraint in list(table.constraints):
            if isinstance(constraint, ForeignKeyConstraint):
                table.constraints.remove(constraint)
        table.foreign_keys.clear()
        metadata.create_all(self.engine)
        self.db = Session(self.engine)
        self.workspace = uuid4()
        self.selected = Lead(id=uuid4(), workspace_id=self.workspace, name='Selected')
        self.unselected = Lead(id=uuid4(), workspace_id=self.workspace, name='Unselected')
        self.foreign = Lead(id=uuid4(), workspace_id=uuid4(), name='Other workspace', is_follow_up=True)
        self.db.add_all([self.selected, self.unselected, self.foreign])
        self.db.commit()
        self.access = patch('app.routers.lead_scoring.verify_workspace_access', return_value=self.workspace)
        self.verify = self.access.start()
        self.addCleanup(self.access.stop)
        self.addCleanup(self.engine.dispose)
        self.addCleanup(self.db.close)

    def add(self, ids):
        return add_follow_up_leads(LeadFollowUpRequest(selected_ids=ids), str(self.workspace), self.db, SimpleNamespace(id=uuid4()))

    def test_selection_persists_and_is_idempotent(self):
        self.add([self.selected.id, self.selected.id])
        self.add([self.selected.id])
        self.db.expire_all()
        found = lead_query(self.db, self.workspace, LeadFilters(follow_up=True)).all()
        self.assertEqual([row.id for row in found], [self.selected.id])
        self.assertFalse(self.unselected.is_follow_up)
        self.assertEqual(lead_query(self.db, self.workspace, LeadFilters()).count(), 2)
        self.assertTrue(self.verify.called)

    def test_foreign_or_missing_selection_rejects_entire_batch(self):
        for invalid_id in (self.foreign.id, uuid4()):
            with self.assertRaises(HTTPException) as raised:
                self.add([self.selected.id, invalid_id])
            self.assertEqual(raised.exception.status_code, 404)
            self.db.expire_all()
            self.assertFalse(self.selected.is_follow_up)

    def test_empty_or_malformed_selection_rejected(self):
        for ids in ([], ['invalid-id']):
            with self.assertRaises(ValidationError):
                LeadFollowUpRequest(selected_ids=ids)

    def test_saved_selection_filters_ids_within_workspace(self):
        found = lead_query(self.db, self.workspace, LeadFilters(lead_ids=[self.selected.id, self.foreign.id])).all()
        self.assertEqual([lead.id for lead in found], [self.selected.id])

    def test_remove_keeps_lead_and_can_be_readded(self):
        self.add([self.selected.id])
        for _ in range(2):
            remove_follow_up_lead(self.selected.id, str(self.workspace), self.db, SimpleNamespace(id=uuid4()))
        self.db.expire_all()
        self.assertEqual(lead_query(self.db, self.workspace, LeadFilters(follow_up=True)).count(), 0)
        self.assertIsNotNone(self.db.get(Lead, self.selected.id))
        self.add([self.selected.id])
        self.db.expire_all()
        self.assertTrue(self.selected.is_follow_up)

    def test_remove_rejects_other_workspace_and_missing_lead(self):
        for lead_id in (self.foreign.id, uuid4()):
            with self.assertRaises(HTTPException) as raised:
                remove_follow_up_lead(lead_id, str(self.workspace), self.db, SimpleNamespace(id=uuid4()))
            self.assertEqual(raised.exception.status_code, 404)
        self.db.expire_all()
        self.assertTrue(self.foreign.is_follow_up)


if __name__ == '__main__':
    unittest.main()
