-- Add houseId + operation columns and unique aggregation key

ALTER TABLE "ApiUsageCost" ADD COLUMN IF NOT EXISTS "houseId" TEXT;
ALTER TABLE "ApiUsageCost" ADD COLUMN IF NOT EXISTS "operation" TEXT NOT NULL DEFAULT 'unknown';

CREATE INDEX IF NOT EXISTS "ApiUsageCost_houseId_idx" ON "ApiUsageCost"("houseId");
CREATE INDEX IF NOT EXISTS "ApiUsageCost_operation_idx" ON "ApiUsageCost"("operation");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ApiUsageCost_userId_houseId_provider_operation_key'
  ) THEN
    ALTER TABLE "ApiUsageCost"
      ADD CONSTRAINT "ApiUsageCost_userId_houseId_provider_operation_key"
      UNIQUE ("userId", "houseId", "provider", "operation");
  END IF;
END $$;
