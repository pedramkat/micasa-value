export const dynamic = "force-dynamic"; // This disables SSG and ISR

import prisma from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { houseService } from "@/lib/services/house.service";
import { processHouseDataWithOpenAI } from "@/lib/services/house-ai.service";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { randomUUID } from "node:crypto";
import path from "node:path";
import fs from "node:fs/promises";
import { PriceParametersEditor } from "@/components/price-parameters-editor";
import { IndirizzoInlineEditor } from "@/components/indirizzo-inline-editor";
import { InlineTextEditor } from "@/components/inline-text-editor";
import { HouseMediaEnhancePanel } from "@/components/house-media-enhance-panel";
import { HouseDetailTabs } from "@/components/house-detail-tabs";
import { OwnerSelect } from "@/components/house/OwnerSelect";
import { FeatureImagePicker } from "@/components/house/FeatureImagePicker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MarketMetricsCards } from "@/components/house/MarketMetricsCards";
import { PriceHistoryChart } from "@/components/house/PriceHistoryChart";
import { IstatComparisonChart } from "@/components/house/IstatComparisonChart";
import { ZonePriceMap } from "@/components/house/ZonePriceMap";
import { HouseLocationMap } from "@/components/house/HouseLocationMap";
import { generatePriceHistory, getMarketMetrics, getZonesForCity } from "@/lib/market-data";
import { ArrowLeft, MapPin, Calculator, Brain, Trash2, Eye, FileText } from "lucide-react";

