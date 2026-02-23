import { prisma } from "../db"
import { CreateHouseInput, UpdateHouseInput, BotTextEntry } from "../types/house.types"
import { House, Prisma } from "@prisma/client"

/**
 * HouseService - Business logic for House operations
 * 
 * This service handles all house-related operations including
 * CRUD operations, valuation calculations, and bot text management.
 */
export class HouseService {
    /**
     * Create a new house
     */
    async create(data: CreateHouseInput): Promise<House> {
        return prisma.house.create({
            data: {
                title: data.title,
                description: data.description,
                agencyId: data.agencyId,
                agentId: data.agentId,
                ownerId: data.ownerId,
                userId: data.userId,
                valuation: data.valuation,
                botTexts: data.botTexts || [],
            },
        })
    }

    /**
     * Find a house by ID
     */
    async findById(id: string): Promise<House | null> {
        return prisma.house.findUnique({
            where: { id },
        })
    }

    /**
     * Find all houses with optional filters
     */
    async findAll(filters?: {
        agencyId?: string
        agentId?: string
        ownerId?: string
    }): Promise<House[]> {
        return prisma.house.findMany({
            where: filters,
            orderBy: { createdAt: "desc" },
        })
    }

    /**
     * Update a house
     */
    async update(id: string, data: UpdateHouseInput): Promise<House> {
        return prisma.house.update({
            where: { id },
            data,
        })
    }

    /**
     * Delete a house
     */
    async delete(id: string): Promise<House> {
        return prisma.house.delete({
            where: { id },
        })
    }

    /**
     * Add a bot text entry to a house
     */
    async addBotText(houseId: string, entry: BotTextEntry): Promise<House> {
        const house = await this.findById(houseId)
        if (!house) {
            throw new Error(`House with id ${houseId} not found`)
        }

        const currentTexts = (house.botTexts as BotTextEntry[]) || []
        const updatedTexts = [...currentTexts, entry]

        return prisma.house.update({
            where: { id: houseId },
            data: {
                botTexts: updatedTexts as unknown as Prisma.JsonValue,
            },
        })
    }

    /**
     * Get all bot texts for a house
     */
    async getBotTexts(houseId: string): Promise<BotTextEntry[]> {
        const house = await this.findById(houseId)
        if (!house) {
            throw new Error(`House with id ${houseId} not found`)
        }

        return (house.botTexts as BotTextEntry[]) || []
    }

    /**
     * Calculate valuation based on bot texts and other factors
     * This is where you'd implement your complex valuation logic
     */
    async calculateValuation(houseId: string): Promise<number> {
        const house = await this.findById(houseId)
        if (!house) {
            throw new Error(`House with id ${houseId} not found`)
        }

        // TODO: Implement your complex valuation algorithm here
        // This is just a placeholder example
        const botTexts = (house.botTexts as BotTextEntry[]) || []
        const baseValuation = Number(house.valuation || 0)

        // Example: Add $1000 for each bot interaction (placeholder logic)
        const calculatedValue = baseValuation + (botTexts.length * 1000)

        return calculatedValue
    }

    /**
     * Update house valuation
     */
    async updateValuation(houseId: string, valuation: number): Promise<House> {
        return prisma.house.update({
            where: { id: houseId },
            data: { valuation },
        })
    }

    /**
     * Search houses by title or description
     */
    async search(query: string): Promise<House[]> {
        return prisma.house.findMany({
            where: {
                OR: [
                    { title: { contains: query, mode: "insensitive" } },
                    { description: { contains: query, mode: "insensitive" } },
                ],
            },
        })
    }
}

// Export a singleton instance
export const houseService = new HouseService()
