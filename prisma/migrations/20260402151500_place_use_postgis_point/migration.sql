-- Ensure PostGIS is available (required for geometry type + ST_* functions)
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA extensions;

-- Add location column as PostGIS geometry(Point,4326)
ALTER TABLE "Place" ADD COLUMN IF NOT EXISTS "location" geometry(Point,4326);

-- Backfill from old lat/lon columns when present
UPDATE "Place"
SET "location" = ST_SetSRID(ST_MakePoint("lon", "lat"), 4326)
WHERE "location" IS NULL AND "lat" IS NOT NULL AND "lon" IS NOT NULL;

-- Drop old columns
ALTER TABLE "Place" DROP COLUMN IF EXISTS "lat";
ALTER TABLE "Place" DROP COLUMN IF EXISTS "lon";

-- Helpful index for spatial queries
CREATE INDEX IF NOT EXISTS "Place_location_gix" ON "Place" USING GIST ("location");
