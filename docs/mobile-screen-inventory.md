# Orbion Agents — Mobile Screen Inventory

**Document version:** 1.0  
**Status:** Draft  
**Scope:** React Native (or mobile web) MVP for Orbion Agents  
**Backend:** FastAPI + PostgreSQL + Redis + Celery  
**Auth:** OTP / Google OAuth / Cookie JWT / 2FA TOTP  
**Realtime:** WebSocket `/ws/{user_id}?token=&workspace_id=` (Redis pubsub, ping/pong heartbeat)

---

## Summary Table

| Screen ID | Screen Name | Group | Priority | MVP Inclusion | Complexity |
|-----------|-------------|-------|----------|---------------|------------|
| SCR-001 | Splash / App Init | Auth | P0 | Yes | Low |
| SCR-002 | Login | Auth | P0 | Yes | Medium |
| SCR-003 | Two-Factor Auth | Auth | P0 | Yes | Low |
| SCR-004 | Workspace Selection | Auth | P0 | Yes | Low |
| SCR-005 | Dashboard Home | Dashboard | P0 | Yes | High |
| SCR-006 | Inbox List | Inbox | P0 | Yes | High |
| SCR-007 | Conversation Detail | Inbox | P0 | Yes | High |
| SCR-008 | Reply Composer | Inbox | P0 | Yes | Medium |
| SCR-009 | AI Agents List | AI Agents | P1 | Yes | Medium |
| SCR-010 | AI Agent Detail | AI Agents | P1 | Yes | Low |
| SCR-011 | Flows List | Automation | P1 | Yes | Medium |
| SCR-012 | Flow Detail View | Automation | P1 | Yes | Low |
| SCR-013 | Contacts List | Contacts/CRM | P1 | Yes | Medium |
| SCR-014 | Contact Detail | Contacts/CRM | P1 | Yes | Medium |
| SCR-015 | Campaigns List | Campaigns | P1 | Yes | Medium |
| SCR-016 | Campaign Detail | Campaigns | P1 | Yes | Medium |
| SCR-017 | Channel Status Overview | Channels | P1 | Yes | Medium |
| SCR-018 | Channel Connection (WhatsApp) | Channels | P1 | Yes | Medium |
| SCR-019 | Notifications List | Notifications | P0 | Yes | Low |
| SCR-020 | Credits & Usage | Credits/Billing | P1 | Yes | Medium |
| SCR-021 | Billing Overview | Credits/Billing | P2 | No | Medium |
| SCR-022 | Profile | Settings | P1 | Yes | Low |
| SCR-023 | Team Members | Settings | P1 | Yes | Medium |
| SCR-024 | Security | Settings | P2 | No | Medium |
| SCR-025 | App Settings | Settings | P1 | Yes | Low |
| SCR-026 | Message Templates | Marketing/Templates | P1 | Yes | Medium |

---

## Global Architecture Notes

- **No push notification backend:** FCM/APNs integration is **not implemented**. In-app notification polling only.
- **Brain/AI Workspace:** Excluded entirely from mobile MVP.
- **Followups:** Backend routes are commented out; not surfaced in mobile.
- **Visual Automation Builder:** Drag-and-drop canvas is not suitable for mobile. Mobile shows read-only flow list with status toggle only.
- **Payments:** Razorpay + PayU; billing flows that require payment open a secure webview.
- **Media Storage:** Supabase media bucket.
- **Permission Model:** Checked via `GET /workspaces/{id}/my-permissions`. Permissions: `dashboard.overview`, `inbox.conversations`, `crm.view`, `ai.chat`, `automation.manage`, `channels.manage`, `credits.view`, `billing.manage`, `marketing.campaigns`, `team.members`, `settings.general`.

---

## Auth Group

---

### SCR-001 — Splash / App Init

| Field | Detail |
|-------|--------|
| **Screen ID** | SCR-001 |
| **Screen Name** | Splash / App Init |
| **Purpose** | Display app logo while restoring auth state from secure storage and determining the correct initial route. |
| **Target User** | All |
| **Entry Point** | Cold app launch |
| **Priority** | P0 |
| **MVP Inclusion** | Yes |
| **Implementation Complexity** | Low |

#### Primary Components
- Full-screen logo / brand mark
- Animated loading indicator (spinner or progress bar)
- Invisible token restoration logic

#### Primary Actions
- Read JWT / session cookie from secure device storage
- Validate token freshness via `GET /auth/me`
- Redirect → Login (no valid token), Workspace Selection (valid token, multiple workspaces), or Dashboard Home (valid token, single workspace)

#### Data Dependencies
- Locally stored JWT / session cookie
- `GET /auth/me` response

#### API Endpoints Required
```
GET /auth/me
GET /auth/workspaces
GET /onboarding/status
```

#### State Behaviors

| State | Behavior |
|-------|----------|
| **Loading** | Full-screen logo with animated spinner; no user interaction possible |
| **Empty** | N/A |
| **Error** | If `/auth/me` returns 401 or network error, clear stored token and navigate to SCR-002 Login |
| **Success** | Navigate to appropriate screen based on workspace count and onboarding status |

#### Permission Required
None (pre-auth screen)

#### Mobile-Specific Considerations
- Secure storage: use platform keychain (iOS Keychain / Android Keystore) to persist session token
- Cold start budget: aim for <300 ms before first meaningful paint
- Handle app resume from background (re-validate token silently)
- Handle deep-link intents that arrive at cold start (e.g. notification tap → specific conversation)

---

### SCR-002 — Login

| Field | Detail |
|-------|--------|
| **Screen ID** | SCR-002 |
| **Screen Name** | Login |
| **Purpose** | Allow users to authenticate via OTP email flow or Google OAuth. |
| **Target User** | All |
| **Entry Point** | SCR-001 redirect when no valid session exists |
| **Priority** | P0 |
| **MVP Inclusion** | Yes |
| **Implementation Complexity** | Medium |

#### Primary Components
- App logo / brand header
- Email address text input
- "Send OTP" primary button
- OTP code input (6-digit, appears after OTP sent)
- "Verify OTP" primary button
- Divider ("or")
- "Continue with Google" OAuth button
- Resend OTP link with countdown timer (e.g. 60 s cooldown)

#### Primary Actions
- Submit email → call `POST /auth/send-otp`
- Submit OTP code → call `POST /auth/verify-otp`
- Tap Google button → initiate OAuth flow via `GET /auth/google/login` (webview or system browser)
- Resend OTP after cooldown

#### Data Dependencies
- User-entered email address
- User-entered OTP code
- Google OAuth redirect response

#### API Endpoints Required
```
POST /auth/send-otp
POST /auth/verify-otp
GET  /auth/google/login
```

#### State Behaviors

| State | Behavior |
|-------|----------|
| **Loading** | Buttons disabled, inline spinner on active button while awaiting API response |
| **Empty** | Email field empty → Send OTP button disabled; form validates email format before enabling button |
| **Error** | Inline field error: invalid email format; toast/snackbar for API errors (OTP expired, invalid OTP, rate limit); retry option shown |
| **Success** | After `verify-otp`: if 2FA enabled → navigate to SCR-003; else → check workspaces → SCR-004 or SCR-005 |

