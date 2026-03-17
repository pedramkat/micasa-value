import { PrismaClient } from "../prisma/generated/client"
import { PrismaPg } from "@prisma/adapter-pg"

/**
 * Shared Prisma Client instance
 * 
 * This ensures we don't create multiple instances in development
 * due to hot reloading, which can exhaust database connections.
 */
declare global {
    var prisma: PrismaClient | undefined
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

export const prisma = global.prisma || new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
})

if (process.env.NODE_ENV !== "production") {
    global.prisma = prisma
}
