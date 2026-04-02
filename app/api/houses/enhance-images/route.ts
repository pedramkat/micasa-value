import prisma from "@/lib/prisma"
import { houseMediaService } from "@/lib/services/house-media.service"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const houseId = typeof body?.houseId === "string" ? body.houseId : null
    const paths = Array.isArray(body?.paths) ? (body.paths as unknown[]) : []

    if (!houseId) {
      return NextResponse.json({ error: "houseId is required" }, { status: 400 })
    }

    const safePaths = paths.filter((p) => typeof p === "string" && p.startsWith(`storage/media/${houseId}/`)) as string[]
    if (safePaths.length === 0) {
      return NextResponse.json({ error: "paths must be non-empty and under this house" }, { status: 400 })
    }

    const house = await prisma.house.findUnique({
      where: { id: houseId },
      select: { media: true, userId: true },
    })

    const existingMedia = house?.media && typeof house.media === "object" ? (house.media as any) : {}
    const existingEnhanced = Array.isArray(existingMedia.enhancedPhotos) ? existingMedia.enhancedPhotos : []

    const results = [] as any[]
    for (const originalPath of safePaths) {
      const enhanced = await houseMediaService.enhanceImage({
        houseId,
        originalPath,
        track: house?.userId ? { userId: house.userId, operation: "image_enhance" } : undefined,
      })
      results.push(enhanced.stored)
    }

    await prisma.house.update({
      where: { id: houseId },
      data: {
        media: {
          ...existingMedia,
          enhancedPhotos: [...existingEnhanced, ...results],
        } as any,
      },
    })

    return NextResponse.json({ ok: true, enhanced: results })
  } catch (error) {
    console.error("Failed to enhance images:", error)
    return NextResponse.json(
      {
        error: "Failed to enhance images",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