export default async function House({
  params,
}: {
  params: { id?: string } | Promise<{ id?: string }>
}) {
  const resolvedParams = await Promise.resolve(params)
  const houseId = typeof resolvedParams?.id === "string" ? resolvedParams.id : ""

  if (!houseId) {
    notFound()
  }

  const house = await prisma.house.findUnique({
    where: { id: houseId },
    include: {
      user: true,
      owner: true,
    },
  });

  if (!house) {
    notFound();
  }

  async function addHouseParameter(formData: FormData) {
    "use server";

    const rawKey = formData.get("key")
    const rawValue = formData.get("value")

    const key = typeof rawKey === "string" ? rawKey.trim() : ""
    const valueString = typeof rawValue === "string" ? rawValue.trim() : ""

    if (!key) {
      return
    }

    const houseParametersConfig = await prisma.configuration.findFirst({
      where: { title: "house_parameters" },
      select: { properties: true },
    })

    const houseParametersProperties =
      houseParametersConfig?.properties &&
      typeof houseParametersConfig.properties === "object" &&
      !Array.isArray(houseParametersConfig.properties)
        ? (houseParametersConfig.properties as Record<string, unknown>)
        : {}

    const typeRaw = houseParametersProperties[key]
    const expectedType = typeof typeRaw === "string" ? typeRaw.toLowerCase() : "string"

    let parsedValue: unknown = valueString
    if (expectedType === "int") {
      const n = Number(valueString)
      parsedValue = Number.isFinite(n) ? Math.trunc(n) : null
    } else if (expectedType === "bool") {
      const lower = valueString.toLowerCase()
      if (lower === "true" || lower === "1" || lower === "yes" || lower === "y") parsedValue = true
      else if (lower === "false" || lower === "0" || lower === "no" || lower === "n") parsedValue = false
      else parsedValue = null
    } else if (expectedType === "string") {
      parsedValue = valueString || null
    }

    const houseRow = await prisma.house.findUnique({
      where: { id: houseId },
      select: { aiCurrent: true },
    })

    const currentAi = houseRow?.aiCurrent && typeof houseRow.aiCurrent === "object" ? (houseRow.aiCurrent as any) : {}
    const currentHouseParams = (currentAi as any)?.houseParameters
    const nextHouseParams: Record<string, unknown> =
      currentHouseParams && typeof currentHouseParams === "object" && !Array.isArray(currentHouseParams)
        ? { ...(currentHouseParams as Record<string, unknown>) }
        : {}

    nextHouseParams[key] = parsedValue

    const nextAiCurrent = {
      ...(currentAi || {}),
      houseParameters: nextHouseParams,
    }

    await prisma.house.update({
      where: { id: houseId },
      data: {
        aiCurrent: nextAiCurrent,
      },
    })

    redirect(`/houses/${houseId}`)
  }

  async function removeHouseParameter(keyToRemove: string) {
    "use server";

    const normalized = typeof keyToRemove === "string" ? keyToRemove.trim() : ""
    if (!normalized) return
    if (normalized.toLowerCase() === "indirizzo") return

    const houseRow = await prisma.house.findUnique({
      where: { id: houseId },
      select: { aiCurrent: true },
    })

    const currentAi = houseRow?.aiCurrent && typeof houseRow.aiCurrent === "object" ? (houseRow.aiCurrent as any) : {}
    const currentHouseParams = (currentAi as any)?.houseParameters
    const nextHouseParams: Record<string, unknown> =
      currentHouseParams && typeof currentHouseParams === "object" && !Array.isArray(currentHouseParams)
        ? { ...(currentHouseParams as Record<string, unknown>) }
        : {}

    const toDeleteLower = normalized.toLowerCase()
    for (const k of Object.keys(nextHouseParams)) {
      if (k.toLowerCase() === toDeleteLower) {
        delete nextHouseParams[k]
      }
    }

    const nextAiCurrent = {
      ...(currentAi || {}),
      houseParameters: nextHouseParams,
    }

    await prisma.house.update({
      where: { id: houseId },
      data: {
        aiCurrent: nextAiCurrent,
      },
    })

    redirect(`/houses/${houseId}`)
  }

  let totalMin: number | null = null
  let totalMax: number | null = null

  const pricingCurrent = house.pricingCurrent && typeof house.pricingCurrent === "object" ? (house.pricingCurrent as any) : null
  const valuationHistory = Array.isArray((house as any).valuationHistory) ? ((house as any).valuationHistory as any[]) : []

  const aiCurrent = house.aiCurrent && typeof house.aiCurrent === "object" ? (house.aiCurrent as any) : null
  const configurationsFromAi = aiCurrent?.configurations
  const houseParametersFromAi = aiCurrent?.houseParameters
  const aiConfigurationsByTitle =
    configurationsFromAi && typeof configurationsFromAi === "object" && !Array.isArray(configurationsFromAi)
      ? (configurationsFromAi as Record<string, unknown>)
      : null

  const houseParametersByKey =
    houseParametersFromAi && typeof houseParametersFromAi === "object" && !Array.isArray(houseParametersFromAi)
      ? (houseParametersFromAi as Record<string, unknown>)
      : null

  const indirizzoEntry = houseParametersByKey
    ? Object.entries(houseParametersByKey).find(([k]) => typeof k === "string" && k.toLowerCase() === "indirizzo")
    : undefined
  const indirizzoValue =
    typeof indirizzoEntry?.[1] === "string" && indirizzoEntry?.[1].trim() ? (indirizzoEntry?.[1] as string).trim() : ""

  const houseParameterEntries = houseParametersByKey
    ? Object.entries(houseParametersByKey)
        .filter(([k]) => typeof k === "string" && k.trim())
        .filter(([k]) => k.toLowerCase() !== "indirizzo")
        .map(([key, value]) => {
          const isEmptyString = typeof value === "string" && !value.trim()
          const isEmptyArray = Array.isArray(value) && value.length === 0
          const isNullish = value === null || value === undefined
          return {
            key,
            value,
            show: !(isNullish || isEmptyString || isEmptyArray),
          }
        })
        .filter((x) => x.show)
    : []

  const houseParametersConfig = await prisma.configuration.findFirst({
    where: { title: "house_parameters" },
    select: { properties: true },
  })

  const houseParametersProperties =
    houseParametersConfig?.properties && typeof houseParametersConfig.properties === "object" && !Array.isArray(houseParametersConfig.properties)
      ? (houseParametersConfig.properties as Record<string, unknown>)
      : {}

  const houseParametersPropertyKeys = Object.keys(houseParametersProperties)
    .filter((k) => typeof k === "string" && k.trim())
    .sort((a, b) => a.localeCompare(b))


  const formatHouseParameterValue = (value: unknown): string => {
    if (value === null || value === undefined) return ""
    if (typeof value === "string") return value
    if (typeof value === "number" || typeof value === "boolean") return String(value)
    if (Array.isArray(value)) {
      const parts: string[] = []
      for (const v of value) {
        const s = formatHouseParameterValue(v)
        if (s) parts.push(s)
      }
      return parts.join(", ")
    }
    if (typeof value === "object") {
      try {
        return JSON.stringify(value)
      } catch {
        return String(value)
      }
    }
    return String(value)
  }

  const configurationTitles: string[] = Array.isArray(configurationsFromAi)
    ? configurationsFromAi.filter((x: unknown) => typeof x === "string" && x.trim())
    : aiConfigurationsByTitle
      ? Object.keys(aiConfigurationsByTitle).filter((t) => typeof t === "string" && t.trim())
      : []

  const configurationRows = configurationTitles.length
    ? await prisma.configuration.findMany({
        where: {
          OR: configurationTitles.map((title) => ({
            title: { equals: title, mode: "insensitive" },
          })),
        },
        select: { title: true, fixValue: true },
      })
    : []

  const evaluationConfigurationTitles = Array.from(
    new Set(
      valuationHistory
        .flatMap((v: any) => {
          const fromInputs = Array.isArray(v?.inputs?.configurations) ? (v.inputs.configurations as unknown[]) : []
          const fromFixValues = Array.isArray(v?.configurationFixValues)
            ? (v.configurationFixValues as any[]).map((x) => x?.title)
            : []
          return [...fromInputs, ...fromFixValues]
        })
        .filter((t) => typeof t === "string" && t.trim()) as string[],
    ),
  )

  const evaluationConfigurationRows = evaluationConfigurationTitles.length
    ? await prisma.configuration.findMany({
        where: {
          OR: evaluationConfigurationTitles.map((title) => ({
            title: { equals: title, mode: "insensitive" },
          })),
        },
        select: { title: true, fixValue: true },
      })
    : []

  const evaluationDbFixValueByTitleLower = new Map(
    evaluationConfigurationRows.map((r) => [r.title.toLowerCase(), r.fixValue]),
  )

  const eligibleConfigurationRows = await prisma.configuration.findMany({
    where: {
      OR: [{ propertyValuation: true }, { houseValuation: true }],
    },
    select: { title: true, fixValue: true },
    orderBy: { title: "asc" },
  })

  const configurationFixValues = configurationTitles.map((t) => {
    const row = configurationRows.find((r) => r.title.toLowerCase() === t.toLowerCase())
    const fixValue = row?.fixValue
    const fixValueNumber = typeof fixValue === "number" ? fixValue : typeof fixValue === "string" ? Number(fixValue) : Number.NaN
    const aiValue = aiConfigurationsByTitle
      ? Object.entries(aiConfigurationsByTitle).find(([k]) => k.toLowerCase() === t.toLowerCase())?.[1]
      : undefined
    return {
      title: t,
      fixValue: aiValue ?? row?.fixValue ?? null,
      found: Boolean(row),
    }
  })

  if (pricingCurrent) {
    const minRaw = pricingCurrent?.pricing?.total?.comprMin
    const maxRaw = pricingCurrent?.pricing?.total?.comprMax
    const min = typeof minRaw === "string" || typeof minRaw === "number" ? Number(minRaw) : Number.NaN
    const max = typeof maxRaw === "string" || typeof maxRaw === "number" ? Number(maxRaw) : Number.NaN
    totalMin = Number.isFinite(min) ? min : null
    totalMax = Number.isFinite(max) ? max : null
  }

  const eur = new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  })

  const avgEstimate = totalMin !== null && totalMax !== null ? (totalMin + totalMax) / 2 : null

  const point = (house as any)?.coordinate
  const coordinateLatLon = (() => {
    if (!point || typeof point !== "object") return null
    if (point.type !== "Point" || !Array.isArray(point.coordinates) || point.coordinates.length < 2) return null

    const a = Number(point.coordinates[0])
    const b = Number(point.coordinates[1])
    if (!Number.isFinite(a) || !Number.isFinite(b)) return null

    const aLooksLikeLat = a >= -90 && a <= 90
    const bLooksLikeLon = b >= -180 && b <= 180
    const aLooksLikeLon = a >= -180 && a <= 180
    const bLooksLikeLat = b >= -90 && b <= 90

    if (aLooksLikeLat && bLooksLikeLon) return { lat: a, lon: b }
    if (aLooksLikeLon && bLooksLikeLat) return { lat: b, lon: a }
    return null
  })()

  // Server action to delete the house
  async function deleteHouse() {
    "use server";

    await prisma.house.delete({
      where: {
        id: houseId,
      },
    });

    redirect("/houses");
  }

  async function saveHouseTitle(nextTitle: string): Promise<{ ok: true } | { ok: false; error: string }> {
    "use server";

    const title = typeof nextTitle === "string" ? nextTitle.trim() : ""
    if (!title) return { ok: false, error: "Title is required." }

    try {
      await prisma.house.update({
        where: { id: houseId },
        data: { title },
      })
      return { ok: true }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unknown error"
      return { ok: false, error: message }
    }
  }

  async function saveHouseDescription(nextDescription: string): Promise<{ ok: true } | { ok: false; error: string }> {
    "use server";

    const description = typeof nextDescription === "string" ? nextDescription.trim() : ""

    try {
      await prisma.house.update({
        where: { id: houseId },
        data: { description: description || null },
      })
      return { ok: true }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unknown error"
      return { ok: false, error: message }
    }
  }

  async function calculateGeom() {
    "use server";

    await houseService.calculateGeom(houseId)
  }

  async function calculatePrice(formData: FormData) {
    "use server";

    const houseRow = await prisma.house.findUnique({
      where: { id: houseId },
      select: { aiCurrent: true, aiHistory: true },
    })

    const currentAi = houseRow?.aiCurrent && typeof houseRow.aiCurrent === "object" ? (houseRow.aiCurrent as any) : {}
    const currentHistory = Array.isArray(houseRow?.aiHistory) ? ((houseRow?.aiHistory as any[]) ?? []) : []

    const overrides: Record<string, unknown> = {}
    for (let i = 0; ; i++) {
      const titleKey = `cfg_title_${i}`
      const valueKey = `cfg_value_${i}`
      const titleRaw = formData.get(titleKey)
      const valueRaw = formData.get(valueKey)

      if (titleRaw === null || titleRaw === undefined) {
        break
      }

      const title = typeof titleRaw === "string" ? titleRaw.trim() : ""
      if (!title) {
        continue
      }

      if (typeof valueRaw === "string" && valueRaw.trim()) {
        overrides[title] = valueRaw.trim()
      }
    }

    const timestamp = new Date().toISOString()
    const manualSnapshotId = randomUUID()

    const currentConfigurations = (currentAi as any)?.configurations
    const nextConfigurations: Record<string, unknown> =
      currentConfigurations && typeof currentConfigurations === "object" && !Array.isArray(currentConfigurations)
        ? { ...(currentConfigurations as Record<string, unknown>) }
        : {}

    for (const [title, value] of Object.entries(overrides)) {
      nextConfigurations[title] = value
    }

    const nextAiCurrent = {
      ...(currentAi || {}),
      configurations: nextConfigurations,
    }

    const nextAiHistory = [
      ...currentHistory,
      {
        id: manualSnapshotId,
        timestamp,
        source: "manual",
        model: "unknown",
        promptVersion: "manual-v1",
        rawResponse: null,
        parsed: nextAiCurrent,
      },
    ]

    await prisma.house.update({
      where: { id: houseId },
      data: {
        aiCurrent: nextAiCurrent,
        aiHistory: nextAiHistory,
      },
    })

    await houseService.calculatePrice(houseId, overrides)
    redirect(`/houses/${houseId}`)
  }

  async function removePriceParameter(title: string) {
    "use server";

    const normalized = typeof title === "string" ? title.trim() : ""
    if (!normalized) return

    const houseRow = await prisma.house.findUnique({
      where: { id: houseId },
      select: { aiCurrent: true, aiHistory: true },
    })

    const currentAi = houseRow?.aiCurrent && typeof houseRow.aiCurrent === "object" ? (houseRow.aiCurrent as any) : {}
    const currentHistory = Array.isArray(houseRow?.aiHistory) ? ((houseRow?.aiHistory as any[]) ?? []) : []

    const currentConfigurations = (currentAi as any)?.configurations
    const nextConfigurations: Record<string, unknown> =
      currentConfigurations && typeof currentConfigurations === "object" && !Array.isArray(currentConfigurations)
        ? { ...(currentConfigurations as Record<string, unknown>) }
        : {}

    const toDeleteLower = normalized.toLowerCase()
    for (const key of Object.keys(nextConfigurations)) {
      if (key.toLowerCase() === toDeleteLower) {
        delete nextConfigurations[key]
      }
    }

    const timestamp = new Date().toISOString()
    const manualSnapshotId = randomUUID()
    const nextAiCurrent = {
      ...(currentAi || {}),
      configurations: nextConfigurations,
    }
    const nextAiHistory = [
      ...currentHistory,
      {
        id: manualSnapshotId,
        timestamp,
        source: "manual",
        model: "unknown",
        promptVersion: "manual-v1",
        rawResponse: null,
        parsed: nextAiCurrent,
      },
    ]

    await prisma.house.update({
      where: { id: houseId },
      data: {
        aiCurrent: nextAiCurrent,
        aiHistory: nextAiHistory,
      },
    })
  }

  async function saveIndirizzo(nextIndirizzo: string): Promise<{ ok: true } | { ok: false; error: string }> {
    "use server";

    const indirizzo = typeof nextIndirizzo === "string" ? nextIndirizzo.trim() : ""
    if (!indirizzo) {
      return { ok: false, error: "Indirizzo is required." }
    }

    try {
      const houseRow = await prisma.house.findUnique({
        where: { id: houseId },
        select: { aiCurrent: true },
      })

      const currentAi = houseRow?.aiCurrent && typeof houseRow.aiCurrent === "object" ? (houseRow.aiCurrent as any) : {}
      const currentHouseParams = (currentAi as any)?.houseParameters
      const nextHouseParams: Record<string, unknown> =
        currentHouseParams && typeof currentHouseParams === "object" && !Array.isArray(currentHouseParams)
          ? { ...(currentHouseParams as Record<string, unknown>) }
          : {}

      const existingKey = Object.keys(nextHouseParams).find((k) => k.toLowerCase() === "indirizzo")
      nextHouseParams[existingKey || "Indirizzo"] = indirizzo

      const nextAiCurrent = {
        ...(currentAi || {}),
        houseParameters: nextHouseParams,
      }

      await prisma.house.update({
        where: { id: houseId },
        data: {
          aiCurrent: nextAiCurrent,
        },
      })

      await houseService.setCoordinateFromStreet(houseId, indirizzo)
      await houseService.calculateGeom(houseId)

      return { ok: true }
    } catch (e) {
      console.error(`[House ${houseId}] Failed saving indirizzo:`, e)
      const message = e instanceof Error ? e.message : "Unknown error"
      return { ok: false, error: message }
    }
  }

  async function regenerateAI() {
    "use server";

    const session = await getServerSession(authOptions)
    const sessionUserId = session?.user?.id
    const sessionEmail = session?.user?.email

    let requesterUserId: string | null = typeof sessionUserId === "string" && sessionUserId.trim() ? sessionUserId : null
    if (requesterUserId) {
      const exists = await prisma.user.findUnique({ where: { id: requesterUserId }, select: { id: true } })
      if (!exists) requesterUserId = null
    }

    if (!requesterUserId && typeof sessionEmail === "string" && sessionEmail.trim()) {
      const user = await prisma.user.findUnique({ where: { email: sessionEmail.trim() }, select: { id: true } })
      requesterUserId = user?.id ?? null
    }

    await processHouseDataWithOpenAI(houseId, `web-${houseId}`, requesterUserId)
    redirect(`/houses/${houseId}`)
  }

  async function deleteEvaluation(valuationId: string) {
    "use server";

    await houseService.deleteValuationSnapshot(houseId, valuationId)
    try {
      const pdfPath = path.join(process.cwd(), "storage", "pdf", houseId, `${valuationId}.pdf`)
      await fs.unlink(pdfPath)
    } catch {
    }
    redirect(`/houses/${houseId}`)
  }

  const evaluationsRecentFirst = [...valuationHistory].reverse()

  const pdfDir = path.join(process.cwd(), "storage", "pdf", houseId)
  const pdfByValuationId = new Set<string>()
  try {
    const files = await fs.readdir(pdfDir)
    for (const f of files) {
      if (!f.toLowerCase().endsWith(".pdf")) continue
      const id = f.slice(0, -4)
      if (id) pdfByValuationId.add(id)
    }
  } catch {
  }

  const media = house.media && typeof house.media === "object" ? (house.media as any) : {}
  const photos = Array.isArray(media.photos) ? (media.photos as any[]) : []
  const enhancedPhotos = Array.isArray(media.enhancedPhotos) ? (media.enhancedPhotos as any[]) : []
  const photoItems = photos
    .map((p) => {
      const pth = p && typeof p === "object" ? (p as any).path : null
      const createdAt = p && typeof p === "object" ? (p as any).createdAt : undefined
      return typeof pth === "string" && pth ? { path: pth, createdAt: typeof createdAt === "string" ? createdAt : undefined } : null
    })
    .filter(Boolean) as Array<{ path: string; createdAt?: string }>

  const enhancedPhotoItems = enhancedPhotos
    .map((p) => {
      const pth = p && typeof p === "object" ? (p as any).path : null
      const createdAt = p && typeof p === "object" ? (p as any).createdAt : undefined
      return typeof pth === "string" && pth ? { path: pth, createdAt: typeof createdAt === "string" ? createdAt : undefined } : null
    })
    .filter(Boolean) as Array<{ path: string; createdAt?: string }>

  const overviewNode = (
    <>
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Estimated Value</p>
            <p className="text-2xl font-bold mt-1">{avgEstimate !== null ? eur.format(avgEstimate) : "—"}</p>
            {totalMin !== null && totalMax !== null && (
              <p className="text-xs text-muted-foreground mt-1">
                {eur.format(totalMin)} – {eur.format(totalMax)}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Photos</p>
            <p className="text-2xl font-bold mt-1">{photoItems.length}</p>
            <p className="text-xs text-muted-foreground mt-1">{enhancedPhotoItems.length} enhanced</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Valuations</p>
            <p className="text-2xl font-bold mt-1">{evaluationsRecentFirst.length}</p>
            <p className="text-xs text-muted-foreground mt-1">{pdfByValuationId.size} with PDF</p>
          </CardContent>
        </Card>
      </div>

      {(houseParameterEntries.length > 0 || houseParametersByKey) && (
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-base font-semibold">House parameters</h2>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="sm:col-span-3">
              <IndirizzoInlineEditor initialValue={indirizzoValue} onSave={saveIndirizzo} />
            </div>

            <div className="sm:col-span-3">
              <form action={addHouseParameter} className="flex flex-col gap-2 sm:flex-row sm:items-end">
                <div className="flex-1">
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Add house parameter</div>
                  <input
                    name="key"
                    list="house-parameter-keys"
                    placeholder="Search parameter…"
                    className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-semibold"
                  />
                  <datalist id="house-parameter-keys">
                    {houseParametersPropertyKeys.map((k) => (
                      <option key={k} value={k} />
                    ))}
                  </datalist>
                </div>

                <div className="flex-1">
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Value</div>
                  <input
                    name="value"
                    placeholder="Value (type-aware)"
                    className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-semibold"
                  />
                </div>

                <button
                  type="submit"
                  className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  Add
                </button>
              </form>
            </div>

            {houseParameterEntries.map((p) => (
              <div key={p.key} className="rounded-lg bg-muted/20 px-4 py-3 ring-1 ring-border">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{p.key}</div>
                    <div className="mt-1 text-sm font-semibold break-words">{formatHouseParameterValue(p.value)}</div>
                  </div>

                  <form action={removeHouseParameter.bind(null, p.key)} className="shrink-0">
                    <button
                      type="submit"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-background text-muted-foreground ring-1 ring-border hover:bg-accent hover:text-foreground"
                      aria-label={`Remove ${p.key}`}
                      title="Remove"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-base font-semibold">Description</h2>
        <div className="mt-3 text-sm text-muted-foreground leading-relaxed">
          <InlineTextEditor
            initialValue={house.description ?? ""}
            placeholder="No description available for this house. Click to add one."
            multiline
            onSave={saveHouseDescription}
            textClassName="whitespace-pre-wrap text-sm text-muted-foreground leading-relaxed"
          />
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-base font-semibold">Location</h2>
        {coordinateLatLon ? (
          <div className="mt-4 overflow-hidden rounded-xl bg-muted h-64">
            <HouseLocationMap lat={coordinateLatLon.lat} lon={coordinateLatLon.lon} />
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">No valid coordinates available for this house.</p>
        )}
      </section>

      {/* Feature Image */}
      <FeatureImagePicker
        houseId={houseId}
        photos={photoItems}
        enhancedPhotos={enhancedPhotoItems}
        featureImagePath={(house as any).featureImagePath ?? null}
      />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Owner</CardTitle>
        </CardHeader>
        <CardContent>
          <OwnerSelect
            houseId={houseId}
            currentOwnerId={house.ownerId}
            currentUserName={house.owner?.name || house.user?.name || ""}
          />
        </CardContent>
      </Card>

      <section className="rounded-xl border border-border bg-card p-5 flex items-center justify-between">
        <div className="text-sm">
          <div className="font-medium">{house.user?.name || "Anonymous"}</div>
          <div className="text-xs text-muted-foreground">Agent</div>
        </div>
        <div className="text-xs text-muted-foreground">
          Updated {new Date(house.updatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
        </div>
      </section>
    </>
  )

  const mediaNode = (
    <div className="space-y-6">
      <HouseMediaEnhancePanel houseId={houseId} photos={photoItems} enhancedPhotos={enhancedPhotoItems} />
    </div>
  )

  const analyticsNode = (
    <>
      {(() => {
        const metrics = getMarketMetrics(houseId)
        const priceHistory = generatePriceHistory(avgEstimate ?? 400000)
        const zones = getZonesForCity(indirizzoValue || houseId)
        return (
          <>
            <MarketMetricsCards metrics={metrics} />
            <div className="grid gap-6 lg:grid-cols-2">
              <PriceHistoryChart data={priceHistory} yoyChange={metrics.yoyChange} />
              <IstatComparisonChart zones={zones} activeZone={metrics.zone} />
            </div>
            <ZonePriceMap zones={zones} activeZone={metrics.zone} coordinate={coordinateLatLon} />
          </>
        )
      })()}
    </>
  )

  const valuationNode = (
    <div className="space-y-6">
      {(totalMin !== null || totalMax !== null) && (
        <section className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-muted-foreground">Average price estimate</div>
              <div className="mt-1 text-2xl font-extrabold text-foreground">
                {totalMin !== null && totalMax !== null
                  ? eur.format((totalMin + totalMax) / 2)
                  : totalMin !== null
                    ? eur.format(totalMin)
                    : totalMax !== null
                      ? eur.format(totalMax)
                      : "—"}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-muted/20 px-4 py-3 ring-1 ring-border">
                <div className="text-xs font-semibold text-muted-foreground">Min</div>
                <div className="mt-1 text-lg font-bold text-foreground">{totalMin !== null ? eur.format(totalMin) : "—"}</div>
              </div>
              <div className="rounded-lg bg-muted/20 px-4 py-3 ring-1 ring-border">
                <div className="text-xs font-semibold text-muted-foreground">Max</div>
                <div className="mt-1 text-lg font-bold text-foreground">{totalMax !== null ? eur.format(totalMax) : "—"}</div>
              </div>
            </div>
          </div>

          {evaluationsRecentFirst.length > 0 && (
            <div className="mt-5 rounded-lg bg-muted/20 px-4 py-3 ring-1 ring-border">
              <div className="text-sm font-semibold">All evaluations ({evaluationsRecentFirst.length})</div>

              <div className="mt-3 space-y-2">
                {evaluationsRecentFirst.map((v, idx) => {
                  const id = typeof v?.id === "string" ? v.id : null
                  const ts = typeof v?.timestamp === "string" ? v.timestamp : null
                  const minRaw = v?.result?.min
                  const maxRaw = v?.result?.max
                  const avgRaw = v?.result?.avg

                  const configurationFixValuesRaw = Array.isArray(v?.configurationFixValues) ? (v.configurationFixValues as any[]) : []

                  const inputs = v?.inputs && typeof v.inputs === "object" ? (v.inputs as any) : null
                  const inputConfigurations = Array.isArray(inputs?.configurations) ? (inputs.configurations as any[]) : []

                  const configurationTitlesForEvaluation = Array.from(
                    new Set(
                      [...inputConfigurations, ...configurationFixValuesRaw.map((x) => x?.title)].filter(
                        (t) => typeof t === "string" && t.trim(),
                      ) as string[],
                    ),
                  )

                  const pricing = v?.pricingCurrent?.pricing && typeof v.pricingCurrent.pricing === "object" ? (v.pricingCurrent.pricing as any) : null
                  const pricingTotal = pricing?.total && typeof pricing.total === "object" ? (pricing.total as any) : null
                  const pricingAdjustments = Array.isArray(pricing?.adjustments) ? (pricing.adjustments as any[]) : []

                  const baseEurPerSqm = pricing?.baseEurPerSqm && typeof pricing.baseEurPerSqm === "object" ? (pricing.baseEurPerSqm as any) : null
                  const superficieCommercialeRaw = pricing?.superficieCommerciale
                  const superficieCommerciale =
                    typeof superficieCommercialeRaw === "string" || typeof superficieCommercialeRaw === "number"
                      ? Number(superficieCommercialeRaw)
                      : Number.NaN

                  const adjustedEurPerSqmMin =
                    Number.isFinite(superficieCommerciale) && superficieCommerciale > 0 && pricingTotal?.comprMin
                      ? Number(pricingTotal.comprMin) / superficieCommerciale
                      : Number.NaN
                  const adjustedEurPerSqmMax =
                    Number.isFinite(superficieCommerciale) && superficieCommerciale > 0 && pricingTotal?.comprMax
                      ? Number(pricingTotal.comprMax) / superficieCommerciale
                      : Number.NaN

                  const min = typeof minRaw === "string" || typeof minRaw === "number" ? Number(minRaw) : Number.NaN
                  const max = typeof maxRaw === "string" || typeof maxRaw === "number" ? Number(maxRaw) : Number.NaN
                  const avg = typeof avgRaw === "string" || typeof avgRaw === "number" ? Number(avgRaw) : Number.NaN

                  return (
                    <details key={id ?? ts ?? `${idx}`} className="rounded-lg border bg-card p-4 transition-colors">
                      <summary className="cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <div className="text-sm font-semibold">{Number.isFinite(avg) ? eur.format(avg) : "—"}</div>
                            <div className="text-xs text-muted-foreground">
                              {Number.isFinite(min) ? eur.format(min) : "—"} - {Number.isFinite(max) ? eur.format(max) : "—"}
                            </div>
                            <div className="text-xs text-muted-foreground">{ts ?? ""}</div>
                          </div>

                          <div className="flex items-center gap-2">
                            {id &&
                              (pdfByValuationId.has(id) ? (
                                <Button size="sm" variant="outline" className="text-xs h-8 gap-1.5" asChild>
                                  <a href={`/houses/${houseId}/pdf/${id}`} target="_blank" rel="noreferrer">
                                    <Eye className="h-3.5 w-3.5" /> View PDF
                                  </a>
                                </Button>
                              ) : (
                                <Button size="sm" variant="outline" className="text-xs h-8 gap-1.5" asChild>
                                  <a href={`/houses/${houseId}/pdf/${id}`} target="_blank" rel="noreferrer">
                                    <FileText className="h-3.5 w-3.5" /> Generate PDF
                                  </a>
                                </Button>
                              ))}

                            {id && (
                              <form action={deleteEvaluation.bind(null, id)}>
                                <button
                                  type="submit"
                                  className="inline-flex h-8 items-center justify-center rounded-md bg-destructive/10 px-3 text-xs font-semibold text-destructive ring-1 ring-destructive/20 hover:bg-destructive/15"
                                >
                                  Delete
                                </button>
                              </form>
                            )}
                          </div>
                        </div>
                      </summary>

                      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="rounded-lg bg-muted/20 px-4 py-3 ring-1 ring-border">
                          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Result</div>
                          <div className="mt-1 text-sm font-semibold">Min: {Number.isFinite(min) ? eur.format(min) : "—"}</div>
                          <div className="mt-1 text-sm font-semibold">Max: {Number.isFinite(max) ? eur.format(max) : "—"}</div>
                          <div className="mt-1 text-sm font-semibold">Avg: {Number.isFinite(avg) ? eur.format(avg) : "—"}</div>
                        </div>

                        <div className="rounded-lg bg-muted/20 px-4 py-3 ring-1 ring-border">
                          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Price per m²</div>
                          <div className="mt-1 text-sm font-semibold">
                            Base: {baseEurPerSqm?.comprMin ? `${eur.format(Number(baseEurPerSqm.comprMin))}/m²` : "—"} -{" "}
                            {baseEurPerSqm?.comprMax ? `${eur.format(Number(baseEurPerSqm.comprMax))}/m²` : "—"}
                          </div>
                          <div className="mt-1 text-sm font-semibold">
                            Adjusted: {Number.isFinite(adjustedEurPerSqmMin) ? `${eur.format(adjustedEurPerSqmMin)}/m²` : "—"} -{" "}
                            {Number.isFinite(adjustedEurPerSqmMax) ? `${eur.format(adjustedEurPerSqmMax)}/m²` : "—"}
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="rounded-lg bg-muted/20 px-4 py-3 ring-1 ring-border">
                          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Configurations</div>
                          <div className="mt-2 space-y-1">
                            {configurationTitlesForEvaluation.length > 0 ? (
                              configurationTitlesForEvaluation.map((title: string, idx2: number) => {
                                const dbFixValue = evaluationDbFixValueByTitleLower.get(title.toLowerCase())
                                return (
                                  <div key={`${title}-${idx2}`} className="flex items-center justify-between gap-3">
                                    <div className="min-w-0 truncate text-sm font-semibold">{title}</div>
                                    <div className="shrink-0 text-sm font-semibold text-muted-foreground">
                                      {dbFixValue !== null && dbFixValue !== undefined ? String(dbFixValue) : "—"}
                                    </div>
                                  </div>
                                )
                              })
                            ) : (
                              <div className="text-sm text-muted-foreground">No configuration fix values.</div>
                            )}
                          </div>
                        </div>

                        <div className="rounded-lg bg-muted/20 px-4 py-3 ring-1 ring-border">
                          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Adjustments</div>
                          <div className="mt-2 space-y-1">
                            {pricingAdjustments.length > 0 ? (
                              pricingAdjustments.map((a: any, idx2: number) => (
                                <div key={`${a?.title ?? "adj"}-${idx2}`} className="flex items-center justify-between gap-3">
                                  <div className="min-w-0 truncate text-sm font-semibold">
                                    {typeof a?.title === "string" ? a.title : "—"}
                                  </div>
                                  <div className="shrink-0 text-sm font-semibold text-muted-foreground">
                                    {typeof a?.fixValue === "string" || typeof a?.fixValue === "number" ? String(a.fixValue) : "—"}
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="text-sm text-muted-foreground">No adjustments.</div>
                            )}
                          </div>
                        </div>
                      </div>

                      {inputConfigurations.length > 0 && (
                        <div className="mt-3 rounded-lg bg-muted/20 px-4 py-3 ring-1 ring-border">
                          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Input configuration titles</div>
                          <div className="mt-2 text-sm font-semibold">
                            {inputConfigurations.filter((x) => typeof x === "string" && x.trim()).join(", ")}
                          </div>
                        </div>
                      )}
                    </details>
                  )
                })}
              </div>
            </div>
          )}
        </section>
      )}

      {configurationFixValues.length > 0 && (
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-base font-semibold">Price parameters</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            These come from <span className="font-mono">aiCurrent.configurations</span> and are applied as multipliers during pricing.
          </p>

          <div className="mt-4">
            <PriceParametersEditor
              formId="calculate-price-form"
              initialItems={configurationFixValues.map((c) => ({
                title: c.title,
                value: c.fixValue !== null && c.fixValue !== undefined ? String(c.fixValue) : "",
                found: c.found,
              }))}
              eligibleOptions={eligibleConfigurationRows.map((r) => ({
                title: r.title,
                fixValue: r.fixValue !== null && r.fixValue !== undefined ? String(r.fixValue) : null,
              }))}
              onRemove={removePriceParameter}
            />
          </div>
        </section>
      )}
    </div>
  )

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/houses" className="flex items-center gap-1 hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Houses
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium truncate">{house.title}</span>
      </div>

      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="space-y-1.5">
          <InlineTextEditor
            initialValue={house.title}
            onSave={saveHouseTitle}
            textClassName="text-2xl font-bold tracking-tight"
          />
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span className="truncate">{indirizzoValue || "—"}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <form action={calculateGeom}>
            <button
              type="submit"
              className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-3 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <Calculator className="mr-2 h-4 w-4" />
              Calculate geom
            </button>
          </form>

          <form id="calculate-price-form" action={calculatePrice}>
            <button
              type="submit"
              className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-3 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <Calculator className="mr-2 h-4 w-4" />
              Calculate price
            </button>
          </form>

          <form action={regenerateAI}>
            <button
              type="submit"
              className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-3 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <Brain className="mr-2 h-4 w-4" />
              Regenerate AI
            </button>
          </form>

          <form action={deleteHouse}>
            <button
              type="submit"
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-input bg-background text-destructive transition-colors hover:bg-accent hover:text-destructive"
              aria-label="Delete house"
              title="Delete house"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>

      <HouseDetailTabs overview={overviewNode} media={mediaNode} valuation={valuationNode} analytics={analyticsNode} />
    </div>
  )
}
