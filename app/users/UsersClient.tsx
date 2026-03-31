"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Users as UsersIcon,
  Plus,
  Search,
  Mail,
  Phone,
  MoreHorizontal,
  Shield,
  Building2,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import type { Role } from "@/prisma/generated/client";
import { useRouter } from "next/navigation";

export type UsersClientUser = {
  id: string;
  name: string;
  surname: string;
  email: string;
  telephone: string;
  address: string;
  telegramId: string;
  role: Role;
  housesCount: number;
  lastActive: string;
};

const allRoles: Role[] = ["ADMIN", "MANAGER", "AGENT", "USER"];

const roleLabels: Record<Role, string> = {
  ADMIN: "Administrator",
  MANAGER: "Manager",
  AGENT: "Agent",
  USER: "User",
};

const roleColors: Record<Role, string> = {
  ADMIN: "border-red-200 bg-red-50 text-red-700",
  MANAGER: "border-amber-200 bg-amber-50 text-amber-700",
  AGENT: "border-blue-200 bg-blue-50 text-blue-700",
  USER: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

export function UsersClient({ users }: { users: UsersClientUser[] }) {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const router = useRouter();

  async function removeUser(user: UsersClientUser) {
    const ok = window.confirm(`Remove user "${`${user.name} ${user.surname}`.trim() || user.email}"?`)
    if (!ok) return

    try {
      const res = await fetch(`/api/users/${user.id}`, { method: "DELETE" })
      const data = (await res.json()) as { ok?: boolean; error?: string }
      if (!res.ok) {
        toast.error("Failed to remove user", { description: data?.error ?? "Unknown error" })
        return
      }

      toast.success("User removed")
      router.refresh()
    } catch (e: any) {
      toast.error("Failed to remove user", { description: e?.message ?? "Unknown error" })
    }
  }

  const filtered = useMemo(() => {
    return users.filter((u) => {
      const name = (u.name ?? "").toLowerCase();
      const email = (u.email ?? "").toLowerCase();
      const query = search.toLowerCase();

      const matchesSearch = name.includes(query) || email.includes(query);
      const matchesRole = roleFilter === "all" || u.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, search, roleFilter]);

  const roleCounts = useMemo(() => {
    return allRoles.reduce(
      (acc, role) => {
        acc[role] = users.filter((u) => u.role === role).length;
        return acc;
      },
      {} as Record<string, number>,
    );
  }, [users]);

  return (
    <div className="p-4 lg:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Users</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage team members and their permissions</p>
        </div>
        <Button
          size="sm"
          onClick={() => {
            setEditingUserId(null)
            setDialogOpen(true)
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add User
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {allRoles.map((role, i) => (
          <motion.div
            key={role}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card
              className={cn(
                "cursor-pointer transition-all hover:shadow-sm",
                roleFilter === role && "ring-1 ring-primary",
              )}
              onClick={() => setRoleFilter(roleFilter === role ? "all" : role)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold">{roleCounts[role] ?? 0}</span>
                  <Shield className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-xs text-muted-foreground mt-1">{roleLabels[role]}s</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[160px] h-9 text-sm">
            <SelectValue placeholder="All roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            {allRoles.map((role) => (
              <SelectItem key={role} value={role}>
                {roleLabels[role]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        {filtered.map((user, i) => (
          <motion.div
            key={user.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
          >
            <Card className="hover:shadow-sm transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm">
                    {(`${user.name} ${user.surname}`.trim() || "?")
                      .split(" ")
                      .filter(Boolean)
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{`${user.name} ${user.surname}`.trim() || "—"}</p>
                      <Badge
                        variant="outline"
                        className={cn("text-[10px] h-5 shrink-0", roleColors[user.role])}
                      >
                        {roleLabels[user.role]}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1 truncate">
                        <Mail className="h-3 w-3" />
                        {user.email}
                      </span>
                      {user.telephone && (
                        <span className="hidden sm:flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {user.telephone}
                        </span>
                      )}
                      <span className="hidden md:flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        {user.housesCount} properties
                      </span>
                      <span className="hidden lg:flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(user.lastActive).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuItem
                        onClick={() => {
                          setEditingUserId(user.id)
                          setDialogOpen(true)
                        }}
                      >
                        Edit details
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => removeUser(user)}
                      >
                        Remove user
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}

        {filtered.length === 0 && (
          <div className="py-12 text-center">
            <UsersIcon className="mx-auto h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground mt-3">No users found</p>
          </div>
        )}
      </div>

      <UserDialog
        open={dialogOpen}
        onOpenChange={(next) => {
          setDialogOpen(next)
          if (!next) setEditingUserId(null)
        }}
        mode={editingUserId ? "edit" : "add"}
        user={editingUserId ? users.find((u) => u.id === editingUserId) ?? null : null}
        onSaved={() => {
          setDialogOpen(false)
          setEditingUserId(null)
          setTimeout(() => {
            router.refresh()
          }, 0)
        }}
      />
    </div>
  );
}

function UserDialog({
  open,
  onOpenChange,
  onSaved,
  mode,
  user,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
  mode: "add" | "edit"
  user: UsersClientUser | null
}) {
  const [name, setName] = useState("")
  const [surname, setSurname] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [telephone, setTelephone] = useState("")
  const [address, setAddress] = useState("")
  const [role, setRole] = useState<Role>("AGENT")
  const [saving, setSaving] = useState(false)

  const telegramId = user?.telegramId ?? ""

  const canSubmit = email.trim().length > 0 && !saving

  useEffect(() => {
    if (!open) return

    if (mode === "edit" && user) {
      setName(user.name)
      setSurname(user.surname)
      setEmail(user.email)
      setTelephone(user.telephone)
      setAddress(user.address)
      setRole(user.role)
      setPassword("")
      return
    }

    if (mode === "add") {
      setName("")
      setSurname("")
      setEmail("")
      setTelephone("")
      setAddress("")
      setRole("AGENT")
      setPassword("")
    }
  }, [open, mode, user?.id])

  async function submit() {
    if (!canSubmit) return
    setSaving(true)
    try {
      const url = mode === "edit" && user ? `/api/users/${user.id}` : "/api/users"
      const method = mode === "edit" ? "PATCH" : "POST"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          surname,
          email,
          password,
          telephone,
          address,
          role,
        }),
      })

      const data = (await res.json()) as { ok?: boolean; id?: string; error?: string }
      if (!res.ok) {
        toast.error(mode === "edit" ? "Failed to update user" : "Failed to add user", {
          description: data?.error ?? "Unknown error",
        })
        return
      }

      toast.success(mode === "edit" ? "User updated" : "User added successfully")
      onSaved()
    } catch (e: any) {
      toast.error(mode === "edit" ? "Failed to update user" : "Failed to add user", {
        description: e?.message ?? "Unknown error",
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card text-foreground">
        <DialogHeader>
          <DialogTitle>{mode === "edit" ? "Edit User" : "Add New User"}</DialogTitle>
          <DialogDescription>
            {mode === "edit" ? "Update user details." : "Add a team member and assign their role."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              placeholder="e.g. Maria Russo"
              className="h-9"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="surname">Surname</Label>
            <Input
              id="surname"
              placeholder="e.g. Rossi"
              className="h-9"
              value={surname}
              onChange={(e) => setSurname(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="maria@micasa.it"
              className="h-9"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder={mode === "edit" ? "Leave blank to keep current" : "Set password"}
              className="h-9"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="telephone">Telephone</Label>
            <Input
              id="telephone"
              placeholder="+39 333 ..."
              className="h-9"
              value={telephone}
              onChange={(e) => setTelephone(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              placeholder="Address"
              className="h-9"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="telegramId">Telegram ID</Label>
            <Input id="telegramId" className="h-9" value={telegramId} disabled />
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as Role)}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {allRoles.map((r) => (
                  <SelectItem key={r} value={r}>
                    {roleLabels[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!canSubmit}>
            {saving ? (mode === "edit" ? "Saving..." : "Adding...") : mode === "edit" ? "Save" : "Add User"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
