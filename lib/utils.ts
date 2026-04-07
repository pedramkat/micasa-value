import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { HouseStatus } from "@/prisma/generated/client"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

function isHouseStatus(value: unknown): value is HouseStatus {
  return typeof value === "string" && (Object.keys(HouseStatus) as readonly string[]).includes(value);
}

export function formatHouseStatus(status: HouseStatus | string | null | undefined): string {
  if (!status) return "Da valutare"
  if (isHouseStatus(status)) {
    const statusLabels: Record<HouseStatus, string> = {
      [HouseStatus.DA_VALUTARE]: "Da valutare",
      [HouseStatus.IN_VALUTAZIONE]: "In valutazione",
      [HouseStatus.VALUTATO]: "Valutato",
      [HouseStatus.IN_PREPARAZIONE]: "In preparazione",
      [HouseStatus.ACQUISITO]: "Acquisito",
      [HouseStatus.IN_VENDITA]: "In vendita",
      [HouseStatus.IN_TRATTATIVA]: "In trattativa",
      [HouseStatus.VENDUTO]: "Venduto",
      [HouseStatus.RITIRATO]: "Ritirato",
      [HouseStatus.SOSPESO]: "Sospeso",
    }
    return statusLabels[status] ?? status
  }
  return String(status)
}