#### Permission Required
None

#### Mobile-Specific Considerations
- Use numeric keyboard for OTP input; auto-advance focus between digit boxes
- SMS autofill (OTP autofill API on Android / iOS) if OTP arrives via SMS
- Support system password manager / passkey autofill on email input
- Google OAuth: use ASWebAuthenticationSession (iOS) / Chrome Custom Tabs (Android) — not a plain WebView — to satisfy OAuth security requirements
- Prevent screenshot on login screen (optional, OS-level flag)

---

### SCR-003 — Two-Factor Auth

| Field | Detail |
|-------|--------|
| **Screen ID** | SCR-003 |
| **Screen Name** | Two-Factor Auth (TOTP) |
| **Purpose** | Verify the TOTP code from an authenticator app when 2FA is enabled for the account. |
| **Target User** | All (users with 2FA enabled) |
| **Entry Point** | SCR-002 Login success when `GET /2fa/status` indicates 2FA is active |
| **Priority** | P0 |
| **MVP Inclusion** | Yes |
| **Implementation Complexity** | Low |

#### Primary Components
- Explanatory header ("Enter your authenticator code")
- 6-digit TOTP code input
- "Verify" primary button
- "Use a backup code" secondary link (P2)

#### Primary Actions
- Submit TOTP code → `POST /2fa/verify-login`
- Auto-submit when all 6 digits entered
- Navigate back to Login if user cancels

#### Data Dependencies
- Session state from SCR-002 (pre-auth token / session ID passed in request)
- User-entered TOTP code

#### API Endpoints Required
```
POST /2fa/verify-login
GET  /2fa/status
```

#### State Behaviors

| State | Behavior |
|-------|----------|
| **Loading** | Input disabled, spinner on Verify button |
| **Empty** | Verify button disabled until 6 digits entered |
| **Error** | Inline error "Invalid or expired code. Try again."; do not clear the input automatically so user can correct; show remaining attempts if API returns them |
| **Success** | Navigate to SCR-004 or SCR-005 based on workspace count |

#### Permission Required
None (mid-auth screen)

#### Mobile-Specific Considerations
- Numeric keyboard; auto-advance between digit boxes
- TOTP codes expire every 30 s — show a subtle timer ring so user knows when to expect code rotation
- No biometric shortcut at this stage (TOTP is the second factor)

---

### SCR-004 — Workspace Selection

| Field | Detail |
|-------|--------|
| **Screen ID** | SCR-004 |
| **Screen Name** | Workspace Selection |
| **Purpose** | Allow users who belong to multiple workspaces to choose which workspace to enter. |
| **Target User** | All multi-workspace users |
| **Entry Point** | Post-auth when `GET /auth/workspaces` returns more than one workspace |
| **Priority** | P0 |
| **MVP Inclusion** | Yes |
| **Implementation Complexity** | Low |

#### Primary Components
- "Select Workspace" heading
- Scrollable list of workspace cards (name, avatar/logo, role badge)
- Search / filter field (if >5 workspaces)

#### Primary Actions
- Tap workspace card → set active workspace → `GET /workspaces/{id}/my-permissions` → navigate to SCR-005

#### Data Dependencies
- `GET /auth/workspaces` response (list of workspaces with id, name, role, logo)

#### API Endpoints Required
```
GET /auth/workspaces
GET /workspaces/{id}/my-permissions
GET /onboarding/status
```

#### State Behaviors

| State | Behavior |
|-------|----------|
| **Loading** | Skeleton list items while fetching workspaces |
| **Empty** | Should not occur if routed here correctly; fallback: "No workspaces found. Contact your administrator." |
| **Error** | Retry button with error message; logout option |
| **Success** | Navigate to Dashboard Home for the selected workspace |

#### Permission Required
None

#### Mobile-Specific Considerations
- Persist last-used workspace ID in local storage so returning users auto-select it (with option to switch)
- Support workspace switching later from a profile menu or side drawer without full re-login

---

## Dashboard Group

---

### SCR-005 — Dashboard Home

| Field | Detail |
|-------|--------|
| **Screen ID** | SCR-005 |
| **Screen Name** | Dashboard Home |
| **Purpose** | Provide an at-a-glance summary of business metrics, recent activity, quick navigation actions, and onboarding status for the active workspace. |
| **Target User** | Owner / Admin / Member (content filtered by permission) |
| **Entry Point** | Post-auth redirect; bottom nav "Home" tab |
| **Priority** | P0 |
| **MVP Inclusion** | Yes |
| **Implementation Complexity** | High |

#### Primary Components
- Workspace name header with notification bell (badge count)
- Onboarding progress banner (dismissible, shown until all steps complete)
- Metrics grid: total conversations, open conversations, resolved, AI credits used
- Revenue summary card (simplified — single stat, no full chart on mobile)
- Recent activity feed (scrollable list of activity items)
- Quick action pills: "New Conversation", "View Inbox", "View Campaigns"
- Pull-to-refresh

#### Primary Actions
- Pull-to-refresh → re-fetch all dashboard data
- Tap metric card → navigate to relevant detail screen
- Tap notification bell → SCR-019
- Dismiss onboarding banner → `POST /onboarding/dismiss`
- Tap activity item → navigate to related conversation or entity
- Tap quick action pills → deep-link to relevant screens

#### Data Dependencies
```
GET /dashboard/overview
GET /dashboard/metrics
GET /dashboard/revenue
GET /dashboard/activities
GET /dashboard/insights
GET /onboarding/status
GET /conversations/counts
```

#### API Endpoints Required
```
GET /dashboard/overview
GET /dashboard/metrics
GET /dashboard/revenue
GET /dashboard/activities
GET /dashboard/insights
GET /onboarding/status
POST /onboarding/dismiss
GET /conversations/counts
GET /notifications
```

#### State Behaviors

| State | Behavior |
|-------|----------|
| **Loading** | Skeleton cards for each metric; skeleton rows for activity feed |
| **Empty** | Metrics show 0 values with descriptive sub-text ("No conversations yet") |
| **Error** | Per-section retry buttons; partial data rendered where available |
| **Success** | Full dashboard with live data; onboarding banner shown if not dismissed |

#### Permission Required
`dashboard.overview`

#### Mobile-Specific Considerations
- Revenue chart is **simplified** to a single summary stat — no interactive D3/SVG chart (performance and screen space constraints)
- Collapse onboarding banner to a slim progress bar after first open to save vertical space
- Bottom navigation bar always visible (Home, Inbox, Notifications, Profile)
- Real-time conversation count badge updated via WebSocket messages (no full page reload)
- Limit activity feed to last 20 items; "View All" link navigates to a dedicated activity list

---

## Inbox Group

---

### SCR-006 — Inbox List

