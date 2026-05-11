# WhatsApp Automation Architecture Audit

Date: 2026-05-09
Reviewer: Codex
Scope: FastAPI webhooks, Celery workers, Twilio integration, flow engine, outbound queueing, Redis locking, callbacks, DB models, retries, sequencing, and multi-tenant workspace routing.

## Executive Summary

This system has the shape of a serious asynchronous messaging architecture, but it is not yet production-safe under failure, concurrency, and adversarial conditions.

The strongest parts are:

- A dedicated `outbound_messages` table with sequence numbers.
- A database partial unique index intended to enforce one active outbound message per conversation.
- A per-conversation Redis lock to reduce duplicate dispatch work.
- A conversation execution lease in `FlowExecutionState` to reduce concurrent flow execution.
- Celery reliability settings that are better than the default baseline.

The most serious weaknesses are:

- Twilio webhook and status callback endpoints are unauthenticated.
- Twilio credentials are stored in a mutable singleton service that is unsafe in a multi-tenant concurrent environment.
- The system performs the external send before the database commit that records the send result, which creates duplicate-send risk after crashes and network ambiguity.
- Message ordering is only partially enforced because several send paths bypass the sequenced outbox.
- Status handling is internally inconsistent and contains concrete enum bugs that can break callback processing.
- Inbound persistence and Celery enqueue are not atomic, so messages can be accepted and stored but never processed.

Maturity rating: `intermediate`

This is not beginner code. There are meaningful production instincts here. But it is also not yet at a production or enterprise reliability bar for high-volume WhatsApp automation.

## Files Reviewed

- `backend/app/routers/inbox_chennal/twilio_webhook.py`
- `backend/app/services/webhook_service.py`
- `backend/app/services/message_service.py`
- `backend/app/services/flow_service_v2.py`
- `backend/app/workers/flow_execution.py`
- `backend/app/services/whatsapp_delivery.py`
- `backend/app/services/channel_service.py`
- `backend/app/services/twilio_service.py`
- `backend/app/core/redis_lock.py`
- `backend/app/core/celery_app.py`
- `backend/app/services/conversation_service.py`
- `backend/app/models/message.py`
- `backend/app/models/outbound_message.py`
- `backend/app/models/conversation.py`
- `backend/app/models/flow_execution.py`
- `backend/app/models/scheduled_resume.py`
- `backend/app/models/webhook_event.py`
- `backend/app/models/workspace.py`
- `backend/app/database.py`
- `backend/app/services/inbox_agents/orchestration_layer.py`
- `backend/app/services/inbox_agents/escalation_queue.py`
- `backend/app/services/inbox_agents/conversation_policy.py`
- `backend/app/services/inbox_agents/followup_scheduler.py`
- `backend/app/services/after_hours_service.py`

## End-to-End Realtime Lifecycle

### 1. Inbound webhook

Twilio inbound traffic enters `POST /twilio/webhook` in `twilio_webhook.py`.

The route:

- reads form data
- hands off to `WebhookService.handle_twilio_webhook`
- returns an empty TwiML response even on some failure paths

`WebhookService.handle_twilio_webhook`:

- extracts `From`, `To`, `Body`, `ButtonText`, `MessageSid`
- derives workspace from the Twilio `To` number
- strips `whatsapp:` from the sender number
- calls `process_incoming_message(...)`

### 2. Conversation and inbound message persistence

`WebhookService.process_incoming_message`:

- normalizes the channel
- calls `ConversationService.get_or_create_conversation`
- calls `MessageService.persist_inbound_message`
- commits the DB transaction
- enqueues `execute_incoming_message.delay(...)`

This is the first important boundary:

- inbound message persistence happens before Celery enqueue
- Celery enqueue is outside the DB transaction

That means an inbound can be stored successfully and still never be processed if broker enqueue fails after commit.

### 3. Flow execution

`execute_incoming_message` in `flow_execution.py`:

- opens a SQLAlchemy session
- creates a `FlowServiceV2` instance
- runs async flow execution through a thread pool
- traces success or failure
- retries on busy or exception paths

`FlowServiceV2.execute_incoming_message`:

- loads the conversation
- claims an execution lease through `FlowExecutionState.runtime_context["_execution_control"]`
- handles pending button or pending question states first
- otherwise performs trigger matching
- activates the selected flow
- cancels stale pending or in-progress outbound rows from older flows
- executes nodes and creates outbound messages in `outbound_messages`
- persists state
- enqueues `send_next_pending_message`

