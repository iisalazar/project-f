# Phase 3B — Dispatch Intelligence + Workflow

Target release: `v3`
Estimated duration: `1 sprint`

## Scope
- Add advanced assignment rules:
  - compatibility, distance, capacity, shift windows
- Implement dispatch-triggered incremental replan + ETA recalculation.
- Introduce and enforce driver workflow state machine:
  - `idle -> enroute -> arrived -> completed -> failed`

## Deliverables
- Rule-based assignment scoring/validation.
- Replan trigger integration with optimization/tracking modules.
- Transition policy checks and workflow audit trails.

## Exit Criteria
- Assignments are policy-driven and optimized, not just valid.
- Driver state transitions are strictly validated and auditable.