| Field | Detail |
|-------|--------|
| **Screen ID** | SCR-006 |
| **Screen Name** | Inbox List |
| **Purpose** | Display all conversations for the active workspace with filtering by channel, search, and real-time unread badge updates. |
| **Target User** | Owner / Admin / Member |
| **Entry Point** | Bottom nav "Inbox" tab; Dashboard quick action |
| **Priority** | P0 |
| **MVP Inclusion** | Yes |
| **Implementation Complexity** | High |

#### Primary Components
- Search bar (top)
- Channel filter chips: All / WhatsApp / Instagram / Twilio
- Filter/sort button (opens bottom sheet: Open / Closed / All; Newest / Oldest)
- Conversation list (contact name, channel icon, last message preview, timestamp, unread badge)
- Floating action button or pull-to-refresh
- WebSocket connection indicator (subtle dot: green = connected, grey = reconnecting)

#### Primary Actions
- Type in search bar → debounced `GET /conversations?search=...`
- Tap channel chip → `GET /conversations?filter=channel:whatsapp` (etc.)
- Tap conversation → SCR-007 Conversation Detail
- Pull-to-refresh
- Swipe-left on row → quick "Mark Read" action
- Paginate (infinite scroll → next page via `?page=N`)

#### Data Dependencies
```
GET /conversations?workspace_id=&filter=&search=&page=
GET /conversations/counts
WebSocket /ws/{user_id}?token=&workspace_id= (new message / status events)
```

#### API Endpoints Required
```
GET /conversations
GET /conversations/counts
POST /conversations/{id}/read
```

#### State Behaviors

| State | Behavior |
|-------|----------|
| **Loading** | Skeleton rows (5–8 items) on initial load; inline spinner at list bottom for pagination |
| **Empty** | Illustration + "No conversations yet" message; if search/filter active: "No results for '{query}'" with clear filter button |
| **Error** | Error banner with retry button; cached list may still be shown |
| **Success** | Full list with real-time unread badge increments via WebSocket; new conversations prepended when received |

#### Permission Required
`inbox.conversations`

#### Mobile-Specific Considerations
- WebSocket must reconnect automatically with exponential backoff (ping/pong heartbeat)
- Virtualised list rendering (FlatList / RecyclerView) for performance with large conversation sets
- Swipe-to-read gesture follows platform conventions (iOS: trailing action; Android: left swipe)
- Filter chips scroll horizontally on small screens
- Badge on bottom nav tab icon reflects total unread count from `conversations/counts`

---

### SCR-007 — Conversation Detail

| Field | Detail |
|-------|--------|
| **Screen ID** | SCR-007 |
| **Screen Name** | Conversation Detail |
| **Purpose** | Display the full message thread for a single conversation, show channel identity, allow agents to reply, get AI suggestions, and manage conversation state. |
| **Target User** | Owner / Admin / Member |
| **Entry Point** | SCR-006 Inbox List — tap conversation row |
| **Priority** | P0 |
| **MVP Inclusion** | Yes |
| **Implementation Complexity** | High |

#### Primary Components
- Navigation header: contact name, channel icon (WhatsApp / Instagram / Twilio), back arrow
- Status badge (Open / Closed)
- Message thread (chat bubble list, sender/agent differentiated by alignment and color)
- Media thumbnails (images inline, documents as attachment cards)
- "AI Suggest" floating button / toolbar button
- Action bar: Close Conversation button, Convert button
- Reply Composer strip (navigates to SCR-008 or inline on larger phones)
- Typing indicator (WebSocket-driven)

#### Primary Actions
- Scroll up to load older messages (paginated)
- Tap media thumbnail → full-screen media viewer
- Tap "AI Suggest" → `POST /ai-suggest` → display suggestion in composer draft
- Tap "Close" → `POST /conversations/{id}/close`
- Tap "Convert" → `POST /conversations/{id}/convert`
- Tap reply area → expand SCR-008 composer
- Mark as read on open → `POST /conversations/{id}/read`

#### Data Dependencies
```
GET /conversations/{id}
GET /messages/{conversation_id}
POST /ai-suggest
POST /conversations/{id}/read
WebSocket — incoming messages on this conversation
```

#### API Endpoints Required
```
GET /conversations/{id}
GET /messages/{conversation_id}
POST /conversations/{id}/read
POST /ai-suggest
POST /conversations/{id}/close
POST /conversations/{id}/convert
```

#### State Behaviors

| State | Behavior |
|-------|----------|
| **Loading** | Skeleton bubbles (alternating left/right) while messages load |
| **Empty** | "No messages yet in this conversation" placeholder at center of thread |
| **Error** | Error banner "Could not load messages" with retry; header info still shown if conversation metadata loaded |
| **Success** | Full thread rendered; new messages appended in real-time via WebSocket; "AI Suggest" shows inline suggestion card above composer |

#### Permission Required
`inbox.conversations`

#### Mobile-Specific Considerations
- Keyboard avoidance: composer input must slide above keyboard on iOS/Android (adjustResize / KeyboardAvoidingView)
- Images from Supabase media bucket rendered with caching and progressive loading
- Document attachments shown as tappable cards (open with system file viewer)
- Long-press on message bubble → copy text action sheet
- Header collapses on scroll to maximise message thread space

---

### SCR-008 — Reply Composer

| Field | Detail |
|-------|--------|
| **Screen ID** | SCR-008 |
| **Screen Name** | Reply Composer |
| **Purpose** | Provide a rich text composition interface for agents to craft and send replies including emoji, images, and documents. |
| **Target User** | Owner / Admin / Member |
| **Entry Point** | Tap reply area in SCR-007; expands as a bottom sheet or full-screen modal |
| **Priority** | P0 |
| **MVP Inclusion** | Yes |
| **Implementation Complexity** | Medium |

#### Primary Components
- Multi-line text input (auto-grows up to 5 lines)
- Character count indicator
- Emoji picker button → bottom sheet emoji grid
- Attachment button → action sheet: "Photo / Video" / "Document"
- Attachment preview strip (thumbnails with remove X)
- Send button (disabled when input empty and no attachment)
- AI suggestion banner (pre-filled draft from `POST /ai-suggest` — tappable to accept)

#### Primary Actions
- Type message text
- Tap emoji → insert at cursor
- Tap attachment → pick from gallery or files → show preview
- Remove attachment thumbnail (tap X)
- Accept AI suggestion → populate text input
- Tap Send → `POST /send-reply` with text + attachment(s)

#### Data Dependencies
- Conversation ID (passed from SCR-007)
- AI suggestion draft (optional, from SCR-007)
- Supabase media bucket (upload attachment before send)

#### API Endpoints Required
```
POST /send-reply
POST /ai-suggest
```

#### State Behaviors

| State | Behavior |
|-------|----------|
| **Loading** | Send button shows spinner; input disabled during send; attachment shows upload progress bar |
| **Empty** | Send button disabled; character count shows 0 / limit |
| **Error** | Toast "Failed to send. Tap to retry." with local message queued; attachment upload failure shows inline error on preview |
| **Success** | Composer clears; new message appended to thread in SCR-007; bottom sheet dismisses |