### 4. Outbound queue creation

`FlowServiceV2._queue_outbound_message`:

- refreshes the execution lease
- reads the highest sequence for the conversation under `SELECT ... FOR UPDATE`
- inserts a new `OutboundMessage(status="pending")`
- commits immediately

This means a single flow run is not one atomic unit. It emits durable outbound rows node by node as execution progresses.

That is not automatically wrong, but it means partial execution is expected under failures.

### 5. Queue release and dispatch

`send_next_pending_message`:

- takes a Redis conversation send lock
- checks for active rows in `in_progress` or `dispatched`
- recovers timed-out active rows by resetting them to `pending`
- loads `active_flow_id`
- claims the next pending row for the active flow
- marks it `in_progress`
- commits
- enqueues `send_whatsapp_message_task`

This is the main outbound dispatcher gate.

### 6. Twilio send

`send_whatsapp_message_task`:

- loads and locks the `OutboundMessage`
- exits if row already has a `twilio_sid`
- validates row status is `in_progress`
- cancels stale rows if the active flow changed
- calls `deliver_outbound_message(...)`
- `deliver_outbound_message(...)` calls `ChannelService.send_message(...)`
- `ChannelService` delegates to `TwilioService`
- `TwilioService.send_whatsapp_message(...)` performs the actual Twilio API call
- on success, the task writes `twilio_sid`, sets status to `dispatched`, creates an inbox message copy, commits, then schedules another release

Important distinction:

- this code treats Twilio API acceptance as `dispatched`
- later status callback transitions move it to `sent` or `delivered`

### 7. Status callback

`POST /twilio/status-callback`:

- reads form data
- calls `MessageService.handle_twilio_status_callback`

The callback handler:

- looks up `OutboundMessage` by `twilio_sid`
- acquires row lock with `with_for_update()`
- ignores unknown rows
- ignores already terminal rows
- updates state for `sent`, `delivered`, or `failed` / `undelivered`
- may update the inbox `Message` record
- schedules another `send_next_pending_message`

### 8. Next queue release

The queue can be released by several events:

- initial flow execution after outbound rows are inserted
- callback `sent`
- callback `delivered`
- callback `failed`
- stale-flow cancellation
- stuck-message sweeper

This is both a strength and a source of risk. It helps avoid stalling, but it also creates overlapping re-entry paths into the dispatcher.

## Architecture Strengths

### Good concurrency instincts

There are several real anti-race primitives here:

- Redis per-conversation send lock
- `SELECT FOR UPDATE` around active outbound rows
- unique `(conversation_id, sequence)` index
- partial unique index to ensure at most one active outbound row
- execution lease to serialize flow execution per conversation

That is materially better than a naive Celery + Twilio integration.

### Queue-backed outbound path for automation

The automation flow engine does not send directly. It usually queues first, which is the correct direction. This gives a place to add retries, auditing, reconciliation, DLQ, and ordering controls.

### Stale-flow awareness

You are explicitly thinking about old flow runs:

- old pending and in-progress outbound rows get cancelled when a new flow activates
- long-delay scheduled resumes store `flow_id` and are checked for staleness before replay

That is good systems thinking.

### Celery worker settings are stronger than default

`task_acks_late=True`, `task_reject_on_worker_lost=True`, and `worker_prefetch_multiplier=1` are all sensible reliability moves for this kind of workload.

## Critical Findings

### 1. Unauthenticated Twilio webhooks

Severity: `P0`

The Twilio inbound webhook and status callback do not verify `X-Twilio-Signature`.

Impact:

- anyone who can hit the endpoint can inject inbound messages
- anyone can fake delivery or failure callbacks
- queue release can be triggered by forged callbacks
- state can be corrupted without Twilio ever sending anything

Why this matters:

This is not just a security problem. It is also a reliability problem, because callback-driven sequencing depends on these requests being trustworthy.

### 2. Workspace takeover on Twilio connect

Severity: `P0`

`connect_twilio` accepts a `workspace_id` but does not verify the current user belongs to that workspace before writing credentials.

Impact:

- authenticated users may be able to overwrite another tenant's Twilio settings
- this breaks workspace isolation directly

### 3. Multi-tenant Twilio singleton is concurrency-unsafe

Severity: `P0`

`TwilioService` is implemented as a mutable singleton with shared fields:

- `client`
- `_from_number`
- `_current_sid`
- `_current_token`
- `_current_workspace_id`

