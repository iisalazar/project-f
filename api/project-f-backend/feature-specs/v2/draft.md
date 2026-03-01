# V2 Draft Plan — Align `v1/finalized.md` to `locate2u-plan.md`

## Objective
Evolve the current v1 optimization platform into a Locate2u-style operations platform by delivering all verticals in [`locate2u-plan.md`](/home/wyvern/Dev/deltafy/project-f/api/project-f-backend/locate2u-plan.md), with controlled risk, tenant safety, and incremental rollout.

## Comparison: v1 vs Target v2

## What v1 already provides
- Authenticated optimization job submission and retrieval
- Async processing via SQS
- VROOM integration with retry
- Basic job lifecycle and logs
- Basic UI for job list/detail

## Major gaps to close for v2
1. Product scope gap
- `v1`: single optimization workflow
- `v2 target`: end-to-end logistics platform (plan, dispatch, execute, track, notify, analyze, admin, integrations)

2. Domain model gap
- `v1`: optimization-job centric model
- `v2 target`: rich operational entities (`Organization`, `Driver`, `Vehicle`, `Depot`, `Trip`, `RoutePlan`, `Dispatch`, `ExecutionEvent`, `Pod`) with multi-tenant ownership

3. Optimization capability gap
- `v1`: drivers/stops mapping with limited constraints
- `v2 target`: vehicles/jobs/shipments, skills, time windows, capacity, priorities, breaks, incremental replan, manual sequencing

4. Dispatch and execution gap
- `v1`: no dispatch workflow or driver state machine
- `v2 target`: assign route/stop flows + driver state transitions + POD + exception handling

5. Live operations gap
- `v1`: no GPS ingest or live ETA recalculation
- `v2 target`: tracking pipeline, route visibility, ETA recomputation, public tracking links

6. Business platform gap
- `v1`: limited operational reporting
- `v2 target`: notifications, KPI analytics, admin/settings, external integrations/webhooks/import

## V2 Delivery Strategy
- Keep v1 endpoints stable while introducing v2 verticals behind new modules and flags.
- Build from data foundation upward; avoid vertical work that bypasses shared domain contracts.
- Ship in slices with production acceptance criteria per phase.
- Enforce tenant isolation and auditable state transitions from the first phase.

## Release Cut (Decision)
- `v2` includes: Phase 0, Phase 1, Phase 2A, Phase 3A, and Phase 4.
- `v3` includes: Phase 2B, Phase 3B, Phase 5, Phase 6, Phase 7, Phase 8, and Phase 9.
- Rationale:
  - `v2` delivers a usable plan -> assign -> execute loop.
  - `v3` delivers optimization intelligence, live tracking/customer comms, and platform-scale admin/integrations.

## Split Phase Files
- [Phase 2A — Optimization MVP](/home/wyvern/Dev/deltafy/project-f/api/project-f-backend/feature-specs/v2/phases/phase-2a-optimization-mvp.md)
- [Phase 2B — Advanced Optimization](/home/wyvern/Dev/deltafy/project-f/api/project-f-backend/feature-specs/v2/phases/phase-2b-advanced-optimization.md)
- [Phase 3A — Dispatch MVP](/home/wyvern/Dev/deltafy/project-f/api/project-f-backend/feature-specs/v2/phases/phase-3a-dispatch-mvp.md)
- [Phase 3B — Dispatch Intelligence + Workflow](/home/wyvern/Dev/deltafy/project-f/api/project-f-backend/feature-specs/v2/phases/phase-3b-dispatch-intelligence-workflow.md)

## Proposed V2 Plan (Draft)

## Phase 0: Architecture and Contract Freeze (2-3 days)
### Scope
- Confirm bounded contexts/modules aligned with verticals:
  - `core-data`, `optimization`, `dispatch`, `execution`, `tracking`, `notifications`, `analytics`, `admin`, `integrations`
- Define API versioning strategy (`/v1` legacy + `/v2` capabilities).
- Define common ID/event conventions and status enum governance.

