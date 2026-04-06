-- DropIndex
DROP INDEX "Place_location_gix";

-- AlterTable
ALTER TABLE "House" ADD COLUMN     "aiCurrent" JSONB,
ADD COLUMN     "aiHistory" JSONB,
ADD COLUMN     "pricingCurrent" JSONB,
ADD COLUMN     "valuationHistory" JSONB;

-- AlterTable
ALTER TABLE "Place" ALTER COLUMN "types" DROP DEFAULT;

-- CreateTable
CREATE TABLE "Setting" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "agencyName" TEXT,
    "agencyBio" TEXT,
    "agencyLogoUrl" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "websiteUrl" TEXT,
    "headquartersAddress" TEXT,
    "defaultOpenAiModel" TEXT DEFAULT 'gpt-4o',
    "apiCostModels" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("id")
);
