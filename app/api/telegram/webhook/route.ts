import { Telegraf, Markup } from "telegraf"
import { NextRequest } from "next/server"
import { openaiService } from "@/lib/openai"
import { houseService } from "@/lib/services/house.service"
import { processHouseDataWithOpenAI as processHouseDataWithOpenAIShared } from "@/lib/services/house-ai.service"
import { createSession, getActiveSession, endSession, isSessionActive, cleanupExpiredSessions } from "@/lib/session"
import prisma from "@/lib/prisma"

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN!)

// Store house IDs per user in memory (sessions are in DB)
const userHouses = new Map<number, string>()

// Store users we asked to share location (value is the houseId to update)
const awaitingLocationShare = new Map<number, string>()

// Store users currently searching for a house to select
const awaitingHouseSearch = new Set<number>()

// Store users waiting for email verification
const awaitingEmail = new Set<number>()

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

function isValidGeoPoint(value: unknown): value is { type: "Point"; coordinates: [number, number] } {
    if (!value || typeof value !== "object") return false
    const v = value as any
    if (v.type !== "Point" || !Array.isArray(v.coordinates) || v.coordinates.length < 2) return false
    const a = Number(v.coordinates[0])
    const b = Number(v.coordinates[1])
    return Number.isFinite(a) && Number.isFinite(b)
}

async function reverseGeocode(lat: number, lon: number): Promise<{
    street?: string
    houseNumber?: string
    city?: string
    displayName?: string
} | null> {
    try {
        const url = new URL("https://nominatim.openstreetmap.org/reverse")
        url.searchParams.set("format", "jsonv2")
        url.searchParams.set("lat", String(lat))
        url.searchParams.set("lon", String(lon))
        url.searchParams.set("addressdetails", "1")

        const res = await fetch(url.toString(), {
            headers: {
                "Accept": "application/json",
                "Accept-Language": "it",
                "User-Agent": "micasa-value",
            },
        })

        if (!res.ok) {
            return null
        }

        const json = (await res.json()) as any
        const addr = json?.address
        const street = typeof addr?.road === "string" ? addr.road : undefined
        const houseNumber = typeof addr?.house_number === "string" ? addr.house_number : undefined
        const cityCandidate = addr?.city ?? addr?.town ?? addr?.village ?? addr?.municipality
        const city = typeof cityCandidate === "string" ? cityCandidate : undefined
        const displayName = typeof json?.display_name === "string" ? json.display_name : undefined

        return { street, houseNumber, city, displayName }
    } catch {
        return null
    }
}

async function maybeAskForLocation(ctx: any, telegramUserId: number, houseId: string) {
    const house = await prisma.house.findUnique({
        where: { id: houseId },
        select: { coordinate: true },
    })

    if (isValidGeoPoint(house?.coordinate)) {
        awaitingLocationShare.delete(telegramUserId)
        return
    }

    awaitingLocationShare.set(telegramUserId, houseId)
    await ctx.reply(
        "📍 This house has no coordinates yet. Do you want to share the location now?",
        Markup.keyboard([[Markup.button.locationRequest("📍 Share location"), "Skip"]])
            .resize()
            .oneTime(),
    )
}

// Helper function to process house data with OpenAI when session ends
async function processHouseDataWithOpenAI(houseId: string, telegramUserId: number) {
    return processHouseDataWithOpenAIShared(houseId, telegramUserId.toString())
}

// Helper to create the persistent keyboard
const mainKeyboard = Markup.keyboard([
    ["➕ Add", "📂 Select"],
    ["❌ End"],
])
    .resize()
    .persistent()

// Start command
bot.start(async (ctx) => {
    const userId = ctx.from?.id
    const telegramId = userId?.toString()

    if (!telegramId || !userId) {
        return ctx.reply("❌ Error: Cannot identify user.")
    }

    try {
        // Check if user already linked their Telegram account
        const user = await prisma.user.findUnique({
            where: { telegramId }
        })

        if (user) {
            // User is already registered
            const activeSession = await getActiveSession(telegramId)
            if (activeSession) {
                return ctx.reply(
                    "You already have an active session! Click '❌ End' to end it first.",
                    mainKeyboard
                )
            }
            return ctx.reply(
                `Welcome back, ${user.name || user.email}! 👋\n\nUse the buttons below to start:`,
                mainKeyboard
            )
        }

        // New user - ask for email
        awaitingEmail.add(userId)
        return ctx.reply(
            "👋 Welcome!\n\nPlease send me your email address to get started."
        )
    } catch (error) {
        console.error(`[User ${userId}] Error in start command:`, error)
        return ctx.reply("❌ An error occurred. Please try again.")
    }
})

