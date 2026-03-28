"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Trash2 } from "lucide-react"

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

  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  const [activeUrl, setActiveUrl] = useState<string | null>(null)
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

      setSelected((prev) => {
        const next = new Set(prev)
        next.delete(targetPath)
        return next
      })

      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete image")
    }
  }

  async function enhanceSelected() {
    const paths = Array.from(selected)
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

      setSelected(new Set())
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to enhance images")
    } finally {
      setIsEnhancing(false)
    }
  }

  return (
    <section className="mb-10">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-xl font-semibold text-gray-900">Photos</h2>
        <div className="text-sm text-gray-500">{sorted.length}</div>
      </div>

      {sorted.length > 0 && (
        <div className="mt-4 flex items-center justify-between gap-4">
          <div className="text-sm text-gray-600">Selected: {selected.size}</div>
          <button
            type="button"
            onClick={enhanceSelected}
            disabled={selected.size === 0 || isEnhancing}
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isEnhancing ? "Enhancing..." : "Enhance images"}
          </button>
        </div>
      )}

      {error && <div className="mt-3 text-sm font-semibold text-red-600">{error}</div>}

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {sorted.map((p) => {
          const url = toMediaUrl(p.path)
          const checked = selected.has(p.path)

          return (
            <div
              key={p.path}
              className="group relative aspect-square overflow-hidden rounded-xl bg-gray-100 ring-1 ring-gray-200"
            >
              <button type="button" onClick={() => setActiveUrl(url)} className="absolute inset-0">
                <img
                  src={url}
                  alt="House photo"
                  className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                  loading="lazy"
                />
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  void deleteImage(p.path)
                }}
                className="absolute right-2 top-2 z-10 inline-flex h-9 w-9 items-center justify-center rounded-md bg-white/90 text-gray-800 ring-1 ring-gray-200 hover:bg-white"
                aria-label="Delete"
                title="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </button>

              <label className="absolute left-2 top-2 z-10 flex items-center gap-2 rounded-lg bg-black/50 px-2 py-1 text-xs font-semibold text-white ring-1 ring-white/20">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => {
                    setSelected((prev) => {
                      const next = new Set(prev)
                      if (next.has(p.path)) next.delete(p.path)
                      else next.add(p.path)
                      return next
                    })
                  }}
                  className="h-4 w-4"
                />
                Select
              </label>
            </div>
          )
        })}
      </div>

      {activeUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6"
          role="dialog"
          aria-modal="true"
          onClick={() => setActiveUrl(null)}
        >
          <div className="relative max-h-[90vh] w-full max-w-5xl" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setActiveUrl(null)}
              className="absolute -top-10 right-0 rounded-lg bg-white/10 px-3 py-2 text-sm font-semibold text-white ring-1 ring-white/20 hover:bg-white/20"
            >
              Close
            </button>
            <div className="overflow-hidden rounded-2xl bg-black ring-1 ring-white/10">
              <img src={activeUrl} alt="House photo" className="max-h-[90vh] w-full object-contain" />
            </div>
          </div>
        </div>
      )}

      {sortedEnhanced.length > 0 && (
        <section className="mt-10">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="text-xl font-semibold text-gray-900">Enhanced photos</h2>
            <div className="text-sm text-gray-500">{sortedEnhanced.length}</div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {sortedEnhanced.map((p) => {
              const url = toMediaUrl(p.path)
              return (
                <div
                  key={p.path}
                  className="group relative aspect-square overflow-hidden rounded-xl bg-gray-100 ring-1 ring-gray-200"
                >
                  <button type="button" onClick={() => setActiveUrl(url)} className="absolute inset-0">
                    <img
                      src={url}
                      alt="Enhanced photo"
                      className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                      loading="lazy"
                    />
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      void deleteImage(p.path)
                    }}
                    className="absolute right-2 top-2 z-10 inline-flex h-9 w-9 items-center justify-center rounded-md bg-white/90 text-gray-800 ring-1 ring-gray-200 hover:bg-white"
                    aria-label="Delete"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )
            })}
          </div>
        </section>
      )}
    </section>
  )
}
