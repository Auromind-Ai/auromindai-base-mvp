# Mobile Architecture Decisions — Orbion Agents

> **Document Type:** Architecture Decision Records (ADRs)
> **App:** Orbion Agents Mobile (React Native / Expo)
> **Last Updated:** 2025-01-21
> **Status:** Living document — open decisions tracked in [ADR-020](#adr-020-token-refresh-gap--open-decision)

---

## Overview

This document captures all key architectural decisions for the Orbion Agents mobile application. Each record includes the context derived from verified repository analysis, the options considered, the chosen approach, and the trade-offs accepted.

### Backend Stack (Verified)

| Component | Technology |
|---|---|
| API Framework | FastAPI (Python) |
| Database | PostgreSQL |
| Cache / Broker | Redis |
| Auth | JWT via cookies + Bearer header |
| Real-time | WebSocket `/ws/{user_id}?token=&workspace_id=` |
| Payments | Razorpay + PayU (India) |
| Media Storage | Supabase bucket |

### Frontend Stack (Verified)

| Component | Technology |
|---|---|
| Framework | Next.js 15, React 18 |
| Language | JavaScript (`jsconfig.json`, no TypeScript) |
| Styling | Tailwind CSS v4 |
| Global State | Zustand |
| Animations | Framer Motion |

---

## Status Legend

| Status | Meaning |
|---|---|
| ✅ Decided | Final decision, ready to implement |
| 🔵 Proposed | Recommended but awaiting formal sign-off |
| 🟡 Open | Unresolved — requires stakeholder input |

---

## Decision Records

---

### ADR-001: Mobile Framework Selection

**Status:** ✅ Decided | **Confidence:** High

**Context:**  
The team needs to select a cross-platform mobile framework that can ship both iOS and Android from a single codebase with the least ramp-up cost, given an existing JavaScript/React web codebase.

**Options Considered:**

| Option | Pros | Cons |
|---|---|---|
| React Native + Expo SDK 51+ | Shares JS/React paradigm with web; OTA updates via EAS Update; managed push, camera, secure store | Some native module limitations; slightly larger app size |
| React Native CLI (bare) | Full native access; smaller bundle | More DevOps overhead; no OTA out-of-box |
| Flutter | Strong performance; single codebase | Dart language — no code reuse from JS web; larger team learning curve |

**Decision:** **React Native + Expo SDK 51+**

**Rationale:**
- Existing codebase is JavaScript + React — no paradigm switch required.
- Expo SDK handles push notifications (FCM/APNs), camera, secure storage, and document picking with minimal native configuration.
- EAS Update enables OTA JavaScript bundle pushes without App Store review cycles.
- Expo Go accelerates early prototyping and developer onboarding.
- Strong community alignment with the web stack (Zustand, TanStack Query both work in RN).

**Trade-offs:**
- Occasional native module limitations for cutting-edge APIs (mitigated by EAS bare workflow escape hatch).
- App binary is slightly larger than a RN CLI equivalent.

**Constraints from Repository:** None — no existing native code to migrate.

---

### ADR-002: Language — JavaScript vs TypeScript

**Status:** ✅ Decided | **Confidence:** High

**Context:**  
The web codebase uses `jsconfig.json` and has no `tsconfig.json` or `.ts`/`.tsx` files. The mobile app must decide whether to follow this convention or introduce TypeScript.

**Options Considered:**

| Option | Pros | Cons |
|---|---|---|
| JavaScript (match repo) | Consistent with web convention; zero migration friction; shared utility files portable | No compile-time type checking |
| TypeScript | Catch type errors early; better IDE IntelliSense; Expo defaults to TS | Adds configuration overhead; inconsistent with web repo |

**Decision:** **JavaScript for all application source files**

**Rationale:**  
Matching the existing convention reduces cognitive overhead when sharing logic (API client, utility functions) between web and mobile. Team familiarity is already in JS.

**Exception — Expo Config Files:**  
Expo's `app.config.js` and EAS configuration may generate TypeScript boilerplate. These config files may remain as `.ts` since they are infrastructure-only and not part of the application source tree. Add `// @ts-nocheck` or keep them as `.js` with JSDoc types if team prefers strict JS-only.

**Trade-offs:**  
No compile-time type safety. Mitigate with JSDoc annotations (`/** @type {import('expo').ExpoConfig} */`) on critical interfaces.

**Constraints from Repository:** `jsconfig.json` present; no `tsconfig.json`.

---

### ADR-003: Navigation Architecture

**Status:** ✅ Decided | **Confidence:** High

**Context:**  
The app has primary screens (Inbox, Dashboard, Agents) and secondary screens (Campaigns, Contacts, Channels, Credits, Settings). Navigation must be thumb-friendly on phones.

**Options Considered:**

| Option | Pros | Cons |
|---|---|---|
| Bottom Tab Navigator (5 tabs) | Flat access | 5 tabs is at the UX limit; cramped on small screens |
| Bottom Tab (4 tabs) + More modal | Thumb-friendly; scales to more screens via More menu | Adds one tap for secondary features |
| Drawer Navigator only | Familiar pattern | Hidden navigation, lower discoverability |

**Decision:** **React Navigation 6 — Bottom Tabs (4 tabs) + More modal/drawer**

**Tab Structure:**

```
[ Inbox ]  [ Dashboard ]  [ Agents ]  [ More ▸ ]
                                          ├── Campaigns
                                          ├── Contacts
                                          ├── Channels
                                          ├── Credits
                                          └── Settings
```

**Rationale:**  
4 tabs is the proven thumb-reach maximum. The More tab pattern (used by iOS App Store, Slack, etc.) keeps secondary features accessible without cluttering the primary bar. Stack navigators nest within each tab for drill-down screens.

**Trade-offs:**  
Secondary features require an additional tap through More. Acceptable for less-frequent workflows (Campaigns, Settings).

**Constraints from Repository:** Existing web sidebar structure informs the grouping.

---

### ADR-004: State Management

**Status:** ✅ Decided | **Confidence:** High

**Context:**  
The web app uses Zustand for global state. The mobile app must handle both global application state (auth, workspace selection) and server-fetched data (conversations, agents, contacts).

**Options Considered:**

| Option | Role | Verdict |
|---|---|---|
| Zustand | Global client state (auth, workspace, UI flags) | ✅ Use — matches web pattern |
| TanStack Query v5 (React Query) | Server state, caching, background refresh, pagination | ✅ Use |
| Redux Toolkit | Global state + server state | ❌ Overkill for this scale |
| Context API only | Simple cases | ❌ Insufficient for complex server state |

**Decision:** **Zustand (global state) + TanStack Query (server state)**

**Store Boundaries:**

| Store | Contents |
|---|---|
| `authStore` | `user`, `token`, `isAuthenticated`, `logout()` |
| `workspaceStore` | `activeWorkspace`, `workspaces[]`, `switchWorkspace()` |
| `uiStore` | `networkStatus`, `theme`, `notificationBadge` |
| TanStack Query | All API data: conversations, messages, agents, contacts, etc. |

**Trade-offs:**  
Two state libraries to understand. The boundary is explicit: if it comes from the server, it belongs in TanStack Query; if it is client-side application state, it belongs in Zustand.

**Constraints from Repository:** Web uses Zustand — shared mental model.

---

### ADR-005: Authentication Token Storage

**Status:** ✅ Decided | **Confidence:** High

**Context:**  
The web app uses HTTP-only cookie-based JWT (`auth_token` cookie) managed by the FastAPI backend. Mobile WebViews and native HTTP clients do not reliably share cookies across origins.

**Options Considered:**

| Option | Security | Feasibility |
|---|---|---|
| AsyncStorage | Low — plaintext on disk | ❌ Not acceptable for auth tokens |
| expo-secure-store (Keychain/Keystore) | High — OS-level encryption | ✅ Best practice |
| Cookie jar (via react-native-cookies) | Medium — complex to manage | ❌ Fragile cross-platform |
| In-memory only | High | ❌ Lost on app restart |

**Decision:** **expo-secure-store — JWT stored in OS Keychain (iOS) / Keystore (Android)**

**Token Transport:**  
```
Authorization: Bearer {token}
```
(Verified: backend `base.js` already supports Bearer header extraction alongside cookie fallback.)

**Token Lifecycle:**

```
Login (OTP verify)
  └─► Receive JWT → SecureStore.setItemAsync('auth_token', token)

Each API request
  └─► SecureStore.getItemAsync('auth_token') → inject as Authorization header

401 Response
  └─► Clear SecureStore → Navigate to Login screen → Re-prompt OTP
```

**Known Gap:** Access token expires in 30 minutes (`ACCESS_TOKEN_EXPIRE_MINUTES=30`). No refresh token endpoint exists in the current backend. See [ADR-020](#adr-020-token-refresh-gap--open-decision).

**Trade-offs:**  
Slightly slower token retrieval (async Keychain read) vs in-memory. Negligible in practice (~1–5ms).

**Constraints from Repository:** Cookie-based auth is not reliable in native mobile context. Bearer header already supported.

---

### ADR-006: WebSocket Strategy

**Status:** ✅ Decided | **Confidence:** High

**Context:**  
Real-time messaging relies on the existing WebSocket endpoint `/ws/{user_id}?token={jwt}&workspace_id={id}`. The mobile client needs equivalent real-time capability.

**Options Considered:**

| Option | Verdict |
|---|---|
| Native WebSocket API (built into RN) | ✅ Use — no extra dependency |
| socket.io-client | ❌ Overkill — backend uses plain WS, not socket.io |
| Long-polling fallback | ❌ Inefficient — use only as last resort |

**Decision:** **Native WebSocket API with reconnect logic ported from `RealtimeContext.js`**

**Connection URL:**
```
wss://api.orbionagents.com/ws/{userId}?token={jwt}&workspace_id={workspaceId}
```

**Reconnect Strategy (from `RealtimeContext.js`):**

```
Max retries: 8
Backoff: exponential with jitter
  delay = min(30000, baseDelay * 2^attempt) + random(0, 1000)ms
```

**App Lifecycle Handling:**

| App State | WebSocket Action |
|---|---|
| Active (foreground) | Connected and streaming |
| Background | Disconnect gracefully — rely on push notifications |
| Foreground resume | Reconnect immediately; re-fetch missed messages via REST |

**Trade-offs:**  
Background disconnect means real-time is push-notification dependent when app is backgrounded. This is the correct mobile pattern — see [ADR-007](#adr-007-push-notifications).

**Constraints from Repository:** WS token passed as query param — already implemented on backend.

---

### ADR-007: Push Notifications

**Status:** 🔵 Proposed | **Confidence:** High (decision clear; backend implementation pending)

**Context:**  
No FCM or APNs integration was found anywhere in the backend repository. This is the **largest identified backend gap** for mobile. When the app is backgrounded, WebSocket is disconnected; users must still receive message alerts.

**Options Considered:**

| Option | Verdict |
|---|---|
| Firebase Cloud Messaging (FCM) + APNs via Expo Notifications | ✅ Use |
| OneSignal (third-party) | Viable fallback; adds vendor dependency |
| Silent push only (no visible notifications) | ❌ Insufficient |

**Decision:** **Expo Notifications → FCM (Android) + APNs (iOS)**

**Required Backend Changes:**

| Change | Description |
|---|---|
| `POST /push/register` | Store device push token per user + device |
| `DELETE /push/deregister` | Remove token on logout |
| Trigger from `notification_scheduler_worker` | Send push for scheduled notifications |
| Trigger from real-time event handler | Send push for new incoming messages when WS is disconnected |

**Mobile Implementation:**

```javascript
// On login success
const { status } = await Notifications.requestPermissionsAsync();
if (status === 'granted') {
  const token = await Notifications.getExpoPushTokenAsync();
  await apiClient.post('/push/register', { token: token.data, platform: Platform.OS });
}
```

**Trade-offs:**  
Requires backend work before this feature is functional. Mobile app can be built with the integration code ready; backend team activates it on their timeline.

**Constraints from Repository:** Gap — no existing push infrastructure.

---

### ADR-008: WhatsApp WABA Channel Setup

**Status:** ✅ Decided | **Confidence:** High

**Context:**  
The existing WhatsApp Business Account (WABA) onboarding flow uses the Meta Facebook JS SDK (`window.FB`), which is loaded as a browser script. This is incompatible with React Native's JavaScript environment (no `window.FB`, no DOM).

**Options Considered:**

| Option | Feasibility |
|---|---|
| Re-implement WABA setup in RN using Meta Graph API directly | Complex — Meta's embedded signup requires browser JS SDK |
| WebView embedding the web app's channel setup page | Fragile — `window.FB` behaviour in WebView is unreliable |
| Redirect to web browser for initial WABA setup | ✅ Clean separation |

**Decision:** **Initial WABA setup redirects to the web app; channel status/management is mobile-native**

**Feature Split:**

| Feature | Mobile Support |
|---|---|
| WABA initial business verification & setup | 🔗 Redirect to `https://app.orbionagents.com/user/admin/channels` |
| Channel status viewing (`GET /channels/status`) | ✅ Native |
| WhatsApp profile viewing (`GET /whatsapp/profile`) | ✅ Native |
| Template management | ✅ Native (read + send) |
| Disconnect channel | ✅ Native |

> **Note:** This is a deliberate scope decision, not a gap. The web app remains the authoritative surface for initial channel onboarding.

**Trade-offs:**  
Users must switch to web browser for first-time WABA setup. This is a one-time action; acceptable.

**Constraints from Repository:** Meta Facebook JS SDK requires browser context (`window.FB`).

---

### ADR-009: Instagram OAuth on Mobile

**Status:** ✅ Decided | **Confidence:** High

**Context:**  
Instagram OAuth uses a redirect-based flow with `state=workspace_id` parameter. The existing web implementation handles the OAuth callback in a browser page. Mobile needs an equivalent deep-link callback.

**Decision:** **expo-auth-session (in-app browser) + deep-link callback**

**Flow:**

```
1. User taps "Connect Instagram"
2. expo-auth-session opens Instagram OAuth URL in in-app browser
3. Instagram redirects to: orbionagents://instagram/callback?code=XXX&state=workspaceId
4. App intercepts deep-link, extracts code
5. POST /api/instagram/connect { code, workspace_id }
6. Backend exchanges code for access token, stores credentials
```

**Deep-Link Configuration (`app.config.js`):**
```javascript
scheme: 'orbionagents',
// Results in: orbionagents://instagram/callback
```

**Required Expo Packages:** `expo-auth-session`, `expo-linking`

**Trade-offs:**  
Requires deep-link scheme registration in app stores. Standard practice; no significant risk.

**Constraints from Repository:** Instagram connect endpoint (`POST /api/instagram/connect`) already exists; state param pattern is deep-link compatible.

---

### ADR-010: Automation Visual Builder

**Status:** ✅ Decided | **Confidence:** High

**Context:**  
The web app features a drag-and-drop visual flow builder (`CanvasGrid.jsx`) built with ReactFlow — a canvas-based library with pan/zoom, node inspection, and an AI magic bar. This pattern is fundamentally incompatible with small phone screens.

**Options Considered:**

| Option | Verdict |
|---|---|
| Port ReactFlow to mobile (custom canvas) | ❌ Extremely complex; poor UX on phone |
| Show flows as a list with limited controls | ✅ Appropriate MVP scope |
| Exclude flows entirely from mobile | ❌ Loses operational value (toggling flows) |

**Decision:** **Mobile shows read-only flow list with status toggle only; creation/editing redirects to web**

**Mobile Capabilities:**

| Action | Mobile Support |
|---|---|
| View list of automation flows | ✅ Native |
| Toggle flow active/inactive (`PATCH /flows/{id}/status`) | ✅ Native |
| View flow name, trigger type, last run | ✅ Native |
| Create new flow | 🔗 Redirect to web |
| Edit flow nodes/logic | 🔗 Redirect to web |

> **This is a scope exclusion, not a gap.** Visual builders require keyboard + pointer input. The mobile surface provides operational control (enable/disable); authoring remains on web.

**Constraints from Repository:** ReactFlow (`CanvasGrid.jsx`) is browser-DOM dependent.

---

### ADR-011: Offline & Network Strategy

**Status:** ✅ Decided | **Confidence:** High

**Context:**  
Mobile users frequently experience intermittent connectivity. The app must handle network interruptions gracefully without data loss, particularly for outgoing messages.

**Decision:** **TanStack Query cache + optimistic updates + draft queue**

**Strategy Layers:**

| Layer | Mechanism |
|---|---|
| Read caching | TanStack Query `staleTime` + `gcTime`; stale-while-revalidate on reconnect |
| Optimistic sends | `POST /send-reply` shows message immediately; rolls back on failure |
| Offline draft queue | Failed sends stored locally; retried on network restore |
| Network indicator | Banner shown when `NetInfo.isConnected === false` |
| Draft persistence | Compose text auto-saved to AsyncStorage (non-sensitive) — never lost |

**Offline Queue Implementation:**
```javascript
// On send failure (network error only, not 4xx):
await AsyncStorage.setItem('pendingMessages', JSON.stringify([...queue, failedMessage]));
// On NetInfo reconnect event:
processPendingQueue(); // flush queue in order
```

**Trade-offs:**  
Optimistic updates can show brief "ghost" messages that roll back. User must be shown clear error state on rollback.

**Constraints from Repository:** TanStack Query already chosen in ADR-004.

---

### ADR-012: API Client Design

**Status:** ✅ Decided | **Confidence:** High

**Context:**  
All mobile API calls must include auth headers, workspace context, consistent timeout handling, and uniform error mapping.

**Decision:** **Centralized `src/services/apiClient.js` wrapping `fetch`**

**Client Responsibilities:**

| Concern | Implementation |
|---|---|
| Base URL | `process.env.EXPO_PUBLIC_API_BASE_URL` |
| Auth injection | `Authorization: Bearer {token}` from `expo-secure-store` |
| Workspace injection | `?workspace_id={id}` appended to all requests |
| Timeout | 30 seconds (AbortController) |
| Error mapping | `401` → re-auth, `403` → permission error, `422` → validation, `5xx` → server error |
| Retry policy | GET only — 1 retry after 800ms on network error (matches web pattern) |
| Logging | Dev-only request/response logging; Sentry breadcrumbs in production |

**Error Enum:**
```javascript
export const ApiError = {
  UNAUTHORIZED: 'UNAUTHORIZED',       // 401 → navigate to login
  FORBIDDEN: 'FORBIDDEN',             // 403 → show permission toast
  VALIDATION: 'VALIDATION',           // 422 → surface field errors
  SERVER_ERROR: 'SERVER_ERROR',       // 5xx → generic error banner
  NETWORK_ERROR: 'NETWORK_ERROR',     // No connection
};
```

**Trade-offs:**  
`fetch`-based client avoids adding Axios as a dependency. If request interceptor complexity grows, migrate to Axios at that point.

**Constraints from Repository:** Backend `base.js` confirms Bearer header extraction is already supported.

---

### ADR-013: Media & File Handling

**Status:** ✅ Decided | **Confidence:** High

**Context:**  
The app serves and accepts media (images, documents, video) through messages. Media files are stored in Supabase storage and served via direct URLs.

**Decision:** **Expo media libraries — no custom native modules required**

**Library Mapping:**

| Media Type | Library | Notes |
|---|---|---|
| Image display | `expo-image` | Built-in disk + memory cache; progressive loading |
| Image capture | `expo-camera` | Take photos to send as messages |
| Image/file upload | `expo-document-picker` + `expo-image-picker` | User selects from gallery or files |
| File download | `expo-file-system` | Download attachments to device |
| Video playback | `expo-av` | Play video messages inline |
| Audio messages | `expo-av` | Record + playback voice messages (P2) |

**Supabase URLs:**  
Media URLs from Supabase bucket are served as public HTTPS URLs — standard `<Image>` or `expo-image` compatible. No special Supabase SDK required on mobile for read access.

**Trade-offs:**  
`expo-av` adds ~2MB to bundle. Acceptable given video is a core message type.

**Constraints from Repository:** Supabase bucket serves direct HTTPS media URLs.

---

### ADR-014: Environment Configuration

**Status:** ✅ Decided | **Confidence:** High

**Context:**  
Mobile builds target multiple environments (development, staging, production) with different API endpoints and service credentials.

**Decision:** **`app.config.js` + `expo-constants` with `.env` files**

**Environment Variables:**

| Variable | Purpose |
|---|---|
| `EXPO_PUBLIC_API_BASE_URL` | REST API base URL |
| `EXPO_PUBLIC_WS_BASE_URL` | WebSocket base URL |
| `EXPO_PUBLIC_FB_APP_ID` | Meta Facebook App ID (Instagram OAuth) |
| `EXPO_PUBLIC_SENTRY_DSN` | Sentry error reporting DSN |
| `EXPO_PUBLIC_ENV` | `development` / `staging` / `production` |

**Rules:**
- `EXPO_PUBLIC_` prefix embeds the value in the JS bundle (public config only).
- **Never** store secret keys (DB passwords, API secrets) in the app bundle — all secrets remain server-side.
- `.env.local` is gitignored; `.env.example` is committed.

**Build Profiles (`eas.json`):**
```json
{
  "build": {
    "development": { "env": { "EXPO_PUBLIC_ENV": "development" } },
    "staging":     { "env": { "EXPO_PUBLIC_ENV": "staging" } },
    "production":  { "env": { "EXPO_PUBLIC_ENV": "production" } }
  }
}
```

**Constraints from Repository:** No existing mobile config to migrate.

---

### ADR-015: CI/CD & Distribution

**Status:** ✅ Decided | **Confidence:** High

**Context:**  
The team needs automated build, test, and distribution pipelines for both iOS and Android without local Xcode/Android Studio dependencies for every developer.

**Decision:** **EAS Build + EAS Submit + EAS Update, orchestrated via GitHub Actions**

**Pipeline:**

```
GitHub PR
  └─► GitHub Actions
        ├─► ESLint + Prettier
        ├─► Jest unit tests
        └─► EAS Build (preview profile) → artifact URL in PR comment

Merge to main
  └─► EAS Build (staging)
        ├─► iOS: TestFlight (beta)
        └─► Android: Firebase App Distribution (beta)

Release tag (vX.Y.Z)
  └─► EAS Build (production)
        ├─► EAS Submit → App Store Connect
        └─► EAS Submit → Google Play Console

JS-only hotfix
  └─► EAS Update → OTA push (no store review)
```

**Key Tools:**

| Tool | Purpose |
|---|---|
| EAS Build | Cloud native builds (no local Xcode/Android Studio required) |
| EAS Submit | Automated App Store + Play Store upload |
| EAS Update | OTA JavaScript bundle updates |
| TestFlight | iOS beta distribution |
| Firebase App Distribution | Android beta distribution |

**Trade-offs:**  
EAS Build minutes are metered on Expo's paid plans. Budget accordingly for CI usage.

**Constraints from Repository:** No existing mobile CI/CD. Greenfield setup.

---

### ADR-016: Monitoring & Crash Reporting

**Status:** ✅ Decided | **Confidence:** High

**Context:**  
Production mobile apps require crash visibility and usage analytics separate from backend Prometheus metrics.

**Decision:** **Sentry for crash reporting + PostHog for product analytics**

| Tool | Integration | Purpose |
|---|---|---|
| Sentry | `@sentry/react-native` (Expo-compatible) | Crash reports, JS errors, performance traces |
| PostHog | `posthog-react-native` | Screen views, feature usage, funnel analysis |

**Sentry Configuration:**
- Attach Sentry breadcrumbs to every API request (via `apiClient.js` in ADR-012).
- Tag every event with `workspace_id` and `user_id` (non-PII).
- Source maps uploaded via EAS Build post-hook.

**Backend Monitoring:** Prometheus metrics remain unchanged — mobile does not alter server-side observability.

**Trade-offs:**  
Two analytics SDKs add minor bundle weight (~500KB combined). Sentry is non-negotiable for production crash visibility.

---

### ADR-017: Security Considerations

**Status:** ✅ Decided | **Confidence:** High

**Context:**  
Mobile apps face distinct security threats: token theft from device storage, network interception, and unauthorized access if a device is lost.

**Decision:** **Defense-in-depth across storage, transport, and access control layers**

**Security Controls:**

| Control | Implementation | Priority |
|---|---|---|
| Secure token storage | `expo-secure-store` only — **never** `AsyncStorage` for tokens | P0 |
| HTTPS everywhere | API_BASE_URL must always be `https://` — enforced in apiClient.js | P0 |
| RBAC enforcement | Replicate `hasPermission()` logic using `GET /workspaces/{id}/my-permissions` | P0 |
| Workspace isolation | Always pass `workspace_id` in requests; validate server-side | P0 |
| Certificate pinning | `expo-ssl-pinning` — evaluate for production release | P1 |
| Biometric app unlock | `expo-local-authentication` (Face ID / fingerprint) | P2 |
| Jailbreak/root detection | `expo-device` + heuristic checks — warn user, do not block | P2 |
| Sensitive screen masking | Hide app preview in App Switcher (system-level flag) | P1 |

> **Rule:** If it is an auth token or PII, it goes in `expo-secure-store`. `AsyncStorage` is only for non-sensitive preferences (theme, draft text).

**Trade-offs:**  
Certificate pinning complicates debugging (must disable for dev builds). Use build profile flag to disable in `development` profile only.

**Constraints from Repository:** JWT auth is in scope; bearer header supported. RBAC `hasPermission()` exists in web — portable to mobile.

---

### ADR-018: CORS for Mobile Client

**Status:** ✅ Decided | **Confidence:** High

**Context:**  
The backend FastAPI CORS middleware is configured with `allow_origins=["https://app.orbionagents.com"]`. The question is whether native mobile HTTP requests are blocked by CORS.

**Decision:** **No CORS changes required for mobile native API calls**

**Explanation:**

| Client Type | Sends `Origin` Header | CORS Applies? |
|---|---|---|
| Web browser | ✅ Yes | Yes — checked against `allow_origins` |
| React Native native fetch | ❌ No | No — CORS is a browser-only enforcement |
| React Native WebView | ✅ Yes (browser context) | Yes — use web origin or configure separately |

Native mobile HTTP clients (React Native `fetch`, `XMLHttpRequest`) do **not** send an `Origin` header. The backend CORS middleware will not reject these requests. No backend changes are needed.

**WebSocket:** Token is passed as a query parameter — already handled by the existing backend; no CORS consideration.

**Trade-offs:**  
None. This is a clarifying decision to prevent unnecessary backend changes.

**Constraints from Repository:** CORS is browser-enforced; native clients are not subject to it.

---

### ADR-019: Brain / AI Workspace Exclusion

**Status:** ✅ Decided | **Confidence:** High

**Context:**  
The web app contains a Brain/RAG (Retrieval-Augmented Generation) workspace feature for knowledge base management and AI document querying. This feature is excluded from the mobile MVP.

**Decision:** **Brain/AI Workspace excluded from mobile MVP; architecture prepared for future addition**

**Rationale:**
- Brain features require complex document upload UX, query interfaces, and potentially large file handling — not suited for a mobile MVP.
- Backend Brain endpoints remain unchanged and available for a future mobile iteration.
- No backend changes required for exclusion.

**Future-Proofing:**  
Feature flags must gate Brain screens so they can be enabled without navigation restructuring:

```javascript
// src/config/features.js
export const FEATURES = {
  BRAIN_WORKSPACE: false, // Enable when mobile Brain is ready
  AUTOMATION_BUILDER: false,
};
```

Navigation registration:
```javascript
// Register Brain tab conditionally — no structural refactor needed later
{FEATURES.BRAIN_WORKSPACE && <Tab.Screen name="Brain" component={BrainStack} />}
```

**Trade-offs:**  
Users who rely heavily on Brain for AI queries must use the web app. Expected for an MVP phase.

**Constraints from Repository:** Brain/RAG endpoints exist but are excluded from mobile scope by product decision.

---

### ADR-020: Token Refresh Gap — Open Decision

**Status:** 🟡 Open | **Confidence:** High (problem is clear; solution requires backend team input)

**Context:**  
The backend access token expires in **30 minutes** (`ACCESS_TOKEN_EXPIRE_MINUTES=30`). No refresh token endpoint (`/auth/refresh`) was found in the repository. Mobile sessions must persist across hours or days of use without forcing repeated OTP re-authentication.

**Problem:**  
A 30-minute session TTL is acceptable for a web browser (user is often re-navigating anyway). For a mobile app, this creates a frustrating experience where the user is logged out every 30 minutes.

**Options Considered:**

| Option | Description | Pros | Cons |
|---|---|---|---|
| **A** | Add `POST /auth/refresh` endpoint | Industry standard; short-lived access tokens remain secure | Requires backend work; refresh token storage strategy needed |
| **B** | Increase `ACCESS_TOKEN_EXPIRE_MINUTES` (e.g., 7 days) | Zero backend work | Longer exposure window if token is stolen; no revocation granularity |
| **C** | Re-authenticate silently with biometrics (no new token issued) | Good UX; no backend change | Complex UX flow; requires biometric availability |
| **D** | Sliding expiry — token TTL resets on each valid API call | Medium security | Requires backend middleware change |

**Recommendation:**  
**Option A** — Add `/auth/refresh` endpoint with a long-lived refresh token (30 days) stored in `expo-secure-store`. This is the industry-standard approach and maintains security boundaries.

Minimum backend contract:
```
POST /auth/refresh
Body: { refresh_token: "..." }
Response: { access_token: "...", expires_in: 1800 }
```

**Interim Mitigation (while Open):**  
Handle `401` responses gracefully by clearing stored token and showing a re-login prompt with OTP — do not crash or enter a broken state.

> **⚠️ Action Required:** Backend team / engineering manager must decide between Options A–D before mobile auth implementation is finalized.

**Constraints from Repository:** `ACCESS_TOKEN_EXPIRE_MINUTES=30` confirmed in backend config. No refresh endpoint found.

---

## Summary Table

| ADR | Decision | Status | Confidence |
|---|---|---|---|
| 001 | React Native + Expo SDK 51+ | ✅ Decided | High |
| 002 | JavaScript (matches repo convention) | ✅ Decided | High |
| 003 | Bottom Tabs (4) + More modal | ✅ Decided | High |
| 004 | Zustand + TanStack Query | ✅ Decided | High |
| 005 | expo-secure-store + Bearer header | ✅ Decided | High |
| 006 | Native WebSocket + reconnect logic | ✅ Decided | High |
| 007 | Expo Notifications → FCM + APNs | 🔵 Proposed | High |
| 008 | WABA setup redirects to web | ✅ Decided | High |
| 009 | expo-auth-session + deep-link | ✅ Decided | High |
| 010 | Flow list read-only + status toggle | ✅ Decided | High |
| 011 | TanStack cache + optimistic + draft queue | ✅ Decided | High |
| 012 | Centralized apiClient.js with fetch | ✅ Decided | High |
| 013 | Expo media libraries (expo-image, expo-av) | ✅ Decided | High |
| 014 | app.config.js + EXPO_PUBLIC_ env vars | ✅ Decided | High |
| 015 | EAS Build + EAS Submit + GitHub Actions | ✅ Decided | High |
| 016 | Sentry + PostHog | ✅ Decided | High |
| 017 | expo-secure-store + RBAC + HTTPS enforcement | ✅ Decided | High |
| 018 | No CORS changes needed for native clients | ✅ Decided | High |
| 019 | Brain excluded; feature-flagged for future | ✅ Decided | High |
| 020 | Token refresh — **OPEN** | 🟡 Open | High |

---

## Open Action Items

| # | Action | Owner | Priority |
|---|---|---|---|
| 1 | Decide on token refresh strategy (ADR-020) | Engineering Manager + Backend Lead | 🔴 P0 — Blocks auth implementation |
| 2 | Implement `POST /push/register` + push trigger logic (ADR-007) | Backend Team | 🟠 P1 — Blocks push notifications |
| 3 | Register `orbionagents://` deep-link scheme in App Store Connect and Play Console (ADR-009) | Mobile / DevOps | 🟡 P1 — Required before Instagram OAuth |
| 4 | Set up EAS project and link to Expo account (ADR-015) | DevOps | 🟡 P1 — Required for first build |

---

*This document is maintained alongside the codebase. Update relevant ADRs when implementation decisions change during development.*
