import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";

import { authOptions } from "@/auth";
import prisma from "@/lib/prisma";
import { costTrackerService } from "@/lib/services/cost-tracker.service";

function decimalToNumber(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (v && typeof v === "object" && typeof (v as any).toString === "function") {
    const n = Number((v as any).toString());
    return Number.isFinite(n) ? n : 0;
  }
  const n = Number(v as any);
  return Number.isFinite(n) ? n : 0;
}

function parseDate(v: string | null): Date | undefined {
  if (!v) return undefined;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return undefined;
  return d;
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  const sessionUserId = session?.user?.id;
  const sessionEmail = session?.user?.email;

  let requesterUserId: string | undefined = typeof sessionUserId === "string" && sessionUserId.trim() ? sessionUserId : undefined;

  // Ensure the userId we use actually exists in our Prisma User table (FK constraint + correct filtering)
  if (requesterUserId) {
    const exists = await prisma.user.findUnique({ where: { id: requesterUserId }, select: { id: true } });
    if (!exists) requesterUserId = undefined;
  }

  if (!requesterUserId && typeof sessionEmail === "string" && sessionEmail.trim()) {
    const user = await prisma.user.findUnique({ where: { email: sessionEmail.trim() }, select: { id: true } });
    requesterUserId = user?.id;
  }

  if (!requesterUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const requester = await prisma.user.findUnique({
    where: { id: requesterUserId },
    select: { role: true },
  });

  const isAdmin = requester?.role === "ADMIN" || requester?.role === "MANAGER";

  const url = new URL(request.url);
  const provider = url.searchParams.get("provider") || undefined;
  const category = url.searchParams.get("category") || undefined;
  const userId = url.searchParams.get("userId") || undefined;
  const houseId = url.searchParams.get("houseId") || undefined;
  const operation = url.searchParams.get("operation") || undefined;
  const from = parseDate(url.searchParams.get("from"));
  const to = parseDate(url.searchParams.get("to"));
  const limitRaw = url.searchParams.get("limit");
  const limit = limitRaw ? Number(limitRaw) : undefined;

  const result = await costTrackerService.getCosts({
    requesterUserId,
    isAdmin,
    userId,
    houseId,
    operation,
    provider: provider as any,
    category: category as any,
    from,
    to,
    limit,
  });

  const totals: Record<string, number> = {};
  for (const row of result.totalsByProvider) {
    const key = String(row.provider);
    totals[key] = decimalToNumber(row._sum?.costUsd);
  }

  const byCategory: Record<string, number> = {};
  for (const row of result.totalsByCategory) {
    const key = String(row.category);
    byCategory[key] = decimalToNumber(row._sum?.costUsd);
  }

  const byOperation: Record<string, number> = {};
  for (const row of result.totalsByOperation) {
    const key = String(row.operation);
    byOperation[key] = decimalToNumber(row._sum?.costUsd);
  }

  const byUser: Array<{ userId: string; costUsd: number }> = [];
  for (const row of result.totalsByUser) {
    byUser.push({
      userId: String(row.userId),
      costUsd: decimalToNumber(row._sum?.costUsd),
    });
  }

  const rows = result.rows.map((r: any) => ({
    id: r.id,
    userId: r.userId,
    houseId: r.houseId,
    provider: r.provider,
    category: r.category,
    operation: r.operation,
    endpoint: r.endpoint,
    costUsd: decimalToNumber(r.costUsd),
    unitsUsed: r.unitsUsed !== null && r.unitsUsed !== undefined ? decimalToNumber(r.unitsUsed) : null,
    createdAt: r.createdAt,
  }));

  return NextResponse.json({
    totals,
    by_category: byCategory,
    by_operation: byOperation,
    by_user: byUser,
    rows,
  });
}
