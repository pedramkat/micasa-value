import { useState, useCallback } from "react";
import { Sparkles, Trash2, CheckSquare, XSquare, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/sonner";
import { MediaGalleryGrid } from "./MediaGalleryGrid";
import { MediaPreviewDialog } from "./MediaPreviewDialog";
import type { HousePhoto } from "@/lib/mock-data";
import { motion, AnimatePresence } from "framer-motion";

interface MediaManagerProps {
  photos: HousePhoto[];
  enhancedPhotos: HousePhoto[];
}

export function MediaManager({ photos, enhancedPhotos }: MediaManagerProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [previewPhoto, setPreviewPhoto] = useState<HousePhoto | null>(null);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [tab, setTab] = useState("originals");

  const currentPhotos = tab === "originals" ? photos : enhancedPhotos;

  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelected(new Set(currentPhotos.map((p) => p.id)));
  }, [currentPhotos]);

  const clearSelection = useCallback(() => {
    setSelected(new Set());
  }, []);

  const handleEnhance = useCallback(async () => {
    if (selected.size === 0 || isEnhancing) return;
    setIsEnhancing(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 2500));

    toast.success(`${selected.size} photo(s) enhanced successfully`, {
      description: "Enhanced versions are now available in the Enhanced tab.",
    });

    setSelected(new Set());
    setIsEnhancing(false);
  }, [selected, isEnhancing]);

  const handleDelete = useCallback((photo: HousePhoto) => {
    toast.success("Photo deleted", {
      description: `${photo.path.split("/").pop()} has been removed.`,
    });
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(photo.id);
      return next;
    });
  }, []);

  // Find enhanced version for preview comparison
  const enhancedForPreview =
    previewPhoto && tab === "originals"
      ? enhancedPhotos.find(
          (_, i) => photos.findIndex((p) => p.id === previewPhoto.id) === i
        )
      : null;

  return (
    <div className="space-y-4">
      <Tabs value={tab} onValueChange={(v) => { setTab(v); clearSelection(); }}>
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

          {/* Bulk actions */}
          {currentPhotos.length > 0 && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={selected.size === currentPhotos.length ? clearSelection : selectAll}
                className="text-xs"
              >
                {selected.size === currentPhotos.length ? (
                  <><XSquare className="mr-1.5 h-3.5 w-3.5" /> Clear</>
                ) : (
                  <><CheckSquare className="mr-1.5 h-3.5 w-3.5" /> Select all</>
                )}
              </Button>
            </div>
          )}
        </div>

        {/* Sticky action bar */}
        <AnimatePresence>
          {selected.size > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center gap-3 rounded-xl bg-primary/5 border border-primary/20 px-4 py-3"
            >
              <span className="text-sm font-medium">
                {selected.size} selected
              </span>
              <div className="flex-1" />
              {tab === "originals" && (
                <Button
                  size="sm"
                  onClick={handleEnhance}
                  disabled={isEnhancing}
                  className="gap-2"
                >
                  {isEnhancing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  {isEnhancing ? "Enhancing..." : "Enhance selected"}
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={clearSelection}
              >
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

      <MediaPreviewDialog
        photo={previewPhoto}
        enhancedVersion={enhancedForPreview}
        onClose={() => setPreviewPhoto(null)}
      />
    </div>
  );
}
