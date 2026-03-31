import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  MapPin,
  Calculator,
  Brain,
  FileText,
  Trash2,
  Download,
  Eye,
  Loader2,
  ChevronDown,
  ExternalLink,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/components/ui/sonner";
import { getHouseById, eurFormatter } from "@/lib/mock-data";
import { MediaManager } from "@/components/media/MediaManager";
import { motion } from "framer-motion";

export default function HouseDetail() {
  const { id } = useParams<{ id: string }>();
  const house = getHouseById(id || "");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  if (!house) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20">
        <h2 className="text-xl font-semibold">Property not found</h2>
        <p className="text-muted-foreground mt-1">The property you're looking for doesn't exist.</p>
        <Button asChild className="mt-4">
          <Link to="/houses">Back to properties</Link>
        </Button>
      </div>
    );
  }

  const avg =
    house.totalMin && house.totalMax ? (house.totalMin + house.totalMax) / 2 : null;

  const handleCalculatePrice = async () => {
    setIsCalculating(true);
    await new Promise((r) => setTimeout(r, 2000));
    toast.success("Price calculated", { description: "Valuation has been updated." });
    setIsCalculating(false);
  };

  const handleRegenerateAI = async () => {
    setIsRegenerating(true);
    await new Promise((r) => setTimeout(r, 3000));
    toast.success("AI analysis regenerated", {
      description: "House parameters have been updated by OpenAI.",
    });
    setIsRegenerating(false);
  };

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/houses" className="flex items-center gap-1 hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Properties
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium truncate">{house.title}</span>
      </div>

      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="space-y-1.5">
          <h1 className="text-2xl font-bold tracking-tight">{house.title}</h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            {house.indirizzo}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleCalculatePrice} disabled={isCalculating}>
            {isCalculating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Calculator className="mr-2 h-4 w-4" />}
            Calculate Price
          </Button>
          <Button variant="outline" size="sm" onClick={handleRegenerateAI} disabled={isRegenerating}>
            {isRegenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Brain className="mr-2 h-4 w-4" />}
            Regenerate AI
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => setShowDeleteDialog(true)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList className="bg-muted/60">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="media">Media</TabsTrigger>
          <TabsTrigger value="valuation">Valuation</TabsTrigger>
        </TabsList>

        {/* OVERVIEW TAB */}
        <TabsContent value="overview" className="mt-6 space-y-6">
          {/* Summary Cards */}
          <div className="grid gap-4 sm:grid-cols-3">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Card>
                <CardContent className="p-5">
                  <p className="text-sm text-muted-foreground">Estimated Value</p>
                  <p className="text-2xl font-bold mt-1">
                    {avg ? eurFormatter.format(avg) : "—"}
                  </p>
                  {house.totalMin && house.totalMax && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {eurFormatter.format(house.totalMin)} – {eurFormatter.format(house.totalMax)}
                    </p>
                  )}
                </CardContent>
              </Card>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card>
                <CardContent className="p-5">
                  <p className="text-sm text-muted-foreground">Photos</p>
                  <p className="text-2xl font-bold mt-1">{house.photos.length}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {house.enhancedPhotos.length} enhanced
                  </p>
                </CardContent>
              </Card>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Card>
                <CardContent className="p-5">
                  <p className="text-sm text-muted-foreground">Valuations</p>
                  <p className="text-2xl font-bold mt-1">{house.valuationHistory.length}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {house.valuationHistory.filter((v) => v.hasPdf).length} with PDF
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Description */}
          {house.description && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {house.description}
                </p>
              </CardContent>
            </Card>
          )}

          {/* House Parameters */}
          {Object.keys(house.houseParameters).length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">House Parameters</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2">
                  {Object.entries(house.houseParameters)
                    .filter(([k]) => k.toLowerCase() !== "indirizzo")
                    .map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between rounded-lg bg-muted/50 px-3.5 py-2.5">
                        <span className="text-sm text-muted-foreground">{key}</span>
                        <span className="text-sm font-medium">{String(value)}</span>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Map */}
          {house.coordinate && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Location</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative overflow-hidden rounded-xl bg-muted h-64">
                  <iframe
                    className="w-full h-full border-0"
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${house.coordinate.lon - 0.01}%2C${house.coordinate.lat - 0.005}%2C${house.coordinate.lon + 0.01}%2C${house.coordinate.lat + 0.005}&layer=mapnik&marker=${house.coordinate.lat}%2C${house.coordinate.lon}`}
                    loading="lazy"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Agent */}
          <Card>
            <CardContent className="p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm">
                  {house.userName.split(" ").map((n) => n[0]).join("")}
                </div>
                <div>
                  <p className="text-sm font-medium">{house.userName}</p>
                  <p className="text-xs text-muted-foreground">Agent</p>
                </div>
              </div>
              <span className="text-xs text-muted-foreground">
                Updated {new Date(house.updatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
              </span>
            </CardContent>
          </Card>
        </TabsContent>

        {/* MEDIA TAB */}
        <TabsContent value="media" className="mt-6">
          <MediaManager photos={house.photos} enhancedPhotos={house.enhancedPhotos} />
        </TabsContent>

        {/* VALUATION TAB */}
        <TabsContent value="valuation" className="mt-6 space-y-6">
          {/* Current valuation */}
          {avg && (
            <Card className="bg-gradient-to-br from-primary/5 to-primary/[0.02] border-primary/20">
              <CardContent className="p-6">
                <p className="text-sm font-medium text-primary">Current Estimate</p>
                <p className="text-4xl font-bold mt-2">{eurFormatter.format(avg)}</p>
                <div className="flex gap-6 mt-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Min</span>
                    <p className="font-semibold mt-0.5">{eurFormatter.format(house.totalMin!)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Max</span>
                    <p className="font-semibold mt-0.5">{eurFormatter.format(house.totalMax!)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* AI Narrative */}
          {house.aiNarrative && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Brain className="h-4 w-4 text-primary" />
                  AI Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {house.aiNarrative}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Price Parameters */}
          {house.configurations.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Price Parameters</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {house.configurations.map((c) => (
                    <div
                      key={c.title}
                      className="flex items-center justify-between rounded-lg bg-muted/50 px-3.5 py-2.5"
                    >
                      <span className="text-sm">{c.title}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono font-medium">
                          {c.fixValue !== null ? String(c.fixValue) : "—"}
                        </span>
                        {c.found && (
                          <Badge variant="secondary" className="text-[10px] h-5">
                            DB
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Valuation History */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                Valuation History ({house.valuationHistory.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {house.valuationHistory.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-sm text-muted-foreground">
                    No valuations yet. Click "Calculate Price" to generate one.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {[...house.valuationHistory].reverse().map((v) => (
                    <div
                      key={v.id}
                      className="rounded-xl border bg-card p-4 space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-lg font-bold">{eurFormatter.format(v.avg)}</p>
                          <p className="text-xs text-muted-foreground">
                            {eurFormatter.format(v.min)} – {eurFormatter.format(v.max)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {v.hasPdf ? (
                            <Button size="sm" variant="outline" className="text-xs h-8 gap-1.5">
                              <Eye className="h-3.5 w-3.5" /> View PDF
                            </Button>
                          ) : (
                            <Button size="sm" variant="outline" className="text-xs h-8 gap-1.5">
                              <FileText className="h-3.5 w-3.5" /> Generate PDF
                            </Button>
                          )}
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() =>
                              toast.success("Evaluation deleted", {
                                description: `Valuation from ${new Date(v.timestamp).toLocaleDateString()} removed.`,
                              })
                            }
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>

                      <Separator />

                      <div className="grid gap-4 sm:grid-cols-3 text-sm">
                        <div>
                          <p className="text-xs text-muted-foreground font-medium mb-1.5">
                            Price per m²
                          </p>
                          <p>
                            Base: {eurFormatter.format(v.baseEurPerSqm.comprMin)} – {eurFormatter.format(v.baseEurPerSqm.comprMax)}
                          </p>
                          {v.superficieCommerciale > 0 && (
                            <p className="mt-0.5">
                              Adjusted: {eurFormatter.format(v.min / v.superficieCommerciale)} – {eurFormatter.format(v.max / v.superficieCommerciale)}
                            </p>
                          )}
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground font-medium mb-1.5">
                            Configurations
                          </p>
                          {v.configurations.length > 0 ? (
                            v.configurations.map((c) => (
                              <p key={c.title}>
                                {c.title}: <span className="font-mono">{String(c.fixValue)}</span>
                              </p>
                            ))
                          ) : (
                            <p className="text-muted-foreground">None</p>
                          )}
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground font-medium mb-1.5">
                            Adjustments
                          </p>
                          {v.adjustments.length > 0 ? (
                            v.adjustments.map((a) => (
                              <p key={a.title}>
                                {a.title}: <span className="font-mono">{String(a.fixValue)}</span>
                              </p>
                            ))
                          ) : (
                            <p className="text-muted-foreground">None</p>
                          )}
                        </div>
                      </div>

                      <div className="text-xs text-muted-foreground">
                        {new Date(v.timestamp).toLocaleString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete House Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this property?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{house.title}" and all associated data including photos, valuations, and PDFs.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() =>
                toast.success("Property deleted", {
                  description: `${house.title} has been removed.`,
                })
              }
            >
              Delete Property
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
