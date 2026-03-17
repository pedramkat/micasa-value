import { House, Prisma } from "../../prisma/generated/client"

/**
 * Input type for creating a new house
 */
export type CreateHouseInput = {
    title: string
    description?: string
    agencyId?: string
    agentId?: string
    ownerId?: string
    userId?: string
    valuation?: number
    coordinate?: Prisma.JsonValue
    botTexts?: Prisma.JsonValue
}

/**
 * Input type for updating a house
 */
export type UpdateHouseInput = Prisma.HouseUpdateInput

/**
 * Type for bot text entries stored in JSONB
 */
export type BotTextEntry = {
    timestamp: string
    userId: number
    message: string
    type: "text" | "voice" | "transcription"
}

/**
 * Extended House type with computed fields
 */
export type HouseWithMetrics = House & {
    totalBotMessages?: number
    lastActivity?: Date
}
