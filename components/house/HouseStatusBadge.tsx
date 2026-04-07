"use client";

import { Badge } from "@/components/ui/badge";
import { formatHouseStatus } from "@/lib/utils";
import { HouseStatus } from "@/prisma/generated/client";

interface HouseStatusBadgeProps {
  status?: string | null;
  className?: string;
}

function isHouseStatus(value: unknown): value is HouseStatus {
  return typeof value === "string" && (Object.values(HouseStatus) as readonly string[]).includes(value);
}

export function HouseStatusBadge({ status, className }: Readonly<HouseStatusBadgeProps>) {
  // Convert database string values to enum values for proper formatting
  let normalizedStatus: HouseStatus | string | null | undefined = status;
  
  // If status is a database string (e.g., "Da valutare"), we need to handle it
  if (typeof status === "string" && !isHouseStatus(status)) {
    // This is likely a database value, pass it directly to formatHouseStatus
    normalizedStatus = status;
  }
  
  return (
    <Badge variant="secondary" className={className}>
      {formatHouseStatus(normalizedStatus)}
    </Badge>
  );
}
