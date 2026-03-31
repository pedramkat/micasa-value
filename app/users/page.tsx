export const dynamic = "force-dynamic";

import prisma from "@/lib/prisma";
import { UsersClient, type UsersClientUser } from "@/app/users/UsersClient";

export default async function UsersPage() {
  const rows = await prisma.user.findMany({
    orderBy: [{ name: "asc" }, { email: "asc" }],
    select: {
      id: true,
      name: true,
      surname: true,
      email: true,
      telephone: true,
      address: true,
      telegramId: true,
      role: true,
      createdHouses: { select: { id: true } },
      sessions: {
        orderBy: { updatedAt: "desc" },
        take: 1,
        select: { updatedAt: true },
      },
    },
  })

  const users: UsersClientUser[] = rows.map((u) => ({
    id: u.id,
    name: u.name ?? "",
    surname: u.surname ?? "",
    email: u.email,
    telephone: u.telephone ?? "",
    address: u.address ?? "",
    telegramId: u.telegramId ?? "",
    role: u.role,
    housesCount: u.createdHouses.length,
    lastActive: (u.sessions[0]?.updatedAt ?? new Date()).toISOString(),
  }))

  return <UsersClient users={users} />
}
