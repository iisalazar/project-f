# Project F — v2 Full Implementation Plan

## Context
The existing UI works but has poor UX compared to the lo-fi design spec (`ui-lo-fi-design.md`). This plan: (1) aligns every existing page to the lo-fi spec, (2) adds the missing Dashboard page and backend endpoint, (3) specifies unit tests for backend and frontend.

---

## UX Gap Analysis

| Screen | Existing issue | Lo-fi target |
|--------|---------------|--------------|
| Layout nav | Duplicate Login button (line 50); no Dashboard link; verbose role badge | Remove dup; add Dashboard; concise role dot |
| Drivers list | "Shift" column raw seconds; plain state text; 3 buttons per row; no row-click | Remove Shift; coloured dot; [Edit] only; row → detail |
| Driver detail | `JSON.stringify()` for location; no breadcrumb | `lon, lat` text; breadcrumb; two-col layout |
| Driver trip detail | All 4 action buttons every row regardless of state; no current-stop panel | Context-aware actions; "Current stop" panel |
| Route plan detail | Driver UUID shown; raw meters/seconds; no map | Driver name; km/min; Mapbox route map |
| Dispatch | Shared status/error; UUID-only labels | Per-form feedback; friendly labels |
| Root `/` | Redirects to `/plan` | Redirect to `/dashboard` |
| `/dashboard` | Does not exist | KPI cards + plans table + date nav |
| Login | Single OTP text input | 6 digit boxes with auto-advance |
| Planning `/plan` | Manual refresh button | Auto-poll every 2s |
| Onboarding | Redirects to `/drivers` after creation | Redirect to `/plan` |

---

## No Schema Changes
All Prisma models (`RoutePlan`, `Trip`, `TripStop`, `Driver`) exist in the database. No migrations needed.

---

## Part A — Backend: New DashboardModule

### Endpoint
`GET /dashboard/summary?date=YYYY-MM-DD`

Guards: `AuthGuard`, `OrganizationAccessGuard`, `RolesGuard`
Roles: `org_admin`, `dispatcher`, `viewer`
Default date: today (ISO)

### Response
```json
{
  "date": "2026-03-15",
  "routePlans": { "total": 4, "inProgress": 2, "completed": 1 },
  "drivers": { "active": 9 },
  "stops": { "done": 87, "total": 124 }
}
```

### Files to Create
- `src/dashboard/dashboard.module.ts` — mirrors `AnalyticsModule` structure
- `src/dashboard/dashboard.controller.ts` — `@Controller('dashboard')`, `@Get('summary')`
- `src/dashboard/dashboard.service.ts` — two `$queryRaw` queries in `Promise.all`
  - Query 1: `RoutePlan` grouped by status for date + org
  - Query 2: `Trip` + `TripStop` join for active drivers + stop counts
  - Uses `assertDate()` helper (same pattern as `AnalyticsService`)
  - Converts `bigint` to `Number()` before returning
- `src/dashboard/dashboard.service.spec.ts` — Jest unit tests (see Part D)

### File to Modify
- `src/app.module.ts` — import and register `DashboardModule` after `AnalyticsModule`

---

## Part B — Frontend: New Files

### B1 — `src/lib/services/operations-api.ts`
Add `getDashboardSummary(date: string)` function calling `GET /dashboard/summary?date=...`

### B2 — `src/routes/dashboard/+page.svelte` (new)
- Auth guard on mount (same pattern as other pages)
- `selectedDate` state (default today)
- `$effect` to reload on date change
- `prevDay()` / `nextDay()` date navigation
- KPI cards grid (3 cards)
- Route plans table (reuse `listRoutePlans(date)`)
- Empty state: "No route plans for this date."

---

## Part C — Frontend: UX Improvements

### C1 — `src/routes/+layout.svelte`
- Remove unconditional duplicate Login button (line 50)
- Add `<a href="/dashboard">Dashboard</a>` as first nav item for org_admin/dispatcher/viewer
- Update role badge format to `● {role}` (remove "Role:" prefix)

### C2 — `src/routes/+page.svelte`
- Change `goto('/plan')` → `goto('/dashboard')`

### C3 — `src/routes/login/+page.svelte`
- Replace single OTP `<input>` with 6 individual digit inputs
- Auto-advance on digit entry; Backspace retreats; paste fills all 6; auto-submit on 6th
- Change post-verify redirect from `/plan` → `/dashboard`

### C4 — `src/routes/onboarding/organization/+page.svelte`
- Change `goto('/drivers')` → `goto('/plan')` after org creation
- Change the onboarding-complete guard from `goto('/plan')` → `goto('/dashboard')`

### C5 — `src/routes/drivers/+page.svelte`
- Remove "Shift" column
- State cell: `<span class="status {driver.state}">● {driver.state}</span>`
- Row clickable → `/drivers/:id` (`onclick` on `<tr>`)
- Replace [View][Edit][Delete] with single [Edit] (stops propagation)
- Add pagination: `page` (1), `pageSize` (20); prev/next buttons below table

### C6 — `src/routes/drivers/[id]/+page.svelte`
- Add breadcrumb: `← Drivers / {driver.name}`
- Location: `${driver.startLocation[0]}, ${driver.startLocation[1]}` in monospace
- Two-column layout: profile card (left) + location cards stacked (right)

### C7 — `src/routes/driver/trips/[tripId]/+page.svelte`
- Add summary header card: status + done/total count
- Add "Current stop" focused panel (first non-completed/non-failed stop)
  - Shows only valid next action: `pending/enroute → [Mark arrived]`; `arrived → [Mark complete]`; always `[Report issue]`
  - Min 48px button height