### Deliverables
- Module map + ownership matrix.
- Initial API surface draft for v2 critical paths.

### Exit criteria
- Stakeholder sign-off on module boundaries and versioning policy.

## Phase 1: Core Data Platform (Foundation) (1-2 sprints)
### Scope
- Add core entities and relations:
  - `Organization`, `User`, `Driver`, `Vehicle`, `Depot`, `Stop`, `Trip`, `TripStop`, `RoutePlan`, `RouteStop`, `Dispatch`, `ExecutionEvent`, `Pod`
- Implement multi-tenant ownership and query guards.
- Add status enums and audit logging for critical state changes.
- Provide CRUD + list/filter primitives for foundational entities.

### Deliverables
- Prisma schema/migrations for foundation entities.
- Repository/services enforcing tenant-safe access patterns.
- Audit event stream/table for critical updates.

### Exit criteria
- Tenant isolation proven via integration tests.
- Foundation data model supports planned downstream modules without schema redesign.

## Phase 2A: Optimization MVP (Plan Baseline) (1 sprint) — Target: v2
### Scope
- Implement core optimization endpoint:
  - `POST /plan/optimize`
- Support baseline constraints:
  - jobs, vehicles, service times, basic time windows
- Persist outputs to `RoutePlan` + ordered `RouteStop` + geometry + ETAs.
- Build daily `Trip` and ordered `TripStop` from optimized routes.

### Deliverables
- Baseline VROOM request builder and response mapper.
- Route/trip persistence path for initial planning.
- Happy-path and validation integration tests.

### Exit criteria
- End-to-end plan generation works for daily planning use cases.
- Generated plans are persisted and queryable for downstream dispatch.

## Phase 2B: Advanced Optimization (Plan Plus) (1 sprint) — Target: v3
### Scope
- Extend optimizer to advanced constraints:
  - shipments, skills, priorities, capacities, breaks
- Add incremental replan:
  - mid-day assignment support
  - virtual start from current GPS
  - completed stops locked
- Add manual sequencing endpoint to reorder stops + recompute ETA/geometry via OSRM.

### Deliverables
- Advanced constraint mapper extensions.
- Replan engine flows and manual resequencing APIs.
- Scenario tests for partial-day and constrained routing cases.

### Exit criteria
- Incremental replan is deterministic and preserves completed-stop invariants.
- Advanced constraints materially improve route feasibility and quality.

## Phase 3A: Dispatch MVP (Assign Baseline) (1 sprint) — Target: v2
### Scope
- Add dispatch endpoints:
  - `POST /dispatch/route`
  - `POST /dispatch/stop`
- Implement baseline assignment validation:
  - entity ownership and active-shift checks
- Trigger trip refresh on assignment using current planned route data.

### Deliverables
- Dispatch command handlers and guardrails.
- Assignment audit events and dispatcher-facing errors.

### Exit criteria
- Dispatchers can assign work to drivers/routes reliably.
- Assignments produce consistent downstream trip updates.

## Phase 3B: Dispatch Intelligence + Workflow (1 sprint) — Target: v3
### Scope
- Add advanced assignment rules:
  - compatibility, distance, capacity, shift windows
- Implement dispatch-triggered incremental replan + ETA recalculation.
- Introduce and enforce driver workflow state machine:
  - `idle -> enroute -> arrived -> completed -> failed`

### Deliverables
- Rule-based assignment scoring/validation.
- Replan trigger integration with optimization/tracking modules.
- Transition policy checks and workflow audit trails.

### Exit criteria
- Assignments are policy-driven and optimized, not just valid.
- Driver state transitions are strictly validated and auditable.

## Phase 4: Execution & Driver App Vertical (Execute) (1 sprint)
### Scope
- Add driver endpoints:
  - `GET /driver/trip/today`
  - `GET /driver/stops`
  - `POST /driver/stops/:id/status`
- Implement POD capture (photo, signature, notes).
- Implement exceptions: failed delivery, reschedule, return-to-depot.

