# Project F — v2 Lo-Fi Design Spec

**Author:** Lead Product Designer
**Target:** v2 implementation by senior full-stack engineer
**Design tokens:** `layout.css` (`--accent:#5ad2ff`, `--accent-2:#f2c94c`, `--danger:#ff6b6b`, `--success:#5dd39e`, `--bg:#0f1320`)
**Font:** Space Grotesk / Fira Mono
**Stack:** SvelteKit + NestJS + Mapbox GL

---

## Role Matrix

| Route              | org_admin | dispatcher | viewer | driver |
|--------------------|-----------|------------|--------|--------|
| /dashboard         | ✓         | ✓          | ✓      | -      |
| /drivers           | ✓         | ✓          | R      | -      |
| /plan              | ✓         | ✓          | -      | -      |
| /route-plans       | ✓         | ✓          | R      | -      |
| /dispatch          | ✓         | ✓          | -      | -      |
| /driver/workboard  | -         | -          | -      | ✓      |
| /driver/trips/:id  | -         | -          | -      | ✓      |

---

## Global Shell

```
┌─────────────────────────────────────────────────────────────┐
│  PROJECT F  ·  Ops Platform         [Acme Logistics ▾] [●]  │
│─────────────────────────────────────────────────────────────│
│  Dashboard  Drivers  Planning  Route Plans  Dispatch         │
│  (role-gated nav items, active item underlined in cyan)      │
└─────────────────────────────────────────────────────────────┘
```

- `[Acme Logistics ▾]` — org switcher dropdown, only shown if user has >1 org
- `[●]` — role badge (● org_admin / ● dispatcher / etc.) + logout
- Nav hidden on `/login`, `/onboarding/*`
- Driver role: nav replaced with just "Workboard"

---

## Screen 1 — Login  `/login`

```
┌─────────────────────────────────────────────────────────────┐
│               PROJECT F · Ops Platform                      │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Sign in to your account                            │   │
│  │                                                     │   │
│  │  Email                                              │   │
│  │  ┌─────────────────────────────────────────────┐   │   │
│  │  │  you@company.com                            │   │   │
│  │  └─────────────────────────────────────────────┘   │   │
│  │                                                     │   │
│  │  ┌────────────────┐  ┌────────────────┐            │   │
│  │  │  ● Log in      │  │  ○ Sign up     │            │   │
│  │  └────────────────┘  └────────────────┘            │   │
│  │                                                     │   │
│  │  [Send one-time code →]  (cyan primary button)      │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

**State 2 — OTP entry:**
```
│  Code sent to you@company.com                               │
│                                                             │
│  Enter 6-digit code                                         │
│  ┌──┐ ┌──┐ ┌──┐  ┌──┐ ┌──┐ ┌──┐  ← individual digit boxes │
│  │  │ │  │ │  │  │  │ │  │ │  │                            │
│  └──┘ └──┘ └──┘  └──┘ └──┘ └──┘                            │
│                                                             │
│  [Verify →]       Resend code (60s countdown)              │
```

**Annotations:**
- Purpose toggle (login/signup) shown as radio-style buttons
- Auto-focus first digit box; auto-advance on input; auto-submit on 6th digit
- Paste support: pasting "123456" fills all boxes
- Backspace from empty box → moves focus to previous box
- On verify → redirect based on role + onboarding state

---

## Screen 2 — Onboarding  `/onboarding/organization`

```
┌─────────────────────────────────────────────────────────────┐
│  Step 1 of 1 — Create your organization                     │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Organization name *                                │   │
│  │  ┌─────────────────────────────────────────────┐   │   │
│  │  │  Acme Logistics                             │   │   │
│  │  └─────────────────────────────────────────────┘   │   │
│  │                                                     │   │
│  │  Timezone                                           │   │
│  │  ┌─────────────────────────────────────────────┐   │   │
│  │  │  UTC                                        │   │   │
│  │  └─────────────────────────────────────────────┘   │   │
│  │  ← used for date-based planning cutoffs             │   │
│  │                                                     │   │
│  │  [Create organization →]                            │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

**Annotations:**
- Shown only when `needsOnboarding = true`
- On success → redirect to `/plan`

