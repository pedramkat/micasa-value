import { openai } from "@ai-sdk/openai"
import { generateText, streamText } from "ai"
import { createOpenAI } from "@ai-sdk/openai"
import { costTrackerService } from "@/lib/services/cost-tracker.service"

type TrackContext = {
    userId?: string | null
    houseId?: string | null
    operation?: string
    endpoint?: string
    category?: "text" | "voice" | "image"
    provider?: "openai"
    model?: string
}

function numberFromUnknown(v: unknown): number | null {
    if (typeof v === "number" && Number.isFinite(v)) return v
    if (typeof v === "string" && v.trim()) {
        const n = Number(v)
        return Number.isFinite(n) ? n : null
    }
    return null
}

function getUsageTokens(usage: any): { inputTokens: number; outputTokens: number; totalTokens: number } {
    const inputTokens =
        numberFromUnknown(usage?.promptTokens) ??
        numberFromUnknown(usage?.inputTokens) ??
        numberFromUnknown(usage?.prompt_tokens) ??
        numberFromUnknown(usage?.input_tokens) ??
        0

    const outputTokens =
        numberFromUnknown(usage?.completionTokens) ??
        numberFromUnknown(usage?.outputTokens) ??
        numberFromUnknown(usage?.completion_tokens) ??
        numberFromUnknown(usage?.output_tokens) ??
        0

    const totalTokens =
        numberFromUnknown(usage?.totalTokens) ??
        numberFromUnknown(usage?.total_tokens) ??
        Math.max(0, inputTokens + outputTokens)

    return {
        inputTokens: Math.max(0, inputTokens),
        outputTokens: Math.max(0, outputTokens),
        totalTokens,
    }
}

function calcOpenAiTextCostUsd(params: { inputTokens: number; outputTokens: number }): number {
    const inPer1M = numberFromUnknown(process.env.OPENAI_TEXT_INPUT_COST_PER_1M) ?? 5
    const outPer1M = numberFromUnknown(process.env.OPENAI_TEXT_OUTPUT_COST_PER_1M) ?? 15
    const cost = (params.inputTokens / 1_000_000) * inPer1M + (params.outputTokens / 1_000_000) * outPer1M
    return Number.isFinite(cost) ? cost : 0
}

function calcOpenAiWhisperCostUsd(params: { durationSeconds: number }): number {
    const perMinute = numberFromUnknown(process.env.OPENAI_WHISPER_COST_PER_MIN) ?? 0.006
    const minutes = params.durationSeconds / 60
    const cost = minutes * perMinute
    return Number.isFinite(cost) ? cost : 0
}