Impact:

- worker A can refresh credentials for workspace X
- worker B can refresh credentials for workspace Y
- A can then send using Y's credentials or sender number depending on interleaving

In a multi-worker, multi-thread, or even reused-process environment, this is a real tenant isolation and correctness risk.

### 4. External send happens before durable send recording

Severity: `P0`

The system sends to Twilio before the DB commit that stores `twilio_sid` and marks the row `dispatched`.

Failure scenario:

1. Twilio accepts the message and returns SID
2. process crashes before DB commit
3. row still appears unsent or timed out
4. sweeper or retry re-dispatches
5. customer receives duplicate message

This is one of the core reliability boundaries in messaging systems, and the current architecture does not close it.

### 5. Status enum bug in message model

Severity: `P0`

The inbox `MessageStatus` enum defines:

- `RECEIVED`
- `SUGGESTED`
- `SENT`

But the code later writes:

- `MessageStatus.DELIVERED`
- `MessageStatus.FAILED`

Impact:

- callback code can raise exceptions during delivery updates
- failed-send cleanup code can also raise
- production callback path is fragile exactly where it should be boring

### 6. Ordering is only partially enforced

Severity: `P1`

Automation-generated outbound messages mostly follow the outbox sequence. But other code paths bypass it:

- `MessageService.send_reply(...)` sends directly
- `AgentOrchestration.send_response(...)` sends directly
- `AfterHoursResponder.handle_request(...)` sends directly

Impact:

- a manual or agentic message can jump ahead of queued automation messages
- callback-driven release logic does not govern all outbound traffic
- the system cannot honestly claim strict per-conversation ordering

### 7. Inbound commit and async processing enqueue are not atomic

Severity: `P1`

`WebhookService.process_incoming_message` commits first, then enqueues Celery.

Impact:

- if broker publish fails after commit, the inbound is persisted but never processed
- no reconciliation job currently guarantees it will be picked up later

This is a classic case for an outbox pattern.

### 8. Duplicate inbound delivery handling is not fully race-safe

Severity: `P1`

`persist_inbound_message` uses:

- `SELECT existing WHERE external_id = ...`
- then insert

There is a DB uniqueness constraint on `messages.external_id`, which is good. But the application path does not catch the concurrent insert conflict in a way that cleanly returns `duplicate`.

Impact:

- duplicate webhook retries can become error responses
- Twilio may redeliver if it sees webhook instability

### 9. SQLAlchemy session crosses thread boundary

Severity: `P1`

Celery task creates a DB session in the main task thread and then passes work into `_executor.submit(asyncio.run, ...)` while that async code uses the same session.

Impact:

- SQLAlchemy sessions are not thread-safe
- undefined behavior under load
- hard-to-debug transaction corruption or stale state risks

### 10. Short-delay resumes can replay stale flow logic

Severity: `P1`

Long delays persist `flow_id` and check it before resume. Short delays via Celery countdown do not carry `flow_id`; resume code loads `state.active_flow_id` at replay time.

Impact:

- a delayed node from an older flow may resume under a newer active flow context
- wrong nodes can execute against the wrong flow

### 11. Retry semantics for send task are inconsistent

Severity: `P1`

On send failure, the code often:

- marks the row `failed`
- schedules next dispatch
- then retries the task

On retry, the task sees row status is no longer `in_progress` and exits.

Impact:

- declared retries are not doing the job they appear to be doing
- system behavior is harder to reason about than it looks

### 12. Queue release depends on callback timing in a fragile way

Severity: `P1`

The dispatcher waits on callback progression, but also has timeout recovery and a sweeper.

Impact:

- delayed callbacks can race with timeout recovery
- callbacks arriving after timeout-induced recovery can mutate stale rows
- the same conversation may bounce between `dispatched`, `pending`, `failed`, and subsequent sends in confusing ways

## Edge Case Simulation

### Twilio callback delay

Current behavior:

- row remains `dispatched`
- no next message should be sent while active row exists
- after timeout, dispatcher or sweeper may reset or fail the message

Risk:

- the system may give up too early for a slow callback
- later callback can arrive after the system already recovered or moved on

### Worker crash mid-send

Crash before Twilio API call:

- row remains `in_progress`
- timeout recovery can retry later

Crash after Twilio accepted but before commit:

- row has no SID and may not become `dispatched`
- resend is possible
- duplicate customer message is likely

### Redis lock expiration

Current behavior:

