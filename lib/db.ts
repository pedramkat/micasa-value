import { PrismaClient } from "../prisma/generated/client"

/**
 * Shared Prisma Client instance
 * 
 * This ensures we don't create multiple instances in development
 * due to hot reloading, which can exhaust database connections.
 */
declare global {
    var prisma: PrismaClient | undefined
}

export const prisma = global.prisma || new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
})

if (process.env.NODE_ENV !== "production") {
    global.prisma = prisma
}