// Button handlers (using text matching instead of callbacks)
bot.hears("➕ Add", async (ctx) => {
    const telegramUserId = ctx.from?.id
    const telegramId = telegramUserId?.toString()

    if (!telegramId || !telegramUserId) {
        return ctx.reply("❌ Error: Cannot identify user.", mainKeyboard)
    }

    try {
        // Check if user is verified
        const user = await prisma.user.findUnique({
            where: { telegramId }
        })

        if (!user) {
            return ctx.reply(
                "⚠️ Please use /start to register your account first.",
                mainKeyboard
            )
        }

        // Check if session already exists
        const existingSession = await getActiveSession(telegramId)
        if (existingSession) {
            return ctx.reply(
                "⚠️ You already have an active session! Click '❌ End' to end it first.",
                mainKeyboard
            )
        }

        // Create new session (expires in 1 hour)
        const session = await createSession(telegramId, user.id)
        console.log(`[User ${telegramUserId}] Created session ${session.id}, expires at ${session.expiresAt}`)

        // Create NEW house for this session linked to the user
        const house = await houseService.create({
            title: `House - ${user.name || user.email} - ${new Date().toISOString()}`,
            description: `House created for session ${session.id}`,
            userId: user.id,
            botTexts: [],
        })
        console.log(`[User ${telegramUserId}] Created new house: ${house.id} for session ${session.id}`)

        const address = extractAddressFromHouseDescription(house.description)
        if (address) {
            try {
                await houseService.setCoordinateFromStreet(house.id, address)
                console.log(`[User ${telegramUserId}] House coordinate set on create from address: ${address}`)
            } catch (geoError) {
                console.error(`[User ${telegramUserId}] Geocoding error on create for house ${house.id}:`, geoError)
            }
        }

        // Store house ID for this Telegram user
        userHouses.set(telegramUserId, house.id)

        await ctx.reply(
            "✅ Session started! Send me messages or voice notes and I'll record them in your house.\n\n⏱️ Session will expire in 1 hour or when you click '❌ End'.",
            mainKeyboard
        )

        await maybeAskForLocation(ctx, telegramUserId, house.id)
    } catch (error) {
        console.error(`[User ${telegramUserId}] Error starting session:`, error)
        await ctx.reply("❌ Error starting session. Please try again.", mainKeyboard)
    }
})

bot.hears("📂 Select", async (ctx) => {
    const userId = ctx.from?.id
    const telegramId = userId?.toString()

    if (!telegramId) {
        return ctx.reply("❌ Error: Cannot identify user.", mainKeyboard)
    }

    const user = await prisma.user.findUnique({
        where: { telegramId },
    })

    if (!userId || !user) {
        return ctx.reply("⚠️ Please use /start to register your account first.", mainKeyboard)
    }

    const hasSession = await isSessionActive(telegramId)
    if (!hasSession) {
        const session = await createSession(telegramId, user.id)
        console.log(`[User ${userId}] Created session ${session.id} (select mode), expires at ${session.expiresAt}`)
    }

    awaitingHouseSearch.add(userId)
    await ctx.reply(
        "🔎 Send me a search term to find one of your houses (by title).\n\nExample: \"Pisa\" or \"Marco Polo\"",
        mainKeyboard,
    )
})

