import prisma from "@/lib/prisma";
import { Prisma } from "@/prisma/generated/client";

export type ApiProvider = "openai" | "google";
export type ApiCostCategory = "image" | "text" | "voice" | "places";

export type TrackCostInput = {
  userId: string;
  houseId?: string | null;
  provider: ApiProvider;
  category: ApiCostCategory;
  operation: string;
  endpoint: string;
  costUsd: number;
  unitsUsed?: number | null;
  metadata?: unknown;
  createdAt?: Date;
};

function toDecimal(value: number): Prisma.Decimal {
  if (!Number.isFinite(value)) {
    return new Prisma.Decimal(0);
  }
  return new Prisma.Decimal(value);
}

function toDecimalOrNull(value: number | null | undefined): Prisma.Decimal | null {
  if (value === null || value === undefined) return null;
  if (!Number.isFinite(value)) return null;
  return new Prisma.Decimal(value);
}

export class CostTrackerService {
  async trackCost(input: TrackCostInput) {
    if (!input.userId) return;

    const operation = typeof input.operation === "string" && input.operation.trim() ? input.operation.trim() : "unknown";
    const houseId = typeof input.houseId === "string" && input.houseId.trim() ? input.houseId.trim() : null;

    if (process.env.NODE_ENV !== "production") {
      console.log("[CostTracker] trackCost", {
        userId: input.userId,
        houseId,
        provider: input.provider,
        category: input.category,
        operation,
        endpoint: input.endpoint,
        costUsd: input.costUsd,
        unitsUsed: input.unitsUsed ?? null,
      });
    }

    const whereKey = {
      userId: input.userId,
      houseId,
      provider: input.provider as any,
      operation,
    };

    let existing: { id: string } | null = null;
    try {
      existing = await (prisma as any).apiUsageCost.findFirst({
        where: whereKey,
        select: { id: true },
      });
    } catch (err) {
      if (process.env.NODE_ENV !== "production") {
        console.error("[CostTracker] findFirst failed", err);
      }
      return;
    }

    if (existing?.id) {
      await (prisma as any).apiUsageCost.update({
        where: { id: existing.id },
        data: {
          category: input.category as any,
          endpoint: input.endpoint,
          costUsd: { increment: toDecimal(input.costUsd) },
          unitsUsed:
            input.unitsUsed === null || input.unitsUsed === undefined
              ? undefined
              : { increment: toDecimal(input.unitsUsed) },
          metadata: input.metadata as any,
        },
        select: { id: true },
      });

      if (process.env.NODE_ENV !== "production") {
        console.log("[CostTracker] updated", { id: existing.id });
      }
      return;
    }

    try {
      await (prisma as any).apiUsageCost.create({
        data: {
          userId: input.userId,
          houseId,
          provider: input.provider as any,
          category: input.category as any,
          operation,
          endpoint: input.endpoint,
          costUsd: toDecimal(input.costUsd),
          unitsUsed: toDecimalOrNull(input.unitsUsed ?? null),
          metadata: input.metadata as any,
          createdAt: input.createdAt,
        },
        select: { id: true },
      });

      if (process.env.NODE_ENV !== "production") {
        console.log("[CostTracker] created");
      }
    } catch (err) {
      const prismaErr = err as any;
      const isUniqueViolation = prismaErr?.code === "P2002";
      const isForeignKeyViolation = prismaErr?.code === "P2003";
      if (isForeignKeyViolation) {
        if (process.env.NODE_ENV !== "production") {
          console.error("[CostTracker] FK violation - skipping cost write", prismaErr);
        }
        return;
      }

      if (!isUniqueViolation) throw err;

      const row = await (prisma as any).apiUsageCost.findFirst({
        where: whereKey,
        select: { id: true },
      });

      if (!row?.id) return;

      await (prisma as any).apiUsageCost.update({
        where: { id: row.id },
        data: {
          category: input.category as any,
          endpoint: input.endpoint,
          costUsd: { increment: toDecimal(input.costUsd) },
          unitsUsed:
            input.unitsUsed === null || input.unitsUsed === undefined
              ? undefined
              : { increment: toDecimal(input.unitsUsed) },
          metadata: input.metadata as any,
        },
        select: { id: true },
      });
    }
  }

  async getCosts(params: {
    requesterUserId: string;
    isAdmin: boolean;
    userId?: string;
    houseId?: string;
    operation?: string;
    provider?: ApiProvider;
    category?: ApiCostCategory;
    from?: Date;
    to?: Date;
    limit?: number;
  }) {
    const userId = params.isAdmin ? params.userId : params.requesterUserId;

    const where: any = {
      ...(userId ? { userId } : {}),
      ...(params.houseId ? { houseId: params.houseId } : {}),
      ...(params.operation ? { operation: params.operation } : {}),
      ...(params.provider ? { provider: params.provider as any } : {}),
      ...(params.category ? { category: params.category as any } : {}),
      ...(params.from || params.to
        ? {
            createdAt: {
              ...(params.from ? { gte: params.from } : {}),
              ...(params.to ? { lte: params.to } : {}),
            },
          }
        : {}),
    };

    const limit = typeof params.limit === "number" && Number.isFinite(params.limit) ? Math.max(1, Math.min(500, params.limit)) : 200;

    const rows = await (prisma as any).apiUsageCost.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        userId: true,
        houseId: true,
        provider: true,
        category: true,
        operation: true,
        endpoint: true,
        costUsd: true,
        unitsUsed: true,
        createdAt: true,
      },
    });

    const totalsByProvider = await (prisma as any).apiUsageCost.groupBy({
      by: ["provider"],
      where,
      _sum: { costUsd: true },
    });

    const totalsByCategory = await (prisma as any).apiUsageCost.groupBy({
      by: ["category"],
      where,
      _sum: { costUsd: true },
    });

    const totalsByOperation = await (prisma as any).apiUsageCost.groupBy({
      by: ["operation"],
      where,
      _sum: { costUsd: true },
    });

    const totalsByUser = params.isAdmin
      ? await (prisma as any).apiUsageCost.groupBy({
          by: ["userId"],
          where: {
            ...(params.provider ? { provider: params.provider as any } : {}),
            ...(params.category ? { category: params.category as any } : {}),
            ...(params.from || params.to
              ? {
                  createdAt: {
                    ...(params.from ? { gte: params.from } : {}),
                    ...(params.to ? { lte: params.to } : {}),
                  },
                }
              : {}),
          },
          _sum: { costUsd: true },
        })
      : [];

    return {
      rows,
      totalsByProvider,
      totalsByCategory,
      totalsByOperation,
      totalsByUser,
    };
  }
}

export const costTrackerService = new CostTrackerService();