- lock TTL is 30s
- if the holder stalls past TTL, another worker may acquire the Redis lock

Mitigation:

- DB row locks reduce damage

Remaining risk:

- Redis lock is not renewed
- correctness depends heavily on DB locking and status checks being perfect

### DB rollback after Twilio success

Current behavior:

- customer may receive message
- local DB may not know it was sent
- callback lookup may fail if `twilio_sid` was never committed

This is one of the hardest failure classes and is not fully addressed.

### Duplicate webhook delivery

Current behavior:

- duplicate check exists
- DB uniqueness exists

Risk:

- concurrent duplicate delivery can still raise an application error instead of returning an idempotent success response

### Celery retry overlap

Current behavior:

- busy conversations retry every 2 seconds
- send task also has retries
- dispatcher can be re-triggered from multiple places

Risk:

- retry amplification under load
- noisy duplicate work
- difficult-to-predict interleavings

### Network timeout after Twilio accepted message

Current behavior:

- task may think the send failed
- row may be marked failed if no SID was captured

Risk:

- callback later arrives but cannot be correlated
- duplicate resend risk remains

### Out-of-order callbacks

Current behavior:

- `delivered` is allowed from `dispatched`, `in_progress`, or `sent`
- `sent` after terminal status is ignored

This is a good instinct, but the enum bug can still break the path.

### Stale flow execution

Current behavior:

- long delayed resumes are flow-aware
- immediate queued sends are partially flow-aware
- short countdown resumes are weaker

Risk:

- some stale work is cancelled correctly
- some stale work can still execute after a newer flow is active

### Concurrent inbound messages

Current behavior:

- execution lease helps serialize active flow execution per conversation

Risk:

- ordering of inbound processing is not strictly guaranteed at queue level
- later inbound can win scheduling before earlier inbound depending on Celery timing

## Is Message Ordering Truly Guaranteed?

Short answer: `no`

More precise answer:

- queued automation messages are mostly ordered by sequence
- only one active outbound row is intended per conversation
- callback-driven release helps maintain progression

But full ordering is broken by:

- direct-send code paths outside the outbox
- release on `sent` rather than strictly on `delivered`
- crash ambiguity after external send
- timeout recovery that can mutate active rows before late callbacks arrive

If the product claim is "all outbound conversation messages are serialized in order across all send sources", the current code does not meet that claim.

## Is Idempotency Fully Safe?

Short answer: `no`

Inbound idempotency:

- partly safe due to unique `external_id`
- not fully safe at the application transaction boundary

Outbound idempotency:

- not fully safe because external send and local persistence are not atomic
- `twilio_sid` is used as evidence of prior send, but only after successful commit
- ambiguous network or crash conditions remain unresolved

True distributed idempotency would require:

- a durable outbound attempt record
- reconciliation for unknown outcomes
- provider correlation guarantees
- exactly-once semantics simulated through idempotent state machines, not assumed from a single task run

## Locking Strategy Review

### What is good

- per-conversation Redis lock lowers duplicate dispatcher work
- `SELECT FOR UPDATE` around active rows is correct direction
- partial unique index is a strong DB guard

### What is not enough

- Redis lock TTL is not renewed
- lock ownership does not span the actual Twilio API call lifecycle
- flow execution lock is stored inside mutable runtime context JSON, not a first-class lease table
- multiple re-entry paths into dispatcher still exist

For multi-worker and multi-container deployment, the locking is helpful but not yet sufficient to guarantee clean behavior under partial failure.

## State Transition Review

Requested states:

- `pending`
- `in_progress`
- `dispatched`
- `delivered`
- `failed`
- `cancelled`

Actual implementation also uses:

- `sent`

### `pending`

Reasonable initial state for queued outbound work.

Risk:

- partial flow commits create pending rows even if later nodes fail

### `in_progress`

Used as claimed-by-dispatcher state.

Risk:

- no durable attempt ownership beyond row state
- ambiguous after worker crash

### `dispatched`

Means Twilio API accepted and returned SID.

Risk:

- not durable if crash occurs before commit
- timeout recovery may treat it as stuck even when provider is fine

### `sent`

Used in callbacks but not listed in your requested state model.

Risk:

- semantic confusion
- next message release can happen before actual delivery

### `delivered`

Good terminal concept.

Risk:

- callback path currently writes an enum value not defined in `MessageStatus`

### `failed`

Currently overloaded.

It can mean:

- provider explicitly failed
- local send code failed before send
- timeout recovery gave up
- ambiguous network outcome got treated as failure