bot.action(/^select_house:(.+)$/, async (ctx) => {
    const userId = ctx.from?.id
    const telegramId = userId?.toString()
    const houseId = ctx.match?.[1]

    if (!userId || !telegramId || !houseId) {
        await ctx.answerCbQuery("Invalid selection")
        return
    }

    try {
        const user = await prisma.user.findUnique({
            where: { telegramId },
            select: { id: true },
        })

        if (!user) {
            await ctx.answerCbQuery("Please /start first")
            return
        }

        const house = await prisma.house.findFirst({
            where: { id: houseId, userId: user.id },
            select: { id: true, title: true, coordinate: true },
        })

        if (!house) {
            await ctx.answerCbQuery("House not found")
            return
        }

        userHouses.set(userId, house.id)
        awaitingHouseSearch.delete(userId)
        await ctx.answerCbQuery("Selected")
        await ctx.reply(`✅ Selected house: ${house.title}`, mainKeyboard)

        if (!isValidGeoPoint(house.coordinate)) {
            await maybeAskForLocation(ctx, userId, house.id)
        }
    } catch (e) {
        console.error(`[User ${userId}] Error selecting house:`, e)
        await ctx.answerCbQuery("Error")
        await ctx.reply("❌ Error selecting house. Please try again.", mainKeyboard)
    }
})

bot.hears("Skip", async (ctx) => {
    const userId = ctx.from?.id
    if (!userId) return
    if (awaitingLocationShare.has(userId)) {
        awaitingLocationShare.delete(userId)
        await ctx.reply("Okay, skipping location for now.", mainKeyboard)
    }
})

bot.on("location", async (ctx) => {
    const userId = ctx.from?.id
    if (!userId) return

    const loc = (ctx.message as any)?.location
    const lat = Number(loc?.latitude)
    const lon = Number(loc?.longitude)
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
        await ctx.reply("❌ Invalid location received.", mainKeyboard)
        return
    }

    const houseId = awaitingLocationShare.get(userId) ?? userHouses.get(userId)
    if (!houseId) {
        await ctx.reply("⚠️ No active house selected. Please add or select a house first.", mainKeyboard)
        return
    }

    try {
        await prisma.house.update({
            where: { id: houseId },
            data: {
                coordinate: {
                    type: "Point",
                    coordinates: [lat, lon],
                } as any,
            },
        })

        const geo = await reverseGeocode(lat, lon)
        const addressLine = geo?.street
            ? `${geo.street}${geo.houseNumber ? ` ${geo.houseNumber}` : ""}${geo.city ? `, ${geo.city}` : ""}`
            : geo?.displayName

        if (addressLine) {
            try {
                await houseService.addBotText(houseId, {
                    timestamp: new Date().toISOString(),
                    userId: userId,
                    message: `Indirizzo: ${addressLine}`,
                    type: "text",
                })
            } catch (e) {
                console.error(`[User ${userId}] Error saving reverse-geocoded address to botTexts:`, e)
            }
        }

        awaitingLocationShare.delete(userId)
        await ctx.reply("✅ Location saved.", mainKeyboard)
    } catch (e) {
        console.error(`[User ${userId}] Error updating house coordinate from Telegram location:`, e)
        await ctx.reply("❌ Error saving location. Please try again.", mainKeyboard)
    }
})

bot.hears("❌ End", async (ctx) => {
    const userId = ctx.from?.id
    const telegramId = userId?.toString()

    if (!telegramId || !userId) {
        return ctx.reply("❌ Error: Cannot identify user.", mainKeyboard)
    }

    try {
        const session = await getActiveSession(telegramId)
        
        if (!session) {
            return ctx.reply("⚠️ No active session to end.", mainKeyboard)
        }

        // Get house ID before ending session
        const houseId = userHouses.get(userId)
        
        // End the session
        await endSession(session.id)
        console.log(`[User ${userId}] Ended session ${session.id}`)
        
        // Process house data with OpenAI
        if (houseId) {
            await ctx.reply("🤖 Processing your session data with AI...", mainKeyboard)
            const aiResponse = await processHouseDataWithOpenAI(houseId, userId)
            
            if (aiResponse && aiResponse.title) {
                await ctx.reply(
                    `✅ Session ended!\n\n🏠 ${aiResponse.title}`,
                    mainKeyboard
                )
            } else if (aiResponse && aiResponse.rawResponse) {
                await ctx.reply(`✅ Session ended!\n\n📊 Analysis:\n${aiResponse.rawResponse}`, mainKeyboard)
            } else {
                await ctx.reply("✅ Session ended. Bye 👋\n\nClick '➕ Add' to start a new session.", mainKeyboard)
            }
            
            // Clear house ID from memory
            userHouses.delete(userId)
        } else {
            await ctx.reply("✅ Session ended. Bye 👋\n\nClick '➕ Add' to start a new session.", mainKeyboard)
        }
    } catch (error) {
        console.error(`[User ${userId}] Error ending session:`, error)
        await ctx.reply("❌ Error ending session. Please try again.", mainKeyboard)
    }
})

