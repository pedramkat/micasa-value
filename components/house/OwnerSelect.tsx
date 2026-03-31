"use client";

import { useState } from "react";
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
import { mockUsers, roleLabels, roleColors } from "@/lib/mock-users";
import { toast } from "@/components/ui/sonner";

interface OwnerSelectProps {
  currentUserName: string;
}

export function OwnerSelect({ currentUserName }: OwnerSelectProps) {
  const currentUser = mockUsers.find((u) => u.name === currentUserName);
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(currentUser?.id || "");

  const selectedUser = mockUsers.find((u) => u.id === selectedId);

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
                {selectedUser.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </div>
              <div className="text-left">
                <p className="text-sm font-medium">{selectedUser.name}</p>
                <p className="text-xs text-muted-foreground">{selectedUser.email}</p>
              </div>
              <Badge
                variant="outline"
                className={cn("text-[10px] h-5 ml-auto", roleColors[selectedUser.role])}
              >
                {roleLabels[selectedUser.role]}
              </Badge>
            </div>
          ) : (
            <span className="flex items-center gap-2 text-muted-foreground">
              <User className="h-4 w-4" />
              Select owner...
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
              {mockUsers.map((user) => (
                <CommandItem
                  key={user.id}
                  value={user.name}
                  onSelect={() => {
                    setSelectedId(user.id);
                    setOpen(false);
                    toast.success("Owner updated", {
                      description: `${user.name} is now the owner.`,
                    });
                  }}
                  className="py-2.5"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-[10px]">
                      {user.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{user.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn("text-[10px] h-5 shrink-0", roleColors[user.role])}
                    >
                      {roleLabels[user.role]}
                    </Badge>
                  </div>
                  <Check
                    className={cn(
                      "ml-2 h-4 w-4 shrink-0",
                      selectedId === user.id ? "opacity-100" : "opacity-0",
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
