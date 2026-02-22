# Project F — Local Setup

This repo contains:
- Backend (NestJS) under `api/project-f-backend`
- UI (SvelteKit) under `api/project-f-ui`
- Infra (Pulumi for Localstack SQS) under `api/project-f-backend/infra`
- Docker Compose at repo root for OSRM/VROOM/Localstack/Postgres

## Prereqs
- Node.js 20+
- Docker + Docker Compose
- Pulumi CLI (for local SQS)

## 1) Start Infra (Docker)
From repo root:
```bash
docker compose up -d osrm vroom localstack postgres
```
Ports:
- VROOM: `http://localhost:3000`
- OSRM: `http://localhost:5000`
- Localstack: `http://localhost:4566`
- Postgres: `localhost:5433`

## 2) Setup SQS (Localstack + Pulumi)
```bash
cd api/project-f-backend/infra
npm install
pulumi login --local
pulumi stack init organization/dev
pulumi config set queueName optimize-job
pulumi up
```
Copy the `queueUrl` output into backend `.env`.

## 3) Backend Setup
```bash
cd api/project-f-backend
npm install
```
Create/update `.env` (example):
```
DATABASE_URL=postgresql://projectf:projectf@localhost:5433/projectf?schema=public
VROOM_URL=http://localhost:3000/
AWS_REGION=ap-southeast-1
SQS_ENDPOINT=http://localhost:4566
SQS_OPTIMIZE_QUEUE_URL=<pulumi queueUrl>
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test
PORT=4000
```
Run migrations:
```bash
npx prisma migrate dev --name init
npx prisma generate
```
Start backend:
```bash
npm run start:dev
```

## 4) UI Setup
```bash
cd api/project-f-ui
npm install
```
Set `.env`:
```
VITE_API_BASE_URL=http://localhost:4000
VITE_MAPBOX_TOKEN=<your_mapbox_token>
```
Start UI:
```bash
npm run dev
```

## 5) Test Flow (Quick)
1. Go to `http://localhost:5173/login`
2. Send OTP + verify (mock email service)
3. Create a job at `/jobs/new`
4. View job list + detail with map

## Troubleshooting
- CORS errors: confirm backend has `app.enableCors({ origin: 'http://localhost:5173', credentials: true })`.
- Queue not receiving: confirm `SQS_OPTIMIZE_QUEUE_URL` is set and Localstack is running.
- Map blank: confirm `VITE_MAPBOX_TOKEN` is set.