// Voice message handler
bot.on("voice", async (ctx) => {
    const userId = ctx.from?.id
    const telegramId = userId?.toString()

    if (!telegramId) {
        return ctx.reply("❌ Error: Cannot identify user.", mainKeyboard)
    }

    const hasSession = await isSessionActive(telegramId)

    if (hasSession) {
        try {
            const voice = ctx.message.voice
            console.log(`[User ${userId}] Voice message received, duration: ${voice.duration}s`)

            // Get file from Telegram
            const fileLink = await ctx.telegram.getFileLink(voice.file_id)
            console.log(`[User ${userId}] Downloading from: ${fileLink.href}`)

            // Download the voice file
            const response = await fetch(fileLink.href)
            const arrayBuffer = await response.arrayBuffer()
            const buffer = Buffer.from(arrayBuffer)

            // Transcribe with OpenAI
            await ctx.reply("🎤 Transcribing...", mainKeyboard)
            const transcription = await openaiService.transcribe(buffer, `voice_${voice.file_id}.ogg`)
            console.log(`[User ${userId}] Transcription: ${transcription}`)

            // Save to database
            const houseId = userHouses.get(userId)
            if (houseId) {
                try {
                    const updatedHouse = await houseService.addBotText(houseId, {
                        timestamp: new Date().toISOString(),
                        userId: userId,
                        message: transcription,
                        type: "transcription",
                    })
                    const messageCount = Array.isArray(updatedHouse.botTexts) ? updatedHouse.botTexts.length : 0
                    console.log(`[User ${userId}] Saved transcription to house ${houseId}. Total messages: ${messageCount}`)
                    
                    // Send transcription back with count
                    await ctx.reply(`📝 Transcription:\n${transcription}\n\n✅ Saved! (Total: ${messageCount})`, mainKeyboard)
                } catch (dbError) {
                    console.error(`[User ${userId}] Database save error:`, dbError)
                    await ctx.reply(`📝 Transcription:\n${transcription}\n\n⚠️ Warning: Could not save to database.`, mainKeyboard)
                }
            } else {
                console.error(`[User ${userId}] No house ID found for this user`)
                await ctx.reply(`📝 Transcription:\n${transcription}\n\n⚠️ Warning: No active house found.`, mainKeyboard)
            }
        } catch (error) {
            console.error(`[User ${userId}] Transcription error:`, error)
            const status = (error as any)?.status
            const retryAfterMs = (error as any)?.retryAfterMs
            if (status === 429) {
                const seconds = typeof retryAfterMs === "number" ? Math.ceil(retryAfterMs / 1000) : null
                await ctx.reply(
                    `⚠️ OpenAI rate limit reached. Please try again${seconds ? ` in ${seconds}s` : " in a moment"}.`,
                    mainKeyboard,
                )
            } else {
                await ctx.reply("❌ Sorry, I couldn't transcribe that. Please try again.", mainKeyboard)
            }
        }
    } else {
        await ctx.reply("Click '➕ Add' first to start transcribing voice messages.", mainKeyboard)
    }
})

