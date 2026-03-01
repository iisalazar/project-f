DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RoutePlanStatus') THEN
    CREATE TYPE "RoutePlanStatus" AS ENUM ('draft', 'optimized', 'dispatched', 'in_progress', 'completed', 'failed');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TripStatus') THEN
    CREATE TYPE "TripStatus" AS ENUM ('planned', 'active', 'completed', 'failed');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TripStopStatus') THEN
    CREATE TYPE "TripStopStatus" AS ENUM ('pending', 'enroute', 'arrived', 'completed', 'failed', 'skipped');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DispatchType') THEN
    CREATE TYPE "DispatchType" AS ENUM ('route', 'stop');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "RoutePlan" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "ownerUserId" UUID NOT NULL,
  "organizationId" UUID,
  "status" "RoutePlanStatus" NOT NULL DEFAULT 'draft',
  "planDate" DATE,
  "inputPayload" JSONB,
  "summaryMetrics" JSONB,
  "geometry" JSONB,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "RoutePlan_ownerUserId_fkey"
    FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE CASCADE,
  CONSTRAINT "RoutePlan_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS "RouteStop" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "routePlanId" UUID NOT NULL,
  "stopId" UUID,
  "stopOrder" INT NOT NULL,
  "etaAt" TIMESTAMPTZ,
  "distanceMeters" INT,
  "durationSeconds" INT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "RouteStop_routePlanId_fkey"
    FOREIGN KEY ("routePlanId") REFERENCES "RoutePlan"("id") ON DELETE CASCADE,
  CONSTRAINT "RouteStop_stopId_fkey"
    FOREIGN KEY ("stopId") REFERENCES "Stop"("id") ON DELETE SET NULL,
  CONSTRAINT "RouteStop_routePlanId_stopOrder_key" UNIQUE ("routePlanId", "stopOrder")
);

CREATE TABLE IF NOT EXISTS "Trip" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "ownerUserId" UUID NOT NULL,
  "organizationId" UUID,
  "routePlanId" UUID,
  "driverId" UUID,
  "vehicleId" UUID,
  "status" "TripStatus" NOT NULL DEFAULT 'planned',
  "tripDate" DATE NOT NULL DEFAULT CURRENT_DATE,
  "startAt" TIMESTAMPTZ,
  "endAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "Trip_ownerUserId_fkey"
    FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE CASCADE,
  CONSTRAINT "Trip_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL,
  CONSTRAINT "Trip_routePlanId_fkey"
    FOREIGN KEY ("routePlanId") REFERENCES "RoutePlan"("id") ON DELETE SET NULL,
  CONSTRAINT "Trip_driverId_fkey"
    FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE SET NULL,
  CONSTRAINT "Trip_vehicleId_fkey"
    FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS "TripStop" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tripId" UUID NOT NULL,
  "stopId" UUID,
  "stopOrder" INT NOT NULL,
  "status" "TripStopStatus" NOT NULL DEFAULT 'pending',
  "etaAt" TIMESTAMPTZ,
  "arrivedAt" TIMESTAMPTZ,
  "completedAt" TIMESTAMPTZ,
  "failureReason" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "TripStop_tripId_fkey"
    FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE,
  CONSTRAINT "TripStop_stopId_fkey"
    FOREIGN KEY ("stopId") REFERENCES "Stop"("id") ON DELETE SET NULL,
  CONSTRAINT "TripStop_tripId_stopOrder_key" UNIQUE ("tripId", "stopOrder")
);

