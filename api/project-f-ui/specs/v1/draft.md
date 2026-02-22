# V1 UI — OTP Login + Optimization Jobs

Goal: a minimal UI that lets a user authenticate and submit/view optimization jobs.

## Supported Backend Endpoints
Auth
- `POST /auth/otp/send`
- `POST /auth/otp/verify`
- `GET /auth/me`

Optimization (Auth required)
- `POST /optimization/jobs`
- `GET /optimization/jobs`
- `GET /optimization/jobs/:jobId`

## Core Screens
1) Login
- Email input
- Purpose toggle (login/signup)
- “Send OTP” action
- OTP input + “Verify” action
- On success: redirect to Jobs

2) Jobs List
- Table of jobs (id, status, createdAt)
- Filters: status, date range
- Pagination
- “New Optimization Job” button

3) Create Job
- JSON editor or form fields (drivers + stops)
- Submit → POST `/optimization/jobs`
- After submit: show job detail or return to list

4) Job Detail
- Job metadata: status, createdAt, updatedAt
- Render routes summary + stops per driver
- Map view with polyline if `geometry` exists
- Logs section (info/error)

## UI Constraints
- V1 is functional over pretty: focus on correctness and clarity.
- Prefer simple forms and tables over complex builders.
- Use server-provided validation errors.

## Client Behavior
- Use cookie-based session from `/auth/otp/verify`.
- All optimization requests require auth.
- Handle 403 by redirecting to Login.
