ALTER TABLE "UserSessionToken"
  ADD COLUMN IF NOT EXISTS "activeOrganizationId" UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'UserSessionToken_activeOrganizationId_fkey'
  ) THEN
    ALTER TABLE "UserSessionToken"
      ADD CONSTRAINT "UserSessionToken_activeOrganizationId_fkey"
      FOREIGN KEY ("activeOrganizationId") REFERENCES "Organization"("id") ON DELETE SET NULL;
  END IF;
END
$$;

ALTER TABLE "OrganizationUserRole"
  ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'active';

CREATE INDEX IF NOT EXISTS "OrganizationUserRole_organizationId_role_idx"
  ON "OrganizationUserRole"("organizationId", "role");

ALTER TABLE "Driver"
  ADD COLUMN IF NOT EXISTS "startLocation" JSONB,
  ADD COLUMN IF NOT EXISTS "endLocation" JSONB,
  ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS "Driver_organizationId_deletedAt_idx"
  ON "Driver"("organizationId", "deletedAt");
