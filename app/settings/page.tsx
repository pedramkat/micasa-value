"use client"

import { useEffect, useMemo, useState } from "react"
import { useSession } from "next-auth/react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useTheme } from "next-themes"
import { Bell, Globe, Palette, Save, Shield, User, DollarSign } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "sonner"

function initialsFromUser(name?: string | null, email?: string | null) {
  const src = (name?.trim() || "")
  if (src) {
    return src
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((x) => x[0]?.toUpperCase())
      .join("")
  }
  if (email?.trim()) return email.trim().slice(0, 2).toUpperCase()
  return "MC"
}

export default function SettingsPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { theme, setTheme } = useTheme()

  const activeTab = searchParams.get("tab") ?? "profile"

  const initials = useMemo(
    () => initialsFromUser(session?.user?.name ?? null, session?.user?.email ?? null),
    [session?.user?.name, session?.user?.email],
  )

  const [profile, setProfile] = useState({
    name: session?.user?.name ?? "",
    email: session?.user?.email ?? "",
    phone: "+39 ",
    company: "MiCasa Valutazioni",
    bio: "",
  })

  const [notifications, setNotifications] = useState({
    emailUpdates: true,
    telegramSync: true,
    valuationAlerts: true,
    weeklyReport: false,
  })

  const [costProvider, setCostProvider] = useState<string>("all")
  const [costCategory, setCostCategory] = useState<string>("all")
  const [costFrom, setCostFrom] = useState<string>("")
  const [costTo, setCostTo] = useState<string>("")
  const [costRows, setCostRows] = useState<
    Array<{
      id: string
      createdAt: string
      houseId: string | null
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
        const url = new URL("/api/settings/costs", window.location.origin)
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

  const handleSave = () => {
    toast.success("Settings saved")
  }

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage your profile and app preferences.</p>
        </div>

        <Button onClick={handleSave} className="gap-2">
          <Save className="h-4 w-4" />
          Save
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
          <TabsTrigger value="profile" className="gap-2">
            <User className="h-4 w-4" />
            Profile
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

        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Personal Information</CardTitle>
              <CardDescription>Update your profile details.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4 pb-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground text-xl font-bold">
                  {initials}
                </div>
                <div>
                  <Button variant="outline" size="sm">
                    Change photo
                  </Button>
                  <p className="text-xs text-muted-foreground mt-1">JPG, PNG. Max 2MB.</p>
                </div>
              </div>

              <Separator />

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Full name</Label>
                  <Input id="name" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company">Company</Label>
                  <Input
                    id="company"
                    value={profile.company}
                    onChange={(e) => setProfile({ ...profile, company: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea id="bio" value={profile.bio} onChange={(e) => setProfile({ ...profile, bio: e.target.value })} rows={3} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Security
              </CardTitle>
              <CardDescription>Manage password and authentication.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="current-pw">Current password</Label>
                  <Input id="current-pw" type="password" placeholder="••••••••" />
                </div>
                <div />
                <div className="space-y-2">
                  <Label htmlFor="new-pw">New password</Label>
                  <Input id="new-pw" type="password" placeholder="••••••••" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-pw">Confirm password</Label>
                  <Input id="confirm-pw" type="password" placeholder="••••••••" />
                </div>
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
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>House</TableHead>
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
                        <TableCell colSpan={7} className="text-sm text-muted-foreground">
                          Loading...
                        </TableCell>
                      </TableRow>
                    ) : costRows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-sm text-muted-foreground">
                          No cost records yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      costRows.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell>{new Date(row.createdAt).toLocaleString("en-GB")}</TableCell>
                          <TableCell className="font-mono text-xs">{row.houseId ?? "—"}</TableCell>
                          <TableCell className="capitalize">{row.provider}</TableCell>
                          <TableCell className="capitalize">{row.category}</TableCell>
                          <TableCell className="font-mono text-xs">{row.operation}</TableCell>
                          <TableCell className="font-mono text-xs">{row.endpoint}</TableCell>
                          <TableCell className="text-right">{row.costUsd.toFixed(6)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
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
