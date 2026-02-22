# V1 Optimization Platform — Final Plan (AI Agent)

This is the implementation plan for the v1 JSON‑only optimization flow.

## Goals
- Authenticated users submit JSON optimization requests.
- Jobs are processed asynchronously via SQS.
- Users can list and view only their own jobs.
- VROOM is called with retry policy (polly‑js).

## Core Decisions
- JSON only (no CSV parsing).
- Standard SQS queue, max 2 workers.
- Ignore time windows/capacities in v1.
- Default availability window: 08:00–17:00 local time if not provided.
- Retry VROOM calls: 3 attempts, exponential backoff with base 1000ms.

## Data Model
OptimizationJob
- id uuid
- ownerUserId uuid FK to User.id
- version string ("v1")
- status enum: `enqueued | processing | completed | failed`
- data JSON
- dataVersion string ("v1")
- result JSON
- resultVersion string ("v1")
- errorMessage string nullable
- lastErrorAt timestamp nullable
- createdAt
- updatedAt

OptimizationJobLog
- id uuid
- optimizationJobId uuid FK to OptimizationJob.id
- type enum: `info | error`
- message string
- data JSON nullable
- createdAt

## Status Lifecycle
- `enqueued` → `processing` → `completed` or `failed`
- `failed` is terminal for v1

## Auth & Access
- All optimization endpoints require AuthGuard (`api/project-f-backend/src/auth/guards/auth.guard.ts`).
- Users can only see their own jobs.

## API
POST /optimization/jobs
Request
```ts
export type CreateOptimizationJobRequest = {
  drivers: {
    id: string;
    name: string;
    startLocation: [number, number];
    endLocation: [number, number];
    availabilityWindow?: [number, number];
  }[];
  stops: {
    id: string;
    location: [number, number];
    serviceSeconds?: number;
  }[];
};
```
Response
- `201 { jobId }`
- `400` for validation errors

GET /optimization/jobs
- Pagination
- Filters: `status`, `createdAt` range
- Default order: `createdAt desc`
- Auth required; only own jobs

GET /optimization/jobs/:jobId
- Returns job + result + log summary
- `404` if not found or not owned
- Auth required

## Validation Rules (v1)
- Lon/lat are numeric and in valid ranges.
- Drivers and stops must be non-empty.
- Driver ids and stop ids are unique.
- Default `serviceSeconds` if missing.
- Ignore time windows/capacities.
- Default availability window to 08:00–17:00 if missing.

## Worker Flow (SQS)
1. Dequeue `jobId` from `optimize-job`.
2. Load job by id and set status to `processing`.
3. Validate job data.
4. Build VROOM request:
   - drivers → vehicles
   - stops → jobs
   - serviceSeconds → job.service
   - availabilityWindow → vehicle.time_window
   - options.g = true
5. Call VROOM with polly‑js retry policy.
6. Save `OptimizationJob.result` and set status `completed`.
7. On error, set status `failed`, set `errorMessage`, `lastErrorAt`.
8. Write logs for each step.

## VROOM Retry Policy (polly‑js)
- Attempts: 3
- Backoff: exponential with base 1000ms
- Retry only on network errors and 5xx

## UI (v1)
- Job list page: status, createdAt, counts of drivers/stops.
- Job detail page: routes + map polyline.

## Implementation Steps
1. Create OptimizationJob + OptimizationJobLog tables (Prisma).
2. Add optimization module (CQRS):
   - `CreateOptimizationJobHandler`
   - `ListOptimizationJobsHandler`
   - `GetOptimizationJobHandler`
3. Add endpoints + AuthGuard.
4. Add SQS worker (max 2 workers).
5. Add VROOM client with polly‑js retry.
6. Persist result + logs.
7. Add Swagger examples for requests.
