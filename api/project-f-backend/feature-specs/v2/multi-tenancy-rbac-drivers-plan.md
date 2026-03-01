# Multi-Tenancy + Org Roles + Driver Management + Optimization/Dispatch Integration Plan

Audience: AI coding agent
Primary goal: implement tenant-safe organization roles, onboarding flow, full driver CRUD, and integrate driver selection into planning + dispatch.

## 0) Current System Snapshot (Important)

### Current dispatch behavior
- Existing endpoints:
  - `POST /dispatch/route`
  - `POST /dispatch/stop`
- Current implementation writes directly to `Dispatch` and `ExecutionEvent` tables and returns `{ dispatchId, status: 'assigned' }`.
- It currently lacks full policy checks (role-based auth, strict tenant ownership, availability/shift validation, assignment heuristics).

### Existing optimization behavior
- Existing planning endpoints accept payloads directly and enqueue optimization jobs.
- Driver identity is currently payload-driven; not yet strongly bound to persistent tenant-scoped driver records.

## 1) Definition of Done

System supports:
1. Tenant-scoped auth context (active organization in session).
2. Role-based authorization (`org_admin`, `dispatcher`, `driver`, `viewer`).
3. Signup/login flow with onboarding to create organization (if none exists).
4. Driver CRUD APIs and UI (add/edit/delete/list/get) with tenant isolation.
5. Optimization and dispatch UI/API can select drivers from persisted org driver list.
6. Automated tests for role gates, tenant isolation, onboarding, driver CRUD, and driver-based dispatch/optimization flows.

## 2) Target Role Model

- `org_admin`
  - full organization settings, membership, drivers CRUD, plan + dispatch, analytics.
- `dispatcher`
  - plan + dispatch + drivers CRUD (optional delete permission configurable).
- `driver`
  - driver itinerary and stop status updates only.
- `viewer`
  - read-only views (no create/update/delete).

Default rules:
- Organization creator becomes `org_admin`.
- Every user action in business modules must resolve `activeOrganizationId` first.

## 3) Data and Session Contract

## 3.1 Required persistence
Ensure these (or equivalent) exist and are used as source-of-truth:
- `Organization`
- `OrganizationUserRole` (`organizationId`, `userId`, `role`, membership status)
- `Driver` (`organizationId`, profile fields, state)

## 3.2 Session/auth extension
Session must carry:
- `userId`
- `activeOrganizationId`

If a user belongs to zero orgs:
- allow auth success
- force onboarding flow before business endpoints

If multiple orgs:
- require explicit active-org selection endpoint/page

## 4) API Plan (Backend)

## 4.1 Auth + onboarding endpoints
1. `POST /auth/onboarding/create-organization`
- Input: `{ name, timezone? }`
- Action: create org + membership (`org_admin`) + set active org
- Output: `{ organizationId, role: 'org_admin' }`

2. `GET /auth/memberships`
- Output: org memberships for current user

3. `POST /auth/active-organization`
- Input: `{ organizationId }`
- Validate membership
- Set active org in session

4. Extend `GET /auth/me`
- Include active organization + role summary

## 4.2 Driver CRUD endpoints
1. `POST /drivers`
2. `GET /drivers` (filters: status, name, pagination)
3. `GET /drivers/:id`
4. `PATCH /drivers/:id`
5. `DELETE /drivers/:id` (soft-delete preferred)

Authorization:
- Create/update/delete: `org_admin`, `dispatcher`
- Read: all org roles

Validation:
- driver belongs to active org
- optional uniqueness rules per org (email/phone/externalRef)
- shift window validation

## 4.3 Optimization integration
Extend plan endpoint contracts with one supported mode:
- Mode A: existing VROOM payload (vehicles/jobs)
- Mode B: `driverIds[]` + stops/jobs, server expands drivers from DB

Minimum requirement:
- UI can choose drivers from org driver list
- server validates selected drivers belong to active org

## 4.4 Dispatch integration
`POST /dispatch/route` and `POST /dispatch/stop` must:
- validate chosen `driverId` belongs to active org
- validate caller role (`org_admin`/`dispatcher`)
- reject inactive/deleted driver

## 5) Authorization Architecture

