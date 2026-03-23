import { openaiService } from "@/lib/openai"
import { houseService } from "@/lib/services/house.service"
import prisma from "@/lib/prisma"
import { randomUUID } from "node:crypto"

function extractAddressFromHouseDescription(description?: string | null): string | null {
    if (!description) return null

    try {
        const parsed = JSON.parse(description)
        const addr = parsed?.houseParameters?.Indirizzo
        return typeof addr === "string" && addr.trim() ? addr.trim() : null
    } catch {
        return null
    }
}

export async function processHouseDataWithOpenAI(houseId: string, logUserId: string): Promise<any> {
    try {
        const house = await houseService.findById(houseId)
        if (!house || !house.botTexts) {
            console.log(`[User ${logUserId}] No house data found for processing`)
            return null
        }

        const botTexts = Array.isArray(house.botTexts) ? house.botTexts : []
        if (botTexts.length === 0) {
            console.log(`[User ${logUserId}] No messages to process in house ${houseId}`)
            return null
        }

        const messagesText = botTexts
            .map((entry: any) => {
                const timestamp = new Date(entry.timestamp).toLocaleString()
                return `[${timestamp}] ${entry.type.toUpperCase()}: ${entry.message}`
            })
            .join("\n\n")

        console.log(`[User ${logUserId}] Processing ${botTexts.length} messages with OpenAI...`)

        const houseConfigurations = await prisma.configuration.findMany({
            where: {
                houseValuation: true,
            },
            select: {
                title: true,
                fixValue: true,
            },
        })

        const configurationTitles = houseConfigurations.map((config) => config.title)
        const configurationsJson = JSON.stringify(configurationTitles, null, 2)

        const fixValueByTitleLower = new Map(
            houseConfigurations.map((c) => [c.title.toLowerCase(), c.fixValue]),
        )

        console.log(
            `[User ${logUserId}] Found ${configurationTitles.length} house valuation configurations:`,
            configurationsJson,
        )

        const houseParametersConfig = await prisma.configuration.findFirst({
            where: {
                title: "house_parameters",
            },
            select: {
                properties: true,
            },
        })

        const houseParameters = houseParametersConfig?.properties || {}
        const houseParametersJson = JSON.stringify(houseParameters, null, 2)

        console.log(`[User ${logUserId}] House parameters configuration:`, houseParametersJson)

        const messages = [
            {
                role: "system" as const,
                content:
                    "Sei un agente immobiliare e stai valutando una casa. Devi organizzare le informazioni in modo da poter utilizzare tutte le informazioni utili per valutare il prezzo in metro quadro della casa.",
            },
            {
                role: "assistant" as const,
                content: `Organizza le informazioni della casa che ricevi in un modo pulito e chiaro.

                Usa le informazioni che ricevi per riempire questo json fin dove trovi le informazioni utili nel messaggio di testo ricevuto ${houseParametersJson}, e metti la risposta sotto la chiave houseParameters.
                IMPORTANTE: il JSON houseParametersJson sopra contiene per ogni chiave il TIPO atteso (string, int, bool). Devi validare e formattare ogni valore in base a quel tipo: se il tipo è string inserisci una stringa; se è int inserisci un numero intero; se è bool inserisci true/false. Se non sei sicuro o il valore non è valido per quel tipo, metti null per quella chiave.

                Inoltre ritorna un Title per la casa: usa l'indirizzo completo per il title e altre informazioni uniche e particolari per rendere la casa distinguibile. La risposta deve andare sotto la chiave title.

                Inoltre scrivi una descrizione "bella", in italiano, adatta ad un annuncio immobiliare, utilizzando solo i dati presenti nei messaggi (se un dato non è presente, non inventarlo). Metti questa descrizione sotto la chiave description.

                Infine riempi anche quest'altro json ${configurationsJson} della valutazione della casa con le informazioni che trovi nel messaggio di testo ricevuto, e metti la risposta sotto la chiave configurations.

                IMPORTANTE: Ritorna SOLO JSON valido senza commenti. Non includere // o /* */ nel JSON.`,
            },
            {
                role: "user" as const,
                content: `Ecco le informazioni ricevute:\n\n${messagesText}`,
            },
        ]

        const response = await openaiService.chatWithHistory(messages)
        console.log(`[User ${logUserId}] OpenAI response:`, response)

        try {
            let jsonString = response.trim()
            const jsonMatch = jsonString.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/)
            if (jsonMatch) {
                jsonString = jsonMatch[1]
            }

            jsonString = jsonString.replace(/\/\/.*$/gm, "")
            jsonString = jsonString.replace(/\/\*[\s\S]*?\*\//g, "")

            const parsedResponse = JSON.parse(jsonString)
            console.log(`[User ${logUserId}] Parsed response:`, JSON.stringify(parsedResponse, null, 2))

            if (parsedResponse.title || parsedResponse.houseParameters || parsedResponse.configurations || parsedResponse.description) {
                const timestamp = new Date().toISOString()
                const aiSnapshotId = randomUUID()

                const aiParsed: any = {}
                if (parsedResponse.houseParameters) aiParsed.houseParameters = parsedResponse.houseParameters
                if (parsedResponse.configurations) {
                    const selectedTitles: string[] = Array.isArray(parsedResponse.configurations)
                        ? parsedResponse.configurations.filter((x: unknown) => typeof x === "string" && x.trim())
                        : []

                    const configMap: Record<string, string> = {}
                    for (const title of selectedTitles) {
                        const raw = fixValueByTitleLower.get(title.toLowerCase())
                        if (raw === null || raw === undefined) continue

                        // Prisma Decimal can be string-ish; normalize to string and trim trailing .00
                        const asString = String(raw)
                        configMap[title] = asString.replace(/\.00$/, "")
                    }

                    aiParsed.configurations = configMap
                }
                if (parsedResponse.title) aiParsed.title = parsedResponse.title
                if (parsedResponse.description) aiParsed.description = parsedResponse.description

                const currentAiHistory = Array.isArray((house as any).aiHistory) ? (house as any).aiHistory : []
                const nextAiHistory = [
                    ...currentAiHistory,
                    {
                        id: aiSnapshotId,
                        timestamp,
                        source: "unknown",
                        model: "unknown",
                        promptVersion: "v1",
                        rawResponse: response,
                        parsed: aiParsed,
                    },
                ]

                const updateData: any = {
                    title: parsedResponse.title || house.title,
                    description: typeof parsedResponse.description === "string" ? parsedResponse.description : house.description,
                    aiCurrent: aiParsed,
                    aiHistory: nextAiHistory,
                }

                console.log(`[User ${logUserId}] Updating house ${houseId} with:`, JSON.stringify(updateData, null, 2))

                const updatedHouse = await houseService.update(houseId, updateData)
                console.log(`[User ${logUserId}] House updated successfully. New title: "${updatedHouse.title}"`)

                const addressFromResponse = parsedResponse?.houseParameters?.Indirizzo
                const address =
                    typeof addressFromResponse === "string" && addressFromResponse.trim()
                        ? addressFromResponse.trim()
                        : extractAddressFromHouseDescription(updatedHouse.description)

                if (address) {
                    try {
                        await houseService.setCoordinateFromStreet(houseId, address)
                        console.log(`[User ${logUserId}] House coordinate updated from address: ${address}`)
                    } catch (geoError) {
                        console.error(`[User ${logUserId}] Geocoding error for house ${houseId}:`, geoError)
                    }
                }
            } else {
                console.log(`[User ${logUserId}] No title, houseParameters or configurations in parsed response`)
            }

            return parsedResponse
        } catch (parseError) {
            console.error(`[User ${logUserId}] Error parsing OpenAI JSON response:`, parseError)
            console.log(`[User ${logUserId}] Raw response:`, response)
            return { rawResponse: response }
        }
    } catch (error) {
        console.error(`[User ${logUserId}] Error processing house data with OpenAI:`, error)
        return null
    }
}
