ALTER TABLE "Driver"
  ADD COLUMN IF NOT EXISTS "userId" UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Driver_userId_fkey'
  ) THEN
    ALTER TABLE "Driver"
      ADD CONSTRAINT "Driver_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL;
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS "Driver_organizationId_userId_unique"
  ON "Driver"("organizationId", "userId")
  WHERE "userId" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "Driver_userId_idx"
  ON "Driver"("userId");
