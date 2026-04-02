"use client";

import { useState } from "react";
import { Check, ImageIcon, Sparkles, Camera } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/sonner";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface FeatureImagePickerProps {
  houseId: string;
  photos: Array<{ path: string; createdAt?: string }>;
  enhancedPhotos: Array<{ path: string; createdAt?: string }>;
  featureImagePath?: string | null;
}

function toMediaUrl(storedPath: string): string {
  const normalized = storedPath.replace(/\\/g, "/")
  const prefix = "storage/"
  const idx = normalized.indexOf(prefix)
  const rel = idx >= 0 ? normalized.slice(idx + prefix.length) : normalized
  return `/media/${rel}`
}

export function FeatureImagePicker({ houseId, photos, enhancedPhotos, featureImagePath }: FeatureImagePickerProps) {
  const firstPath = photos.length > 0 ? photos[0].path : enhancedPhotos.length > 0 ? enhancedPhotos[0].path : null
  const initialPath = featureImagePath ?? firstPath
  const [selectedPath, setSelectedPath] = useState<string | null>(initialPath);
  const [tab, setTab] = useState("originals");

  const allPhotos = [...photos, ...enhancedPhotos];
  const selectedPhoto = allPhotos.find((p) => p.path === selectedPath) || null;

  const handleSelect = async (photo: { path: string }) => {
    setSelectedPath(photo.path)
    try {
      const res = await fetch(`/api/houses/${houseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ featureImagePath: photo.path }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error ?? "Failed to update feature image")
      }
      toast.success("Feature image updated", {
        description: `${photo.path.split("/").pop()} set as the cover photo.`,
      })
    } catch (e: any) {
      toast.error("Failed to update feature image", { description: e?.message ?? "Unknown error" })
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <ImageIcon className="h-4 w-4 text-primary" />
          Feature Image
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Preview */}
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedPhoto?.path || "empty"}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="relative overflow-hidden rounded-xl aspect-[16/9] bg-muted"
          >
            {selectedPhoto ? (
              <>
                <img
                  src={toMediaUrl(selectedPhoto.path)}
                  alt="Feature"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                <div className="absolute bottom-3 left-3 flex items-center gap-2">
                  <Badge
                    variant="secondary"
                    className="bg-background/80 backdrop-blur-sm text-[11px] font-medium"
                  >
                    {enhancedPhotos.some((p) => p.path === selectedPhoto.path)
                      ? "✨ Enhanced"
                      : "Original"}
                  </Badge>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <Camera className="h-8 w-8 mb-2 opacity-40" />
                <p className="text-sm">No photos available</p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Thumbnail picker */}
        {(photos.length > 0 || enhancedPhotos.length > 0) && (
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="h-8 bg-muted/60">
              <TabsTrigger value="originals" className="text-xs gap-1.5 h-6 px-2.5">
                <Camera className="h-3 w-3" />
                Originals
                <Badge variant="secondary" className="h-4 px-1 text-[9px] font-semibold ml-0.5">
                  {photos.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="enhanced" className="text-xs gap-1.5 h-6 px-2.5">
                <Sparkles className="h-3 w-3" />
                Enhanced
                <Badge variant="secondary" className="h-4 px-1 text-[9px] font-semibold ml-0.5">
                  {enhancedPhotos.length}
                </Badge>
              </TabsTrigger>
            </TabsList>

            {["originals", "enhanced"].map((t) => (
              <TabsContent key={t} value={t} className="mt-3">
                <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
                  {(t === "originals" ? photos : enhancedPhotos).map((photo) => {
                    
                    const isSelected = selectedPath === photo.path;
                    return (
                      <motion.button
                        key={photo.path}
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.96 }}
                        onClick={() => handleSelect(photo)}
                        className={cn(
                          "relative aspect-square rounded-lg overflow-hidden border-2 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          isSelected
                            ? "border-primary shadow-md shadow-primary/20"
                            : "border-transparent hover:border-muted-foreground/30"
                        )}
                      >
                        <img
                          src={toMediaUrl(photo.path)}
                          alt={photo.path.split("/").pop()}
                          className="w-full h-full object-cover"
                        />
                        {/* Selected overlay */}
                        <AnimatePresence>
                          {isSelected && (
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="absolute inset-0 bg-primary/20 flex items-center justify-center"
                            >
                              <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                                <Check className="h-3 w-3 text-primary-foreground" />
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.button>
                    );
                  })}
                </div>
                {(t === "originals" ? photos : enhancedPhotos).length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    No {t === "enhanced" ? "enhanced" : "original"} photos available
                  </p>
                )}
              </TabsContent>
            ))}
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
