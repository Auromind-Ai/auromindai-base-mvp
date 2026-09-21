import unittest
from uuid import uuid4

from pydantic import ValidationError
from app.schemas.crm_filters import CrmSavedViewCreate


class SavedViewValidationTests(unittest.TestCase):
    def test_empty_criteria_rejected(self):
        for filters in ({}, {"search": "   "}, {"sources": [], "favorite": None}, {"lead_ids": []}):
            with self.subTest(filters=filters), self.assertRaises(ValidationError):
                CrmSavedViewCreate(name="Empty", filters=filters)

    def test_filter_or_selection_is_allowed(self):
        for filters in ({"search": " customer "}, {"sources": ["whatsapp"]},
                        {"favorite": False}, {"min_score": 0}, {"lead_ids": [str(uuid4())]}):
            view = CrmSavedViewCreate(name=" Saved view ", filters=filters)
            self.assertEqual(view.name, "Saved view")
            self.assertTrue(view.filters.model_dump(exclude_none=True, exclude_defaults=True))

    def test_invalid_name_or_filter_rejected(self):
        for name, filters in (("  ", {"favorite": True}), ("View", {"unknown": True}),
                              ("View", {"lead_ids": ["invalid"]})):
            with self.assertRaises(ValidationError):
                CrmSavedViewCreate(name=name, filters=filters)
