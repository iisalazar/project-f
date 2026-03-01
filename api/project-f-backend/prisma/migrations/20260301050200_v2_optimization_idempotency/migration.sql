ALTER TABLE "OptimizationJob"
  ADD COLUMN IF NOT EXISTS "attempts" INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "error" JSONB,
  ADD COLUMN IF NOT EXISTS "organizationId" UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'OptimizationJob_organizationId_fkey'
  ) THEN
    ALTER TABLE "OptimizationJob"
      ADD CONSTRAINT "OptimizationJob_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL;
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "OptimizationInput" (
  "jobId" UUID PRIMARY KEY,
  "payload" JSONB NOT NULL,
  "payloadHash" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "OptimizationInput_jobId_fkey"
    FOREIGN KEY ("jobId") REFERENCES "OptimizationJob"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "OptimizationResult" (
  "jobId" UUID PRIMARY KEY,
  "solution" JSONB NOT NULL,
  "metrics" JSONB,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "OptimizationResult_jobId_fkey"
    FOREIGN KEY ("jobId") REFERENCES "OptimizationJob"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "OptimizationJob_ownerUserId_status_idx"
  ON "OptimizationJob"("ownerUserId", "status");
