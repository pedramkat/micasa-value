"use client"

import { useMemo, useState } from "react"

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

export function HouseMediaGallery({ photos }: { photos: HousePhotoItem[] }) {
  const sorted = useMemo(() => {
    return [...photos].sort((a, b) => {
      const ta = a.createdAt ? Date.parse(a.createdAt) : 0
      const tb = b.createdAt ? Date.parse(b.createdAt) : 0
      return tb - ta
    })
  }, [photos])

  const [activeUrl, setActiveUrl] = useState<string | null>(null)

  if (!sorted.length) return null

  return (
    <section className="mb-10">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-xl font-semibold text-gray-900">Photos</h2>
        <div className="text-sm text-gray-500">{sorted.length}</div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {sorted.map((p) => {
          const url = toMediaUrl(p.path)
          return (
            <button
              key={p.path}
              type="button"
              onClick={() => setActiveUrl(url)}
              className="group relative aspect-square overflow-hidden rounded-xl bg-gray-100 ring-1 ring-gray-200"
            >
              <img
                src={url}
                alt="House photo"
                className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                loading="lazy"
              />
            </button>
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
    </section>
  )
}