---

## Screen 3 — Dashboard  `/dashboard`

```
┌─────────────────────────────────────────────────────────────┐
│  Dashboard                  [← Prev]  Mon 15 Mar 2026  [Next→]│
│─────────────────────────────────────────────────────────────│
│                                                             │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐        │
│  │ Route Plans  │ │ Active Drivers│ │  Stops Done  │        │
│  │              │ │              │ │              │        │
│  │     4        │ │      9       │ │   87 / 124   │        │
│  │  (cyan)      │ │  (yellow)    │ │   (green)    │        │
│  └──────────────┘ └──────────────┘ └──────────────┘        │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Route Plans — 15 Mar 2026                          │   │
│  │                                                     │   │
│  │  Plan ID   Driver         Status       Date   Stops │   │
│  │  ─────────────────────────────────────────────────  │   │
│  │  #abc123   John Smith     ● in_progress  15 Mar  12 │   │
│  │  #def456   Maria Garcia   ● dispatched   15 Mar  9  │   │
│  │  #ghi789   —  Unassigned  ○ optimized    15 Mar  15 │   │
│  │                                                     │   │
│  │  (empty state: "No route plans for this date.")     │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

**Annotations:**
- Date nav: Prev/Next buttons change `selectedDate` by ±1 day and reload data
- KPI cards link to filtered list views
- Row click → `/route-plans/:id`
- KPI colours: route plans = `var(--accent)`, drivers = `var(--accent-2)`, stops = `var(--success)`

---

## Screen 4 — Drivers List  `/drivers`

```
┌─────────────────────────────────────────────────────────────┐
│  Drivers                                 [+ Add driver]      │
│─────────────────────────────────────────────────────────────│
│  Search: [──────────────────]  State: [All ▾]  [Apply]      │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Name            Email            State    Actions  │   │
│  │  ─────────────────────────────────────────────────  │   │
│  │  John Smith      j@co.com         ● idle   [Edit]   │   │
│  │  Maria Garcia    m@co.com         ● enroute [Edit]  │   │
│  │  Tom Lee         t@co.com         ● failed  [Edit]  │   │
│  │                                                     │   │
│  │  ← Prev  Page 1 of 3  Next →                       │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

**Status dot colours:** idle=cyan, enroute=yellow, arrived=yellow, completed=green, failed=red

**Annotations:**
- Entire row is clickable → `/drivers/:id`
- `[Edit]` button click → `/drivers/:id/edit` (stops row-click propagation)
- `[+ Add driver]` hidden for `viewer` role
- Shift column removed (was showing raw seconds — not useful)
- Pagination: 20 per page

---

## Screen 5 — Driver Detail  `/drivers/:id`