### Deliverables
- Driver itinerary read model optimized for mobile latency.
- POD storage and metadata model.

### Exit criteria
- Driver can complete full stop lifecycle with POD and exception paths.

## Phase 5: Tracking & ETA Vertical (1 sprint)
### Scope
- Add GPS ingest:
  - `POST /tracking/locations` (batch)
- Add live route tracking endpoint:
  - `GET /tracking/route/:id`
- Implement ETA recomputation on GPS and stop-change events.
- Add tokenized public tracking links per stop.

### Deliverables
- Tracking ingestion pipeline + retention policy.
- ETA recomputation engine and cache strategy.

### Exit criteria
- Dispatch can see live progress and ETAs with bounded staleness.
- Public tracking links are secure and revocable.

## Phase 6: Notifications Vertical (0.5-1 sprint)
### Scope
- Event-driven notifications for key milestones:
  - enroute, arrived, delivered, failed
- Org-scoped template management.
- Channel abstraction for SMS/email/push.

### Deliverables
- Notification event handlers + template renderer.
- Delivery logging and retry policies.

### Exit criteria
- Notification flows are idempotent and tenant-customizable.

## Phase 7: Ops & Analytics Vertical (0.5-1 sprint)
### Scope
- KPI pipelines:
  - on-time rate, stop duration, drive time, idle time
- Route and driver performance reports.

### Deliverables
- Aggregation jobs/materialized views.
- Admin-facing analytics endpoints.

### Exit criteria
- KPI outputs are reproducible and match sampled operational records.

## Phase 8: Admin & Settings Vertical (0.5-1 sprint)
### Scope
- Org settings: timezone, holidays, SLA.
- Driver shifts/working hours.
- Vehicle capacities and skills catalog.
- RBAC (dispatcher/admin/driver).

### Deliverables
- Settings and policy enforcement services.
- RBAC middleware/guards and role matrix tests.

### Exit criteria
- Policy controls actively constrain planning, dispatch, and execution behavior.

## Phase 9: Integrations Vertical (0.5-1 sprint)
### Scope
- Webhooks for status updates.
- Import/export pathways (CSV/Sheets).
- External order ingestion.

### Deliverables
- Webhook subscriptions with signature verification.
- Batch import jobs with validation/error reports.

### Exit criteria
- External systems can reliably ingest and emit operational events.

## Cross-Cutting Workstreams (run in parallel)
1. Reliability and observability
- Structured logs, correlation IDs, queue depth metrics, replan latency metrics.

2. Security and compliance
- Tenant-scoped authorization checks on every read/write path.
- Sensitive data handling for POD assets and public tracking links.

3. Testing and release governance
- Contract tests per endpoint.
- Workflow integration tests across plan -> dispatch -> execute -> notify.
- Backward compatibility tests for v1 paths during migration.

## Milestone Acceptance Criteria
1. Foundational entities and tenant boundaries are production-safe.
2. Optimization supports advanced constraints and incremental replanning.
3. Dispatch and execution close the operational loop with audited state changes.
4. Tracking and notifications provide near-real-time visibility and customer comms.
5. Analytics/admin/integrations enable scale and ecosystem adoption.

## Key Risks and Mitigations
- Scope risk (large v2 surface):
  - Mitigation: vertical gates with strict exit criteria and feature flags.
- Data-model churn risk:
  - Mitigation: finalize foundation schema early, use additive migrations.
- Replan complexity risk:
  - Mitigation: isolate replan engine and lock completed-stop invariants with tests.
- Multi-tenant data leak risk:
  - Mitigation: centralized tenant guard patterns and query-level policy tests.

## Open Decisions for Review
1. API strategy: keep existing optimization endpoints indefinitely, or set formal deprecation timeline once v2 endpoints stabilize?
2. Replan triggering policy: synchronous on assignment, or asynchronous event-driven with SLA target?
3. POD storage target: DB metadata + object storage now, or phase object storage after MVP execution vertical?
