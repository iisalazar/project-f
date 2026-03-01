# Phase 2B — Advanced Optimization (Plan Plus)

Target release: `v3`
Estimated duration: `1 sprint`

## Scope
- Extend optimizer to advanced constraints:
  - shipments, skills, priorities, capacities, breaks
- Add incremental replan:
  - mid-day assignment support
  - virtual start from current GPS
  - completed stops locked
- Add manual sequencing endpoint to reorder stops + recompute ETA/geometry via OSRM.

## Deliverables
- Advanced constraint mapper extensions.
- Replan engine flows and manual resequencing APIs.
- Scenario tests for partial-day and constrained routing cases.

## Exit Criteria
- Incremental replan is deterministic and preserves completed-stop invariants.
- Advanced constraints materially improve route feasibility and quality.