```
┌─────────────────────────────────────────────────────────────┐
│  ← Drivers / John Smith                      [Edit driver]  │
│─────────────────────────────────────────────────────────────│
│                                                             │
│  ┌──────────────────────────┐  ┌──────────────────────────┐ │
│  │  Profile                 │  │  Start Location          │ │
│  │                          │  │                          │ │
│  │  Name   John Smith       │  │  151.2093, -33.8688      │ │
│  │  Email  j@acme.com       │  │  (lon, lat — monospace)  │ │
│  │  Phone  +61 4xx xxx xxx  │  └──────────────────────────┘ │
│  │  State  ● idle           │                              │
│  │                          │  ┌──────────────────────────┐ │
│  └──────────────────────────┘  │  End Location            │ │
│                                │                          │ │
│                                │  151.2055, -33.8721      │ │
│                                └──────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

**Annotations:**
- Breadcrumb: `← Drivers / {name}`
- Location shown as `lon, lat` in monospace (not raw JSON)
- Two-column layout: profile left, locations right

---

## Screen 6 — Driver Create / Edit  `/drivers/new` & `/drivers/:id/edit`

```
┌─────────────────────────────────────────────────────────────┐
│  ← Drivers / New driver                                     │
│─────────────────────────────────────────────────────────────│
│  Name *  [──────────────┐  Email *  [─────────────────]     │
│  Phone   [──────────────┐  State    [idle            ▾]     │
│                                                             │
│  Start location                                             │
│  [INTERACTIVE MAP — click to drop pin]                      │
│  Lon [──────────────]  Lat [──────────────]                 │
│                                                             │
│  End location  (same map layout)                            │
│                                                             │
│  [Save driver]    [Cancel]                                  │
│  ─────────────────────────────────────────                  │
│  Danger zone      [Delete driver]  (red, edit only)         │
└─────────────────────────────────────────────────────────────┘
```

---

## Screen 7 — Planning Workspace  `/plan`

```
┌─────────────────────────────────────────────────────────────┐
│  Planning Workspace                                          │
│─────────────────────────────────────────────────────────────│
│  Plan date  [2026-03-15 ▾]                                  │
│  Drivers    [John S.] [Maria G.] [Tom L.]  (toggle chips)   │
│             Selected in cyan, unselected muted               │
│                                                             │
│  [ Table ]  [ JSON ]  (mode toggle)                         │
│  ID | Lon | Lat | Service | [Map] | [Remove]                │
│  + Add row                              [✕ Clear]           │
│                                                             │
│  [▶ Run optimization]  ← disabled until date+driver+job     │
│                                                             │
│  ─────── Status ──────────────────────────────             │
│  ● Queued → ● Processing → ● Done  (auto-updates, no button)│
│  Route plan created: #abc123  [View route plan →]           │
└─────────────────────────────────────────────────────────────┘
```

**Annotations:**
- Driver chips: active = cyan border; click to toggle; load from org drivers list
- Status row: auto-polls every 2s; no manual refresh button; shows animated step progress
- `[▶ Run optimization]` becomes loading state on submit

---

## Screen 8 — Route Plans List  `/route-plans`

```
┌─────────────────────────────────────────────────────────────┐
│  Route Plans                          [← Prev] [Next →]     │
│─────────────────────────────────────────────────────────────│
│  Date: [2026-03-15 ▾]  Status: [All ▾]  Driver: [All ▾]    │
│                                                             │
│  Plan ID   Driver         Status        Date   Stops        │
│  ────────────────────────────────────────────────────────   │
│  #abc123   John Smith     ● dispatched   15 Mar  12         │
│  #def456   Maria Garcia   ● in_progress  15 Mar  9          │
│  #ghi789   —  Unassigned  ○ optimized    15 Mar  15         │
└─────────────────────────────────────────────────────────────┘
```

**Status colours:** draft=grey, optimized=cyan, dispatched=yellow, in_progress=yellow, completed=green, failed=red

---

## Screen 9 — Route Plan Detail  `/route-plans/:id`

```
┌─────────────────────────────────────────────────────────────┐
│  ← Route Plans / Plan #abc123                               │
│─────────────────────────────────────────────────────────────│
│  ┌──────────────────────┐  ┌──────────────────────────────┐ │
│  │  Status ● dispatched │  │  Assign driver               │ │
│  │  Date   15 Mar 2026  │  │  Driver [John Smith        ▾]│ │
│  │  Stops  12           │  │  Vehicle ID (optional) [──]  │ │
│  └──────────────────────┘  │  [Assign →]                  │ │
│                            └──────────────────────────────┘ │
│  Trips table: ID | Driver Name | Status | Date              │
│  Stops table: # | Stop ID | ETA | Distance (km) | Duration  │
│                                                             │
│  ┌── Route Map ──────────────────────────────────────────┐  │
│  │  [MAPBOX — numbered stop pins + cyan polyline route]  │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

**Annotations:**
- Breadcrumb: `← Route Plans / Plan #abc123`
- Trips table shows driver **name** (not UUID)
- Distance formatted as "1.2 km"; duration as "8 min"
- Map rendered from `routePlan.geometry` field (polyline or GeoJSON)
- "Assign driver" card only shown for org_admin/dispatcher

---

## Screen 10 — Dispatch Console  `/dispatch`

```
┌─────────────────────────────────────────────────────────────┐
│  Dispatch                                                    │
│─────────────────────────────────────────────────────────────│
│  ┌── Dispatch route ─────────────────────────────────────┐  │
│  │  Route plan  [#abc123 — 15 Mar (optimized)          ▾]│  │
│  │  Driver      [John Smith                            ▾]│  │
│  │  [Dispatch route →]                                   │  │
│  │  ✓ Route dispatched successfully  ← inline feedback   │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌── Dispatch stop ──────────────────────────────────────┐  │
│  │  Stop ID  [────────────────────────]                  │  │
│  │  Driver   [Maria Garcia           ▾]                  │  │
│  │  [Dispatch stop →]                                    │  │
│  │  ✕ Error: ...  ← inline feedback per-form             │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

**Annotations:**
- Route plan dropdown label: `#shortId — planDate (status)` (not raw UUID)
- Success/error feedback inside each card (not shared at bottom)

---

## Screen 11 — Driver Workboard  `/driver/workboard`

```
┌─────────────────────────────────────────────────────────────┐
│  My Workboard                              [● driver]        │
│─────────────────────────────────────────────────────────────│
│  ◀  Mon 13  Tue 14  [Wed 15]  Thu 16  Fri 17  ▶             │
│  (selected date underlined in cyan)                         │
│                                                             │
│  [ Today ] [ Past 14d ] [ Next 14d ]   ← tab bar           │
│                                                             │
│  Trip           Date      Status      Stops                 │
│  trip_abc123    15 Mar    ● active     12 stops             │
│  (empty: "No trips assigned for this day")                  │
└─────────────────────────────────────────────────────────────┘
```

**Annotations:** Mobile-first. Large touch targets. Date strip = 5-day sliding window.

---

## Screen 12 — Driver Trip Detail  `/driver/trips/:tripId`

```
┌─────────────────────────────────────────────────────────────┐
│  ← Workboard / Trip #abc123                                 │
│─────────────────────────────────────────────────────────────│
│  Date 15 Mar    Status ● active    Done 8 / 12              │
│                                                             │
│  ┌── Current stop: #3 ─────────────────────────────────┐   │
│  │  ETA  10:05                                         │   │
│  │  [Mark arrived]    [Mark complete]    [Report issue] │   │
│  │  (large buttons, min 48px touch target)             │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ✓  1  Stop A   09:30  ✓ completed    (row dimmed)         │
│  ✓  2  Stop B   09:45  ✓ completed    (row dimmed)         │
│  →  3  Stop C   10:05  ● active       [context action only] │
│     4  Stop D   10:30  ○ pending                           │
└─────────────────────────────────────────────────────────────┘
```

**State transitions per stop:**
- `pending/enroute` → [Mark arrived] → `arrived`
- `arrived` → [Mark complete] → `completed`
- any → [Report issue] → `failed`

**Annotations:**
- "Current stop" panel = first non-completed, non-failed stop
- Completed rows: `opacity: 0.45`
- Active stop (→) auto-scrolled into view
- Per-row action in table: only the **next valid** action shown (not all 4)
- Mobile-first; sticky bottom CTAs in current-stop panel

---

## Navigation & Transition Map

```
/login
  ├── needsOnboarding=true → /onboarding/organization → /plan
  ├── role=driver          → /driver/workboard
  └── else                 → /dashboard

/dashboard → all dispatcher views via nav
/plan [submit] → poll → /route-plans/:id
/route-plans → row click → /route-plans/:id
/drivers → row click → /drivers/:id
/driver/workboard → row click → /driver/trips/:tripId
```

---

## Component Reuse

| Component               | File                                    | Used on          |
|-------------------------|-----------------------------------------|------------------|
| `MapPointPicker.svelte` | `lib/components/MapPointPicker.svelte`  | Screens 6, 7     |
| `apiFetch<T>`           | `lib/api.ts`                            | All API calls    |
| layout.css design tokens| `lib/assets/layout.css`                 | All screens      |
| Mapbox GL + polyline    | `jobs/[jobId]/+page.svelte` (pattern)   | Screens 9        |

---

## Responsive Notes

| Screen          | Priority     |
|-----------------|--------------|
| Driver workboard| Mobile-first |
| Driver trip     | Mobile-first |
| Driver form     | Desktop-first|
| Planning        | Desktop-first|
| Route plan detail| Desktop-first|
| Dashboard/lists | Both         |
