"use client"

import { useCallback, useMemo, useState } from "react"
import { CheckSquare, Loader2, Sparkles, XSquare } from "lucide-react"
import { AnimatePresence, motion } from "framer-motion"

import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "@/components/ui/sonner"

import { MediaGalleryGrid } from "./MediaGalleryGrid"
import { MediaPreviewDialog, type MediaPhoto } from "./MediaPreviewDialog"

type TabValue = "originals" | "enhanced"

interface MediaManagerProps {
  photos: MediaPhoto[]
  enhancedPhotos: MediaPhoto[]
  getEnhancedForPreview?: (photo: MediaPhoto) => MediaPhoto | null
  onEnhanceSelected?: (photos: MediaPhoto[]) => Promise<void>
  onDelete?: (photo: MediaPhoto) => Promise<void>
}

export function MediaManager({ photos, enhancedPhotos, getEnhancedForPreview, onEnhanceSelected, onDelete }: MediaManagerProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [previewPhoto, setPreviewPhoto] = useState<MediaPhoto | null>(null)
  const [isEnhancing, setIsEnhancing] = useState(false)

  const tab = (searchParams.get("mediaTab") as TabValue) ?? "originals"

  const currentPhotos = tab === "originals" ? photos : enhancedPhotos

  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const selectAll = useCallback(() => {
    setSelected(new Set(currentPhotos.map((p) => p.id)))
  }, [currentPhotos])

  const clearSelection = useCallback(() => {
    setSelected(new Set())
  }, [])

  const handleEnhance = useCallback(async () => {
    if (selected.size === 0 || isEnhancing || tab !== "originals") return

    const selectedPhotos = photos.filter((p) => selected.has(p.id))
    if (selectedPhotos.length === 0) return

    setIsEnhancing(true)
    try {
      await onEnhanceSelected?.(selectedPhotos)
      toast.success(`${selectedPhotos.length} photo(s) enhanced successfully`, {
        description: "Enhanced versions are now available in the Enhanced tab.",
      })
      setSelected(new Set())
    } catch (e) {
      toast.error("Enhancement failed")
    } finally {
      setIsEnhancing(false)
    }
  }, [selected, isEnhancing, tab, photos, onEnhanceSelected])

  const handleDelete = useCallback(
    async (photo: MediaPhoto) => {
      try {
        await onDelete?.(photo)
        toast.success("Photo deleted")
        setSelected((prev) => {
          const next = new Set(prev)
          next.delete(photo.id)
          return next
        })
      } catch {
        toast.error("Delete failed")
      }
    },
    [onDelete],
  )

  const enhancedForPreview = useMemo(() => {
    if (!previewPhoto) return null
    if (tab !== "originals") return null
    return getEnhancedForPreview?.(previewPhoto) ?? null
  }, [previewPhoto, tab, getEnhancedForPreview])

  return (
    <div className="space-y-4">
      <Tabs
        value={tab}
        onValueChange={(v) => {
          const next = new URLSearchParams(searchParams.toString())
          next.set("mediaTab", v)
          router.replace(`${pathname}?${next.toString()}`, { scroll: false })
          clearSelection()
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <TabsList className="bg-muted/60">
            <TabsTrigger value="originals" className="gap-2">
              Original Photos
              <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-semibold">
                {photos.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="enhanced" className="gap-2">
              Enhanced
              <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-semibold">
                {enhancedPhotos.length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          {currentPhotos.length > 0 && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={selected.size === currentPhotos.length ? clearSelection : selectAll}
                className="text-xs"
              >
                {selected.size === currentPhotos.length ? (
                  <>
                    <XSquare className="mr-1.5 h-3.5 w-3.5" /> Clear
                  </>
                ) : (
                  <>
                    <CheckSquare className="mr-1.5 h-3.5 w-3.5" /> Select all
                  </>
                )}
              </Button>
            </div>
          )}
        </div>

        <AnimatePresence>
          {selected.size > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-3 flex items-center gap-3 rounded-xl bg-primary/5 border border-primary/20 px-4 py-3"
            >
              <span className="text-sm font-medium">{selected.size} selected</span>
              <div className="flex-1" />
              {tab === "originals" && (
                <Button size="sm" onClick={handleEnhance} disabled={isEnhancing || !onEnhanceSelected} className="gap-2">
                  {isEnhancing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {isEnhancing ? "Enhancing..." : "Enhance selected"}
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={clearSelection}>
                Cancel
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        <TabsContent value="originals" className="mt-4">
          <MediaGalleryGrid
            photos={photos}
            selected={selected}
            onToggleSelect={toggleSelect}
            onPreview={setPreviewPhoto}
            onDelete={handleDelete}
          />
        </TabsContent>

        <TabsContent value="enhanced" className="mt-4">
          <MediaGalleryGrid
            photos={enhancedPhotos}
            selected={selected}
            onToggleSelect={toggleSelect}
            onPreview={setPreviewPhoto}
            onDelete={handleDelete}
          />
        </TabsContent>
      </Tabs>

      <MediaPreviewDialog photo={previewPhoto} enhancedVersion={enhancedForPreview} onClose={() => setPreviewPhoto(null)} />
    </div>
  )
}
