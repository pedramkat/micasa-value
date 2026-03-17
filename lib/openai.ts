import { openai } from "@ai-sdk/openai"
import { generateText, streamText } from "ai"
import { createOpenAI } from "@ai-sdk/openai"

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
    async chat(userMessage: string, systemPrompt?: string): Promise<string> {
        const { text } = await generateText({
            model: this.model,
            messages: [
                ...(systemPrompt ? [{ role: "system" as const, content: systemPrompt }] : []),
                { role: "user" as const, content: userMessage },
            ],
        })

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
    ): Promise<string> {
        const { text } = await generateText({
            model: this.model,
            messages,
        })

        return text
    }

    /**
     * Transcribe audio using OpenAI Whisper
     */
    async transcribe(audioBuffer: Buffer, filename: string): Promise<string> {
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
