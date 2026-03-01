# Phase 3A — Dispatch MVP (Assign Baseline)

Target release: `v2`
Estimated duration: `1 sprint`

## Scope
- Add dispatch endpoints:
  - `POST /dispatch/route`
  - `POST /dispatch/stop`
- Implement baseline assignment validation:
  - entity ownership and active-shift checks
- Trigger trip refresh on assignment using current planned route data.

## Deliverables
- Dispatch command handlers and guardrails.
- Assignment audit events and dispatcher-facing errors.

## Exit Criteria
- Dispatchers can assign work to drivers/routes reliably.
- Assignments produce consistent downstream trip updates.