#### Permission Required
`inbox.conversations`

#### Mobile-Specific Considerations
- Keyboard always-visible while composer is open (do not dismiss on send)
- Attachment size limit: enforce client-side max (e.g. 16 MB for WhatsApp); show inline warning before upload
- Emoji picker must not dismiss keyboard on Android (tricky — render picker above keyboard or use a custom bottom sheet)
- AI suggestion strip is dismissible; tapping it copies text into input, allowing edits before send

---

## AI Agents Group

---

### SCR-009 — AI Agents List

| Field | Detail |
|-------|--------|
| **Screen ID** | SCR-009 |
| **Screen Name** | AI Agents List |
| **Purpose** | Display all configured AI agent/flow configurations with their current enable/disable status and allow toggling. |
| **Target User** | Owner / Admin |
| **Entry Point** | Side drawer or bottom nav "Agents" section |
| **Priority** | P1 |
| **MVP Inclusion** | Yes |
| **Implementation Complexity** | Medium |

#### Primary Components
- Screen header "AI Agents"
- Searchable list of agent cards (agent name, type/trigger badge, status chip: Active/Inactive)
- Toggle switch per card for enable/disable
- Tap row → SCR-010 Agent Detail

#### Primary Actions
- Toggle switch → `PATCH /flows/{id}/status` (active / inactive)
- Tap row → navigate to SCR-010
- Pull-to-refresh

#### Data Dependencies
```
GET /flows
PATCH /flows/{id}/status
```

#### API Endpoints Required
```
GET /flows
PATCH /flows/{id}/status
```

#### State Behaviors

| State | Behavior |
|-------|----------|
| **Loading** | Skeleton cards |
| **Empty** | "No AI agents configured. Set them up on the web dashboard." |
| **Error** | Retry button; cached list shown if available |
| **Success** | Full list with toggle states; optimistic UI for toggle with rollback on API error |

#### Permission Required
`ai.chat`, `automation.manage`

#### Mobile-Specific Considerations
- Toggle state updated optimistically; roll back with snackbar "Failed to update status" if API fails
- Agent type badges color-coded (e.g. trigger type: keyword / schedule / event)
- Creation of new AI agents is web-only; mobile is manage-only

---

### SCR-010 — AI Agent Detail

| Field | Detail |
|-------|--------|
| **Screen ID** | SCR-010 |
| **Screen Name** | AI Agent Detail |
| **Purpose** | Show a read-only summary of an AI agent's configuration, trigger type, status, and recent activity. |
| **Target User** | Owner / Admin |
| **Entry Point** | SCR-009 AI Agents List — tap agent row |
| **Priority** | P1 |
| **MVP Inclusion** | Yes |
| **Implementation Complexity** | Low |

#### Primary Components
- Agent name and status header
- Configuration summary card (trigger type, target channel, response mode)
- Status toggle (enable/disable)
- Last activity timestamp
- "Edit on Web" banner/button

#### Primary Actions
- Toggle status → `PATCH /flows/{id}/status`
- Tap "Edit on Web" → open app's web dashboard in system browser

#### Data Dependencies
```
GET /flows/{id}
PATCH /flows/{id}/status
```

#### API Endpoints Required
```
GET /flows/{id}
PATCH /flows/{id}/status
```

#### State Behaviors

| State | Behavior |
|-------|----------|
| **Loading** | Full-screen skeleton |
| **Empty** | N/A (always has data if navigated from list) |
| **Error** | Error message with back button |
| **Success** | Read-only detail card with actionable toggle |

#### Permission Required
`ai.chat`, `automation.manage`

#### Mobile-Specific Considerations
- Clearly communicate that editing requires the web dashboard (no drag-drop builder on mobile)
- Status toggle consistent with SCR-009 (optimistic update + rollback)

---

## Automation Flows Group

---

### SCR-011 — Flows List

| Field | Detail |
|-------|--------|
| **Screen ID** | SCR-011 |
| **Screen Name** | Flows List |
| **Purpose** | List all automation flows with their active/paused status and allow agents to toggle flow status from mobile. |
| **Target User** | Owner / Admin |
| **Entry Point** | Sidebar / nav "Automation" section |
| **Priority** | P1 |
| **MVP Inclusion** | Yes |
| **Implementation Complexity** | Medium |

#### Primary Components
- Screen header "Automation Flows"
- Searchable list of flow cards (flow name, trigger type badge, status chip: Active/Paused)
- Toggle switch per card (Active ↔ Paused)
- Tap row → SCR-012 Flow Detail
- Pull-to-refresh

#### Primary Actions
- Toggle switch → `PATCH /flows/{id}/status`
- Tap row → SCR-012
- Pull-to-refresh

#### Data Dependencies
```
GET /flows
PATCH /flows/{id}/status
```

#### API Endpoints Required
```
GET /flows
PATCH /flows/{id}/status
```

#### State Behaviors

| State | Behavior |
|-------|----------|
| **Loading** | Skeleton list |
| **Empty** | "No flows created yet. Build automation flows on the web dashboard." |
| **Error** | Error banner + retry |
| **Success** | Flow list with real toggle state; optimistic UI on toggle |

#### Permission Required
`automation.manage`

#### Mobile-Specific Considerations
- Drag-and-drop canvas builder is **not available on mobile** — prominently communicate this
- Flow creation and editing redirect to web dashboard
- Status toggle uses optimistic update with rollback

---

### SCR-012 — Flow Detail View

| Field | Detail |
|-------|--------|
| **Screen ID** | SCR-012 |
| **Screen Name** | Flow Detail View |
| **Purpose** | Provide a read-only summary of an automation flow including its name, trigger type, node count, and current status. |
| **Target User** | Owner / Admin |
| **Entry Point** | SCR-011 Flows List — tap flow row |
| **Priority** | P1 |
| **MVP Inclusion** | Yes |
| **Implementation Complexity** | Low |

#### Primary Components
- Flow name and status header
- Summary card: trigger type, node count, created date, last modified
- Status toggle (Active / Paused)
- Node summary list (read-only: node name, node type — no canvas)
- "Edit on Web" banner

#### Primary Actions
- Toggle status → `PATCH /flows/{id}/status`
- Tap "Edit on Web" → system browser

#### Data Dependencies
```
GET /flows/{id}
PATCH /flows/{id}/status
```

#### API Endpoints Required
```
GET /flows/{id}
PATCH /flows/{id}/status
```

#### State Behaviors

| State | Behavior |
|-------|----------|
| **Loading** | Skeleton card |
| **Empty** | N/A |
| **Error** | Error state with back navigation |
| **Success** | Read-only detail with toggle |

#### Permission Required
`automation.manage`

#### Mobile-Specific Considerations
- **No drag-and-drop canvas.** Node list is a plain scrollable list of node names/types
- "Edit on Web" is a persistent banner at the bottom of the screen

---

