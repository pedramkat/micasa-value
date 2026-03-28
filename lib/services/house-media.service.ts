import path from "node:path"
import fs from "node:fs/promises"
import { randomUUID } from "node:crypto"
import sharp from "sharp"
import OpenAI, { toFile } from "openai"

export type StoredMediaItem = {
  path: string
  source: "telegram" | "openai"
  kind: "photo"
  createdAt: string
  telegram?: {
    fileId?: string
    fileUniqueId?: string
  }
  enhanced?: {
    originalPath?: string
    model?: string
  }
}

export type SaveTelegramPhotoInput = {
  houseId: string
  buffer: Buffer
  fileId?: string
  fileUniqueId?: string
  extension: string
  createdAt: Date
}

export type SaveTelegramPhotoResult = {
  stored: StoredMediaItem
  absolutePath: string
}

export type EnhanceImageInput = {
  houseId: string
  originalPath: string
  createdAt?: Date
}

export type EnhanceImageResult = {
  stored: StoredMediaItem
  absolutePath: string
}

class HouseMediaService {
  private baseDir(): string {
    return path.join(process.cwd(), "storage", "media")
  }

  private enhancedBaseDir(): string {
    return path.join(process.cwd(), "storage", "enhanced_media")
  }

  private async enhanceWithOpenAI(imageBuffer: Buffer, mimeType: string): Promise<{ buffer: Buffer; model: string }> {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not set")
    }

    const client = new OpenAI({ apiKey })

    const prompt = `You are a professional real estate photographer and photo editor. Enhance property images to look like they were shot with a Canon EOS 7D using professional settings and natural lighting, while keeping the scene realistic and credible for property listings.

Enhancement rules:
- Improve exposure, brightness, and dynamic range
- Correct white balance and colors (natural tones)
- Increase sharpness and reduce noise
- Use natural-looking contrast (avoid HDR effect)
- Prefer natural light; balance shadows and highlights

Photography style:
- Simulate Canon EOS 7D quality
- Aperture: f/8–f/11 (sharp depth of field)
- Shutter: well-exposed, no motion blur
- ISO: low (clean image, no grain)

Composition:
- Apply rule of thirds for better balance
- Slightly correct perspective if needed
- Improve visual harmony without altering reality

Task:
Enhance this real estate image. Source: mobile phone photo. Goal: professional listing quality. Make it bright, sharp, natural, and well-balanced. Apply realistic lighting and good composition.

Output:
Return only the enhanced image.`

    const model = "gpt-image-1"

    const pngBuffer = mimeType === "image/png" ? imageBuffer : await sharp(imageBuffer).png().toBuffer()

    const imageFile = await toFile(pngBuffer, "image.png", { type: "image/png" })
    const rsp = await client.images.edit({
      model,
      image: [imageFile],
      prompt
    })

    const b64Out = typeof (rsp as any)?.data?.[0]?.b64_json === "string" ? (rsp as any).data[0].b64_json : null
    if (!b64Out) {
      throw new Error("OpenAI image enhancement returned no image")
    }

    return { buffer: Buffer.from(b64Out, "base64"), model }
  }

  async saveTelegramPhoto(input: SaveTelegramPhotoInput): Promise<SaveTelegramPhotoResult> {
    const yyyy = String(input.createdAt.getUTCFullYear())
    const mm = String(input.createdAt.getUTCMonth() + 1).padStart(2, "0")
    const dd = String(input.createdAt.getUTCDate()).padStart(2, "0")

    const safeExt = input.extension.replace(/[^a-zA-Z0-9]/g, "") || "bin"
    const fileKey = input.fileUniqueId || input.fileId || String(Date.now())

    const relativePath = path.join(
      "storage",
      "media",
      input.houseId,
      "telegram",
      yyyy,
      mm,
      dd,
      `photo_${fileKey}.${safeExt}`,
    )

    const absolutePath = path.join(process.cwd(), relativePath)
    await fs.mkdir(path.dirname(absolutePath), { recursive: true })
    await fs.writeFile(absolutePath, input.buffer)

    const stored: StoredMediaItem = {
      path: relativePath,
      source: "telegram",
      kind: "photo",
      createdAt: input.createdAt.toISOString(),
      telegram: {
        fileId: input.fileId,
        fileUniqueId: input.fileUniqueId,
      },
    }

    return { stored, absolutePath }
  }

  async enhanceImage(input: EnhanceImageInput): Promise<EnhanceImageResult> {
    const createdAt = input.createdAt ?? new Date()
    const yyyy = String(createdAt.getUTCFullYear())
    const mm = String(createdAt.getUTCMonth() + 1).padStart(2, "0")
    const dd = String(createdAt.getUTCDate()).padStart(2, "0")

    const originalAbsolutePath = path.join(process.cwd(), input.originalPath)
    const originalExt = path.extname(originalAbsolutePath).toLowerCase()
    const mimeType =
      originalExt === ".png"
        ? "image/png"
        : originalExt === ".webp"
          ? "image/webp"
          : originalExt === ".gif"
            ? "image/gif"
            : "image/jpeg"

    const originalBuffer = await fs.readFile(originalAbsolutePath)
    const enhanced = await this.enhanceWithOpenAI(originalBuffer, mimeType)

    const baseName = path.basename(originalAbsolutePath, originalExt).replace(/[^a-zA-Z0-9_-]/g, "_") || "photo"
    const outKey = randomUUID()
    const relativePath = path.join(
      "storage",
      "enhanced_media",
      input.houseId,
      "openai",
      yyyy,
      mm,
      dd,
      `enhanced_${baseName}_${outKey}.png`,
    )

    const absolutePath = path.join(process.cwd(), relativePath)
    await fs.mkdir(path.dirname(absolutePath), { recursive: true })
    await fs.writeFile(absolutePath, enhanced.buffer)

    const stored: StoredMediaItem = {
      path: relativePath,
      source: "openai",
      kind: "photo",
      createdAt: createdAt.toISOString(),
      enhanced: {
        originalPath: input.originalPath,
        model: enhanced.model,
      },
    }

    return { stored, absolutePath }
  }
}

export const houseMediaService = new HouseMediaService()
