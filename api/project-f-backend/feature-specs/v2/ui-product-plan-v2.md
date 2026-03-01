# UI Product Plan v2 — Organization Onboarding, Driver Management, Planning, Dispatch, Driver Workboard

Owner perspective: senior frontend execution plan with backend contract review.
Audience: implementation AI agent + engineering reviewers.

## 1. Product Goals

As a platform user, I must be able to:
1. Join/login to the platform.
2. Create my organization during onboarding.
3. Add/edit/delete drivers.
4. Create optimization jobs by selecting drivers from my org and submitting jobs to optimize.
5. Set a planned date for the optimization workload.
6. Generate route plans and persist them (driver assignment for a day).

As a driver, I must be able to:
1. Login to the platform.
2. See jobs assigned to me by day:
- today
- past
- future

## 2. Current State Review (API + UI)

## 2.1 Existing APIs
- Auth:
  - `POST /auth/otp/send`
  - `POST /auth/otp/verify`
  - `GET /auth/me`
  - `GET /auth/memberships`
  - `POST /auth/onboarding/create-organization`
  - `POST /auth/active-organization`
- Drivers CRUD:
  - `POST /drivers`
  - `GET /drivers`
  - `GET /drivers/:id`
  - `PATCH /drivers/:id`
  - `DELETE /drivers/:id`
- Planning/optimization:
  - `POST /plan/optimize`
  - `POST /v1/optimizations`
  - `GET /v1/optimizations/:jobId`
  - `GET /v1/optimizations/:jobId/solution`
- Dispatch:
  - `POST /dispatch/route`
  - `POST /dispatch/stop`
- Driver execution:
  - `GET /driver/trip/today`
  - `GET /driver/stops`
  - `POST /driver/stops/:id/status`

## 2.2 Existing UI
- Login + onboarding page.
- Drivers CRUD pages.
- Plan page and Dispatch page.
- Driver today page.

## 2.3 Gaps against desired product behavior
1. Planning date support is missing in API contract and UI flow.
2. RoutePlan persistence is implicit; no dedicated list/detail endpoints to inspect route plans by date.
3. Driver view is limited to "today" only; no date filter/history/future schedule endpoints.
4. Dispatch and planning UX are still low-guidance and not strongly tied to a daily workboard.
5. No role-tailored navigation and page-level guard UX polish.

## 3. Required API Improvements (New or Enhanced)

## 3.1 Must-add planning contracts
1. Enhance `POST /plan/optimize`
- Add `planDate` (ISO date, org timezone aware).
- Add `selectedDriverIds[]` as first-class field.
- Keep compatibility with explicit `vehicles` payload.

2. Add route plan retrieval APIs
- `GET /route-plans?date=YYYY-MM-DD&status=&driverId=`
- `GET /route-plans/:id`
- `GET /route-plans/:id/stops`

3. Add assignment APIs for day-based workflow
- `POST /route-plans/:id/assign-driver`
- Optionally keep existing `/dispatch/*` and map internally.

## 3.2 Must-add driver workboard contracts
1. `GET /driver/trips?date=YYYY-MM-DD` (driver scoped)
2. `GET /driver/trips/range?from=YYYY-MM-DD&to=YYYY-MM-DD`
3. `GET /driver/trips/:tripId/stops`

Notes:
- Current `GET /driver/trip/today` and `GET /driver/stops` can remain as shorthand.

## 3.3 Nice-to-have improvements
1. `GET /jobs?date=` filter and job-to-route linkage.
2. Status timeline endpoint for plan -> dispatch -> execution lifecycle.

## 4. UX Architecture (New IA)

## 4.1 Information architecture
- Public/Auth:
  - `/login`
  - `/onboarding/organization`
- Dispatcher/Admin:
  - `/dashboard`
  - `/drivers`
  - `/planning` (create optimization jobs + date + driver selection)
  - `/route-plans`
  - `/dispatch`
- Driver:
  - `/driver/workboard` (day selector + today/past/future tabs)
  - `/driver/trips/:tripId`

## 4.2 Role-aware nav behavior
- `org_admin` / `dispatcher` see management + planning + dispatch modules.
- `driver` sees only workboard/execution views.
- `viewer` sees read-only plan/route views.

## 5. Frontend Delivery Plan

## Phase FE-1: Auth + onboarding polish
Scope:
- finalize login->onboarding->app routing matrix.
- add organization switcher UI in header when memberships > 1.

