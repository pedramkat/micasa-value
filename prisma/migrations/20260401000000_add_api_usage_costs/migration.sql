-- Create enums if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ApiProvider') THEN
    CREATE TYPE "ApiProvider" AS ENUM ('openai', 'google');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ApiCostCategory') THEN
    CREATE TYPE "ApiCostCategory" AS ENUM ('image', 'text', 'voice', 'places');
  END IF;
END $$;

-- Create table if not exists
CREATE TABLE IF NOT EXISTS "ApiUsageCost" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "provider" "ApiProvider" NOT NULL,
  "category" "ApiCostCategory" NOT NULL,
  "endpoint" TEXT NOT NULL,
  "costUsd" DECIMAL(10,6) NOT NULL,
  "unitsUsed" DECIMAL(20,6),
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ApiUsageCost_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ApiUsageCost_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS "ApiUsageCost_userId_idx" ON "ApiUsageCost"("userId");
CREATE INDEX IF NOT EXISTS "ApiUsageCost_provider_idx" ON "ApiUsageCost"("provider");
CREATE INDEX IF NOT EXISTS "ApiUsageCost_category_idx" ON "ApiUsageCost"("category");
CREATE INDEX IF NOT EXISTS "ApiUsageCost_createdAt_idx" ON "ApiUsageCost"("createdAt");
CREATE INDEX IF NOT EXISTS "ApiUsageCost_userId_createdAt_idx" ON "ApiUsageCost"("userId", "createdAt");
