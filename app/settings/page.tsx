"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useTheme } from "next-themes"
import { Bell, DollarSign, Globe, Palette, Save, User } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { toast } from "sonner"

export default function SettingsPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { theme, setTheme } = useTheme()

  const activeTab = searchParams.get("tab") ?? "agency"

  const [notifications, setNotifications] = useState({
    emailUpdates: true,
    telegramSync: true,
    valuationAlerts: true,
    weeklyReport: false,
  })

  const [generalSettings, setGeneralSettings] = useState({
    agencyName: "",
    agencyBio: "",
    agencyLogoUrl: "",
    contactEmail: "",
    contactPhone: "",
    websiteUrl: "",
    headquartersAddress: "",
    defaultOpenAiModel: "gpt-4o",
    apiCostModelsText: "[]",
  })
  const [generalLoading, setGeneralLoading] = useState(false)

  const [costProvider, setCostProvider] = useState<string>("all")
  const [costCategory, setCostCategory] = useState<string>("all")
  const [costFrom, setCostFrom] = useState<string>("")
  const [costTo, setCostTo] = useState<string>("")
  const [costRows, setCostRows] = useState<
    Array<{
      id: string
      createdAt: string
      houseId: string | null
      houseTitle: string | null
      userId: string | null
      userName: string | null
      provider: string
      category: string
      operation: string
      endpoint: string
      costUsd: number
    }>
  >([])
  const [costTotals, setCostTotals] = useState<Record<string, number>>({})
  const [costByCategory, setCostByCategory] = useState<Record<string, number>>({})
  const [costLoading, setCostLoading] = useState(false)

  useEffect(() => {
    let canceled = false

    async function loadCosts() {
      setCostLoading(true)
      try {
        const url = new URL("/api/settings/costs", globalThis.location.origin)
        if (costProvider !== "all") url.searchParams.set("provider", costProvider)
        if (costCategory !== "all") url.searchParams.set("category", costCategory)
        if (costFrom) url.searchParams.set("from", costFrom)
        if (costTo) url.searchParams.set("to", costTo)
        url.searchParams.set("limit", "200")

        const res = await fetch(url.toString(), { cache: "no-store" })
        if (!res.ok) {
          throw new Error(`Failed fetching costs (${res.status})`)
        }
        const data = (await res.json()) as {
          totals?: Record<string, number>
          by_category?: Record<string, number>
          by_operation?: Record<string, number>
          rows?: Array<any>
        }

        if (canceled) return
        setCostTotals(data.totals ?? {})
        setCostByCategory(data.by_category ?? {})
        setCostRows(
          Array.isArray(data.rows)
            ? data.rows.map((r) => ({
                id: String(r.id),
                createdAt: typeof r.createdAt === "string" ? r.createdAt : new Date(r.createdAt).toISOString(),
                houseId: r.houseId ? String(r.houseId) : null,
                houseTitle: typeof r.houseTitle === "string" ? r.houseTitle : null,
                userId: r.userId ? String(r.userId) : null,
                userName:
                  typeof r.userName === "string" && r.userName.trim()
                    ? r.userName.trim()
                    : r.userId
                      ? String(r.userId)
                      : null,
                provider: String(r.provider),
                category: String(r.category),
                operation: String(r.operation ?? "unknown"),
                endpoint: String(r.endpoint),
                costUsd: typeof r.costUsd === "number" ? r.costUsd : Number(r.costUsd ?? 0),
              }))
            : [],
        )
      } catch (e: any) {
        if (!canceled) {
          toast.error(e?.message ?? "Failed fetching costs")
          setCostRows([])
          setCostTotals({})
          setCostByCategory({})
        }
      } finally {
        if (!canceled) setCostLoading(false)
      }
    }

    loadCosts()
    return () => {
      canceled = true
    }
  }, [costProvider, costCategory, costFrom, costTo])

  useEffect(() => {
    let canceled = false

    async function loadGeneral() {
      setGeneralLoading(true)
      try {
        const res = await fetch("/api/settings/general", { cache: "no-store" })
        if (!res.ok) {
          const data = await res.json().catch(() => null)
          throw new Error(data?.error ?? `Failed fetching settings (${res.status})`)
        }
        const data = (await res.json()) as any
        if (canceled) return

        setGeneralSettings((prev) => ({
          ...prev,
          agencyName: typeof data?.agencyName === "string" ? data.agencyName : "",
          agencyBio: typeof data?.agencyBio === "string" ? data.agencyBio : "",
          agencyLogoUrl: typeof data?.agencyLogoUrl === "string" ? data.agencyLogoUrl : "",
          contactEmail: typeof data?.contactEmail === "string" ? data.contactEmail : "",
          contactPhone: typeof data?.contactPhone === "string" ? data.contactPhone : "",
          websiteUrl: typeof data?.websiteUrl === "string" ? data.websiteUrl : "",
          headquartersAddress: typeof data?.headquartersAddress === "string" ? data.headquartersAddress : "",
          defaultOpenAiModel: typeof data?.defaultOpenAiModel === "string" && data.defaultOpenAiModel.trim() ? data.defaultOpenAiModel : "gpt-4o",
          apiCostModelsText: JSON.stringify(data?.apiCostModels ?? [], null, 2),
        }))
      } catch (e: any) {
        if (!canceled) {
          toast.error("Impossibile caricare le impostazioni", { description: e?.message })
        }
      } finally {
        if (!canceled) setGeneralLoading(false)
      }
    }

    loadGeneral()
    return () => {
      canceled = true
    }
  }, [])

  const handleSave = async () => {
    try {
      const parsed = JSON.parse(generalSettings.apiCostModelsText || "[]")
      const res = await fetch("/api/settings/general", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agencyName: generalSettings.agencyName,
          agencyBio: generalSettings.agencyBio,
          agencyLogoUrl: generalSettings.agencyLogoUrl,
          contactEmail: generalSettings.contactEmail,
          contactPhone: generalSettings.contactPhone,
          websiteUrl: generalSettings.websiteUrl,
          headquartersAddress: generalSettings.headquartersAddress,
          defaultOpenAiModel: generalSettings.defaultOpenAiModel,
          apiCostModels: parsed,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error ?? `Save failed (${res.status})`)
      }

      toast.success("Impostazioni salvate")
    } catch (e: any) {
      if (e?.message?.includes("Unexpected token")) {
        toast.error("JSON non valido nei costi API", { description: "Controlla il formato del campo" })
        return
      }
      toast.error("Salvataggio fallito", { description: e?.message })
    }
  }

  return (
    <div className="p-4 lg:p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Impostazioni</h1>
          <p className="text-muted-foreground text-sm mt-1">Gestisci il tuo profilo e le preferenze dell'app.</p>
        </div>

        <Button onClick={handleSave} className="gap-2">
          <Save className="h-4 w-4" />
          Salva
        </Button>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(v) => {
          const next = new URLSearchParams(searchParams.toString())
          next.set("tab", v)
          router.replace(`${pathname}?${next.toString()}`, { scroll: false })
        }}
        className="space-y-6"
      >
        <TabsList className="bg-muted/50">
          <TabsTrigger value="agency" className="gap-2">
            <User className="h-4 w-4" />
            Agenzia
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="general" className="gap-2">
            <Globe className="h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="api-costs" className="gap-2">
            <DollarSign className="h-4 w-4" />
            API Costs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="agency" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informazioni agenzia</CardTitle>
              <CardDescription>Dati generali dell'applicazione e dell'agenzia.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="agency-name">Nome agenzia</Label>
                  <Input
                    id="agency-name"
                    value={generalSettings.agencyName}
                    onChange={(e) => setGeneralSettings({ ...generalSettings, agencyName: e.target.value })}
                    disabled={generalLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="agency-logo">Logo</Label>
                  <Input
                    id="agency-logo"
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      const reader = new FileReader()
                      reader.onload = () => {
                        const result = typeof reader.result === "string" ? reader.result : ""
                        if (!result) return
                        setGeneralSettings({ ...generalSettings, agencyLogoUrl: result })
                      }
                      reader.readAsDataURL(file)
                    }}
                    disabled={generalLoading}
                  />
                  {generalSettings.agencyLogoUrl ? (
                    <div className="pt-2">
                      <div className="text-xs text-muted-foreground">Anteprima</div>
                      <img
                        src={generalSettings.agencyLogoUrl}
                        alt="Logo"
                        className="mt-2 h-16 w-16 rounded object-contain border bg-background"
                      />
                      <div className="pt-2">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => setGeneralSettings({ ...generalSettings, agencyLogoUrl: "" })}
                          disabled={generalLoading}
                        >
                          Rimuovi logo
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="agency-bio">Bio agenzia</Label>
                <Textarea
                  id="agency-bio"
                  value={generalSettings.agencyBio}
                  onChange={(e) => setGeneralSettings({ ...generalSettings, agencyBio: e.target.value })}
                  rows={4}
                  disabled={generalLoading}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="contact-email">Email contatto</Label>
                  <Input
                    id="contact-email"
                    value={generalSettings.contactEmail}
                    onChange={(e) => setGeneralSettings({ ...generalSettings, contactEmail: e.target.value })}
                    disabled={generalLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact-phone">Telefono contatto</Label>
                  <Input
                    id="contact-phone"
                    value={generalSettings.contactPhone}
                    onChange={(e) => setGeneralSettings({ ...generalSettings, contactPhone: e.target.value })}
                    disabled={generalLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website-url">Sito web</Label>
                  <Input
                    id="website-url"
                    value={generalSettings.websiteUrl}
                    onChange={(e) => setGeneralSettings({ ...generalSettings, websiteUrl: e.target.value })}
                    disabled={generalLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hq-address">Indirizzo sede</Label>
                  <Input
                    id="hq-address"
                    value={generalSettings.headquartersAddress}
                    onChange={(e) => setGeneralSettings({ ...generalSettings, headquartersAddress: e.target.value })}
                    disabled={generalLoading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Modello OpenAI predefinito</Label>
                <Select
                  value={generalSettings.defaultOpenAiModel}
                  onValueChange={(v) => setGeneralSettings({ ...generalSettings, defaultOpenAiModel: v })}
                  disabled={generalLoading}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gpt-4o">gpt-4o</SelectItem>
                    <SelectItem value="gpt-4o-mini">gpt-4o-mini</SelectItem>
                    <SelectItem value="gpt-4.1">gpt-4.1</SelectItem>
                    <SelectItem value="gpt-4.1-mini">gpt-4.1-mini</SelectItem>
                    <SelectItem value="gpt-4.1-nano">gpt-4.1-nano</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Notification preferences</CardTitle>
              <CardDescription>Choose what you want to be notified about.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {[
                {
                  key: "emailUpdates" as const,
                  label: "Email updates",
                  desc: "Receive updates when valuations complete.",
                },
                {
                  key: "telegramSync" as const,
                  label: "Telegram sync",
                  desc: "Notifications when new photos are imported from Telegram.",
                },
                {
                  key: "valuationAlerts" as const,
                  label: "Valuation alerts",
                  desc: "Notify when a valuation is ready for download.",
                },
                {
                  key: "weeklyReport" as const,
                  label: "Weekly report",
                  desc: "Get a weekly portfolio summary by email.",
                },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">{item.label}</Label>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                  <Switch
                    checked={notifications[item.key]}
                    onCheckedChange={(v) => setNotifications({ ...notifications, [item.key]: v })}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Palette className="h-4 w-4" />
                App preferences
              </CardTitle>
              <CardDescription>Customize how the app looks and feels.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Theme</Label>
                  <Select value={theme ?? "system"} onValueChange={(v) => setTheme(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="system">System</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Language</Label>
                  <Select defaultValue="en">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="it">Italiano</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Select defaultValue="eur">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="eur">EUR (€)</SelectItem>
                      <SelectItem value="usd">USD ($)</SelectItem>
                      <SelectItem value="gbp">GBP (£)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Date format</Label>
                  <Select defaultValue="dd-mm-yyyy">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dd-mm-yyyy">DD/MM/YYYY</SelectItem>
                      <SelectItem value="mm-dd-yyyy">MM/DD/YYYY</SelectItem>
                      <SelectItem value="yyyy-mm-dd">YYYY-MM-DD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Configurazione costi API (JSON)</CardTitle>
              <CardDescription>
                Parametri applicativi per il calcolo dei costi (array JSON). Esempio: provider/category/model/unit/costUsd.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Textarea
                value={generalSettings.apiCostModelsText}
                onChange={(e) => setGeneralSettings({ ...generalSettings, apiCostModelsText: e.target.value })}
                rows={10}
                disabled={generalLoading}
              />
              <div className="text-xs text-muted-foreground">Il salvataggio avviene col pulsante "Salva" in alto.</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">API & Integrations</CardTitle>
              <CardDescription>Manage external keys and integrations.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="openai-key">OpenAI API Key</Label>
                <Input id="openai-key" type="password" placeholder="sk-••••••••••••••••" />
                <p className="text-xs text-muted-foreground">Used for AI narrative and photo enhancement.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="telegram-token">Telegram Bot Token</Label>
                <Input id="telegram-token" type="password" placeholder="••••••••:•••••••••••••••••••" />
                <p className="text-xs text-muted-foreground">Used to sync photos and notes from Telegram.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api-costs" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">API Costs</CardTitle>
              <CardDescription>Track per-user costs for OpenAI and Google Places.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <Card className="border-dashed">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">Total OpenAI</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="text-2xl font-bold">${(costTotals.openai ?? 0).toFixed(6)}</div>
                  </CardContent>
                </Card>
                <Card className="border-dashed">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">Total Google</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="text-2xl font-bold">${(costTotals.google ?? 0).toFixed(6)}</div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-4 sm:grid-cols-4">
                <div className="space-y-2">
                  <Label>Provider</Label>
                  <Select value={costProvider} onValueChange={setCostProvider}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="openai">OpenAI</SelectItem>
                      <SelectItem value="google">Google</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={costCategory} onValueChange={setCostCategory}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="text">Text</SelectItem>
                      <SelectItem value="image">Image</SelectItem>
                      <SelectItem value="voice">Voice</SelectItem>
                      <SelectItem value="places">Places</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>From</Label>
                  <Input type="date" value={costFrom} onChange={(e) => setCostFrom(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>To</Label>
                  <Input type="date" value={costTo} onChange={(e) => setCostTo(e.target.value)} />
                </div>
              </div>

              <div className="rounded-lg border">
                <TooltipProvider delayDuration={150} skipDelayDuration={200} disableHoverableContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>House</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Provider</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Operation</TableHead>
                        <TableHead>Endpoint</TableHead>
                        <TableHead className="text-right">Cost (USD)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {costLoading ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-sm text-muted-foreground">
                            Loading...
                          </TableCell>
                        </TableRow>
                      ) : costRows.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-sm text-muted-foreground">
                            No cost records yet.
                          </TableCell>
                        </TableRow>
                      ) : (
                        costRows.map((row) => {
                          const createdAtLabel = new Date(row.createdAt).toLocaleString("en-GB")
                          const fullHouseLabel = row.houseTitle?.trim() || row.houseId?.trim() || "—"
                          const truncatedHouseLabel =
                            fullHouseLabel !== "—" && fullHouseLabel.length > 32
                              ? `${fullHouseLabel.slice(0, 32)}…`
                              : fullHouseLabel
                          const showHouseTooltip = truncatedHouseLabel !== fullHouseLabel
                          const userLabel = row.userName?.trim() || row.userId || "—"

                          return (
                            <TableRow key={row.id}>
                              <TableCell>{createdAtLabel}</TableCell>
                              <TableCell className="text-sm">
                                {fullHouseLabel === "—" ? (
                                  "—"
                                ) : showHouseTooltip ? (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="cursor-help whitespace-nowrap font-medium text-sm">
                                        {truncatedHouseLabel}
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent side="top">{fullHouseLabel}</TooltipContent>
                                  </Tooltip>
                                ) : (
                                  <span className="whitespace-nowrap font-medium text-sm">{truncatedHouseLabel}</span>
                                )}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">{userLabel}</TableCell>
                              <TableCell className="capitalize">{row.provider}</TableCell>
                              <TableCell className="capitalize">{row.category}</TableCell>
                              <TableCell className="font-mono text-xs">{row.operation}</TableCell>
                              <TableCell className="font-mono text-xs">{row.endpoint}</TableCell>
                              <TableCell className="text-right">{row.costUsd.toFixed(6)}</TableCell>
                            </TableRow>
                          )
                        })
                      )}
                    </TableBody>
                  </Table>
                </TooltipProvider>
              </div>

              <div className="text-xs text-muted-foreground">
                Totals by category: {Object.entries(costByCategory)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([k, v]) => `${k}: $${Number(v ?? 0).toFixed(4)}`)
                  .join(" | ")}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
