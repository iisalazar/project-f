# V1 UI Plan — Detailed Implementation

This is the detailed plan based on current backend endpoints.

## 1) Auth Flow
- Screen: Login
  - Inputs: `email`, `purpose` (login/signup), `otp`.
  - Actions:
    - `Send OTP` → `POST /auth/otp/send`.
    - `Verify OTP` → `POST /auth/otp/verify` (cookie set by server).
  - On success: call `GET /auth/me` and route to Jobs.
  - On error: surface message from backend.

## 2) Route Guards (UI)
- Any page under `/jobs` or `/jobs/:id` requires session.
- If `/auth/me` returns 403, redirect to `/login`.

## 3) Jobs List Screen
- Endpoint: `GET /optimization/jobs`
- Query params: `status`, `createdAtFrom`, `createdAtTo`, `page`, `pageSize`.
- Table columns: `id`, `status`, `createdAt`, `updatedAt`.
- Actions:
  - Open job detail
  - Create new job

## 4) Create Job Screen
- Endpoint: `POST /optimization/jobs`
- Inputs (v1 JSON-only):
  - Drivers: `id`, `name`, `startLocation`, `endLocation`, `availabilityWindow?`
  - Stops: `id`, `location`, `serviceSeconds?`
- Suggestion: provide a JSON editor with a sample payload.
- After submit: show job detail.

## 5) Job Detail Screen
- Endpoint: `GET /optimization/jobs/:jobId`
- Render:
  - Job status + timestamps
  - Raw result (collapsed JSON)
  - Route summary (per driver)
  - Stops list in order
  - Map polyline if `route.geometry` exists
  - Logs list (info/error)

## 6) Error Handling
- 400: validation error → show inline error
- 403: auth expired → redirect to login
- 404: job not found → show empty state

## 7) Non-Goals (v1)
- No CSV import
- No live tracking
- No manual drag-drop routing

## 8) Engineering Notes
- Keep API base URL in env config.
- Use `credentials: 'include'` for fetch to send cookies.
- Prefer server timestamps; format in UI.