Implement two guards:
1. `AuthGuard` (existing): identifies user
2. `OrganizationAccessGuard` (new): resolves active org, verifies membership

Implement role decorator + guard:
- `@Roles(...)`
- `RolesGuard` enforcing role membership for active org

All business controllers (`drivers`, `plan`, `dispatch`, `driver`) must be protected with org + role guard.

## 6) Frontend Plan (Pages + Components)

## 6.1 New pages
1. `/onboarding/organization`
2. `/select-organization` (only if user has >1 memberships)
3. `/drivers`
4. `/drivers/new`
5. `/drivers/[id]`
6. `/drivers/[id]/edit`

## 6.2 New components
- `OrganizationOnboardingForm`
- `OrganizationSwitcher`
- `DriverTable`
- `DriverForm`
- `DriverFilters`
- `RoleGate`

## 6.3 UX behavior
- After login:
  - if no memberships -> redirect to onboarding
  - if one membership -> set active org automatically
  - if many -> show org selection page
- Planning/dispatch forms load drivers from `GET /drivers`
- Replace manual driver-id typing with dropdown/searchable select

## 7) Concrete Build Sequence (For AI Agent)

## Phase 1: Tenant context + roles
1. Add/verify membership lookup service.
2. Add active-organization session support.
3. Add `OrganizationAccessGuard` and `RolesGuard`.
4. Protect existing optimization/dispatch/driver controllers with new guards.

Acceptance:
- Requests without active org fail with explicit error.
- Cross-org access attempts denied.

## Phase 2: Onboarding + org switching
1. Implement onboarding endpoints.
2. Implement memberships + active-org switch endpoints.
3. Extend `/auth/me` response.
4. Add frontend onboarding/switch pages and redirects.

Acceptance:
- First-time user can create org and continue into app.

## Phase 3: Driver CRUD backend
1. Implement driver service + controller + DTOs.
2. Add list filters + pagination.
3. Add soft delete behavior.
4. Enforce role + tenant checks.

Acceptance:
- CRUD works only within active organization.

## Phase 4: Driver CRUD frontend
1. Implement drivers list/detail/new/edit pages.
2. Implement reusable `DriverForm` and `DriverTable`.
3. Gate actions by role.

Acceptance:
- Admin/dispatcher can manage drivers end-to-end.

## Phase 5: Plan/dispatch integration with driver list
1. Add driver-list fetch in plan/dispatch pages.
2. Replace free-text ids with driver selection controls.
3. Update backend endpoints to enforce selected drivers are org-owned.

Acceptance:
- Plan and dispatch paths run with persisted drivers only.

## Phase 6: Hardening + tests
1. Add unit tests:
- role guard
- org access guard
- onboarding service
- driver service
- dispatch validation logic
2. Add integration/e2e tests:
- signup -> onboarding -> create driver -> plan -> dispatch
- cross-tenant negative tests

Acceptance:
- all tests pass; no cross-tenant leakage paths.

## 8) API/UI Contract Notes

- Prefer additive, backward-compatible API changes where possible.
- Keep legacy optimization endpoints operational while introducing tenant-scoped behavior.
- Emit clear errors:
  - `403` unauthorized role
  - `409` invalid state (no active organization)
  - `404` resource not in tenant scope

## 9) Risks + Mitigations

1. Risk: cross-tenant data leakage
- Mitigation: central tenant-scoped repository patterns + mandatory `organizationId` predicates.

2. Risk: role-policy drift across modules
- Mitigation: single role matrix and shared role guard tests.

3. Risk: onboarding edge cases lock users out
- Mitigation: deterministic redirect matrix based on memberships + active org state.

4. Risk: plan/dispatch regressions during driver integration
- Mitigation: support transitional compatibility mode and add contract tests.

## 10) Suggested Initial Task Breakdown for Agent Execution

1. Implement auth session active-org support + memberships endpoint.
2. Implement onboarding create-org endpoint and frontend onboarding page.
3. Implement driver CRUD API + unit tests.
4. Implement drivers UI pages/components.
5. Integrate driver selectors into `/plan` and `/dispatch`.
6. Add role/tenant negative tests and finalize docs.
