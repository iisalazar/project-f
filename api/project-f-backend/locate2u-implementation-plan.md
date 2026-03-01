# Locate2u Implementation Plan

Based on `locate2u-plan.md` and current implementation status.

## Phase 0: Stabilize Current MVP (Week 1)
- Scope: lock current plan/dispatch/driver flows and close known defects.
- Deliverables:
  - fix open bugs
  - add regression tests for assign-driver
  - add regression tests for driver login mapping
  - add regression tests for stop status updates
  - add regression tests for route-plan visibility by role
- Acceptance criteria:
  - green CI for core tests
  - no blocking bugs in plan -> dispatch -> driver execution flow

## Phase 1: Core CRUD Completion (Weeks 2-3)
- Scope: implement missing admin APIs for `Vehicle`, `Depot`, `Stop/Job`.
- Deliverables:
  - CRUD + list filters + tenant isolation + RBAC for each entity
- Acceptance criteria:
  - dispatcher/admin can fully manage vehicles/depots/stops in one org
  - cross-tenant access blocked

## Phase 2: Tracking & ETA Vertical (Weeks 4-5)
- Scope: real-time tracking and ETA recompute.
- Deliverables:
  - `POST /tracking/locations` (batch ingest)
  - `GET /tracking/route/:id`
  - ETA recompute service triggered by GPS and stop changes
- Acceptance criteria:
  - dispatch UI can fetch latest route position and refreshed ETAs for active trips

## Phase 3: Execution Enhancements (Weeks 6-7)
- Scope: POD + exceptions workflow.
- Deliverables:
  - POD endpoints (photo URL, signature URL, notes)
  - exception APIs for failed delivery/reschedule/return-to-depot
- Acceptance criteria:
  - driver can complete stop with POD
  - failed stop can be rescheduled and reflected in trip status/events

## Phase 4: Dispatch Intelligence (Weeks 8-9)
- Scope: assignment rules and smarter dispatch.
- Deliverables:
  - rule engine checks for compatibility, shift windows, capacity, distance
  - validation in `/dispatch/route` and `/dispatch/stop`
- Acceptance criteria:
  - invalid assignments are rejected with explicit reason
  - valid assignment writes structured decision events

## Phase 5: Advanced Optimization (Weeks 10-11)
- Scope: close ODL gaps.
- Deliverables:
  - support shipments/pickup-delivery pairing/skills/priorities/breaks in optimization payload
  - manual stop reorder API with recompute
  - incremental replan for mid-day assignments
- Acceptance criteria:
  - optimization accepts advanced constraints
  - updated plan/trip artifacts persist correctly

## Phase 6: Notifications Vertical (Week 12)
- Scope: event-driven customer comms.
- Deliverables:
  - template CRUD per org
  - notification worker
  - triggers for enroute/arrived/delivered/failed
- Acceptance criteria:
  - status transitions emit notifications using org templates
  - delivery status is persisted

## Phase 7: Integrations Vertical (Weeks 13-14)
- Scope: ecosystem connectivity.
- Deliverables:
  - webhook subscription CRUD + signed delivery
  - CSV import/export endpoints
  - external order ingestion endpoint
- Acceptance criteria:
  - third-party systems can ingest status updates via webhooks
  - bulk stop import works with validation report

## Phase 8: Ops & Analytics (Weeks 15-16)
- Scope: KPI and reporting.
- Deliverables:
  - KPI aggregation jobs
  - report endpoints for on-time rate/stop duration/drive time/idle time
  - driver scorecards
- Acceptance criteria:
  - dashboard APIs return org-scoped KPIs for date ranges with consistent definitions

## Cross-Phase Quality Gates
- Scope: required for every phase.
- Deliverables:
  - OpenAPI updates
  - RBAC tests
  - tenant-isolation tests
  - e2e happy-path and negative-path scenarios
  - migration rollback notes
- Acceptance criteria:
  - no phase closes without API contract docs
  - test coverage for auth + tenant + role
  - production runbook update

## Recommended Immediate Next Sprint
1. Phase 0 + Phase 1 together (stability + missing core CRUD).
2. Start Phase 2 backend contracts in parallel once Phase 1 API shape is frozen.