// Catch-all: show keyboard for any other message
bot.on("text", async (ctx) => {
    const userId = ctx.from?.id
    const telegramId = userId?.toString()
    const messageText = ctx.message.text
    const botInfo = ctx.botInfo

    if (!telegramId || !userId) {
        return ctx.reply("❌ Error: Cannot identify user.")
    }

    // Check if user is waiting for email verification
    if (awaitingEmail.has(userId) && messageText) {
        const email = messageText.trim().toLowerCase()
        
        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(email)) {
            return ctx.reply("❌ Invalid email format. Please send a valid email address.")
        }

        try {
            // Check if user exists with this email
            const user = await prisma.user.findUnique({
                where: { email }
            })

            if (user) {
                // Update user with telegramId
                await prisma.user.update({
                    where: { email },
                    data: { telegramId }
                })

                awaitingEmail.delete(userId)
                console.log(`[User ${userId}] Linked Telegram account to email: ${email}`)

                return ctx.reply(
                    `✅ Account linked successfully!\n\nWelcome ${user.name || email}! 👋\n\nUse the buttons below to start:`,
                    mainKeyboard
                )
            } else {
                // Email not found in database
                awaitingEmail.delete(userId)
                console.log(`[User ${userId}] Email not found: ${email}`)

                return ctx.reply(
                    "❌ Email not found in our system.\n\n📞 Please contact our helpdesk at:\n+39 329 586 2621"
                )
            }
        } catch (error) {
            console.error(`[User ${userId}] Error verifying email:`, error)
            return ctx.reply("❌ An error occurred. Please try again or contact support.")
        }
    }

    // Check if user has verified their account
    const user = await prisma.user.findUnique({
        where: { telegramId }
    })

    if (!user) {
        return ctx.reply(
            "⚠️ Please use /start to register your account first."
        )
    }

    const hasSession = await isSessionActive(telegramId)

    if (userId && awaitingHouseSearch.has(userId) && messageText) {
        const query = messageText.trim()
        if (!query) {
            return ctx.reply("🔎 Please send a non-empty search term.", mainKeyboard)
        }

        const houses = await prisma.house.findMany({
            where: {
                userId: user.id,
                title: { contains: query, mode: "insensitive" },
            },
            select: { id: true, title: true, updatedAt: true },
            orderBy: { updatedAt: "desc" },
            take: 10,
        })

        if (!houses.length) {
            return ctx.reply("No houses found. Try another search.", mainKeyboard)
        }

        const keyboard = Markup.inlineKeyboard(
            houses.map((h) => [Markup.button.callback(h.title, `select_house:${h.id}`)]),
        )

        return ctx.reply("Select a house:", keyboard)
    }

    if (hasSession && messageText) {
        console.log(`[User ${userId}] Message: ${messageText}`)

        // Save text message to database
        const houseId = userHouses.get(userId)
        if (houseId) {
            try {
                const updatedHouse = await houseService.addBotText(houseId, {
                    timestamp: new Date().toISOString(),
                    userId: userId,
                    message: messageText,
                    type: "text",
                })
                const messageCount = Array.isArray(updatedHouse.botTexts) ? updatedHouse.botTexts.length : 0
                console.log(`[User ${userId}] Saved text message to house ${houseId}. Total messages: ${messageCount}`)
                
                await ctx.reply(`✅ Message saved! (Total: ${messageCount})`, mainKeyboard)
            } catch (dbError) {
                console.error(`[User ${userId}] Database save error:`, dbError)
                await ctx.reply("❌ Error saving message. Please try again.", mainKeyboard)
            }
        } else {
            console.error(`[User ${userId}] No house ID found for this user`)
            await ctx.reply("❌ No active house found. Please click '📂 Select' to choose one (or '➕ Add' to create a new one).", mainKeyboard)
        }
    } else {
        await ctx.reply("Use the buttons below:", mainKeyboard)
    }
})

// Periodic cleanup of expired sessions (every 5 minutes)
setInterval(async () => {
    try {
        const expiredSessions = await cleanupExpiredSessions()
        
        if (expiredSessions.length > 0) {
            console.log(`[Session Cleanup] Found ${expiredSessions.length} expired sessions`)
            
            // Process each expired session with OpenAI
            for (const session of expiredSessions) {
                try {
                    // Find house associated with this session's telegramId
                    const user = await prisma.user.findUnique({
                        where: { telegramId: session.telegramId },
                        include: { houses: true }
                    })
                    
                    if (user && user.houses.length > 0) {
                        // Get the most recent house (likely the one for this session)
                        const house = user.houses[user.houses.length - 1]
                        
                        console.log(`[Session Cleanup] Processing house ${house.id} for expired session ${session.id}`)
                        await processHouseDataWithOpenAI(house.id, parseInt(session.telegramId))
                    }
                } catch (processError) {
                    console.error(`[Session Cleanup] Error processing session ${session.id}:`, processError)
                }
            }
            
            console.log(`[Session Cleanup] Processed ${expiredSessions.length} expired sessions`)
        }
    } catch (error) {
        console.error("[Session Cleanup] Error:", error)
    }
}, 5 * 60 * 1000)

export async function POST(req: NextRequest) {
    const body = await req.json()
    await bot.handleUpdate(body)
    return new Response("OK")
}
