# MVP / Version 1 of the Platform

Goal: deliver a minimal route-optimization product with upload → optimize → view results.

## Scope
- Users can log in.
- Users can submit optimization requests via JSON API.
- Requests are validated and optimized asynchronously.
- Users can view optimization jobs by status.
- Users can view details for a completed optimization (routes + map).

## Core Entities
OptimizationJob
- id uuid
- ownerUserId uuid FK to User.id
- version string (e.g., "v1")
- status enum: `enqueued | processing | completed | failed`
- data JSON (raw normalized request)
- dataVersion string (e.g., "v1")
- result JSON (VROOM response or simplified result)
- resultVersion string (e.g., "v1")
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

## Validation Rules (v1)
- Lon/lat are numeric and in valid ranges.
- Drivers and stops must be non-empty.
- Driver ids and stop ids must be unique.
- Default service time if missing.
- Ignore time windows and capacities in v1.
- Default driver availability: 08:00–17:00 local time if not provided.

## Workflow
1. User submits JSON to `POST /optimization/jobs`.
2. API validates and normalizes to `OptimizationJobData`.
3. Create `OptimizationJob` record (status: `enqueued`).
4. Enqueue `jobId` to SQS queue `optimize-job` (standard queue).
5. Worker dequeues `jobId`.
6. Worker loads job and sets status `processing`.
7. Worker validates job data again (defense in depth).
8. Worker calls VROOM, stores result in `OptimizationJob.result`.
9. Worker sets status `completed`.
10. On error, status `failed`, set `errorMessage` and `lastErrorAt`.
11. Each step writes `OptimizationJobLog` entries.
12. Enforce max 2 worker processes/threads for v1.

## Endpoints
POST /optimization/jobs
Request (normalized JSON)
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
- `201` with `{ jobId }`
- `400` for validation errors

GET /optimization/jobs
- Returns paginated list of jobs.
- Supports filters: `status`, `createdAt` range, `ownerUserId` (admin only).
- Default order: `createdAt desc`.
- Requires AuthGuard; only returns jobs owned by the authenticated user.

GET /optimization/jobs/:jobId
- Returns full job (data + result + logs summary).
- `404` if not found or not owned by user.
- Requires AuthGuard; only returns job owned by the authenticated user.

## Data Types
```ts
export interface OptimizationJobData {
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
}

export interface OptimizationJobResult {
  routes: {
    driverId: string;
    stops: {
      id: string;
      location: [number, number];
      arrivalEtaSeconds?: number;
    }[];
    totalDistanceMeters?: number;
    totalDurationSeconds?: number;
  }[];
}
```

## VROOM Mapping (v1)
- drivers → vehicles
- stops → jobs
- serviceSeconds → job.service
- availabilityWindow → vehicle.time_window (default 08:00–17:00 if missing)
- geometry enabled via `options.g = true`

## VROOM Call Reliability (v1)
- Use `polly-js` to retry VROOM API calls with exponential backoff.
- Retry only on transient failures (network errors, 5xx).
- Policy: 3 attempts, exponential backoff with base 1000ms.

## UI (v1)
- Job list page: status, createdAt, count of drivers/stops.
- Job detail page: route list and map polyline.

## Non-Goals (v1)
- Live driver tracking.
- Manual route editing.
- Notifications.
- Multi-day scheduling.

## Status Lifecycle (v1)
- `enqueued` → `processing` → `completed` or `failed`
- `failed` is terminal for v1 (no retries).
