# Route Optimization Platform — AI Agent Bootstrapping Plan (Single NestJS App, Feature-First)

This document instructs an AI coding agent to bootstrap a self-hosted route optimization backend using:

* **NestJS** (single app that exposes HTTP API **and** runs the SQS worker)
* **Postgres** (Prisma)
* **AWS SQS** (LocalStack in dev)
* **VROOM + OSRM** (Docker Compose)

The codebase must be organized by **vertical slices / features**, not by layers.

---

## Goal (Definition of Done)

A repo that boots locally and supports:

1. `POST /v1/optimizations` → creates job in Postgres + enqueues SQS message
2. Background SQS consumer processes job → calls VROOM (which uses OSRM) → stores result in Postgres
3. `GET /v1/optimizations/:id` → status
4. `GET /v1/optimizations/:id/solution` → solution JSON
5. Includes idempotency + DLQ config + minimal tests

Everything runs via:

```bash
docker compose up
npm install
npm run dev
```

> If you prefer pnpm, you can switch, but default instructions should use **npm** for simplicity.

---

## Agent Constraints (Hard Rules)

* Use **one NestJS application** (no separate api/worker apps)
* The NestJS app must run:

  * HTTP controllers
  * SQS publisher
  * SQS consumer (worker) polling in background
* Use **Postgres** as the only database
* Use **SQS** for job orchestration (LocalStack locally)
* Use **VROOM + OSRM** via Docker Compose
* SQS messages must contain only `{ jobId }` (payload stored in Postgres)
* Worker must be **idempotent** (duplicate SQS deliveries safe)
* Organize code by **features/vertical slices**, not layers

---

## Repo Layout (Single Service + Feature-First)

```
routeopt/
  src/
    main.ts
    app.module.ts

    modules/
      optimization/
        optimization.module.ts
        controllers/
          create-optimization.controller.ts
          get-optimization.controller.ts
          get-optimization-solution.controller.ts
        services/
          create-optimization.service.ts
          solve-optimization.service.ts
          get-optimization.service.ts
        queues/
          optimization.publisher.ts
          optimization.consumer.ts
        persistence/
          optimization.repository.ts
        dto/
          create-optimization.dto.ts
        mappers/
          vroom.mapper.ts

      routing/
        routing.module.ts
        services/
          osrm.service.ts

    infra/
      database/
        prisma.service.ts
      queue/
        sqs.service.ts
      http/
        http.service.ts

  prisma/
  infra/
    docker/
      osrm/
      vroom/
    localstack/

  docker-compose.yml
  README.md
  .env.example
```

---

## Phase 0 — Initialize Project

Tasks:

1. Initialize Node project (npm)
2. Create a single NestJS app under `src/`
3. Add feature modules:

   * `modules/optimization`
   * `modules/routing`
4. Add shared infra providers:

   * Prisma provider in `infra/database`
   * SQS client in `infra/queue`
   * HTTP client wrapper in `infra/http`
5. Add ESLint + Prettier
6. Add env handling using `@nestjs/config`

**Deliverable:** app starts and compiles.

---

## Phase 1 — Infrastructure (Docker Compose)

Create `docker-compose.yml` with services:

* `postgres`
* `localstack` (SQS)
* `osrm`
* `vroom`
* `nestjs` (your app)

OSRM requires preprocessing.

Add scripts in `infra/docker/osrm/`:

* `download_map.sh` (placeholder; document where to get PBF)
* `build_osrm.sh` that runs:

```bash
osrm-extract
osrm-partition
osrm-customize
```

**Deliverable:** `docker compose up` starts infra; OSRM starts after preprocessing.

---

## Phase 2 — Database Schema (Prisma)

### Tables

**OptimizationJob**

* `id` UUID PK
* `status` enum: `queued | running | succeeded | failed`
* `attempts` INT default 0
* `error` JSONB nullable
* `createdAt`, `updatedAt`

**OptimizationInput**

* `jobId` UUID PK/FK
* `payload` JSONB (canonical request)
* `payloadHash` TEXT (optional; for dedupe)

**OptimizationResult**

* `jobId` UUID PK/FK
* `solution` JSONB
* `metrics` JSONB
* `createdAt`

### Constraints

* `OptimizationResult.jobId` UNIQUE/PK (prevents duplicate solutions)
* `OptimizationInput.jobId` UNIQUE/PK

**Deliverable:** `npx prisma migrate dev` works.

---

## Phase 3 — Optimization Feature (HTTP + Queue Publisher)

All optimization functionality must live under `src/modules/optimization`.

### HTTP Endpoints

#### POST /v1/optimizations

Accept a VROOM-native payload (keep v1 close to VROOM to move fast):

```json
{
  "vehicles": [{ "id": 1, "start": [121.0437, 14.6760], "end": [121.0437, 14.6760] }],
  "jobs": [{ "id": 101, "location": [121.0509, 14.5547], "service": 300 }]
}
```

