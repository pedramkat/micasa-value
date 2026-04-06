"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { AnimatePresence, motion } from "framer-motion"
import { Brain, Loader2, Sparkles, ArrowRight, Check } from "lucide-react"

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { toast } from "@/components/ui/sonner"

const categoryLabels: Record<FieldCategory, string> = {
  general: "Informazioni generali",
  parameters: "Parametri casa",
  configurations: "Configurazioni",
}

type FieldCategory = "general" | "parameters" | "configurations"
type FieldKind = "title" | "description" | "parameter" | "configuration"

interface FieldEntry {
  id: string
  label: string
  category: FieldCategory
  kind: FieldKind
  key?: string
  currentValue: string
  aiValue: string
  selected: boolean
}

interface AiPreviewPayload {
  title?: string | null
  description?: string | null
  rawResponse?: string | null
  houseParameters?: Record<string, unknown> | null
  configurations?: Record<string, unknown> | null
  aiParsed?: {
    title?: string | null
    description?: string | null
    houseParameters?: Record<string, unknown> | null
    configurations?: Record<string, unknown> | null
  } | null
}

interface SelectionPayload {
  title?: boolean
  description?: boolean
  houseParameters?: string[]
  configurations?: string[]
}

export interface AIRegenerateDialogProps {
  houseId: string
  currentTitle: string
  currentDescription: string
  currentHouseParameters?: Record<string, unknown> | null
  currentConfigurations?: Record<string, unknown> | null
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "—"
  if (typeof value === "string") return value.trim() || "—"
  if (typeof value === "number" || typeof value === "boolean") return String(value)
  if (Array.isArray(value)) {
    const parts = value.map((v) => formatValue(v)).filter((v) => v && v !== "—")
    return parts.length ? parts.join(", ") : "—"
  }
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

function normalizePreview(preview: AiPreviewPayload): Required<Pick<AiPreviewPayload, "title" | "description">> & {
  houseParameters: Record<string, unknown>
  configurations: Record<string, unknown>
  rawResponse?: string | null
} {
  const aiParsed = isPlainObject(preview.aiParsed) ? preview.aiParsed : {}
  return {
    title: typeof aiParsed.title === "string" && aiParsed.title ? aiParsed.title : (typeof preview.title === "string" ? preview.title : null),
    description: typeof aiParsed.description === "string" ? aiParsed.description : (typeof preview.description === "string" ? preview.description : null),
    houseParameters: isPlainObject(aiParsed.houseParameters)
      ? aiParsed.houseParameters
      : isPlainObject(preview.houseParameters)
        ? preview.houseParameters!
        : {},
    configurations: isPlainObject(aiParsed.configurations)
      ? aiParsed.configurations
      : isPlainObject(preview.configurations)
        ? preview.configurations!
        : {},
    rawResponse: typeof preview.rawResponse === "string" ? preview.rawResponse : null,
  }
}

function buildFields(
  preview: Required<Pick<AiPreviewPayload, "title" | "description">> & {
    houseParameters: Record<string, unknown>
    configurations: Record<string, unknown>
  },
  currentTitle: string,
  currentDescription: string,
  currentHouseParameters?: Record<string, unknown> | null,
  currentConfigurations?: Record<string, unknown> | null,
): FieldEntry[] {
  const fields: FieldEntry[] = []
  const currentParams = isPlainObject(currentHouseParameters) ? currentHouseParameters : {}
  const currentConfigs = isPlainObject(currentConfigurations) ? currentConfigurations : {}

  if (preview.title && preview.title.trim() && preview.title.trim() !== currentTitle.trim()) {
    fields.push({
      id: "field-title",
      label: "Titolo",
      category: "general",
      kind: "title",
      currentValue: currentTitle || "—",
      aiValue: preview.title.trim(),
      selected: false,
    })
  }

  if (preview.description && preview.description.trim() && preview.description.trim() !== currentDescription.trim()) {
    fields.push({
      id: "field-description",
      label: "Descrizione",
      category: "general",
      kind: "description",
      currentValue: currentDescription || "—",
      aiValue: preview.description.trim(),
      selected: false,
    })
  }

  for (const [key, value] of Object.entries(preview.houseParameters)) {
    const aiValue = formatValue(value)
    const currentValue = formatValue(currentParams[key])
    if (aiValue === currentValue) continue
    fields.push({
      id: `param-${key}`,
      label: key,
      category: "parameters",
      kind: "parameter",
      key,
      currentValue,
      aiValue,
      selected: false,
    })
  }

  for (const [key, value] of Object.entries(preview.configurations)) {
    const aiValue = formatValue(value)
    const currentValue = formatValue(currentConfigs[key])
    if (aiValue === currentValue) continue
    fields.push({
      id: `config-${key}`,
      label: key,
      category: "configurations",
      kind: "configuration",
      key,
      currentValue,
      aiValue,
      selected: false,
    })
  }

  return fields
}

export function AIRegenerateDialog({
  houseId,
  currentTitle,
  currentDescription,
  currentHouseParameters,
  currentConfigurations,
}: AIRegenerateDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [phase, setPhase] = useState<"idle" | "generating" | "review">("idle")
  const [fields, setFields] = useState<FieldEntry[]>([])
  const [previewData, setPreviewData] = useState<AiPreviewPayload | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [previewToken, setPreviewToken] = useState<string | null>(null)
  const [applying, setApplying] = useState(false)

  useEffect(() => {
    let cancelled = false

    if (!open) {
      setPhase("idle")
      setFields([])
      setPreviewData(null)
      setPreviewError(null)
      setPreviewToken(null)
      return
    }

    const fetchPreview = async () => {
      setPhase("generating")
      setPreviewError(null)
      try {
        const res = await fetch(`/api/houses/${houseId}/ai/preview`, { method: "POST" })
        if (!res.ok) {
          const data = await res.json().catch(() => null)
          throw new Error(data?.error ?? "Impossibile generare il suggerimento AI")
        }
        const data = (await res.json()) as { preview: AiPreviewPayload; token?: string }
        if (cancelled) return
        setPreviewData(data.preview)
        setPreviewToken(typeof data.token === "string" && data.token ? data.token : null)
        const normalized = normalizePreview(data.preview)
        const built = buildFields(normalized, currentTitle, currentDescription, currentHouseParameters, currentConfigurations)
        setFields(built)
        setPhase("review")
      } catch (error: unknown) {
        if (cancelled) return
        const message = error instanceof Error ? error.message : "Errore sconosciuto"
        setPreviewError(message)
        setPhase("review")
      }
    }

    fetchPreview()
    return () => {
      cancelled = true
    }
  }, [open, houseId, currentTitle, currentDescription, currentHouseParameters, currentConfigurations])

  const selectedCount = useMemo(() => fields.filter((f) => f.selected).length, [fields])

  const toggleField = (id: string) => {
    setFields((prev) => prev.map((field) => (field.id === id ? { ...field, selected: !field.selected } : field)))
  }

  const toggleAll = (selected: boolean) => {
    setFields((prev) => prev.map((field) => ({ ...field, selected })))
  }

  const selectionPayload = useMemo<SelectionPayload>(() => {
    const selected = fields.filter((f) => f.selected)
    const params = new Set<string>()
    const configs = new Set<string>()
    let title = false
    let description = false

    for (const field of selected) {
      if (field.kind === "title") title = true
      if (field.kind === "description") description = true
      if (field.kind === "parameter" && field.key) params.add(field.key)
      if (field.kind === "configuration" && field.key) configs.add(field.key)
    }

    return {
      title,
      description,
      houseParameters: Array.from(params),
      configurations: Array.from(configs),
    }
  }, [fields])

  const handleApply = async () => {
    if (!previewData || selectedCount === 0) return
    if (!previewToken) {
      toast.error("Sessione AI scaduta", { description: "Rigenera l'anteprima prima di applicare." })
      return
    }
    setApplying(true)
    try {
      const res = await fetch(`/api/houses/${houseId}/ai/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preview: previewData, selection: selectionPayload, token: previewToken }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error ?? "Impossibile applicare i dati AI")
      }
      toast.success("Dettagli aggiornati con l'AI")
      setOpen(false)
      router.refresh()
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Errore sconosciuto"
      toast.error("Non è stato possibile applicare i valori AI", { description: message })
    } finally {
      setApplying(false)
    }
  }

  return (
    <>
      <Button variant="outline" className="inline-flex h-9 items-center" onClick={() => setOpen(true)}>
        <Brain className="mr-2 h-4 w-4" />
        Rigenera AI
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <Brain className="h-4 w-4 text-primary" />
              </div>
              Rigenerazione AI
            </DialogTitle>
            <DialogDescription>
              {phase === "generating" ? "Sto analizzando i dati della casa con OpenAI…" : "Seleziona i campi da aggiornare con l'AI."}
            </DialogDescription>
          </DialogHeader>

          <Separator />

          <AnimatePresence mode="wait">
            {phase === "generating" ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-16 gap-4"
              >
                <div className="relative">
                  <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <Sparkles className="h-7 w-7 text-primary animate-pulse" />
                  </div>
                  <Loader2 className="absolute -top-1 -right-1 h-5 w-5 text-primary animate-spin" />
                </div>
                <div className="text-center space-y-1">
                  <p className="text-sm font-medium">Elaborazione in corso</p>
                  <p className="text-xs text-muted-foreground">Sto generando nuove proposte per il tuo immobile…</p>
                </div>
              </motion.div>
            ) : (
              <motion.div key="review" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col min-h-0 flex-1">
                {previewError ? (
                  <div className="p-6 text-sm text-destructive">{previewError}</div>
                ) : fields.length === 0 ? (
                  <div className="p-6 text-sm text-muted-foreground">
                    Nessuna differenza trovata tra i dati attuali e la nuova risposta AI.
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between px-6 py-3 bg-muted/40">
                      <span className="text-xs font-medium text-muted-foreground">
                        {selectedCount} di {fields.length} selezionati
                      </span>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => toggleAll(true)}>
                          Seleziona tutto
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => toggleAll(false)}>
                          Pulisci
                        </Button>
                      </div>
                    </div>

                    <div className="flex-1 max-h-[50vh] overflow-y-auto px-6 py-4 space-y-6">
                        {(Object.keys(categoryLabels) as FieldCategory[]).map((category) => {
                          const items = fields.filter((field) => field.category === category)
                          if (!items.length) return null
                          return (
                            <div key={category} className="space-y-3">
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="text-[10px] font-semibold uppercase tracking-wider">
                                  {categoryLabels[category]}
                                </Badge>
                                <Separator className="flex-1" />
                              </div>
                              <div className="space-y-2">
                                {items.map((field) => (
                                  <motion.div
                                    key={field.id}
                                    initial={{ opacity: 0, x: -4 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className={`group relative rounded-xl border p-4 transition-all cursor-pointer ${
                                      field.selected
                                        ? "border-primary/40 bg-primary/[0.03] shadow-sm"
                                        : "border-border hover:border-muted-foreground/30 hover:bg-muted/30"
                                    }`}
                                    onClick={() => toggleField(field.id)}
                                  >
                                    <div className="flex items-start gap-3">
                                      <div className="pt-0.5">
                                        <Checkbox checked={field.selected} onCheckedChange={() => toggleField(field.id)} className="pointer-events-none" />
                                      </div>
                                      <div className="flex-1 min-w-0 space-y-2.5">
                                        <p className="text-sm font-medium">{field.label}</p>
                                        <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-start">
                                          <div className="rounded-lg bg-muted/60 px-3 py-2">
                                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1">Attuale</p>
                                            <p className="text-xs leading-relaxed break-words">{field.currentValue}</p>
                                          </div>
                                          <div className="flex items-center justify-center pt-5">
                                            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/50" />
                                          </div>
                                          <div className="rounded-lg bg-primary/[0.06] border border-primary/10 px-3 py-2">
                                            <p className="text-[10px] uppercase tracking-wider text-primary/70 font-medium mb-1 flex items-center gap-1">
                                              <Sparkles className="h-2.5 w-2.5" /> Suggerimento AI
                                            </p>
                                            <p className="text-xs leading-relaxed break-words font-medium">{field.aiValue}</p>
                                          </div>
                                        </div>
                                      </div>
                                      <AnimatePresence>
                                        {field.selected && (
                                          <motion.div
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            exit={{ scale: 0 }}
                                            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"
                                          >
                                            <Check className="h-3 w-3" />
                                          </motion.div>
                                        )}
                                      </AnimatePresence>
                                    </div>
                                  </motion.div>
                                ))}
                              </div>
                            </div>
                          )
                        })}
                    </div>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {phase === "review" && !previewError && fields.length > 0 && (
            <>
              <Separator />
              <DialogFooter className="px-6 py-4">
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Annulla
                </Button>
                <Button onClick={handleApply} disabled={selectedCount === 0 || applying}>
                  {applying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                  Applica {selectedCount > 0 ? `(${selectedCount})` : ""}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
