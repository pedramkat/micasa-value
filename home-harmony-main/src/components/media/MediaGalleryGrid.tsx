import { useState } from "react";
import { Trash2, Check, ZoomIn } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import type { HousePhoto } from "@/lib/mock-data";
import { motion } from "framer-motion";

interface MediaGalleryGridProps {
  photos: HousePhoto[];
  selected: Set<string>;
  onToggleSelect: (id: string) => void;
  onPreview: (photo: HousePhoto) => void;
  onDelete: (photo: HousePhoto) => void;
}

export function MediaGalleryGrid({
  photos,
  selected,
  onToggleSelect,
  onPreview,
  onDelete,
}: MediaGalleryGridProps) {
  const [deleteTarget, setDeleteTarget] = useState<HousePhoto | null>(null);

  if (!photos.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted mb-4">
          <ZoomIn className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="font-semibold">No photos yet</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Upload photos or send them via Telegram
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {photos.map((photo, i) => {
          const isSelected = selected.has(photo.id);
          return (
            <motion.div
              key={photo.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.03 }}
              className={cn(
                "group relative aspect-square overflow-hidden rounded-xl bg-muted ring-2 transition-all cursor-pointer",
                isSelected ? "ring-primary shadow-lg" : "ring-transparent hover:ring-border"
              )}
            >
              <img
                src={photo.url}
                alt="Property photo"
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
                onClick={() => onPreview(photo)}
              />

              {/* Hover overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

              {/* Checkbox */}
              <div
                className={cn(
                  "absolute top-2.5 left-2.5 z-10 transition-opacity",
                  isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                )}
              >
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleSelect(photo.id);
                  }}
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-md border-2 transition-colors cursor-pointer",
                    isSelected
                      ? "bg-primary border-primary text-primary-foreground"
                      : "bg-white/90 border-white/60 hover:border-white"
                  )}
                >
                  {isSelected && <Check className="h-3.5 w-3.5" />}
                </div>
              </div>

              {/* Actions */}
              <div className="absolute top-2.5 right-2.5 z-10 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onPreview(photo);
                      }}
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/90 backdrop-blur-sm text-foreground hover:bg-white transition-colors shadow-sm"
                    >
                      <ZoomIn className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Preview</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget(photo);
                      }}
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/90 backdrop-blur-sm text-destructive hover:bg-white transition-colors shadow-sm"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Delete</TooltipContent>
                </Tooltip>
              </div>

              {/* Source badge */}
              {photo.source && (
                <div className="absolute bottom-2.5 left-2.5 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-[10px] font-medium bg-black/60 text-white px-2 py-0.5 rounded-md backdrop-blur-sm uppercase tracking-wide">
                    {photo.source}
                  </span>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this photo?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The photo will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteTarget) onDelete(deleteTarget);
                setDeleteTarget(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
