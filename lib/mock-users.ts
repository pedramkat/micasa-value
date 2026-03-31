export type UserRole = "administrator" | "manager" | "agent" | "user";

export type AppUser = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  housesCount: number;
  lastActive: string;
};

export const roleLabels: Record<UserRole, string> = {
  administrator: "Administrator",
  manager: "Manager",
  agent: "Agent",
  user: "User",
};

export const roleColors: Record<UserRole, string> = {
  administrator: "border-red-200 bg-red-50 text-red-700",
  manager: "border-amber-200 bg-amber-50 text-amber-700",
  agent: "border-blue-200 bg-blue-50 text-blue-700",
  user: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

export const mockUsers: AppUser[] = [
  {
    id: "1",
    name: "Admin User",
    email: "admin@micasa.it",
    phone: "+39 000 000000",
    role: "administrator",
    housesCount: 12,
    lastActive: new Date().toISOString(),
  },
  {
    id: "2",
    name: "Manager User",
    email: "manager@micasa.it",
    phone: "+39 000 000001",
    role: "manager",
    housesCount: 8,
    lastActive: new Date().toISOString(),
  },
  {
    id: "3",
    name: "Agent User",
    email: "agent@micasa.it",
    phone: "+39 000 000002",
    role: "agent",
    housesCount: 5,
    lastActive: new Date().toISOString(),
  },
  {
    id: "4",
    name: "Owner User",
    email: "owner@micasa.it",
    phone: "+39 000 000003",
    role: "user",
    housesCount: 1,
    lastActive: new Date().toISOString(),
  },
];