Flow:

1. Validate body (DTO + validation)
2. Insert `OptimizationJob` + `OptimizationInput`
3. Publish SQS message `{ jobId }`
4. Return `{ jobId }`

#### GET /v1/optimizations/:jobId

Return:

* status
* attempts
* timestamps
* error

#### GET /v1/optimizations/:jobId/solution

Return solution JSON if available; else 404/409.

### Queue Publisher (in-feature)

Implement `queues/optimization.publisher.ts` using the shared `SqsService`.

Env vars:

* `SQS_ENDPOINT` (LocalStack)
* `SQS_QUEUE_URL_OPTIMIZE`
* `AWS_REGION`
* dummy credentials for LocalStack

**Deliverable:** creating an optimization enqueues a job.

---

## Phase 4 — Optimization Consumer (Worker Inside Same App)

The worker must run **inside the same NestJS application process**.

Place SQS polling logic in:

* `src/modules/optimization/queues/optimization.consumer.ts`

### Consumer behavior

1. Long-poll SQS (20s)
2. For each message:

   * parse `jobId`
   * load job + payload via repository
   * if job is `succeeded` → delete message (idempotent)
   * mark job `running` + attempts++
   * call VROOM
   * persist `OptimizationResult` (unique by jobId)
   * mark job `succeeded`
   * delete message

### Startup

Consumer starts polling on module init (`OnModuleInit`) or app bootstrap.

### Error handling

On failure:

* store error JSON on job
* do NOT delete message
* allow retry → DLQ after max receives

**Deliverable:** background processing works while HTTP API is running.

---

## Phase 5 — OSRM + VROOM Smoke Test

Add script:

```bash
scripts/seed-and-run.sh
```

Steps:

1. Create job via API
2. Poll status until succeeded
3. Fetch solution
4. Print summary metrics

Add curl examples:

* `curl/create-job.json`
* `curl/create-job.sh`

**Deliverable:** one command demonstrates full end-to-end completion.

---

## Phase 6 — Production Basics (Minimal)

Add:

* structured logging
* request IDs
* health endpoints

  * `/health` includes DB + SQS connectivity
* unit tests

  * create optimization flow
  * worker idempotency (duplicate message)
* `.env.example`

**Deliverable:** stable dev setup + basic confidence.

---

## LocalStack SQS Provisioning

Create:

```
infra/localstack/create-queues.sh
```

Queues:

* `routeopt.optimize.request`
* `routeopt.optimize.dlq`

Set redrive policy:

* `maxReceiveCount = 5`

Add npm script:

```json
{
  "scripts": {
    "infra:sqs": "bash infra/localstack/create-queues.sh"
  }
}
```

---

## VROOM Payload Contract (v1)

```ts
type VroomPayload = {
  vehicles: {
    id: number
    start: [number, number] // [lon, lat]
    end?: [number, number]
  }[]
  jobs: {
    id: number
    location: [number, number] // [lon, lat]
    service?: number
  }[]
}
```

---

## README Requirements

README must include:

* prerequisites
* OSRM preprocessing steps
* docker compose boot
* how to provision SQS queues in LocalStack
* API usage
* troubleshooting:

  * coordinate order [lon, lat]
  * OSRM dataset not built
  * LocalStack creds/endpoint

---

## AI Agent Execution Prompt

```
You are an autonomous coding agent. Create a project named routeopt implementing a self-hosted route optimization backend.

Stack:
- Single NestJS app (HTTP API + SQS consumer worker in the same process)
- Postgres (Prisma)
- SQS for job queue (LocalStack in dev)
- VROOM + OSRM via Docker Compose

Code organization rules:
- Organize by vertical slices / features.
- Place HTTP controllers, queue publisher/consumer, services, repositories, and mappers inside the feature folder.
- Avoid layer-first folder structures.

Requirements:
1) docker-compose.yml must run: postgres, localstack, vroom, osrm
2) Optimization feature under src/modules/optimization must include:
   - POST /v1/optimizations: validate VROOM-native payload, store OptimizationJob + OptimizationInput, enqueue SQS message {jobId}
   - GET /v1/optimizations/:jobId: job status
   - GET /v1/optimizations/:jobId/solution: return solution JSON
   - SQS publisher in-feature
   - SQS consumer in-feature that long-polls and processes jobs idempotently
3) Worker behavior:
   - if job already succeeded, delete SQS message and exit
   - mark job running, call VROOM (HTTP), store OptimizationResult, mark job succeeded
   - on error: persist error; do NOT delete message; retries + DLQ supported
4) Provide scripts to create SQS queues in LocalStack including DLQ + redrive policy.
5) Provide README with full local setup including OSRM preprocessing commands.

Deliverables:
- working NestJS app with feature-first structure
- Prisma migrations
- infra scripts for LocalStack queues
- sample curl request + seed script demonstrating end-to-end job completion
```