import { Telegraf, Markup } from "telegraf"
import { NextRequest } from "next/server"
import { openaiService } from "@/lib/openai"
import { houseService } from "@/lib/services/house.service"
import { createSession, getActiveSession, endSession, isSessionActive, cleanupExpiredSessions } from "@/lib/session"
import prisma from "@/lib/prisma"

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN!)

// Store house IDs per user in memory (sessions are in DB)
const userHouses = new Map<number, string>()

// Store users waiting for email verification
const awaitingEmail = new Set<number>()

// Helper function to process house data with OpenAI when session ends
async function processHouseDataWithOpenAI(houseId: string, telegramUserId: number) {
    try {
        const house = await houseService.findById(houseId)
        if (!house || !house.botTexts) {
            console.log(`[User ${telegramUserId}] No house data found for processing`)
            return null
        }

        const botTexts = Array.isArray(house.botTexts) ? house.botTexts : []
        if (botTexts.length === 0) {
            console.log(`[User ${telegramUserId}] No messages to process in house ${houseId}`)
            return null
        }

        // Format all messages for OpenAI
        const messagesText = botTexts.map((entry: any) => {
            const timestamp = new Date(entry.timestamp).toLocaleString()
            return `[${timestamp}] ${entry.type.toUpperCase()}: ${entry.message}`
        }).join('\n\n')

        console.log(`[User ${telegramUserId}] Processing ${botTexts.length} messages with OpenAI...`)

        // Fetch configurations with houseValuation = true
        const houseConfigurations = await prisma.configuration.findMany({
            where: {
                houseValuation: true
            },
            select: {
                title: true
            }
        })

        const configurationTitles = houseConfigurations.map(config => config.title)
        const configurationsJson = JSON.stringify(configurationTitles, null, 2)
        
        console.log(`[User ${telegramUserId}] Found ${configurationTitles.length} house valuation configurations:`, configurationsJson)

        // Fetch house_parameters configuration
        const houseParametersConfig = await prisma.configuration.findFirst({
            where: {
                title: "house_parameters"
            },
            select: {
                properties: true
            }
        })

        const houseParameters = houseParametersConfig?.properties || {}
        const houseParametersJson = JSON.stringify(houseParameters, null, 2)
        
        console.log(`[User ${telegramUserId}] House parameters configuration:`, houseParametersJson)

        // Prepare messages for OpenAI
        const messages = [
            {
                role: "system" as const,
                content: "Sei un agente immobiliare e stai valutando una casa. Devi organizzare le informazioni in modo da poter utilizzare tutte le informazioni utili per valutare il prezzo in metro quadro della casa."
            },
            {
                role: "assistant" as const,
                content: `Organizza le informazioni della casa che ricevi in un modo pulito e chiaro. Usa le informazioni che ricevi per riempire questo json fin dove trovi le informazioni utili nel messaggio di testo ricevuto ${houseParametersJson}, e metti la risposta sotto la chiave houseParameters. inoltre ritorna un Title per la casa, usa l'indirizzo completo per il title e altre informazioni unici e particolari per evvidenziare la casa e renderla unica. la risposta deve andare sotto la chiave title.\n Inoltre riempi anche quest altro json ${configurationsJson} della valutazione della casa con le informazioni che trovi nel messaggio di testo ricevuto. e metti la risposta sotto la chiave configurations.\nIMPORTANTE: Ritorna SOLO JSON valido senza commenti. Non includere // o /* */ nel JSON.`
            },
            {
                role: "user" as const,
                content: `Ecco le informazioni ricevute:\n\n${messagesText}`
            }
        ]

        // Send to OpenAI
        const response = await openaiService.chatWithHistory(messages)
        console.log(`[User ${telegramUserId}] OpenAI response:`, response)

        // Parse JSON response
        try {
            // Try to extract JSON from response (in case there's markdown code blocks)
            let jsonString = response.trim()
            const jsonMatch = jsonString.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/)
            if (jsonMatch) {
                jsonString = jsonMatch[1]
            }

            // Remove comments from JSON (OpenAI sometimes adds them)
            // Remove single-line comments: // comment
            jsonString = jsonString.replace(/\/\/.*$/gm, '')
            // Remove multi-line comments: /* comment */
            jsonString = jsonString.replace(/\/\*[\s\S]*?\*\//g, '')

            const parsedResponse = JSON.parse(jsonString)
            console.log(`[User ${telegramUserId}] Parsed response:`, JSON.stringify(parsedResponse, null, 2))
            
            // Update house with title and description
            if (parsedResponse.title || parsedResponse.houseParameters || parsedResponse.configurations) {
                // Build description from houseParameters and configurations
                const descriptionData: any = {}
                
                if (parsedResponse.houseParameters) {
                    descriptionData.houseParameters = parsedResponse.houseParameters
                }
                
                if (parsedResponse.configurations) {
                    descriptionData.configurations = parsedResponse.configurations
                }
                
                const descriptionString = Object.keys(descriptionData).length > 0 
                    ? JSON.stringify(descriptionData, null, 2)
                    : undefined
                
                const updateData = {
                    title: parsedResponse.title || house.title,
                    description: descriptionString || house.description || undefined,
                }
                console.log(`[User ${telegramUserId}] Updating house ${houseId} with:`, JSON.stringify(updateData, null, 2))
                
                const updatedHouse = await houseService.update(houseId, updateData)
                console.log(`[User ${telegramUserId}] House updated successfully. New title: "${updatedHouse.title}"`)
            } else {
                console.log(`[User ${telegramUserId}] No title, houseParameters or configurations in parsed response`)
            }

            return parsedResponse
        } catch (parseError) {
            console.error(`[User ${telegramUserId}] Error parsing OpenAI JSON response:`, parseError)
            console.log(`[User ${telegramUserId}] Raw response:`, response)
            // Return raw response if parsing fails
            return { rawResponse: response }
        }
    } catch (error) {
        console.error(`[User ${telegramUserId}] Error processing house data with OpenAI:`, error)
        return null
    }
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

        // Store house ID for this Telegram user
        userHouses.set(telegramUserId, house.id)

        await ctx.reply(
            "✅ Session started! Send me messages or voice notes and I'll record them in your house.\n\n⏱️ Session will expire in 1 hour or when you click '❌ End'.",
            mainKeyboard
        )
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

    const hasSession = await isSessionActive(telegramId)
    if (!hasSession) {
        return ctx.reply("⚠️ No active session. Click '➕ Add' to start a session first.", mainKeyboard)
    }

    await ctx.reply("📂 Select mode activated.", mainKeyboard)
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
            
            if (aiResponse && aiResponse.title && aiResponse.description) {
                await ctx.reply(
                    `✅ Session ended!\n\n🏠 ${aiResponse.title}\n\n📋 ${aiResponse.description}`,
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
            await ctx.reply("❌ Sorry, I couldn't transcribe that. Please try again.", mainKeyboard)
        }
    } else {
        await ctx.reply("Click '➕ Add' first to start transcribing voice messages.", mainKeyboard)
    }
})

// Catch-all: show keyboard for any other message
bot.on("message", async (ctx) => {
    const userId = ctx.from?.id
    const telegramId = userId?.toString()
    const messageText = ctx.text
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
            await ctx.reply("❌ No active house found. Please click '➕ Add' first.", mainKeyboard)
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
