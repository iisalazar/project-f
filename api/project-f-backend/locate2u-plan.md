# Locate2u-Style Platform Plan (VROOM + OSRM)

This plan is split by verticals/features and ordered by dependency.

## 1) Core Data Platform (Foundation)
- Entities: `Organization`, `User`, `Driver`, `Vehicle`, `Stop/Job`, `RoutePlan`, `RouteStop`, `Dispatch`, `ExecutionEvent`, `Pod`.
- Relationships and ownership rules (multi-tenant).
- Status enums (job lifecycle, driver state, route status).
- Audit/logging for critical updates (assignments, status changes).
- API primitives (CRUD + list filters).
- Rationale: everything else depends on this data model.

## 2) ODL / Optimization Vertical (Plan)
- VROOM request builder:
  - Vehicles, jobs, shipments, skills, time windows, service, priorities.
- Optimization API:
  - `POST /plan/optimize` returns route plan + ordered stops.
- Persist plan result:
  - RoutePlan + RouteStop order + geometry + ETAs.
- Manual sequencing:
  - API to reorder stops and recompute ETA/geometry via OSRM.
- Constraints/heuristics:
  - capacity, skills, pickup-delivery pairing, driver breaks.
- Rationale: core competitive logic (ODL layer).

## 3) Dispatch Vertical (Assign)
- Assign driver/vehicle to route or stops.
- Dispatch actions:
  - `POST /dispatch/route`, `POST /dispatch/stop`.
- Driver workflow state machine:
  - `idle → enroute → arrived → completed → failed`.
- Assignment rules:
  - compatibility, distance, capacity, shift windows.
- Rationale: bridges plan → execution.

## 4) Execution & Driver App Vertical (Execute)
- Driver itinerary endpoints:
  - `GET /driver/route/today`, `GET /driver/stops`.
- Status updates:
  - `POST /driver/stops/:id/status`.
- POD capture:
  - photo upload, signature, notes.
- Exception handling:
  - failed delivery, reschedule, return-to-depot.
- Rationale: operational completion loop.

## 5) Tracking & ETA Vertical
- GPS ingest:
  - `POST /tracking/locations` (batch).
- Live tracking:
  - `GET /tracking/route/:id` for dispatch UI.
- ETA recompute:
  - OSRM route update with live driver position.
- Public tracking links:
  - tokenized URL per stop.
- Rationale: customer experience + ops visibility.

## 6) Notifications Vertical
- SMS/email/push pipeline.
- Event-driven notifications:
  - “driver enroute”, “arrived”, “delivered”, “failed”.
- Template management per org.
- Rationale: customer comms.

## 7) Ops & Analytics Vertical
- KPIs:
  - on-time rate, stop duration, drive time, idle time.
- Route performance reports.
- Driver performance scorecards.
- Rationale: admin value + business reporting.

## 8) Admin & Settings Vertical
- Org settings (timezone, holidays, SLA).
- Driver shifts and working hours.
- Vehicle capacities, skills catalog.
- Role-based access control (dispatcher vs admin vs driver).
- Rationale: configurability and scale.

## 9) Integrations Vertical
- Webhooks for status updates.
- Import/export (CSV/Sheets).
- External order ingestion.
- Rationale: adoption in real ops.

## Suggested Build Order
1. Core Data Platform
2. Optimization (Plan)
3. Dispatch
4. Execution (Driver)
5. Tracking & ETA
6. Notifications
7. Analytics
8. Admin/Settings
9. Integrations
