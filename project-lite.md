# Route Optimization Local Dev Plan (Infra in Docker Compose, NestJS on Host)

Goal: run **OSRM + VROOM + LocalStack** via Docker Compose (infra-only), while running your **NestJS API on your host machine** (outside Compose) and letting it communicate with these services over `localhost`.

---

## What runs where

### Docker Compose (infra)

* **OSRM**: routing + matrix
* **VROOM**: optimization (calls OSRM internally)
* **LocalStack**: AWS emulation (SQS for now)

### Host machine (your dev environment)

* **NestJS** API (started with `npm run start:dev`)

---

## Endpoints you will use from NestJS

Because ports are exposed by Docker Compose, your NestJS app can reach these via `localhost`:

* VROOM: `http://localhost:3000`
* OSRM: `http://localhost:5000`
* LocalStack edge: `http://localhost:4566`

---

## Folder layout

```
routeopt-lite/
  docker-compose.yml
  maps/                 # input .osm.pbf
  data/
    osrm/               # generated OSRM dataset files
    localstack/         # LocalStack state
  api/                  # your NestJS project (runs on host)
```

---

## Step 1 — One-time OSRM preprocessing

1. Put an OSM PBF file in `./maps/` (start small if possible).

Example:

* `maps/philippines-latest.osm.pbf`

2. Generate OSRM dataset output into `./data/osrm/`.

```bash
mkdir -p data/osrm maps

# Extract
docker run --rm -t \
  -v "$PWD/maps:/maps" -v "$PWD/data/osrm:/data" \
  ghcr.io/project-osrm/osrm-backend:latest \
  osrm-extract -p /opt/car.lua /maps/philippines-latest.osm.pbf -o /data/map.osrm

# Partition + customize (MLD)
docker run --rm -t -v "$PWD/data/osrm:/data" ghcr.io/project-osrm/osrm-backend:latest \
  osrm-partition /data/map.osrm

docker run --rm -t -v "$PWD/data/osrm:/data" ghcr.io/project-osrm/osrm-backend:latest \
  osrm-customize /data/map.osrm
```

Result: `data/osrm/map.osrm` and many `map.osrm.*` files.

---

## Step 2 — Docker Compose (infra only)

Create `docker-compose.yml`:

```yaml
services:
  osrm:
    image: ghcr.io/project-osrm/osrm-backend:latest
    container_name: osrm
    ports:
      - "5000:5000"
    volumes:
      - ./data/osrm:/data
    command: >
      osrm-routed --algorithm mld /data/map.osrm

  vroom:
    image: vroomvrp/vroom-docker:latest
    container_name: vroom
    ports:
      - "3000:3000"
    environment:
      - VROOM_ROUTER=osrm
      - OSRM_HOST=osrm
      - OSRM_PORT=5000
    depends_on:
      - osrm

  localstack:
    image: localstack/localstack:latest
    container_name: localstack
    ports:
      - "4566:4566"
    environment:
      - SERVICES=sqs
      - DEFAULT_REGION=ap-southeast-1
      - EDGE_PORT=4566
    volumes:
      - ./data/localstack:/var/lib/localstack
      - /var/run/docker.sock:/var/run/docker.sock
```

Start infra:

```bash
docker compose up
```

---

## Step 3 — Smoke test infra (no NestJS yet)

### OSRM route

```bash
curl "http://localhost:5000/route/v1/driving/121.0437,14.6760;121.0509,14.5547?overview=false"
```

### VROOM solve

```bash
curl -X POST "http://localhost:3000/" \
  -H "Content-Type: application/json" \
  -d '{
    "vehicles":[{"id":1,"start":[121.0437,14.6760],"end":[121.0437,14.6760]}],
    "jobs":[
      {"id":101,"location":[121.0509,14.5547],"service":300},
      {"id":102,"location":[121.0600,14.5600],"service":300}
    ]
  }'
```

---

## Step 4 — Run NestJS on the host (outside Compose)

From `./api`:

```bash
npm install
npm run start:dev
```

NestJS will communicate with the infra via `localhost`.

---

## Step 5 — Configure NestJS environment variables

Create `api/.env.local` (or `.env`):

```dotenv
VROOM_URL=http://localhost:3000
OSRM_URL=http://localhost:5000

AWS_REGION=ap-southeast-1
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test
SQS_ENDPOINT=http://localhost:4566
```

In NestJS:

* VROOM calls should use `process.env.VROOM_URL`
* OSRM calls should use `process.env.OSRM_URL`
* AWS SDK SQS client should use `endpoint: process.env.SQS_ENDPOINT`

---

## Important notes / gotchas

1. Coordinate order is **[lon, lat]** for OSRM and VROOM.
2. With NestJS running on the host, you should use **localhost**.
3. If you later run NestJS inside Docker, you must switch URLs to service names:

   * `http://vroom:3000`
   * `http://osrm:5000`
   * `http://localstack:4566`

---

## Next step ideas (still lite)

* Add a minimal NestJS endpoint:

  * `POST /v1/optimize` → forward body to VROOM
  * `GET /v1/osrm/route` → proxy OSRM route for debugging
* Add a tiny script to create LocalStack SQS queues (optional)

---

# End
