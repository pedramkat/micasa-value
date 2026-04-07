-- CreateEnum
CREATE TYPE "HouseStatus" AS ENUM ('Da valutare', 'In valutazione', 'Valutato', 'In preparazione', 'Acquisito', 'In vendita', 'In trattativa', 'Venduto', 'Ritirato', 'Sospeso');

-- AlterTable
ALTER TABLE "House" ADD COLUMN     "status" "HouseStatus" NOT NULL DEFAULT 'Da valutare';