CREATE TABLE IF NOT EXISTS "Dispatch" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "ownerUserId" UUID NOT NULL,
  "organizationId" UUID,
  "dispatchType" "DispatchType" NOT NULL,
  "routePlanId" UUID,
  "stopId" UUID,
  "driverId" UUID,
  "vehicleId" UUID,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "Dispatch_ownerUserId_fkey"
    FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE CASCADE,
  CONSTRAINT "Dispatch_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL,
  CONSTRAINT "Dispatch_routePlanId_fkey"
    FOREIGN KEY ("routePlanId") REFERENCES "RoutePlan"("id") ON DELETE SET NULL,
  CONSTRAINT "Dispatch_stopId_fkey"
    FOREIGN KEY ("stopId") REFERENCES "Stop"("id") ON DELETE SET NULL,
  CONSTRAINT "Dispatch_driverId_fkey"
    FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE SET NULL,
  CONSTRAINT "Dispatch_vehicleId_fkey"
    FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS "ExecutionEvent" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "ownerUserId" UUID NOT NULL,
  "organizationId" UUID,
  "eventType" TEXT NOT NULL,
  "entityId" UUID,
  "data" JSONB,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "ExecutionEvent_ownerUserId_fkey"
    FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE CASCADE,
  CONSTRAINT "ExecutionEvent_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS "Pod" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tripStopId" UUID NOT NULL,
  "photoUrl" TEXT,
  "signatureUrl" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "Pod_tripStopId_fkey"
    FOREIGN KEY ("tripStopId") REFERENCES "TripStop"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "TrackingLocation" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "ownerUserId" UUID NOT NULL,
  "driverId" UUID,
  "tripId" UUID,
  "latitude" DOUBLE PRECISION NOT NULL,
  "longitude" DOUBLE PRECISION NOT NULL,
  "recordedAt" TIMESTAMPTZ NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "TrackingLocation_ownerUserId_fkey"
    FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE CASCADE,
  CONSTRAINT "TrackingLocation_driverId_fkey"
    FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE SET NULL,
  CONSTRAINT "TrackingLocation_tripId_fkey"
    FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS "NotificationTemplate" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "eventType" TEXT NOT NULL,
  "channel" TEXT NOT NULL,
  "templateBody" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "NotificationTemplate_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE,
  CONSTRAINT "NotificationTemplate_organizationId_eventType_channel_key" UNIQUE ("organizationId", "eventType", "channel")
);

CREATE TABLE IF NOT EXISTS "NotificationEvent" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "ownerUserId" UUID NOT NULL,
  "eventType" TEXT NOT NULL,
  "channel" TEXT NOT NULL,
  "recipient" TEXT NOT NULL,
  "payload" JSONB,
  "status" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "NotificationEvent_ownerUserId_fkey"
    FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "AnalyticsSnapshot" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" UUID,
  "metricDate" DATE NOT NULL,
  "metricKey" TEXT NOT NULL,
  "metricValue" DOUBLE PRECISION NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "AnalyticsSnapshot_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL,
  CONSTRAINT "AnalyticsSnapshot_organizationId_metricDate_metricKey_key"
    UNIQUE ("organizationId", "metricDate", "metricKey")
);

CREATE TABLE IF NOT EXISTS "WebhookSubscription" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" UUID,
  "url" TEXT NOT NULL,
  "secret" TEXT NOT NULL,
  "eventFilters" JSONB,
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "WebhookSubscription_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS "ImportJob" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" UUID,
  "type" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "source" TEXT,
  "error" JSONB,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "ImportJob_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "RoutePlan_ownerUserId_idx" ON "RoutePlan"("ownerUserId");
CREATE INDEX IF NOT EXISTS "RouteStop_routePlanId_idx" ON "RouteStop"("routePlanId");
CREATE INDEX IF NOT EXISTS "Trip_ownerUserId_tripDate_idx" ON "Trip"("ownerUserId", "tripDate");
CREATE INDEX IF NOT EXISTS "TripStop_tripId_idx" ON "TripStop"("tripId");
CREATE INDEX IF NOT EXISTS "Dispatch_ownerUserId_createdAt_idx" ON "Dispatch"("ownerUserId", "createdAt");
CREATE INDEX IF NOT EXISTS "ExecutionEvent_ownerUserId_createdAt_idx" ON "ExecutionEvent"("ownerUserId", "createdAt");
CREATE INDEX IF NOT EXISTS "TrackingLocation_driverId_recordedAt_idx" ON "TrackingLocation"("driverId", "recordedAt");
CREATE INDEX IF NOT EXISTS "NotificationEvent_ownerUserId_createdAt_idx" ON "NotificationEvent"("ownerUserId", "createdAt");