Deliverables:
- deterministic redirect logic based on `/auth/me.auth`.
- organization context badge and switch action.

## Phase FE-2: Driver management experience
Scope:
- improve list with pagination/filter chips and state badges.
- upgrade create/edit forms with map-based location pickers only.
- add empty/error/success states.

Deliverables:
- robust `/drivers` module usable by dispatcher/admin.

## Phase FE-3: Planning workspace (date + drivers + jobs)
Scope:
- dedicated planning form sections:
  - plan date picker
  - driver selector (multi-select from org drivers)
  - jobs input (table + import JSON)
- submit to `POST /plan/optimize` with explicit plan date.
- poll job status and surface route-plan creation result.

Deliverables:
- production-quality planning page with clear state transitions.

## Phase FE-4: Route plan board + dispatch UX
Scope:
- route plans list by date and status.
- route plan detail with assigned driver, ordered stops, ETA summary.
- driver assignment controls for selected date.

Deliverables:
- `/route-plans` and `/route-plans/:id` with dispatch hooks.

## Phase FE-5: Driver workboard (today/past/future)
Scope:
- calendar/day selector.
- tabs: Today / Past / Future.
- trip list + trip detail stop progression and status updates.

Deliverables:
- `/driver/workboard` and `/driver/trips/:tripId`.

## 6. API-to-UI Mapping Matrix

1. Join/login + onboarding
- UI: login + onboarding pages
- API: existing auth endpoints (mostly sufficient)
- Improvement: include `activeOrganizationName` in `/auth/me` for reduced client joins

2. Driver CRUD
- UI: `/drivers` module
- API: existing CRUD endpoints are sufficient for MVP
- Improvement: add server-side sort options and soft-deleted audit view (optional)

3. Plan optimize with date + selected drivers
- UI: planning workspace
- API: needs enhanced `POST /plan/optimize` contract with `planDate` + driver IDs

4. Persisted route plans and day assignment views
- UI: route-plan list/detail pages
- API: needs `GET /route-plans*` set

5. Driver assigned jobs by date (today/past/future)
- UI: workboard
- API: needs date/range trip endpoints beyond current `today` shorthand

## 7. Automated Testing Plan

## 7.1 Unit tests (frontend)
- `auth routing guard` utility tests
- `organization context` store tests
- `drivers-api` and `planning-api` client tests
- form-state transformation tests (drivers + jobs -> optimize payload)

## 7.2 Component tests
- Onboarding form submission and validation.
- Driver form map-picker interactions.
- Planning page date + driver selection behavior.
- Driver workboard date tab transitions.

## 7.3 Integration tests (frontend + mocked API)
- login -> onboarding -> create org -> land on planning
- create driver -> edit driver -> delete driver
- create plan for date with selected drivers -> see processing/completed state
- driver login -> see today, past, future assigned trips

## 7.4 E2E tests (real backend)
- Scenario A (dispatcher):
  - signup/login, org create, add drivers, create dated plan, assign driver, verify route plan exists
- Scenario B (driver):
  - login, open workboard, filter day, open trip, update stop status

## 7.5 Non-functional UI checks
- accessibility smoke checks (focus order, label-control association, keyboard navigation)
- responsive checks for driver workflow on mobile widths
- loading/retry states for async operations

## 8. Implementation Order Recommendation

1. API contract updates for plan date + route plans + driver trip range (backend first).
2. FE-1 onboarding polish and org switcher.
3. FE-2 drivers module hardening.
4. FE-3 planning workspace with date + selected drivers.
5. FE-4 route plan board and dispatch assignment UX.
6. FE-5 driver workboard today/past/future.
7. automated test expansion (component + integration + e2e).

## 9. Risks and Mitigations

1. API drift risk during UI implementation
- Mitigation: freeze OpenAPI examples before FE-3.

2. Timezone/date correctness risk
- Mitigation: server authoritative date parsing per org timezone; UI always sends ISO date.

3. Role leakage risk
- Mitigation: route-level guard + backend guard, both tested.

4. Workflow complexity risk
- Mitigation: deliver in vertical slices with acceptance criteria per phase.

## 10. Acceptance Criteria (User-Facing)

1. New user can signup/login and create org in one uninterrupted flow.
2. Org admin/dispatcher can fully manage drivers (add/edit/delete/list/get).
3. Dispatcher can create dated optimization jobs by selecting drivers from org list.
4. Route plans are visible and explorable by day.
5. Driver can view assigned work for today, past days, and future days.