## Contacts / CRM Group

---

### SCR-013 — Contacts List

| Field | Detail |
|-------|--------|
| **Screen ID** | SCR-013 |
| **Screen Name** | Contacts List |
| **Purpose** | Browse and search CRM leads with lead score badges, channel indicators, and basic filter options. |
| **Target User** | Owner / Admin / Member |
| **Entry Point** | Sidebar / nav "CRM" or "Contacts" section |
| **Priority** | P1 |
| **MVP Inclusion** | Yes |
| **Implementation Complexity** | Medium |

#### Primary Components
- Search bar
- Filter button (bottom sheet: channel, score range, label)
- Lead list (contact name, email/phone, lead score badge, channel indicator, last seen)
- Infinite scroll pagination
- Pull-to-refresh

#### Primary Actions
- Search → `GET /lead-scoring/leads?search=...`
- Apply filter → filtered request
- Tap contact → SCR-014 Contact Detail
- Pull-to-refresh

#### Data Dependencies
```
GET /lead-scoring/leads
GET /contact-lists
```

#### API Endpoints Required
```
GET /lead-scoring/leads
GET /contact-lists
```

#### State Behaviors

| State | Behavior |
|-------|----------|
| **Loading** | Skeleton list rows |
| **Empty** | "No contacts found" with clear filter option |
| **Error** | Retry button |
| **Success** | Full list with score badges; pagination loads more on scroll |

#### Permission Required
`crm.view`

#### Mobile-Specific Considerations
- Lead score badge: color-coded (e.g. green ≥ 70, yellow 40–69, red < 40)
- Channel indicator icons (WhatsApp, Instagram, Twilio) next to contact name
- Adding/editing contacts is web-only for MVP; mobile is view-only

---

### SCR-014 — Contact Detail

| Field | Detail |
|-------|--------|
| **Screen ID** | SCR-014 |
| **Screen Name** | Contact Detail |
| **Purpose** | Display full lead profile including contact info, lead score, labels, and link to conversation history. |
| **Target User** | Owner / Admin / Member |
| **Entry Point** | SCR-013 Contacts List — tap contact row |
| **Priority** | P1 |
| **MVP Inclusion** | Yes |
| **Implementation Complexity** | Medium |

#### Primary Components
- Contact avatar, name, email, phone
- Lead score widget (numeric + color ring)
- Channel badges
- Labels / tags list
- "View Conversations" button (deep-link to inbox filtered by this contact)
- Metadata card (created date, last active, source)

#### Primary Actions
- Tap "View Conversations" → SCR-006 filtered by contact
- Pull-to-refresh

#### Data Dependencies
```
GET /lead-scoring/leads (individual lead data)
GET /conversations?filter=contact:{id}
```

#### API Endpoints Required
```
GET /lead-scoring/leads
GET /conversations
```

#### State Behaviors

| State | Behavior |
|-------|----------|
| **Loading** | Skeleton profile card |
| **Empty** | N/A |
| **Error** | Error with back button |
| **Success** | Full profile with all sections |

#### Permission Required
`crm.view`

#### Mobile-Specific Considerations
- Tapping phone number → native phone dialer (tel: URI)
- Tapping email → native mail client (mailto: URI)
- Editing lead profile is web-only for MVP

---

## Campaigns Group

---

### SCR-015 — Campaigns List

| Field | Detail |
|-------|--------|
| **Screen ID** | SCR-015 |
| **Screen Name** | Campaigns List |
| **Purpose** | Show all marketing campaigns with status badges and provide quick actions to launch or pause campaigns. |
| **Target User** | Owner / Admin |
| **Entry Point** | Sidebar / nav "Campaigns" section |
| **Priority** | P1 |
| **MVP Inclusion** | Yes |
| **Implementation Complexity** | Medium |

#### Primary Components
- Screen header "Campaigns"
- Filter chips: All / Draft / Scheduled / Running / Completed / Paused
- Campaign list (name, status badge, contact count, scheduled date, channel)
- Quick action menu per row (launch / pause / view detail)
- Pull-to-refresh

#### Primary Actions
- Filter chips → filter list client-side or via query param
- Tap row → SCR-016 Campaign Detail
- Quick action "Launch" → `POST /campaigns/{id}/launch`
- Quick action "Pause" → `POST /campaigns/{id}/pause`
- Pull-to-refresh → `GET /campaigns`

#### Data Dependencies
```
GET /campaigns
POST /campaigns/{id}/launch
POST /campaigns/{id}/pause
```

#### API Endpoints Required
```
GET /campaigns
POST /campaigns/{id}/launch
POST /campaigns/{id}/pause
```

#### State Behaviors

| State | Behavior |
|-------|----------|
| **Loading** | Skeleton cards |
| **Empty** | "No campaigns yet. Create campaigns from the web dashboard." |
| **Error** | Retry banner |
| **Success** | Full list; status badges update after launch/pause actions |

#### Permission Required
`marketing.campaigns`

#### Mobile-Specific Considerations
- Campaign creation is web-only; mobile is manage-only
- Status badge color map: Draft=grey, Scheduled=blue, Running=green, Completed=teal, Paused=orange
- Launch/pause actions require confirmation bottom sheet ("Are you sure you want to launch this campaign?")

---

### SCR-016 — Campaign Detail

| Field | Detail |
|-------|--------|
| **Screen ID** | SCR-016 |
| **Screen Name** | Campaign Detail |
| **Purpose** | Show campaign metrics, recipient count, status, and allow status management (pause, resume, cancel). |
| **Target User** | Owner / Admin |
| **Entry Point** | SCR-015 Campaigns List — tap campaign row |
| **Priority** | P1 |
| **MVP Inclusion** | Yes |
| **Implementation Complexity** | Medium |

#### Primary Components
- Campaign name and status header
- Metrics grid: total recipients, delivered, read, failed, replied
- Status action button (context-sensitive: Launch / Pause / Resume / Cancel)
- Campaign config summary (channel, contact list, scheduled time, message preview)
- Pull-to-refresh

#### Primary Actions
- Tap Launch → `POST /campaigns/{id}/launch` (with confirmation)
- Tap Pause → `POST /campaigns/{id}/pause` (with confirmation)
- Pull-to-refresh → `GET /campaigns/{id}`

#### Data Dependencies
```
GET /campaigns/{id}
POST /campaigns/{id}/launch
POST /campaigns/{id}/pause
```

#### API Endpoints Required
```
GET /campaigns/{id}
POST /campaigns/{id}/launch
POST /campaigns/{id}/pause
```

#### State Behaviors

| State | Behavior |
|-------|----------|
| **Loading** | Skeleton metrics grid + summary card |
| **Empty** | N/A |
| **Error** | Error with retry; action buttons disabled |
| **Success** | Full metrics; action button reflects current status; success toast after launch/pause |

#### Permission Required
`marketing.campaigns`

