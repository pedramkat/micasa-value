"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import type { MediaPhoto } from "@/components/media/MediaPreviewDialog"
import { MediaManager } from "@/components/media/MediaManager"

export type HousePhotoItem = {
  path: string
  createdAt?: string
}

function toMediaUrl(storedPath: string): string {
  const normalized = storedPath.replace(/\\/g, "/")
  const prefix = "storage/"
  const idx = normalized.indexOf(prefix)
  const rel = idx >= 0 ? normalized.slice(idx + prefix.length) : normalized
  return `/media/${rel}`
}

function normalizePhotoKey(storedPath: string): string {
  const normalized = storedPath.replace(/\\/g, "/")
  const base = normalized.split("/").pop() || normalized
  return base
    .toLowerCase()
    .replace(/^enhanced[_-]?/, "")
    .replace(/^enh[_-]?/, "")
}

export function HouseMediaEnhancePanel({
  houseId,
  photos,
  enhancedPhotos,
}: {
  houseId: string
  photos: HousePhotoItem[]
  enhancedPhotos: HousePhotoItem[]
}) {
  const router = useRouter()

  const sorted = useMemo(() => {
    return [...photos].sort((a, b) => {
      const ta = a.createdAt ? Date.parse(a.createdAt) : 0
      const tb = b.createdAt ? Date.parse(b.createdAt) : 0
      return tb - ta
    })
  }, [photos])

  const sortedEnhanced = useMemo(() => {
    return [...enhancedPhotos].sort((a, b) => {
      const ta = a.createdAt ? Date.parse(a.createdAt) : 0
      const tb = b.createdAt ? Date.parse(b.createdAt) : 0
      return tb - ta
    })
  }, [enhancedPhotos])

  const originalByKey = useMemo(() => {
    const map = new Map<string, HousePhotoItem>()
    for (const p of sorted) {
      map.set(normalizePhotoKey(p.path), p)
    }
    return map
  }, [sorted])

  const enhancedByKey = useMemo(() => {
    const map = new Map<string, HousePhotoItem>()
    for (const p of sortedEnhanced) {
      map.set(normalizePhotoKey(p.path), p)
    }
    return map
  }, [sortedEnhanced])

  const [isEnhancing, setIsEnhancing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function deleteImage(targetPath: string) {
    if (!targetPath) return

    setError(null)
    try {
      const res = await fetch("/api/houses/delete-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ houseId, path: targetPath }),
      })

      if (!res.ok) {
        const text = await res.text().catch(() => "")
        throw new Error(text || `Request failed with status ${res.status}`)
      }
      router.refresh()
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to delete image"
      setError(message)
      throw new Error(message)
    }
  }

  async function enhancePaths(paths: string[]) {
    if (paths.length === 0 || isEnhancing) return
    setIsEnhancing(true)
    setError(null)

    try {
      const res = await fetch("/api/houses/enhance-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ houseId, paths }),
      })

      if (!res.ok) {
        const text = await res.text().catch(() => "")
        throw new Error(text || `Request failed with status ${res.status}`)
      }
      router.refresh()
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to enhance images"
      setError(message)
      throw new Error(message)
    } finally {
      setIsEnhancing(false)
    }
  }

  const uiOriginals = useMemo<MediaPhoto[]>(
    () =>
      sorted.map((p) => ({
        id: p.path,
        path: p.path,
        url: toMediaUrl(p.path),
        createdAt: p.createdAt,
      })),
    [sorted],
  )

  const uiEnhanced = useMemo<MediaPhoto[]>(
    () =>
      sortedEnhanced.map((p) => ({
        id: p.path,
        path: p.path,
        url: toMediaUrl(p.path),
        createdAt: p.createdAt,
      })),
    [sortedEnhanced],
  )

  const getEnhancedForPreview = useMemo(() => {
    return (photo: MediaPhoto): MediaPhoto | null => {
      const key = normalizePhotoKey(photo.path)

      const enhancedItem = enhancedByKey.get(key)
      if (enhancedItem) {
        return {
          id: enhancedItem.path,
          path: enhancedItem.path,
          url: toMediaUrl(enhancedItem.path),
          createdAt: enhancedItem.createdAt,
        }
      }

      const originalIdx = sorted.findIndex((p) => p.path === photo.path)
      const fallback = originalIdx >= 0 && sortedEnhanced[originalIdx] ? sortedEnhanced[originalIdx] : null
      if (!fallback) return null

      return {
        id: fallback.path,
        path: fallback.path,
        url: toMediaUrl(fallback.path),
        createdAt: fallback.createdAt,
      }
    }
  }, [enhancedByKey, sorted, sortedEnhanced])

  return (
    <section className="mb-10">
      {error && <div className="mt-3 text-sm font-semibold text-red-600">{error}</div>}

      <MediaManager
        photos={uiOriginals}
        enhancedPhotos={uiEnhanced}
        getEnhancedForPreview={getEnhancedForPreview}
        onEnhanceSelected={async (selectedPhotos) => {
          await enhancePaths(selectedPhotos.map((p) => p.path))
        }}
        onDelete={async (photo) => {
          await deleteImage(photo.path)
        }}
      />
    </section>
  )
}
