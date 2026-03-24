import { prisma } from "../db"
import { CreateHouseInput, UpdateHouseInput, BotTextEntry } from "../types/house.types"
import { House, Prisma } from "../../prisma/generated/client"
import { randomUUID } from "node:crypto"

/**
 * HouseService - Business logic for House operations
 * 
 * This service handles all house-related operations including
 * CRUD operations, valuation calculations, and bot text management.
 */
export class HouseService {
    private lonLatToWebMercator(lon: number, lat: number): { x: number; y: number } {
        const R = 6378137
        const x = R * (lon * Math.PI / 180)
        const y = R * Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI / 180) / 2))
        return { x, y }
    }

    private normalizeItalianAddress(input: string): string {
        return input
            .trim()
            .replace(/\s+/g, " ")
            .replace(/\bnumero\b/gi, "")
            .replace(/\bn\.?\b/gi, "")
            .replace(/\s+,/g, ",")
            .replace(/,\s+/g, ", ")
            .replace(/\s{2,}/g, " ")
            .trim()
    }

    async getCoordinatesFromStreet(street: string): Promise<Prisma.JsonObject> {
        const rawQuery = street?.trim()
        if (!rawQuery) {
            throw new Error("Street is required")
        }

        const normalized = this.normalizeItalianAddress(rawQuery)
        const queries = Array.from(
            new Set(
                [
                    rawQuery,
                    normalized,
                    normalized.toLowerCase().includes("italia") ? normalized : `${normalized}, Italia`,
                ].filter(Boolean),
            ),
        )

        let first: { lat: string; lon: string } | undefined

        for (const q of queries) {
            const url = new URL("https://nominatim.openstreetmap.org/search")
            url.searchParams.set("format", "jsonv2")
            url.searchParams.set("q", q)
            url.searchParams.set("addressdetails", "1")
            url.searchParams.set("limit", "1")
            url.searchParams.set("countrycodes", "it")

            const res = await fetch(url.toString(), {
                headers: {
                    "Accept": "application/json",
                    "Accept-Language": "it",
                    "User-Agent": "micasa-value",
                },
            })

            if (!res.ok) {
                throw new Error(`Nominatim request failed with status ${res.status}`)
            }

            const results = (await res.json()) as Array<{
                lat: string
                lon: string
                display_name?: string
                boundingbox?: string[]
                type?: string
                class?: string
                address?: Record<string, unknown>
            }>

            const candidate = results?.[0]
            if (candidate?.lat && candidate?.lon) {
                first = candidate
                break
            }
        }

        if (!first?.lat || !first?.lon) {
            throw new Error("No coordinates found for the given street")
        }

        const lat = Number(first.lat)
        const lon = Number(first.lon)

        return {
            type: "Point",
            coordinates: [lat, lon],
        }
    }

    async setCoordinateFromStreet(houseId: string, street: string): Promise<House> {
        const coordinate = await this.getCoordinatesFromStreet(street)
        return prisma.house.update({
            where: { id: houseId },
            data: {
                coordinate: coordinate as unknown as Prisma.InputJsonValue,
            } as any,
        })
    }

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
                coordinate: data.coordinate as unknown as Prisma.InputJsonValue,
                botTexts: data.botTexts || [],
            } as any,
        })
    }

    async deleteValuationSnapshot(houseId: string, valuationId: string): Promise<House> {
        const house = await prisma.house.findUnique({
            where: { id: houseId },
            select: {
                aiHistory: true,
                aiCurrent: true,
                pricingCurrent: true,
                valuationHistory: true,
                valuation: true,
            },
        })

        if (!house) {
            throw new Error(`House with id ${houseId} not found`)
        }

        const valuationHistory = Array.isArray(house.valuationHistory) ? (house.valuationHistory as any[]) : []
        const toDelete = valuationHistory.find((v) => v && typeof v === "object" && v.id === valuationId)
        const aiSnapshotId = toDelete && typeof toDelete.aiSnapshotId === "string" ? toDelete.aiSnapshotId : null

        const nextValuationHistory = valuationHistory.filter((v) => !(v && typeof v === "object" && v.id === valuationId))

        const aiHistory = Array.isArray(house.aiHistory) ? (house.aiHistory as any[]) : []
        const nextAiHistory = aiSnapshotId
            ? aiHistory.filter((a) => !(a && typeof a === "object" && a.id === aiSnapshotId))
            : aiHistory

        const latestValuation = nextValuationHistory.length > 0 ? nextValuationHistory[nextValuationHistory.length - 1] : null
        const latestAi = nextAiHistory.length > 0 ? nextAiHistory[nextAiHistory.length - 1] : null

        const nextPricingCurrent = latestValuation && typeof latestValuation === "object" ? latestValuation.pricingCurrent ?? null : null
        const nextAiCurrent = latestAi && typeof latestAi === "object" ? latestAi.parsed ?? null : null

        const avgRaw = latestValuation?.result?.avg
        const avgNumber = typeof avgRaw === "string" || typeof avgRaw === "number" ? Number(avgRaw) : Number.NaN
        const nextValuationDecimal = Number.isFinite(avgNumber) ? avgNumber.toFixed(2) : null

        return prisma.house.update({
            where: { id: houseId },
            data: {
                aiHistory: nextAiHistory as Prisma.InputJsonValue,
                valuationHistory: nextValuationHistory as Prisma.InputJsonValue,
                aiCurrent: nextAiCurrent as any,
                pricingCurrent: nextPricingCurrent as any,
                valuation: nextValuationDecimal as any,
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
                botTexts: updatedTexts as Prisma.InputJsonValue,
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

    async calculateGeom(houseId: string): Promise<void> {
        console.log("start calculating")
        console.log(`houseId: ${houseId}`)

        const house = await prisma.house.findUnique({
            where: { id: houseId },
            select: { coordinate: true, pricingCurrent: true },
        })

        const point = house?.coordinate as any
        if (!point || point.type !== "Point" || !Array.isArray(point.coordinates) || point.coordinates.length < 2) {
            console.log(`No valid coordinate found for houseId: ${houseId}`)
            return
        }

        const a = Number(point.coordinates[0])
        const b = Number(point.coordinates[1])
        if (!Number.isFinite(a) || !Number.isFinite(b)) {
            console.log(`Invalid coordinate numbers for houseId: ${houseId}`)
            return
        }

        const aLooksLikeLat = a >= -90 && a <= 90
        const bLooksLikeLon = b >= -180 && b <= 180
        const aLooksLikeLon = a >= -180 && a <= 180
        const bLooksLikeLat = b >= -90 && b <= 90

        let lon: number
        let lat: number
        if (aLooksLikeLat && bLooksLikeLon) {
            lat = a
            lon = b
        } else if (aLooksLikeLon && bLooksLikeLat) {
            lon = a
            lat = b
        } else {
            console.log(`Coordinate values are out of expected lon/lat ranges for houseId: ${houseId}`)
            return
        }

        try {
            const polygons = await prisma.$queryRaw<any[]>(Prisma.sql`
                SELECT id, "linkZona", zona, semester
                FROM "OmiPolygon"
                WHERE ST_Covers(
                    ST_SetSRID(ST_GeomFromGeoJSON("polygonData"::text), 4326),
                    ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326)
                )
                LIMIT 1;
            `)

            const match = polygons?.[0]
            if (match) {
                console.log(`House ${houseId} is inside OmiPolygon ${match.id} (${match.linkZona}) (lon/lat=[${lon}, ${lat}])`)

                const marketValue = await prisma.omiMarketValue.findFirst({
                    where: {
                        descrTipologia: "Abitazioni civili",
                        linkZona: match.linkZona,
                        zona: match.zona,
                        semester: match.semester,
                    },
                    select: {
                        comprMin: true,
                        comprMax: true,
                    },
                })

                const geometry = {
                    omiPolygonId: match.id,
                    linkZona: match.linkZona,
                    zona: match.zona,
                    comprMin: marketValue?.comprMin ? marketValue.comprMin.toString() : null,
                    comprMax: marketValue?.comprMax ? marketValue.comprMax.toString() : null,
                }

                const currentPricing = house?.pricingCurrent && typeof house.pricingCurrent === "object" ? (house.pricingCurrent as any) : {}

                await prisma.house.update({
                    where: { id: houseId },
                    data: {
                        pricingCurrent: {
                            ...(currentPricing || {}),
                            geometry,
                        } as Prisma.InputJsonValue,
                    },
                })
            } else {
                console.log(`No OmiPolygon found containing houseId: ${houseId} (lon/lat=[${lon}, ${lat}])`)
            }
        } catch (e) {
            console.error(`PostGIS query failed while calculating price for houseId: ${houseId}`, e)
        }
    }

    async calculatePrice(houseId: string, overrideFixValues?: Record<string, unknown>): Promise<void> {
        console.log("start pricing")
        console.log(`houseId: ${houseId}`)

        const parseArea = (value: unknown): number => {
            if (typeof value === "number") {
                return Number.isFinite(value) ? value : Number.NaN
            }
            if (typeof value !== "string") {
                return Number.NaN
            }

            const normalized = value
                .trim()
                .toLowerCase()
                .replace(/,/g, ".")

            const match = normalized.match(/(-?\d+(?:\.\d+)?)/)
            if (!match) {
                return Number.NaN
            }

            const n = Number(match[1])
            return Number.isFinite(n) ? n : Number.NaN
        }

        const house = await prisma.house.findUnique({
            where: { id: houseId },
            select: {
                aiCurrent: true,
                aiHistory: true,
                pricingCurrent: true,
                valuationHistory: true,
            },
        })

        const aiCurrent = house?.aiCurrent && typeof house.aiCurrent === "object" ? (house.aiCurrent as any) : {}
        const pricingCurrent = house?.pricingCurrent && typeof house.pricingCurrent === "object" ? (house.pricingCurrent as any) : {}

        const configurationsFromAi = aiCurrent?.configurations
        const configurations: string[] = Array.isArray(configurationsFromAi)
            ? configurationsFromAi.filter((x: unknown) => typeof x === "string" && x.trim())
            : configurationsFromAi && typeof configurationsFromAi === "object"
                ? Object.keys(configurationsFromAi as Record<string, unknown>).filter((t) => typeof t === "string" && t.trim())
                : []

        const overrideByTitleLower =
            overrideFixValues && typeof overrideFixValues === "object"
                ? new Map(
                      Object.entries(overrideFixValues)
                          .filter(([k]) => typeof k === "string" && k.trim())
                          .map(([k, v]) => [k.toLowerCase(), v]),
                  )
                : new Map<string, unknown>()

        const comprMinRaw = pricingCurrent?.geometry?.comprMin
        const comprMaxRaw = pricingCurrent?.geometry?.comprMax

        const comprMin = typeof comprMinRaw === "string" || typeof comprMinRaw === "number" ? Number(comprMinRaw) : Number.NaN
        const comprMax = typeof comprMaxRaw === "string" || typeof comprMaxRaw === "number" ? Number(comprMaxRaw) : Number.NaN

        if (!Number.isFinite(comprMin) || !Number.isFinite(comprMax)) {
            console.log(`No valid geometry.comprMin/comprMax found in description for houseId: ${houseId}`)
            return
        }

        const houseParameters = aiCurrent?.houseParameters && typeof aiCurrent.houseParameters === "object"
            ? aiCurrent.houseParameters
            : {}

        const mainSurface = parseArea(houseParameters?.["Superficie"]) 
        if (!Number.isFinite(mainSurface)) {
            console.log(`No valid houseParameters.Superficie found in description for houseId: ${houseId}`)
            return
        }

        const balconySurface = parseArea(houseParameters?.["Supperficie balconi"])
        const terraceSurface = parseArea(houseParameters?.["Superficie terrazza"])
        const gardenSurface = parseArea(houseParameters?.["Superficie giardino"])
        const resedeSurface = parseArea(houseParameters?.["Superficie resede"])
        const cellarSurface = parseArea(houseParameters?.["Superficie cantina"])
        const atticSurface = parseArea(houseParameters?.["Superficie soffitta"])

        const balconiesAndTerracesSurface = [balconySurface, terraceSurface]
            .filter((x) => Number.isFinite(x))
            .reduce((sum, x) => sum + x, 0)

        const gardenLikeSurface = [gardenSurface, resedeSurface]
            .filter((x) => Number.isFinite(x))
            .reduce((sum, x) => sum + x, 0)

        const surfaceComponents = {
            main: { sqm: mainSurface, weight: 1 },
            balconiesAndTerraces: { sqm: balconiesAndTerracesSurface, weight: 0.25 },
            garden: { sqm: gardenLikeSurface, weight: 0.1 },
            cellar: { sqm: Number.isFinite(cellarSurface) ? cellarSurface : 0, weight: 0.25 },
            attic: { sqm: Number.isFinite(atticSurface) ? atticSurface : 0, weight: 0.25 },
        }

        const superficieCommerciale = Object.values(surfaceComponents)
            .reduce((sum, c) => sum + (Number(c.sqm) * Number(c.weight)), 0)

        if (!Number.isFinite(superficieCommerciale) || superficieCommerciale <= 0) {
            console.log(`Failed to compute superficieCommerciale for houseId: ${houseId}`)
            return
        }

        const baseMinTotal = comprMin * superficieCommerciale
        const baseMaxTotal = comprMax * superficieCommerciale

        const timestamp = new Date().toISOString()
        const valuationId = randomUUID()
        const aiHistory = Array.isArray(house?.aiHistory) ? (house?.aiHistory as any[]) : []
        const latestAiSnapshotId = typeof aiHistory?.[aiHistory.length - 1]?.id === "string" ? aiHistory[aiHistory.length - 1].id : null

        const basePricing = {
            superficieCommerciale: superficieCommerciale.toFixed(2),
            baseEurPerSqm: {
                comprMin: comprMin.toString(),
                comprMax: comprMax.toString(),
            },
            baseTotal: {
                comprMin: baseMinTotal.toFixed(2),
                comprMax: baseMaxTotal.toFixed(2),
            },
            components: surfaceComponents,
        }

        if (!configurations.length) {
            const nextPricingCurrent = {
                ...pricingCurrent,
                pricing: {
                    ...basePricing,
                    total: {
                        comprMin: baseMinTotal.toFixed(2),
                        comprMax: baseMaxTotal.toFixed(2),
                    },
                    adjustments: [],
                },
            }

            const average = (baseMinTotal + baseMaxTotal) / 2
            const nextValuationHistory = Array.isArray(house?.valuationHistory) ? ([...(house?.valuationHistory as any[])] as any[]) : []
            nextValuationHistory.push({
                id: valuationId,
                timestamp,
                source: "unknown",
                aiSnapshotId: latestAiSnapshotId,
                inputs: {
                    geometry: pricingCurrent?.geometry,
                    houseParameters,
                    configurations,
                },
                configurationFixValues: [],
                result: {
                    min: baseMinTotal.toFixed(2),
                    max: baseMaxTotal.toFixed(2),
                    avg: average.toFixed(2),
                },
                pricingCurrent: nextPricingCurrent,
            })

            await prisma.house.update({
                where: { id: houseId },
                data: {
                    pricingCurrent: nextPricingCurrent as Prisma.InputJsonValue,
                    valuationHistory: nextValuationHistory as Prisma.InputJsonValue,
                    valuation: average.toFixed(2) as any,
                },
            })
            return
        }

        const configurationRows = await prisma.configuration.findMany({
            where: {
                OR: configurations.map((title) => ({
                    title: { equals: title, mode: "insensitive" },
                })),
            },
            select: { title: true, fixValue: true },
        })

        const dbFixValueByTitleLower = new Map(
            configurationRows.map((r) => [r.title.toLowerCase(), r.fixValue]),
        )

        // aiCurrent.configurations can be a mapping { title: fixValueString }
        // If present, prefer those values for the valuation snapshot and computation.
        const aiFixValueByTitleLower =
            configurationsFromAi && typeof configurationsFromAi === "object" && !Array.isArray(configurationsFromAi)
                ? new Map(
                      Object.entries(configurationsFromAi as Record<string, unknown>)
                          .filter(([k]) => typeof k === "string" && k.trim())
                          .map(([k, v]) => [k.toLowerCase(), v]),
                  )
                : new Map<string, unknown>()

        let adjustedMin = baseMinTotal
        let adjustedMax = baseMaxTotal
        const adjustments: Array<{ title: string; fixValue: string }> = []
        const configurationFixValues: Array<{ title: string; fixValue: string }> = []

        for (const title of configurations) {
            const titleLower = title.toLowerCase()
            const overrideRaw = overrideByTitleLower.get(titleLower)
            const aiRaw = aiFixValueByTitleLower.get(titleLower)
            const dbRaw = dbFixValueByTitleLower.get(titleLower)

            const rawToNumber = (value: unknown): number => {
                if (value === null || value === undefined) return Number.NaN
                if (typeof value === "number") return Number.isFinite(value) ? value : Number.NaN
                if (typeof value === "string") {
                    const trimmed = value.trim()
                    if (!trimmed) return Number.NaN
                    const n = Number(trimmed)
                    return Number.isFinite(n) ? n : Number.NaN
                }
                return Number.NaN
            }

            const fixValueNumber = Number.isFinite(rawToNumber(overrideRaw))
                ? rawToNumber(overrideRaw)
                : Number.isFinite(rawToNumber(aiRaw))
                    ? rawToNumber(aiRaw)
                    : rawToNumber(dbRaw)
            if (!Number.isFinite(fixValueNumber)) {
                continue
            }

            const factor = fixValueNumber / 100
            adjustedMin *= factor
            adjustedMax *= factor
            adjustments.push({ title, fixValue: fixValueNumber.toString() })
            configurationFixValues.push({ title, fixValue: fixValueNumber.toString() })
        }

        const nextPricingCurrent = {
            ...pricingCurrent,
            pricing: {
                ...basePricing,
                total: {
                    comprMin: adjustedMin.toFixed(2),
                    comprMax: adjustedMax.toFixed(2),
                },
                adjustments,
            },
        }

        const average = (adjustedMin + adjustedMax) / 2
        const nextValuationHistory = Array.isArray(house?.valuationHistory) ? ([...(house?.valuationHistory as any[])] as any[]) : []
        nextValuationHistory.push({
            id: valuationId,
            timestamp,
            source: "unknown",
            aiSnapshotId: latestAiSnapshotId,
            inputs: {
                geometry: pricingCurrent?.geometry,
                houseParameters,
                configurations,
            },
            configurationFixValues,
            result: {
                min: adjustedMin.toFixed(2),
                max: adjustedMax.toFixed(2),
                avg: average.toFixed(2),
            },
            pricingCurrent: nextPricingCurrent,
        })

        await prisma.house.update({
            where: { id: houseId },
            data: {
                pricingCurrent: nextPricingCurrent as Prisma.InputJsonValue,
                valuationHistory: nextValuationHistory as Prisma.InputJsonValue,
                valuation: average.toFixed(2) as any,
            },
        })
    }

    async printValuationSnapshot(houseId: string, valuationId: string): Promise<void> {
        const house = await prisma.house.findUnique({
            where: { id: houseId },
            select: { valuationHistory: true, title: true },
        })

        if (!house) {
            console.log(`[print] House not found: ${houseId}`)
            return
        }

        const history = Array.isArray(house.valuationHistory) ? (house.valuationHistory as any[]) : []
        const snap = history.find((v) => v && typeof v === "object" && v.id === valuationId)

        if (!snap) {
            console.log(`[print] Valuation snapshot not found: ${valuationId} (house=${houseId})`)
            return
        }

        console.log(`[print] House: ${house.title} (${houseId})`) 
        console.log(`[print] Valuation snapshot: ${valuationId}`)
        // console.log(JSON.stringify(snap, null, 2))
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
