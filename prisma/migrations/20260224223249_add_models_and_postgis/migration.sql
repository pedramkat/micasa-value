/*
  Warnings:

  - A unique constraint covering the columns `[telegramId]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "House" ADD COLUMN     "userId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "telegramId" TEXT;

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "telegramId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Configuration" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "fixValue" DECIMAL(12,2),
    "variableValue" DECIMAL(12,2),
    "properties" JSONB,
    "propertyValuation" BOOLEAN NOT NULL DEFAULT false,
    "houseValuation" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Configuration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OmiMarketValue" (
    "id" TEXT NOT NULL,
    "areaTerritorial" TEXT NOT NULL,
    "regione" TEXT NOT NULL,
    "provincia" TEXT NOT NULL,
    "comuneIstat" TEXT NOT NULL,
    "comuneCat" TEXT,
    "sezione" TEXT,
    "comuneAmm" TEXT,
    "comuneDescrizione" TEXT NOT NULL,
    "fascia" TEXT NOT NULL,
    "zona" TEXT NOT NULL,
    "linkZona" TEXT NOT NULL,
    "codTipologia" TEXT NOT NULL,
    "descrTipologia" TEXT NOT NULL,
    "stato" TEXT NOT NULL,
    "statoPrev" TEXT,
    "comprMin" DECIMAL(12,2),
    "comprMax" DECIMAL(12,2),
    "supNlCompr" TEXT,
    "locMin" DECIMAL(12,2),
    "locMax" DECIMAL(12,2),
    "supNlLoc" TEXT,
    "semester" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OmiMarketValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OmiZone" (
    "id" TEXT NOT NULL,
    "areaTerritorial" TEXT NOT NULL,
    "regione" TEXT NOT NULL,
    "provincia" TEXT NOT NULL,
    "comuneIstat" TEXT NOT NULL,
    "comuneCat" TEXT,
    "sezione" TEXT,
    "comuneAmm" TEXT,
    "comuneDescrizione" TEXT NOT NULL,
    "fascia" TEXT NOT NULL,
    "zonaDescr" TEXT NOT NULL,
    "zona" TEXT NOT NULL,
    "linkZona" TEXT NOT NULL,
    "codTipPrev" TEXT,
    "descrTipPrev" TEXT,
    "statoPrev" TEXT,
    "microzona" TEXT,
    "semester" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OmiZone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OmiPolygon" (
    "id" TEXT NOT NULL,
    "comuneAmm" TEXT NOT NULL,
    "linkZona" TEXT NOT NULL,
    "zona" TEXT,
    "zonaDescr" TEXT,
    "polygonData" JSONB NOT NULL,
    "kmlFileName" TEXT NOT NULL,
    "semester" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OmiPolygon_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Session_telegramId_idx" ON "Session"("telegramId");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "OmiMarketValue_comuneIstat_idx" ON "OmiMarketValue"("comuneIstat");

-- CreateIndex
CREATE INDEX "OmiMarketValue_linkZona_idx" ON "OmiMarketValue"("linkZona");

-- CreateIndex
CREATE INDEX "OmiMarketValue_zona_idx" ON "OmiMarketValue"("zona");

-- CreateIndex
CREATE INDEX "OmiMarketValue_codTipologia_idx" ON "OmiMarketValue"("codTipologia");

-- CreateIndex
CREATE INDEX "OmiMarketValue_comuneDescrizione_zona_codTipologia_idx" ON "OmiMarketValue"("comuneDescrizione", "zona", "codTipologia");

-- CreateIndex
CREATE UNIQUE INDEX "OmiMarketValue_linkZona_codTipologia_semester_key" ON "OmiMarketValue"("linkZona", "codTipologia", "semester");

-- CreateIndex
CREATE INDEX "OmiZone_comuneIstat_idx" ON "OmiZone"("comuneIstat");

-- CreateIndex
CREATE INDEX "OmiZone_linkZona_idx" ON "OmiZone"("linkZona");

-- CreateIndex
CREATE INDEX "OmiZone_zona_idx" ON "OmiZone"("zona");

-- CreateIndex
CREATE INDEX "OmiZone_comuneDescrizione_zona_idx" ON "OmiZone"("comuneDescrizione", "zona");

-- CreateIndex
CREATE UNIQUE INDEX "OmiZone_linkZona_semester_key" ON "OmiZone"("linkZona", "semester");

-- CreateIndex
CREATE INDEX "OmiPolygon_comuneAmm_idx" ON "OmiPolygon"("comuneAmm");

-- CreateIndex
CREATE INDEX "OmiPolygon_linkZona_idx" ON "OmiPolygon"("linkZona");
-- CreateIndex
CREATE UNIQUE INDEX "OmiPolygon_comuneAmm_linkZona_semester_key" ON "OmiPolygon"("comuneAmm", "linkZona", "semester");

-- CreateIndex
CREATE INDEX "House_userId_idx" ON "House"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "User_telegramId_key" ON "User"("telegramId");

-- AddForeignKey
ALTER TABLE "House" ADD CONSTRAINT "House_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