- Per-row in table: show only context-appropriate action (not all 4 buttons)
- Completed rows: `opacity: 0.45`; active stop row marked with `→`

### C8 — `src/routes/route-plans/[id]/+page.svelte`
- Add breadcrumb: `← Route Plans / Plan #${routePlanId.slice(0,8)}`
- Trips table: show `drivers.find(d => d.id === trip.driverId)?.name` instead of raw UUID
- Stops table: `(meters/1000).toFixed(1) km`; `Math.round(seconds/60) min`
- Add Mapbox route map after Stops section (reuse pattern from `/jobs/[jobId]/+page.svelte`)
  - Handle geometry as polyline string, GeoJSON LineString, or VROOM routes array
  - Cyan polyline layer; numbered markers; `fitBounds`

### C9 — `src/routes/dispatch/+page.svelte`
- Split shared `status`/`error` into `routeStatus`/`routeError` + `stopStatus`/`stopError`
- Move feedback inside each respective card
- Route plan option label: `#${id.slice(0,8)} — ${planDate} (${status})`

### C10 — `src/routes/plan/+page.svelte`
- Add `startPolling()`/`stopPolling()` with `setInterval(2000)`
- Call `startPolling()` after `jobId` is set in `submitPlan()`
- Stop polling when status = `completed` or `failed`
- `onDestroy(stopPolling)` for cleanup
- Replace "Refresh Status" button with 3-step progress indicator:
  `● Queued → ● Processing → ● Done`

---

## Part D — Unit Tests

### D1 — Backend: `src/dashboard/dashboard.service.spec.ts`

```
describe('DashboardService')
  ✓ returns correct counts when data exists
  ✓ returns zeros when no data exists
  ✓ throws BadRequestException for invalid date format (e.g. '15-03-2026', 'not-a-date')
  ✓ handles empty activityRows gracefully (defaults active/stops to 0)
```

Pattern: mock `PrismaService.$queryRaw` with `jest.fn()`, use `mockResolvedValueOnce` for each query.

### D2 — Frontend: `src/routes/login/login-otp.test.ts`

```
describe('OTP digit box behaviour')
  ✓ advances focus to next box after digit entry
  ✓ moves focus back on Backspace from empty box
  ✓ distributes pasted 6-char string across all boxes
  ✓ derived otp is empty string when all boxes are empty
  ✓ ignores non-numeric input
```

Use `@testing-library/svelte` + `vitest`.

### D3 — Frontend: `src/routes/dashboard/dashboard.test.ts`

```
describe('Dashboard page')
  ✓ renders 3 KPI cards with mock API values
  ✓ increments date by 1 day on Next click
  ✓ decrements date by 1 day on Prev click
  ✓ shows empty-state when no route plans
  ✓ redirects to /login if getMe() throws
```

### D4 — Frontend: `src/routes/plan/plan-poll.test.ts`

```
describe('Plan page auto-polling')
  ✓ starts polling (setInterval 2000ms) after plan submission
  ✓ clears interval when status becomes 'completed'
  ✓ clears interval on component destroy (unmount)
```

Use `vi.useFakeTimers()` + `vi.spyOn(global, 'setInterval')`.

---

## Implementation Order

| # | Task | Files | Requires |
|---|------|-------|---------|
| 1 | DashboardModule | 4 backend files + app.module.ts | — |
| 2 | Layout nav fixes + root redirect | +layout.svelte, +page.svelte | — |
| 3 | Onboarding redirect | onboarding/organization/+page.svelte | — |
| 4 | Drivers list UX | drivers/+page.svelte | — |
| 5 | Driver detail UX | drivers/[id]/+page.svelte | — |
| 6 | Driver trip detail UX | driver/trips/[tripId]/+page.svelte | — |
| 7 | Route plan detail UX + map | route-plans/[id]/+page.svelte | — |
| 8 | Dispatch feedback | dispatch/+page.svelte | — |
| 9 | Login OTP digit boxes | login/+page.svelte | — |
| 10 | Planning auto-poll | plan/+page.svelte | — |
| 11 | Dashboard service fn | operations-api.ts | #1 |
| 12 | Dashboard page | routes/dashboard/+page.svelte | #11 |
| 13 | Backend unit tests | dashboard.service.spec.ts | #1 |
| 14 | Frontend unit tests | *.test.ts | #9, #10, #12 |

---

## New Files Summary

**Backend:**
- `src/dashboard/dashboard.module.ts`
- `src/dashboard/dashboard.controller.ts`
- `src/dashboard/dashboard.service.ts`
- `src/dashboard/dashboard.service.spec.ts`

**Frontend:**
- `src/routes/dashboard/+page.svelte`
- `src/routes/dashboard/dashboard.test.ts`
- `src/routes/login/login-otp.test.ts`
- `src/routes/plan/plan-poll.test.ts`

**Docs:**
- `feature-specs/v2/ui-lo-fi-design.md`
- `feature-specs/v2/implementation-plan-v2.md` (this file)

## Modified Files Summary

**Backend:** `src/app.module.ts`

**Frontend:**
- `src/lib/services/operations-api.ts`
- `src/routes/+layout.svelte`
- `src/routes/+page.svelte`
- `src/routes/login/+page.svelte`
- `src/routes/onboarding/organization/+page.svelte`
- `src/routes/drivers/+page.svelte`
- `src/routes/drivers/[id]/+page.svelte`
- `src/routes/driver/trips/[tripId]/+page.svelte`
- `src/routes/route-plans/[id]/+page.svelte`
- `src/routes/dispatch/+page.svelte`
- `src/routes/plan/+page.svelte`
