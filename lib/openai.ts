import { openai } from "@ai-sdk/openai"
import { generateText, streamText } from "ai"
import { createOpenAI } from "@ai-sdk/openai"

export class OpenAIService {
    private model = openai("gpt-4o")
    private openaiClient = createOpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    })

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

        if (!response.ok) {
            throw new Error(`Transcription failed: ${response.statusText}`)
        }

        const data = await response.json()
        return data.text
    }
}

// Export a singleton instance
export const openaiService = new OpenAIService()
