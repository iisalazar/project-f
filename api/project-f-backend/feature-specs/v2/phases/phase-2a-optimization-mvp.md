# Phase 2A — Optimization MVP (Plan Baseline)

Target release: `v2`
Estimated duration: `1 sprint`

## Scope
- Implement core optimization endpoint:
  - `POST /plan/optimize`
- Support baseline constraints:
  - jobs, vehicles, service times, basic time windows
- Persist outputs to `RoutePlan` + ordered `RouteStop` + geometry + ETAs.
- Build daily `Trip` and ordered `TripStop` from optimized routes.

## Deliverables
- Baseline VROOM request builder and response mapper.
- Route/trip persistence path for initial planning.
- Happy-path and validation integration tests.

## Exit Criteria
- End-to-end plan generation works for daily planning use cases.
- Generated plans are persisted and queryable for downstream dispatch.