Those are not the same thing operationally.

### `cancelled`

Useful and necessary for stale-flow invalidation.

Risk:

- only some stale cases are covered

## Hidden Bug Classes

### Missing returns

The biggest reliability issue here is less "missing return" and more "returning success-looking responses on ambiguous state".

Examples:

- webhook routes often return generic success or empty TwiML even on important internal problems
- duplicate or error conditions may not surface clearly enough for operator diagnosis

### Silent `None` propagation

There are multiple places where `send_whatsapp_message(...)` can return `None` unless `raise_on_error=True`.

Most queue path calls use `raise_on_error=True`, which is better. But direct-send paths are weaker and can silently lose intent unless every caller checks aggressively.

### Partial commits

This architecture intentionally performs many commits:

- inbound persisted before Celery enqueue
- outbound row committed per message
- state committed separately
- tracing committed separately

That gives durability, but it also means partial progress is the norm. Without an explicit saga or event model, reconstruction under failure is messy.

### Callback race conditions

Likely failure modes:

- late callback after timeout reset
- late callback after stale-flow cancellation
- duplicate callback deliveries
- callback after row was marked terminal by another recovery path

Some guards exist, but not enough to call this robust.

### Shared mutable state

The most dangerous example is `TwilioService` singleton mutable credential state.

### Stale SQLAlchemy sessions

There is also a risk from:

- session reuse across thread boundary
- repeated commits and refreshes on long-running flow logic
- multiple nested transactional concepts without strict unit-of-work boundaries

## Security Risks

### Webhook verification

Twilio verification is missing.

Meta webhook GET verification exists, but POST signature verification is not visible in the code reviewed.

### Replay attacks

You already have a `webhook_events` table, but the Twilio inbound and callback flow is not using it.

That means:

- duplicate provider events are not durably tracked
- replay prevention is incomplete

### Workspace isolation

The connect route bug is a direct isolation problem.

The mutable Twilio singleton is also a cross-tenant isolation problem.

### Secret leakage

Twilio auth token is stored on the workspace model as plaintext `Text`.

There is encryption machinery elsewhere in the codebase, but this reviewed path does not show Twilio workspace credentials being encrypted at rest before persistence.

## Bottlenecks and Scaling Limits

### TwilioService credential refresh path

Every send opens a new short-lived DB session in `_ensure_ready`, which adds DB overhead on each outbound send.

In low volume this is acceptable. At high throughput it becomes a wasteful synchronous dependency in the hot path.

### Thread pool size

`ThreadPoolExecutor(max_workers=4)` caps concurrent async flow execution inside a worker process. That may become a choke point or produce head-of-line blocking.

### Callback-driven sequencing

The queue only advances cleanly when callbacks arrive or timeout recovery fires. That makes throughput and latency sensitive to provider callback quality.

### Repeated commits

The flow engine commits frequently, which increases database write pressure and transaction churn.

### Single active outbound per conversation

This is correct for ordering, but it does cap throughput per conversation by design. That is usually acceptable, but should be explicit.

## Production-Grade Recommendations

### 1. Implement a real outbound outbox pattern

Do not treat the current `outbound_messages` table as fully complete just because it exists.

Add:

- `outbound_message_attempts` table
- attempt states like `created`, `sending`, `provider_accepted`, `provider_failed`, `unknown`
- durable provider request/response correlation fields

### 2. Separate "unknown outcome" from "failed"

A timeout after provider call is not the same as a confirmed provider failure.

Add states like:

- `provider_unknown`
- `awaiting_reconcile`

Then reconcile via callback or provider fetch API if available.

### 3. Force every outbound send through one queue

Do not allow:

- manual reply direct send
- agent orchestration direct send
- after-hours direct send

All outbound traffic should go through the same sequenced outbox if ordering is a requirement.

### 4. Replace mutable singleton Twilio client

Use either:

- per-send client construction
- immutable per-workspace cached client keyed by workspace id and credentials hash

Never store mutable tenant-specific credentials in a global singleton shared by concurrent tasks.

### 5. Add provider event deduplication

Use `webhook_events` for Twilio inbound and callbacks.

Store:

- provider
- event id
- payload
- processed flag

and make handlers idempotent by first durably reserving the event id.

### 6. Move to explicit saga/event architecture

Recommended event chain:

- inbound_received
- inbound_persisted
- inbound_processing_enqueued
- flow_started
- outbound_queued
- outbound_dispatch_started
- outbound_provider_accepted
- outbound_callback_received
- outbound_delivered
- outbound_failed