export class OpenAIService {
    private model = openai("gpt-4o")
    private openaiClient = createOpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    })

    private async sleep(ms: number) {
        await new Promise((resolve) => setTimeout(resolve, ms))
    }

    /**
     * Generate a simple text response from OpenAI
     */
    async chat(userMessage: string, systemPrompt?: string, track?: TrackContext): Promise<string> {
        const result: any = await generateText({
            model: this.model,
            messages: [
                ...(systemPrompt ? [{ role: "system" as const, content: systemPrompt }] : []),
                { role: "user" as const, content: userMessage },
            ],
        })

        const text = result?.text as string

        const userId = track?.userId
        if (userId) {
            const usage: any = result?.usage
            const { inputTokens, outputTokens, totalTokens } = getUsageTokens(usage)
            const costUsd = calcOpenAiTextCostUsd({ inputTokens, outputTokens })
            await costTrackerService.trackCost({
                userId,
                houseId: track?.houseId ?? null,
                provider: "openai",
                category: track?.category ?? "text",
                operation: track?.operation ?? "chat",
                endpoint: track?.endpoint ?? "chat.completions",
                costUsd,
                unitsUsed: totalTokens,
                metadata: {
                    model: track?.model ?? "gpt-4o",
                    inputTokens,
                    outputTokens,
                    totalTokens,
                },
            })
        }

        return text
    }

    /**
     * Stream a response from OpenAI (for real-time responses)
     */
    async chatStream(userMessage: string, systemPrompt?: string) {
        const result = await streamText({
            model: this.model,
            messages: [
                ...(systemPrompt ? [{ role: "system" as const, content: systemPrompt }] : []),
                { role: "user" as const, content: userMessage },
            ],
        })

        return result.textStream
    }

    /**
     * Chat with conversation history
     */
    async chatWithHistory(
        messages: Array<{ role: "user" | "assistant" | "system"; content: string }>,
        track?: TrackContext,
    ): Promise<string> {
        const result: any = await generateText({
            model: this.model,
            messages,
        })

        const text = result?.text as string

        const userId = track?.userId
        if (userId) {
            const usage: any = result?.usage
            const { inputTokens, outputTokens, totalTokens } = getUsageTokens(usage)
            const costUsd = calcOpenAiTextCostUsd({ inputTokens, outputTokens })
            await costTrackerService.trackCost({
                userId,
                houseId: track?.houseId ?? null,
                provider: "openai",
                category: track?.category ?? "text",
                operation: track?.operation ?? "chat",
                endpoint: track?.endpoint ?? "chat.completions",
                costUsd,
                unitsUsed: totalTokens,
                metadata: {
                    model: track?.model ?? "gpt-4o",
                    inputTokens,
                    outputTokens,
                    totalTokens,
                },
            })
        }

        return text
    }

    /**
     * Transcribe audio using OpenAI Whisper
     */
    async transcribe(
        audioBuffer: Buffer,
        filename: string,
        opts?: { durationSeconds?: number; track?: TrackContext },
    ): Promise<string> {
        const maxAttempts = 4
        let lastError: unknown

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            const formData = new FormData()
            const audioBlob = new Blob([new Uint8Array(audioBuffer)], { type: "audio/ogg" })
            formData.append("file", audioBlob, filename)
            formData.append("model", "whisper-1")

            const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
                },
                body: formData,
            })

            if (response.ok) {
                const data = await response.json()

                const userId = opts?.track?.userId
                const durationSeconds = typeof opts?.durationSeconds === "number" && Number.isFinite(opts.durationSeconds)
                    ? Math.max(0, opts.durationSeconds)
                    : 0
                if (userId) {
                    const costUsd = calcOpenAiWhisperCostUsd({ durationSeconds })
                    await costTrackerService.trackCost({
                        userId,
                        houseId: opts?.track?.houseId ?? null,
                        provider: "openai",
                        category: "voice",
                        operation: opts?.track?.operation ?? "voice_to_text",
                        endpoint: opts?.track?.endpoint ?? "audio.transcriptions",
                        costUsd,
                        unitsUsed: durationSeconds,
                        metadata: {
                            model: "whisper-1",
                            durationSeconds,
                        },
                    })
                }
                return data.text
            }

            const retryAfterHeader = response.headers.get("retry-after")
            const retryAfterMs = retryAfterHeader ? Number(retryAfterHeader) * 1000 : null

            const bodyText = await response.text().catch(() => "")
            const bodySuffix = bodyText ? ` - ${bodyText}` : ""
            const err: any = new Error(
                `Transcription failed: ${response.status} ${response.statusText}${bodySuffix}`,
            )
            err.status = response.status
            err.retryAfterMs = retryAfterMs
            lastError = err

            const retryable = response.status === 429 || (response.status >= 500 && response.status <= 599)
            if (!retryable || attempt === maxAttempts) {
                throw err
            }

            const baseDelay = 500
            const backoffDelay = baseDelay * Math.pow(2, attempt - 1)
            const jitter = Math.floor(Math.random() * 250)
            const delay = Math.min(10_000, (retryAfterMs ?? backoffDelay) + jitter)
            await this.sleep(delay)
        }

        throw lastError instanceof Error ? lastError : new Error("Transcription failed")
    }
}

// Export a singleton instance
export const openaiService = new OpenAIService()
