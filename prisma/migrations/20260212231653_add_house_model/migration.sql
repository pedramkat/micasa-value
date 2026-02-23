-- CreateTable
CREATE TABLE "House" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "agencyId" TEXT,
    "agentId" TEXT,
    "ownerId" TEXT,
    "botTexts" JSONB,
    "valuation" DECIMAL(12,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "House_pkey" PRIMARY KEY ("id")
);
