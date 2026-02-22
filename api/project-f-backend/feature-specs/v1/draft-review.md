# Draft Review Notes (v1)

## High-Risk Gaps
- No retry policy for failed VROOM calls (acceptable for v1 if documented).

## Data Integrity Risks
- V1 ignores time windows and capacities; ensure these fields are stripped or normalized.
- Driver and stop uniqueness should be enforced at the normalized payload level.
- No explicit owner access control rules for logs or job details.

## Operational Gaps
- SQS queue name hardcoded. Define per-env naming or config.
- Max 2 workers must be enforced (app config or infra).
- No SLA on job processing time, or job timeout rules.

## Security Gaps
- Ensure AuthGuard protects all optimization endpoints and ownership is enforced.
- Potential PII in logs without retention policy.

## UX Gaps
- No progress indication beyond status.
- Error details are limited to `errorMessage` (acceptable for v1).

## Suggested Fixes (v1)
- Add `errorMessage` and `lastErrorAt` to `OptimizationJob`.
- Add `resultVersion` and `dataVersion`.
- Add a stable job status lifecycle definition (enqueued → processing → completed/failed).

## Test Coverage Gaps
- No tests specified for JSON validation.
- No tests specified for worker failure handling.
- No tests specified for auth access control.
