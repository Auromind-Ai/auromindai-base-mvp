"""Database-free tests: python -m unittest discover -s tests/crm -p test_report_csv_columns.py"""
import csv
import io
import unittest
from types import SimpleNamespace
from datetime import datetime, timezone

from app.services.crm.lead_email_report_service import LeadEmailReportService, validate_csv_columns


class ReportCsvColumnsTests(unittest.TestCase):
    def rows(self, columns):
        lead = SimpleNamespace(name='Actual customer', phone='9876543210', source='whatsapp',
                               score=63, lead_tier='warm', created_at=datetime(2026, 9, 19, tzinfo=timezone.utc))
        data = LeadEmailReportService.generate_csv_bytes([lead], columns)
        return list(csv.reader(io.StringIO(data.decode('utf-8-sig'))))

    def test_no_selection_exports_all_table_fields(self):
        rows = self.rows([])
        self.assertEqual(rows[0], ['S.no', 'Date', 'Source', 'Name', 'Phone', 'Lead Score', 'Lead Category'])
        self.assertEqual(rows[1][3:6], ['Actual customer', '9876543210', '63 / 100'])
        self.assertEqual(self.rows(None), rows)

    def test_selected_fields_only(self):
        self.assertEqual(self.rows(['name', 'phone']), [['Name', 'Phone'], ['Actual customer', '9876543210']])

    def test_other_fields_are_not_allowed(self):
        for field in ['company', 'email', 'status', 'intent_signals', 'last_activity_at']:
            with self.assertRaises(ValueError):
                validate_csv_columns([field])


if __name__ == '__main__':
    unittest.main()
