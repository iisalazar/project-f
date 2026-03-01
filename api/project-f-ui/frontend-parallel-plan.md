# Frontend Parallel Plan (Aligned to Backend v2/v3)

## Objective
Ship a production-ready dispatcher + driver web experience in parallel with backend phases, with clear API contracts, feature flags, and release safety.

## Source Alignment
- Backend master draft: `/api/project-f-backend/feature-specs/v2/draft.md`
- Split backend phases:
  - `/api/project-f-backend/feature-specs/v2/phases/phase-2a-optimization-mvp.md`
  - `/api/project-f-backend/feature-specs/v2/phases/phase-2b-advanced-optimization.md`
  - `/api/project-f-backend/feature-specs/v2/phases/phase-3a-dispatch-mvp.md`
  - `/api/project-f-backend/feature-specs/v2/phases/phase-3b-dispatch-intelligence-workflow.md`

## Release Cut (Frontend)
- `v2` frontend scope:
  - Foundation UX + auth/session hardening
  - Plan MVP UI (phase 2A)
  - Dispatch MVP UI (phase 3A)
  - Driver execution UI (phase 4)
- `v3` frontend scope:
  - Advanced planning UX (phase 2B)
  - Dispatch intelligence/workflow UX (phase 3B)
  - Live tracking, notifications center, analytics, admin/settings, integrations UI

## Principles
- Build around domain-first frontend modules (not page-only logic).
- Keep feature delivery API-driven with contract mocks from day 1.
- Use feature flags so unfinished v3 flows do not block v2 release.
- Enforce tenant-safe navigation and role-based route protection in UI.

## Frontend Workstreams (Run in Parallel)

## Stream A: Platform Foundation (starts immediately)
### Scope
- Frontend architecture cleanup for scale:
  - `src/lib/domain/*` (types, adapters, validators)
  - `src/lib/services/*` (API clients)
  - `src/lib/stores/*` (session, org, driver, trip)
- Shared shell:
  - app layout, navigation, loading and error boundaries
- Auth/session hardening:
  - token refresh handling, unauthorized redirects, role guards
- Observability:
  - client error tracking, request correlation ID pass-through

### Deliverables
- Stable app shell + route guard strategy
- Shared design tokens and component primitives
- API service layer with typed contracts

### Exit criteria
- New features can be added without duplicating page-level API logic.
- Unauthorized and cross-role access paths are blocked in UI.

## Stream B: Planning Experience (maps to backend 2A/2B)

### Phase FE-2A (Target: v2)
#### Scope
- Planning workspace for baseline optimization:
  - input forms for vehicles/jobs/service/time windows
  - plan run action and processing state
  - route result table + ordered stops + ETA summary
- Trip/day view generated from planned route

#### Deliverables
- `/plan` route and supporting components
- plan results visualization (list-first; map optional fallback)
- validation UX aligned with backend errors

#### Exit criteria
- Dispatcher can create and review a valid daily plan end-to-end.

### Phase FE-2B (Target: v3)
#### Scope
- Advanced constraints UI:
  - shipments, skills, priorities, capacities, breaks
- Incremental replan controls:
  - replan scope selector and completed-stop lock indicators
- Manual resequencing UI with ETA diff preview

#### Deliverables
- advanced planner panels and rules editor
- replan and resequence interaction flows

#### Exit criteria
- Dispatcher can safely run constrained replans with clear impact preview.

## Stream C: Dispatch Experience (maps to backend 3A/3B)

### Phase FE-3A (Target: v2)
#### Scope
- Assignment console:
  - assign route to driver
  - assign stop to driver
- Basic validation feedback (ownership/shift eligibility)
- Assignment activity log in UI

#### Deliverables
- `/dispatch` route with route/stop assignment workflows
- immediate assignment outcome state updates

#### Exit criteria
- Dispatcher can assign work without leaving UI and see assignment result immediately.

### Phase FE-3B (Target: v3)
#### Scope
- Intelligent assignment support:
  - rule visibility (compatibility/distance/capacity/shift)
  - recommendation/ranking display
- Driver workflow timeline and transition controls

#### Deliverables
- assignment decision panel with explainability
- workflow timeline widgets and transition actions

#### Exit criteria
- Dispatcher can choose assignments using rule-aware guidance and monitor lifecycle states.

## Stream D: Driver Execution UX (maps to backend phase 4, Target: v2)
### Scope
- Driver day views:
  - today itinerary
  - stop detail and status update actions
- POD capture flow:
  - photo/signature/notes UX hooks
- Exception handling UX:
  - failed delivery, reschedule, return-to-depot

### Deliverables
- `/driver/today` and `/driver/stops/*` routes
- optimistic updates with conflict recovery

### Exit criteria
- Driver can complete stop lifecycle with clear success/failure outcomes.

## Stream E: v3 Expansion Surfaces
### Scope
- Tracking UI: live route view, ETA refresh indicators, public tracking page
- Notifications center and template preview/testing UI
- Analytics dashboards for KPI trends
- Admin/settings screens (timezone, shifts, capacities, roles)
- Integrations UI (webhook setup, import jobs, status)

### Exit criteria
- All v3 platform surfaces are navigable, role-scoped, and operationally usable.

## Suggested Timeline (Frontend)
1. Sprint 1: Stream A foundation + FE-2A scaffolding
2. Sprint 2: FE-2A complete + FE-3A start
3. Sprint 3: FE-3A complete + Stream D execution flows (v2 hardening)
4. Sprint 4+: FE-2B and FE-3B, then Streams E features (v3)

## Dependencies and Handshakes
- Backend contract freeze required before each FE phase starts.
- OpenAPI/DTO examples required for generated typing.
- Shared status enums must be finalized to prevent UI state drift.
- Feature flags required for partial rollout and staged validation.

## QA and Acceptance
- Contract tests against mocked and real backend environments.
- E2E flows:
  - plan -> assign -> execute (v2)
  - constrained replan -> intelligent assign -> tracking (v3)
- Non-functional checks:
  - page load budget
  - error resilience for delayed/failed async jobs
  - mobile-responsive driver workflows

## Risks and Mitigations
- API churn risk:
  - Mitigation: typed API client adapters and compatibility mappers.
- State complexity risk:
  - Mitigation: central stores + explicit workflow state charts.
- Slow perceived performance risk:
  - Mitigation: skeleton states, incremental rendering, optimistic updates.
