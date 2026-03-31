-- 1) Extend Role enum to include USER
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'Role' AND e.enumlabel = 'USER'
  ) THEN
    ALTER TYPE "Role" ADD VALUE 'USER';
  END IF;
END $$;

-- 2) Ensure ownerId column exists (it already exists in schema, but keep migration idempotent)
ALTER TABLE "House" ADD COLUMN IF NOT EXISTS "ownerId" TEXT;

-- 3) Add/replace FK for House.userId (creator) to be SET NULL instead of CASCADE
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'House_userId_fkey'
  ) THEN
    ALTER TABLE "House" DROP CONSTRAINT "House_userId_fkey";
  END IF;
END $$;

ALTER TABLE "House"
ADD CONSTRAINT "House_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- 4) Add FK for ownerId
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'House_ownerId_fkey'
  ) THEN
    ALTER TABLE "House" DROP CONSTRAINT "House_ownerId_fkey";
  END IF;
END $$;

ALTER TABLE "House"
ADD CONSTRAINT "House_ownerId_fkey"
FOREIGN KEY ("ownerId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- 5) Index for ownerId
CREATE INDEX IF NOT EXISTS "House_ownerId_idx" ON "House"("ownerId");
