-- CreateTable
CREATE TABLE "Place" (
    "id" TEXT NOT NULL,
    "googlePlaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "rating" DOUBLE PRECISION,
    "userRatingsTotal" INTEGER,
    "types" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "lat" DOUBLE PRECISION,
    "lon" DOUBLE PRECISION,
    "raw" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Place_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HousePlace" (
    "id" TEXT NOT NULL,
    "houseId" TEXT NOT NULL,
    "placeId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "distanceMeters" INTEGER,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HousePlace_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Place_googlePlaceId_key" ON "Place"("googlePlaceId");

-- CreateIndex
CREATE INDEX "Place_googlePlaceId_idx" ON "Place"("googlePlaceId");

-- CreateIndex
CREATE UNIQUE INDEX "HousePlace_houseId_placeId_category_key" ON "HousePlace"("houseId", "placeId", "category");

-- CreateIndex
CREATE INDEX "HousePlace_houseId_idx" ON "HousePlace"("houseId");

-- CreateIndex
CREATE INDEX "HousePlace_placeId_idx" ON "HousePlace"("placeId");

-- CreateIndex
CREATE INDEX "HousePlace_category_idx" ON "HousePlace"("category");

-- CreateIndex
CREATE INDEX "HousePlace_fetchedAt_idx" ON "HousePlace"("fetchedAt");

-- AddForeignKey
ALTER TABLE "HousePlace" ADD CONSTRAINT "HousePlace_houseId_fkey" FOREIGN KEY ("houseId") REFERENCES "House"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HousePlace" ADD CONSTRAINT "HousePlace_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "Place"("id") ON DELETE CASCADE ON UPDATE CASCADE;
