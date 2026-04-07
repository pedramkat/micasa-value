"use client";

import { useEffect, useState } from "react";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";
import { HouseStatus } from "@/prisma/generated/client";

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
};

function isHouseStatus(value: unknown): value is HouseStatus {
  return typeof value === "string" && (Object.values(HouseStatus) as readonly string[]).includes(value);
}

export function HouseStatusSelect({
  houseId,
  currentStatus,
  disabled,
}: Readonly<{
  houseId: string;
  currentStatus?: HouseStatus | null;
  disabled?: boolean;
}>) {
  const [value, setValue] = useState<HouseStatus>(currentStatus ?? HouseStatus.DA_VALUTARE);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setValue(currentStatus ?? HouseStatus.DA_VALUTARE);
  }, [currentStatus]);

  async function persist(next: HouseStatus) {
    setValue(next);
    setIsSaving(true);
    try {
      const res = await fetch(`/api/houses/${houseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      const data = (await res.json().catch(() => null)) as any;
      if (!res.ok) throw new Error(data?.error ?? "Failed to update status");
      toast.success("Stato aggiornato", { description: statusLabels[next] ?? next });
    } catch (e: any) {
      toast.error("Impossibile aggiornare lo stato", { description: e?.message ?? "Unknown error" });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Select
      value={value}
      onValueChange={(v) => {
        if (isHouseStatus(v)) {
          void persist(v);
        }
      }}
      disabled={Boolean(disabled) || isSaving}
    >
      <SelectTrigger>
        <SelectValue placeholder="Seleziona stato" />
      </SelectTrigger>
      <SelectContent>
        {Object.values(HouseStatus).map((s) => (
          <SelectItem key={s} value={s}>
            {statusLabels[s] ?? s}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