#### Mobile-Specific Considerations
- Metrics shown as simple numeric cards — no charts on mobile for MVP
- Action button state machine: Draft→Launch, Running→Pause, Paused→Resume
- Confirmation sheet must clearly state the action and its impact (e.g. "Launching will immediately send to X recipients")

---

## Channels Group

---

### SCR-017 — Channel Status Overview

| Field | Detail |
|-------|--------|
| **Screen ID** | SCR-017 |
| **Screen Name** | Channel Status Overview |
| **Purpose** | Display the connection status of all configured communication channels (WhatsApp, Instagram, Twilio) in one view. |
| **Target User** | Owner / Admin |
| **Entry Point** | Sidebar / nav "Channels" section |
| **Priority** | P1 |
| **MVP Inclusion** | Yes |
| **Implementation Complexity** | Medium |

#### Primary Components
- Screen header "Channels"
- Channel status cards (channel name, icon, status badge: Connected/Disconnected/Error, last checked timestamp)
- Tap card → channel-specific detail screen (SCR-018 for WhatsApp)
- Pull-to-refresh

#### Primary Actions
- Pull-to-refresh → `GET /channels/status`
- Tap WhatsApp card → SCR-018
- Tap Instagram / Twilio cards → respective detail screens (P2; same pattern as SCR-018)

#### Data Dependencies
```
GET /channels/status
GET /whatsapp/meta-status
```

#### API Endpoints Required
```
GET /channels/status
GET /whatsapp/meta-status
```

#### State Behaviors

| State | Behavior |
|-------|----------|
| **Loading** | Skeleton status cards |
| **Empty** | "No channels configured. Add channels from the web dashboard." |
| **Error** | Retry button; each card shows individual error state |
| **Success** | All channel cards with current status badges |

#### Permission Required
`channels.manage`

#### Mobile-Specific Considerations
- Status badge uses consistent color system: Connected=green, Disconnected=red, Degraded=orange
- Channel icons use official brand assets (WhatsApp green, Instagram gradient, Twilio red)
- Initial channel setup (WABA onboarding) redirects to web — communicate clearly on empty state

---

### SCR-018 — Channel Connection (WhatsApp)

| Field | Detail |
|-------|--------|
| **Screen ID** | SCR-018 |
| **Screen Name** | Channel Connection — WhatsApp |
| **Purpose** | Show WhatsApp Business API connection status, profile information, and allow reconnect actions. Initial WABA setup must be completed on the web. |
| **Target User** | Owner / Admin |
| **Entry Point** | SCR-017 Channel Status Overview — tap WhatsApp card |
| **Priority** | P1 |
| **MVP Inclusion** | Yes |
| **Implementation Complexity** | Medium |

#### Primary Components
- WhatsApp connection status banner (Connected / Disconnected / Error)
- Profile info card: business name, phone number, display name, profile photo
- Meta API health status (from `/whatsapp/meta-status`)
- "Reconnect" button (visible when disconnected)
- "Initial Setup on Web" info banner

#### Primary Actions
- Tap "Reconnect" → trigger reconnect flow (API action TBD; may open a webview)
- Pull-to-refresh → `GET /whatsapp/meta-status` + `GET /whatsapp/profile`

#### Data Dependencies
```
GET /whatsapp/meta-status
GET /whatsapp/profile
GET /channels/status
```

#### API Endpoints Required
```
GET /whatsapp/meta-status
GET /whatsapp/profile
GET /channels/status
```

#### State Behaviors

| State | Behavior |
|-------|----------|
| **Loading** | Skeleton profile card |
| **Empty** | "WhatsApp not configured. Complete setup on the web dashboard." |
| **Error** | Error banner with specific error detail from Meta API; reconnect CTA |
| **Success** | Connected status, full profile card displayed |

#### Permission Required
`channels.manage`

