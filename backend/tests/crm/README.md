# Leads & CRM upgrade

## Existing implementation and reuse

- `frontend/src/components/leads/LeadsWorkspace.jsx`: shared directory, conversation preview, lead overview, favorites, manual creation, Inbox links, and responsive panels. `/user/admin/leads` presents the original simple Leads UI; `/user/admin/crm` enables the upgraded navigation, filters, exports, analytics, and saved views. The global sidebar has separate Leads and CRM entries; both reuse the same data/services and panels.
- `backend/app/models/ai_action.py`: existing `Lead` model, contact/source fields, assignment, labels, conversion values, and intent JSON. No model or migration was added.
- `backend/app/routers/lead_scoring.py`: existing authenticated list/detail/scoring/history/assignment/conversion APIs. New read/report endpoints use the same `verify_workspace_access` authorization.
- `backend/app/services/crm/lead_scoring_service.py`: existing score calculation, list serialization, and audit logging. Listing now batches template-log reads and delegates filtering to `lead_query.py`.
- `backend/app/models/lead_scoring.py`: existing `LeadScoreHistory` and `TemplateLog`. Workspace history queries this audit table; assignment changes now record an event there.
- `backend/app/models/conversation.py` and `message.py`: existing conversations/messages. Message count, unread status, and who is waiting derive from these records, without new fields.
- `backend/app/config/scoring/default.yaml`: scoring source of truth. Current tiers are Hot ≥75, Warm ≥40, Cold <40. The UI receives ranges from configuration; no alternate scoring algorithm was added.
- Existing workspace, score, status, activity, message/conversation, and history indexes are reused.

Previously missing: server-side channel/favorite/date/intent/assignment/label/revenue filters; exports; CRM-wide analytics/history; secondary navigation and saved filter controls. Channel/favorite filtering was previously limited to the loaded browser page.

## Behavior and API contract

The existing `GET /lead-scoring/leads` accepts an optional JSON `filters` query parameter. Legacy `status`, `search`, `min_score`, `max_score`, sorting, and pagination remain supported.

`GET /lead-scoring/filter-options`, `/analytics`, and `/history` and `POST /lead-scoring/export` belong to the existing router. Every route verifies workspace access. Selected export IDs are intersected with that workspace. Assignment now requires membership in the same workspace.

`LeadFilters` is shared by listing, analytics and export. Filter groups use AND; multi-select values in a group use OR. Dates use inclusive lower/exclusive upper bounds; the UI translates local calendar days into UTC instants, including the complete selected end day. Search includes name, phone, and email and treats SQL wildcard characters literally. Twilio includes existing SMS/phone source aliases. Score change means the latest recorded audit entry, not an inferred lifetime trend.

Export scopes:

- All ignores filters and selected IDs.
- Filtered uses the applied search, quick filter, and advanced filters, without pagination.
- Selected ignores filters and exports only selected accessible IDs.

CSV and XLSX support selected columns and spreadsheet formula protection. Export iterates database rows in batches and writes to a disk-backed spool. Install the added `openpyxl` dependency through `backend/requirements.txt`.

Analytics reports the current state of leads **created** in the selected period. Qualified means the existing Warm or Hot tier. Revenue is the sum of recorded deal values for converted leads in that cohort. Conversion groups can overlap; the UI does not imply that every conversion passed through Hot. No currency is inferred from the lead model.

Saved views use browser storage scoped to account and workspace. They store filters, not lead data, and are not synchronized between devices. Workspace changes remount the CRM and clear cached leads/selections.

## Deliberate gaps

No `Qualified Lead Email Report` implementation was found in this checkout after repository-wide searches. The existing `notification_scheduler_worker.py` implements daily summaries and weekly performance emails, with admin-managed notification templates. Those systems are unchanged. The Email Reports section describes their availability and links to existing settings; filtered scheduling, attachments, and AI email summaries are **not implemented**, because there is no matching existing report integration to extend.

No artificial Inactive tier, city/state fields, buying-intent signals, engagement bands, or response-speed categories were added. Existing supported intents are exposed from scoring configuration. Response speed remains in the existing individual lead detail. Period comparison and saved-view defaults were optional and are not implemented.

## Verification

Run PostgreSQL integration tests directly (they intentionally avoid the repository's global SQLite fixtures):

```powershell
$env:CRM_TEST_DATABASE_URL = '<PostgreSQL test connection URL>'
python backend/tests/crm/test_crm_upgrade.py
```

Tests create a random isolated schema in a transaction, exercise real SQL and FastAPI routes, then roll back all fixtures. They cover no/empty filters, dates, score, channels, multiple channels, status, tiers, boolean/nested intent JSON, assignment, labels, combined filters, pagination, engagement, revenue, CSV/XLSX round trips, all/filtered/selected exports, analytics, legacy list arguments, history, missing authentication, and cross-workspace denial.

Validation performed: 13 PostgreSQL integration tests passed; the frontend production build passed; targeted ESLint passed with two pre-existing `<img>` warnings in the CRM page. Neither Chrome nor the in-app browser is available to the UI automation tool in this session, so interactive/visual QA and end-to-end creation/conversation/conversion/email-delivery checks remain unverified.
