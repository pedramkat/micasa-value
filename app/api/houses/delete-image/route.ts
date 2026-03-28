import prisma from "@/lib/prisma"
import { NextResponse } from "next/server"
import fs from "node:fs/promises"
import path from "node:path"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const houseId = typeof body?.houseId === "string" ? body.houseId : null
    const targetPath = typeof body?.path === "string" ? body.path : null

    if (!houseId || !targetPath) {
      return NextResponse.json({ error: "houseId and path are required" }, { status: 400 })
    }

    const normalized = targetPath.replace(/\\/g, "/")
    if (normalized.includes("..")) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 })
    }

    const allowedPrefixes = [`storage/media/${houseId}/`, `storage/enhanced_media/${houseId}/`]
    if (!allowedPrefixes.some((p) => normalized.startsWith(p))) {
      return NextResponse.json({ error: "Path not allowed" }, { status: 400 })
    }

    const house = await prisma.house.findUnique({
      where: { id: houseId },
      select: { media: true },
    })

    const existingMedia = house?.media && typeof house.media === "object" ? (house.media as any) : {}
    const photos = Array.isArray(existingMedia.photos) ? (existingMedia.photos as any[]) : []
    const enhancedPhotos = Array.isArray(existingMedia.enhancedPhotos) ? (existingMedia.enhancedPhotos as any[]) : []

    const nextPhotos = photos.filter((p) => !(p && typeof p === "object" && (p as any).path === targetPath))
    const nextEnhanced = enhancedPhotos.filter((p) => !(p && typeof p === "object" && (p as any).path === targetPath))

    await prisma.house.update({
      where: { id: houseId },
      data: {
        media: {
          ...existingMedia,
          photos: nextPhotos,
          enhancedPhotos: nextEnhanced,
        } as any,
      },
    })

    const absolute = path.join(process.cwd(), targetPath)
    try {
      await fs.unlink(absolute)
    } catch {
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Failed to delete image:", error)
    return NextResponse.json(
      {
        error: "Failed to delete image",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
