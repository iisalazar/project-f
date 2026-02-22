# Project F

Route optimization + dispatch prototype built on **VROOM + OSRM** with a lightweight OTP-authenticated UI.

## What’s inside
- **Backend**: NestJS (`api/project-f-backend`)
- **UI**: SvelteKit (`api/project-f-ui`)
- **Infra**: Docker Compose + Pulumi (Localstack SQS)

## Quick Start
See `SETUP.md` for full setup.

## Key Features (v1)
- OTP login (cookie-based session)
- Create optimization jobs (JSON payload)
- Async processing via SQS
- View job status + result
- Map view with driver route selection

## Useful URLs
- UI: `http://localhost:5173`
- API: `http://localhost:4000`
- Swagger: `http://localhost:4000/docs`
- VROOM: `http://localhost:3000`
- OSRM: `http://localhost:5000`

## Contributing
- Keep changes scoped to a single vertical slice where possible.
- Update specs in `api/project-f-backend/feature-specs/v1/` or `api/project-f-ui/specs/v1/` when behavior changes.

## License
UNLICENSED