#### Mobile-Specific Considerations
- Initial WABA setup must happen on web (Meta's WABA OAuth flow is not mobile-compatible in-app) — show a clear "Complete Setup on Web" CTA that opens the web dashboard
- Profile photo loaded from Supabase media bucket with caching
- Show WhatsApp quality rating if returned by Meta API

---

## Notifications Group

---

### SCR-019 — Notifications List

| Field | Detail |
|-------|--------|
| **Screen ID** | SCR-019 |
| **Screen Name** | Notifications List |
| **Purpose** | Display in-app notifications (new messages, system alerts, campaign events) with mark-read and mark-all-read actions. |
| **Target User** | All |
| **Entry Point** | Notification bell icon on Dashboard / bottom nav badge; deep-link from notification tap |
| **Priority** | P0 |
| **MVP Inclusion** | Yes |
| **Implementation Complexity** | Low |

#### Primary Components
- Screen header "Notifications" with unread count badge
- "Mark All Read" button (top-right)
- Notification list (icon, title, body, timestamp, unread dot)
- Pull-to-refresh
- Infinite scroll pagination

#### Primary Actions
- Pull-to-refresh → `GET /notifications`
- Tap notification → mark as read (`PATCH /notifications/{id}/read`) + navigate to related entity
- Tap "Mark All Read" → `POST /notifications/read-all`

#### Data Dependencies
```
GET /notifications
PATCH /notifications/{id}/read
POST /notifications/read-all
```

#### API Endpoints Required
```
GET /notifications
PATCH /notifications/{id}/read
POST /notifications/read-all
```

#### State Behaviors

| State | Behavior |
|-------|----------|
| **Loading** | Skeleton rows |
| **Empty** | "You're all caught up! No new notifications." with an illustration |
| **Error** | Retry button |
| **Success** | Full list; unread items visually distinguished; badge cleared as items are marked read |

#### Permission Required
None (all authenticated users)

#### Mobile-Specific Considerations
- **No push notification backend (FCM/APNs) exists.** In-app notifications only via polling or WebSocket events
- Unread dot disappears immediately on tap (optimistic mark-read)
- Badge on bell icon in header and bottom nav must update in real-time via WebSocket
- Swipe-to-dismiss can mark as read (platform-native gesture)

---

## Credits & Billing Group

---

### SCR-020 — Credits & Usage

| Field | Detail |
|-------|--------|
| **Screen ID** | SCR-020 |
| **Screen Name** | Credits & Usage |
| **Purpose** | Show AI credit balance, WhatsApp Conversation Credit (WCC) balance, usage history, and provide a Buy Credits entry point via webview. |
| **Target User** | Owner / Admin |
| **Entry Point** | Sidebar / nav "Credits" section; Dashboard metric card tap |
| **Priority** | P1 |
| **MVP Inclusion** | Yes |
| **Implementation Complexity** | Medium |

#### Primary Components
- AI Credits balance card (remaining / total)
- WCC balance card
- Usage history list (date, type, amount, description)
- "Buy Credits" primary button (opens billing webview)
- Pull-to-refresh

#### Primary Actions
- Pull-to-refresh → refresh balances and history
- Tap "Buy Credits" → open Razorpay / PayU billing page in system webview
- Paginate usage history

#### Data Dependencies
```
GET /billing/credits/summary
GET /billing/credits/history
```

#### API Endpoints Required
```
GET /billing/credits/summary
GET /billing/credits/history
```

#### State Behaviors

| State | Behavior |
|-------|----------|
| **Loading** | Skeleton balance cards + history rows |
| **Empty** | "No usage history yet" placeholder for history section |
| **Error** | Error banner with retry; balances show "—" when unavailable |
| **Success** | Balance cards + paginated history |

#### Permission Required
`credits.view`

#### Mobile-Specific Considerations
- Payment (Buy Credits) opens system browser or an in-app webview — do NOT implement native Razorpay SDK for MVP
- Balance cards should be prominently styled (large numbers, color-coded if low)
- Show a "Low Credits" warning banner when balance falls below a threshold

---

### SCR-021 — Billing Overview

| Field | Detail |
|-------|--------|
| **Screen ID** | SCR-021 |
| **Screen Name** | Billing Overview |
| **Purpose** | Display the current subscription plan, renewal date, and invoice history. |
| **Target User** | Owner |
| **Entry Point** | Settings or Credits section |
| **Priority** | P2 |
| **MVP Inclusion** | No |
| **Implementation Complexity** | Medium |

#### Primary Components
- Current plan card (plan name, features, renewal date)
- Invoice / payment history list
- "Manage Plan on Web" button

#### Primary Actions
- Tap "Manage Plan on Web" → system browser
- Pull-to-refresh

#### Data Dependencies
```
GET /billing/plan
GET /billing/status
```

#### API Endpoints Required
```
GET /billing/plan
GET /billing/status
```

#### State Behaviors

| State | Behavior |
|-------|----------|
| **Loading** | Skeleton plan card |
| **Empty** | "No active plan found" |
| **Error** | Error with retry |
| **Success** | Plan card with renewal date |

#### Permission Required
`billing.manage`

#### Mobile-Specific Considerations
- Full billing management (upgrade/downgrade, payment method) redirects to web for P2
- Excluded from MVP; placeholder "Coming Soon" entry in Settings is acceptable

---

## Settings & Profile Group

---

### SCR-022 — Profile

| Field | Detail |
|-------|--------|
| **Screen ID** | SCR-022 |
| **Screen Name** | Profile |
| **Purpose** | Allow the user to view and edit their name, email, avatar, and notification/display preferences. |
| **Target User** | All |
| **Entry Point** | Bottom nav profile icon; sidebar profile section |
| **Priority** | P1 |
| **MVP Inclusion** | Yes |
| **Implementation Complexity** | Low |

#### Primary Components
- Avatar (tappable → image picker)
- Name field (editable)
- Email field (read-only — email is auth identifier)
- Save button
- Logout button

#### Primary Actions
- Tap avatar → image picker → upload to Supabase media bucket → `PATCH /auth/me`
- Edit name → `PATCH /auth/me`
- Tap Logout → `POST /auth/logout` → clear local storage → navigate to SCR-002

#### Data Dependencies
```
GET /auth/me
PATCH /auth/me
```

#### API Endpoints Required
```
GET /auth/me
PATCH /auth/me
POST /auth/logout
```

#### State Behaviors

| State | Behavior |
|-------|----------|
| **Loading** | Skeleton avatar + fields |
| **Empty** | N/A |
| **Error** | Inline field errors; toast on save failure |
| **Success** | Toast "Profile updated"; avatar updates immediately |

#### Permission Required
None (own profile)

#### Mobile-Specific Considerations
- Avatar picker: system image picker (gallery + camera); crop to square before upload
- Logout must clear all local secure storage (token, workspace ID)
- Email is read-only (changing email requires re-auth — web-only for MVP)

---

### SCR-023 — Team Members

| Field | Detail |
|-------|--------|
| **Screen ID** | SCR-023 |
| **Screen Name** | Team Members |
| **Purpose** | View workspace members with their roles and send invitations to new members. |
| **Target User** | Owner / Admin |
| **Entry Point** | Settings section "Team" |
| **Priority** | P1 |
| **MVP Inclusion** | Yes |
| **Implementation Complexity** | Medium |

#### Primary Components
- Member list (avatar, name, email, role badge)
- Invite button (opens invite modal/bottom sheet)
- Invite modal: email input, role selector, Send Invite button
- Pull-to-refresh

#### Primary Actions
- Pull-to-refresh → `GET /workspaces/{id}/members`
- Tap Invite → show bottom sheet → fill email + role → `POST /workspaces/{id}/invitations`

#### Data Dependencies
```
GET /workspaces/{id}/members
POST /workspaces/{id}/invitations
GET /workspaces/{id}/my-permissions
```

#### API Endpoints Required
```
GET /workspaces/{id}/members
POST /workspaces/{id}/invitations
```

#### State Behaviors

| State | Behavior |
|-------|----------|
| **Loading** | Skeleton member rows |
| **Empty** | "No team members yet." |
| **Error** | Retry; invite failure shows inline error in modal |
| **Success** | Invitation success toast "Invite sent to {email}" |

#### Permission Required
`team.members`

#### Mobile-Specific Considerations
- Role selector is a picker (not a complex dropdown): Owner / Admin / Member
- Member removal / role editing is web-only for MVP
- Pending invitation rows shown with "Pending" badge

---

### SCR-024 — Security

| Field | Detail |
|-------|--------|
| **Screen ID** | SCR-024 |
| **Screen Name** | Security |
| **Purpose** | Display active login sessions, 2FA status, and allow revoking individual sessions. |
| **Target User** | All |
| **Entry Point** | Settings section "Security" |
| **Priority** | P2 |
| **MVP Inclusion** | No |
| **Implementation Complexity** | Medium |

#### Primary Components
- 2FA status card (Enabled / Disabled) with link to setup on web
- Active sessions list (device, browser, IP, last active, Revoke button)
- "Revoke All Other Sessions" button

#### Primary Actions
- Tap Revoke on session → API call to revoke that session
- Tap "Revoke All" → confirmation → API call

#### Data Dependencies
```
GET /user/sessions
GET /user/security-summary
GET /2fa/status
```

#### API Endpoints Required
```
GET /user/sessions
GET /user/security-summary
GET /2fa/status
```

#### State Behaviors

| State | Behavior |
|-------|----------|
| **Loading** | Skeleton session list |
| **Empty** | "No other active sessions." |
| **Error** | Error banner with retry |
| **Success** | Session list; revoke success removes row immediately |

#### Permission Required
None (own security settings)

#### Mobile-Specific Considerations
- 2FA enrollment/disable requires web for MVP (TOTP QR code scanning)
- Excluded from MVP; placeholder entry in Settings is acceptable

---

### SCR-025 — App Settings

| Field | Detail |
|-------|--------|
| **Screen ID** | SCR-025 |
| **Screen Name** | App Settings |
| **Purpose** | Allow users to configure notification preferences and app theme (light/dark/system). |
| **Target User** | All |
| **Entry Point** | Settings section "App Settings" / bottom nav profile |
| **Priority** | P1 |
| **MVP Inclusion** | Yes |
| **Implementation Complexity** | Low |

#### Primary Components
- Notification Preferences section (in-app notification toggles by type: new messages, campaign updates, system alerts)
- Theme picker: System / Light / Dark
- Save button (or auto-save on toggle)

#### Primary Actions
- Toggle notification preference → `PATCH /users/me/preferences`
- Change theme → apply immediately + `PATCH /users/me/preferences`

#### Data Dependencies
```
GET /users/me/preferences
PATCH /users/me/preferences
```

#### API Endpoints Required
```
GET /users/me/preferences
PATCH /users/me/preferences
```

#### State Behaviors

| State | Behavior |
|-------|----------|
| **Loading** | Skeleton toggle rows |
| **Empty** | N/A |
| **Error** | Toast "Failed to save preferences. Tap to retry." |
| **Success** | Preferences auto-saved; theme change reflects immediately |

#### Permission Required
None (own preferences)

#### Mobile-Specific Considerations
- **No push notifications in MVP** (FCM/APNs not implemented) — notification preference toggles control in-app notification visibility only; make this clear to users
- Theme change applies at app root level without restart
- Store theme preference locally as well as server-side for fast cold-start application

---

### SCR-026 - Message Templates

| Field | Detail |
|-------|--------|
| **Screen ID** | SCR-026 |
| **Screen Name** | Message Templates |
| **Section** | Marketing / Templates |
| **Priority** | P1 |
| **MVP Inclusion** | Yes |
| **Complexity** | Medium |
| **Target User** | Owner, Admin, Marketer, Support Agent |
| **Entry Point** | More Drawer → Message Templates, Dashboard Quick Action, or Conversation reply bar `📋` |

#### Purpose
Enables users to browse, search, and preview approved WhatsApp and omnichannel message templates, inspect Meta approval status (`APPROVED`, `PENDING`, `REJECTED`, `ACTION_REQUIRED`), and quick-insert templates directly into active customer conversations or marketing broadcasts.

#### Primary Components
- Search bar (by template name, category, or variable tags)
- Approval status filter tabs (`All`, `Approved`, `Pending`, `Draft`, `Action Required`)
- Template status metric chips (Total, Approved, Pending, Action Required)
- Template cards displaying template name, category (`MARKETING`, `UTILITY`, `AUTHENTICATION`), language (`en_US`), and message preview with dynamic variable chips (`{{customer_name}}`, `{{order_id}}`)
- Interactive WhatsApp Message Preview sheet simulating native WhatsApp bubble with header media, footer text, and quick-reply CTA buttons

#### Primary Actions
- Search and filter templates
- Tap template to open native-styled WhatsApp preview sheet
- Insert selected template into active conversation (`SCR-008 Reply Composer`)
- Sync templates with Meta WhatsApp Business Account (`GET /templates`)
- Submit draft template for Meta review (`POST /templates/submit/{template_id}`)

#### Data Dependencies
```
GET /templates?workspace_id={workspace_id}
GET /templates/status/{workspace_id}
POST /templates/submit/{template_id}
```

#### State Behaviors

| State | Behavior |
|-------|----------|
| **Loading** | Shimmer skeleton template cards |
| **Empty** | "No templates found. Sync with Meta or create templates on the web console." + Sync button |
| **Error** | "Failed to load templates. Check channel connection." + Retry button |
| **Success** | List of interactive template cards with status badges and quick actions |

#### Permission Required
`templates.manage` (or `marketing.templates`)

#### Mobile-Specific Considerations
- Visual template creation wizard with media file uploading and complex variable mapping is best managed on desktop/web; mobile focuses on viewing, status monitoring, previewing, and one-tap insertion into live customer chats.
- Interactive WhatsApp bubble preview modal simulates exact customer-facing message rendering before sending.

---

## Appendix A — Permission Reference

| Permission Key | Screens Gated |
|----------------|---------------|
| `dashboard.overview` | SCR-005 |
| `inbox.conversations` | SCR-006, SCR-007, SCR-008 |
| `crm.view` | SCR-013, SCR-014 |
| `ai.chat` | SCR-009, SCR-010 |
| `automation.manage` | SCR-009, SCR-010, SCR-011, SCR-012 |
| `channels.manage` | SCR-017, SCR-018 |
| `credits.view` | SCR-020 |
| `billing.manage` | SCR-021 |
| `marketing.campaigns` | SCR-015, SCR-016 |
| `templates.manage` | SCR-026 |
| `team.members` | SCR-023 |
| `settings.general` | SCR-025 |
| *(none)* | SCR-001, SCR-002, SCR-003, SCR-004, SCR-019, SCR-022, SCR-024, SCR-025 |

---

## Appendix B — Navigation Architecture

```
App Root
├── Auth Stack (unauthenticated)
│   ├── SCR-001 Splash
│   ├── SCR-002 Login
│   ├── SCR-003 Two-Factor Auth
│   └── SCR-004 Workspace Selection
│
└── Main App (authenticated)
    ├── Bottom Tab Navigator
    │   ├── Tab: Home → SCR-005 Dashboard
    │   ├── Tab: Inbox → SCR-006 Inbox List
    │   │              └── SCR-007 Conversation Detail
    │   │                  └── SCR-008 Reply Composer
    │   ├── Tab: Notifications → SCR-019
    │   └── Tab: Profile → SCR-022
    │
    └── Drawer / Side Navigation
        ├── AI Agents → SCR-009 → SCR-010
        ├── Automation → SCR-011 → SCR-012
        ├── CRM / Contacts → SCR-013 → SCR-014
        ├── Campaigns → SCR-015 → SCR-016
        ├── Channels → SCR-017 → SCR-018
        ├── Credits → SCR-020
        └── Settings
            ├── Profile (SCR-022)
            ├── Team Members (SCR-023)
            ├── Security (SCR-024) [P2]
            ├── Billing (SCR-021) [P2]
            └── App Settings (SCR-025)
```

---

## Appendix C — Feature Gap Registry

| Gap | Description | Workaround |
|-----|-------------|------------|
| Push Notifications | FCM/APNs backend not implemented | In-app notification list via polling/WebSocket only |
| Campaign Creation | Mobile has no campaign creation UI | Redirect to web dashboard |
| Flow Builder | Drag-and-drop canvas not suitable for mobile | Read-only node list + status toggle |
| AI Agent Creation | Agent configuration requires web | Read-only list + status toggle on mobile |
| Billing Management | Full plan management requires web | Webview / system browser redirect |
| 2FA Enrollment | QR code setup requires web | Status shown; link to web |
| Contact Editing | Lead editing requires web | Read-only contact profile on mobile |
| WABA Setup | Meta's OAuth WABA flow not mobile-compatible | Status/reconnect only; initial setup on web |
| Followups | Backend routes commented out | Not surfaced in mobile |
| Brain/AI Workspace | Excluded from mobile MVP entirely | N/A |

---

*Document maintained by: Engineering / Product Team*  
*Last updated: 2026-10-21*
