"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ChevronsUpDown, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/sonner";

interface OwnerSelectProps {
  houseId: string;
  currentOwnerId?: string | null;
  currentUserName?: string;
}

type OwnerUser = {
  id: string;
  name: string | null;
  surname: string | null;
  email: string;
  role: string;
};

const roleLabels: Record<string, string> = {
  ADMIN: "Administrator",
  MANAGER: "Manager",
  AGENT: "Agent",
  USER: "User",
};

const roleColors: Record<string, string> = {
  ADMIN: "border-red-200 bg-red-50 text-red-700",
  MANAGER: "border-amber-200 bg-amber-50 text-amber-700",
  AGENT: "border-blue-200 bg-blue-50 text-blue-700",
  USER: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

export function OwnerSelect({ houseId, currentOwnerId, currentUserName }: OwnerSelectProps) {
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(currentOwnerId ?? "");
  const [users, setUsers] = useState<OwnerUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setSelectedId(currentOwnerId ?? "");
  }, [currentOwnerId]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      try {
        const res = await fetch("/api/users");
        const data = (await res.json()) as OwnerUser[];
        if (!res.ok) throw new Error((data as any)?.error ?? "Failed to fetch users");
        if (!cancelled) setUsers(Array.isArray(data) ? data : []);
      } catch (e: any) {
        toast.error("Failed to load users", { description: e?.message ?? "Unknown error" });
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const currentUserIdByName = useMemo(() => {
    const needle = typeof currentUserName === "string" ? currentUserName.trim().toLowerCase() : "";
    if (!needle) return null;

    const match = users.find((u) => {
      const full = `${u.name ?? ""} ${u.surname ?? ""}`.trim().toLowerCase();
      return full === needle;
    });
    return match?.id ?? null;
  }, [users, currentUserName]);

  useEffect(() => {
    if (selectedId) return;
    if (currentOwnerId) return;
    if (currentUserIdByName) setSelectedId(currentUserIdByName);
  }, [selectedId, currentOwnerId, currentUserIdByName]);

  const selectedUser = users.find((u) => u.id === selectedId);
  const selectedUserName = `${selectedUser?.name ?? ""} ${selectedUser?.surname ?? ""}`.trim();

  async function selectOwner(nextOwnerId: string) {
    setSelectedId(nextOwnerId);
    setOpen(false);

    try {
      const res = await fetch(`/api/houses/${houseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ownerId: nextOwnerId }),
      });
      const data = (await res.json()) as any;
      if (!res.ok) throw new Error(data?.error ?? "Failed to update owner");

      const u = users.find((x) => x.id === nextOwnerId);
      const name = `${u?.name ?? ""} ${u?.surname ?? ""}`.trim() || u?.email || "Owner";
      toast.success("Owner updated", { description: `${name} is now the owner.` });
    } catch (e: any) {
      toast.error("Failed to update owner", { description: e?.message ?? "Unknown error" });
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-auto py-2.5 px-3.5"
        >
          {selectedUser ? (
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-xs">
                {selectedUserName
                  ? selectedUserName
                      .split(" ")
                      .filter(Boolean)
                      .map((n) => n[0])
                      .join("")
                  : "?"}
              </div>
              <div className="text-left">
                <p className="text-sm font-medium">{selectedUserName || selectedUser.email}</p>
                <p className="text-xs text-muted-foreground">{selectedUser.email}</p>
              </div>
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px] h-5 ml-auto",
                  roleColors[selectedUser.role] ?? "border-border bg-background text-muted-foreground",
                )}
              >
                {roleLabels[selectedUser.role] ?? selectedUser.role}
              </Badge>
            </div>
          ) : (
            <span className="flex items-center gap-2 text-muted-foreground">
              <User className="h-4 w-4" />
              {isLoading ? "Loading users..." : "Select owner..."}
            </span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[340px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search users..." className="h-9" />
          <CommandList>
            <CommandEmpty>No user found.</CommandEmpty>
            <CommandGroup>
              {users.map((user) => {
                const displayName = `${user.name ?? ""} ${user.surname ?? ""}`.trim() || user.email
                return (
                  <CommandItem
                    key={user.id}
                    value={displayName}
                    onSelect={() => {
                      void selectOwner(user.id)
                    }}
                    className="py-2.5"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-[10px]">
                        {displayName
                          .split(" ")
                          .filter(Boolean)
                          .map((n) => n[0])
                          .join("")}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{displayName}</p>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] h-5 shrink-0",
                          roleColors[user.role] ?? "border-border bg-background text-muted-foreground",
                        )}
                      >
                        {roleLabels[user.role] ?? user.role}
                      </Badge>
                    </div>
                    <Check
                      className={cn(
                        "ml-2 h-4 w-4 shrink-0",
                        selectedId === user.id ? "opacity-100" : "opacity-0",
                      )}
                    />
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
