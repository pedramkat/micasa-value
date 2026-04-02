"use client"

import { useState } from "react"
import { ArrowLeftRight, X } from "lucide-react"

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export type MediaPhoto = {
  id: string
  url: string
  path: string
  createdAt?: string
  source?: string
}

interface MediaPreviewDialogProps {
  photo: MediaPhoto | null
  enhancedVersion?: MediaPhoto | null
  onClose: () => void
}

export function MediaPreviewDialog({ photo, enhancedVersion, onClose }: MediaPreviewDialogProps) {
  const [showComparison, setShowComparison] = useState(false)
  const [sliderPosition, setSliderPosition] = useState(50)

  if (!photo) return null

  return (
    <Dialog
      open={!!photo}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent hideCloseButton className="max-w-4xl p-0 overflow-hidden bg-black/95 border-none">
        <DialogTitle className="sr-only">Photo preview</DialogTitle>

        <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-4">
          <div className="flex items-center gap-2">
            {photo.source && (
              <Badge variant="secondary" className="bg-white/10 text-white border-0 backdrop-blur-sm text-xs">
                {photo.source}
              </Badge>
            )}
            {photo.createdAt && (
              <span className="text-xs text-white/60">
                {new Date(photo.createdAt).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {enhancedVersion && (
              <Button
                size="sm"
                variant={showComparison ? "default" : "secondary"}
                onClick={() => setShowComparison((v) => !v)}
                className={cn("text-xs h-8", !showComparison && "bg-white/10 text-white border-0 hover:bg-white/20")}
              >
                <ArrowLeftRight className="mr-1.5 h-3.5 w-3.5" />
                Before / After
              </Button>
            )}

            <Button
              size="icon"
              variant="ghost"
              className="text-white hover:bg-white/10 h-8 w-8"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="relative flex items-center justify-center min-h-[60vh] max-h-[85vh]">
          {showComparison && enhancedVersion ? (
            <div
              className="relative w-full h-full select-none"
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect()
                setSliderPosition(((e.clientX - rect.left) / rect.width) * 100)
              }}
              onTouchMove={(e) => {
                const touch = e.touches[0]
                const rect = e.currentTarget.getBoundingClientRect()
                setSliderPosition(((touch.clientX - rect.left) / rect.width) * 100)
              }}
            >
              <img src={enhancedVersion.url} alt="Enhanced" className="w-full max-h-[85vh] object-contain" />

              <div className="absolute inset-0 overflow-hidden" style={{ width: `${sliderPosition}%` }}>
                <img
                  src={photo.url}
                  alt="Original"
                  className="w-full max-h-[85vh] object-contain"
                  style={{ width: `${100 / (sliderPosition / 100)}%`, maxWidth: "none" }}
                />
              </div>

              <div
                className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg cursor-ew-resize"
                style={{ left: `${sliderPosition}%` }}
              >
                <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-lg">
                  <ArrowLeftRight className="h-4 w-4 text-foreground" />
                </div>
              </div>

              <div className="absolute bottom-4 left-4 text-xs font-medium bg-black/60 text-white px-2 py-1 rounded-md">
                Original
              </div>
              <div className="absolute bottom-4 right-4 text-xs font-medium bg-primary/80 text-white px-2 py-1 rounded-md">
                Enhanced
              </div>
            </div>
          ) : (
            <img src={photo.url} alt="Preview" className="max-w-full max-h-[85vh] object-contain" />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