This will make observability and reconciliation much easier.

### 7. Add DLQ and replay tooling

Use DLQ for:

- exhausted Celery tasks
- unknown send outcomes
- poison callbacks

Also add operator tooling to replay safely.

### 8. Improve observability

Add metrics for:

- webhook throughput
- duplicate webhook rate
- callback lag
- queue depth per conversation and per workspace
- pending age
- stuck message recovery count
- send unknown-outcome count
- callback-not-found count
- cross-tenant credential mismatch alarms

### 9. Tighten retry policy

Busy retry every 2 seconds is acceptable at small scale, but under load it can become noisy.

Use:

- jitter
- capped exponential backoff
- distinct retry rules for DB contention vs provider failure vs network ambiguity

### 10. Queue partitioning

Partition by at least:

- workspace
- conversation

If scale grows, consider a design where each conversation hashes to a routing partition to preserve local ordering without global contention.

## Exact Code-Level Fixes

### Fix 1. Add missing status enum values

Current model and callback logic disagree. Align them immediately.

Suggested enum:

```python
class MessageStatus(str, enum.Enum):
    RECEIVED = "RECEIVED"
    SUGGESTED = "SUGGESTED"
    SENT = "SENT"
    DELIVERED = "DELIVERED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"
```

### Fix 2. Verify workspace ownership in Twilio connect route

Before writing credentials, validate the requested workspace against the authenticated user.

### Fix 3. Verify Twilio signatures

Use Twilio's request validator for:

- inbound webhook
- status callback

Reject invalid requests early.

### Fix 4. Replace check-then-insert idempotency with insert-and-handle-conflict

For inbound messages and webhook events, rely on DB uniqueness first, not a separate existence read.

### Fix 5. Stop using one mutable Twilio singleton

Safer pattern:

```python
def build_twilio_client(workspace: Workspace) -> tuple[Client, str]:
    client = Client(workspace.twilio_account_sid, workspace.twilio_auth_token)
    from_number = f"whatsapp:{workspace.twilio_phone_number}"
    return client, from_number
```

### Fix 6. Carry `flow_id` through short-delay resumes

`resume_flow_node` should receive and validate the original flow id before resuming.

### Fix 7. Do not share a SQLAlchemy session across thread boundaries

Either:

- keep the task fully synchronous
- or create the DB session inside the thread or async execution context that uses it

### Fix 8. Rework send attempts around ambiguity

Current logic is too optimistic.

Safer model:

1. mark attempt `sending`
2. perform provider call
3. if success, store SID and `provider_accepted`
4. if network timeout after request dispatch, mark `unknown`
5. reconcile later instead of immediate resend

## Honest Maturity Rating

### Beginner

No. The system is beyond that.

### Intermediate

Yes. This is the most accurate rating.

You are already thinking in terms of:

- queues
- locks
- stale work invalidation
- sequenced outbound delivery
- callback-driven progression

That is real backend maturity.

### Production

Not yet.

You are still missing the hard parts that define production reliability:

- secure provider ingress
- atomicity boundaries around external side effects
- consistent idempotency model
- one unified send path
- robust recovery from unknown outcomes

### Enterprise

Definitely not yet.

Enterprise-grade messaging systems are obsessed with ambiguity resolution, auditability, replay, reconciliation, and tenant isolation. This code is not there today.

## Final Verdict

This architecture has a solid backbone and several good defensive ideas, but it is still fragile in the exact places where real messaging systems usually fail:

- at the boundary between local transaction and external provider side effect
- under duplicate or delayed callbacks
- under multi-tenant concurrent execution
- when supposedly rare timing races become normal under scale

The biggest conceptual issue is this:

You are very close to an outbox-driven architecture, but not fully committed to it yet.

Right now the system behaves like a hybrid:

- sometimes queue-first
- sometimes direct-send
- sometimes callback-gated
- sometimes timeout-recovered

That hybrid model is where a lot of hidden production bugs live.

If you want the shortest path to a real production-grade system, the first set of moves should be:

1. secure the webhooks
2. remove the mutable Twilio singleton
3. unify all outbound sends behind the outbox
4. fix the status enum mismatch
5. redesign send attempts around `unknown outcome`, not just `success` or `failed`
6. add durable webhook and callback dedupe using `webhook_events`

Once those are in place, the rest of the architecture becomes much easier to reason about and scale.
