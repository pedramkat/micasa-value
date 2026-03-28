export const dynamic = "force-dynamic"; // This disables SSG and ISR

import prisma from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { houseService } from "@/lib/services/house.service";
import { processHouseDataWithOpenAI } from "@/lib/services/house-ai.service";
import { randomUUID } from "node:crypto";
import path from "node:path";
import fs from "node:fs/promises";
import { PriceParametersEditor } from "@/components/price-parameters-editor";
import { IndirizzoInlineEditor } from "@/components/indirizzo-inline-editor";
import { InlineTextEditor } from "@/components/inline-text-editor";
import { HouseMediaEnhancePanel } from "@/components/house-media-enhance-panel";
import { Trash2 } from "lucide-react";

export default async function House({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const houseId = id;

  const house = await prisma.house.findUnique({
    where: { id: houseId },
    include: {
      user: true,
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

    await processHouseDataWithOpenAI(houseId, `web-${houseId}`)
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

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-8">
      <article className="max-w-3xl w-full bg-white shadow-lg rounded-lg p-8">
        {/* House Title */}
        <div className="mb-4">
          <InlineTextEditor
            initialValue={house.title}
            onSave={saveHouseTitle}
            textClassName="text-5xl font-extrabold text-gray-900"
          />
        </div>

        <HouseMediaEnhancePanel houseId={houseId} photos={photoItems} enhancedPhotos={enhancedPhotoItems} />

        <div className="mb-6 flex items-center gap-3">
        <form action={calculateGeom}>
          <button
            type="submit"
            className="px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors"
          >
            Calculate geom
          </button>
        </form>

        <form id="calculate-price-form" action={calculatePrice}>
          <button
            type="submit"
            className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
          >
            Calculate price
          </button>
        </form>

        <form action={regenerateAI}>
          <button
            type="submit"
            className="px-6 py-3 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-colors"
          >
            Regenerate AI
          </button>
        </form>
        </div>

        {(totalMin !== null || totalMax !== null) && (
          <section className="mb-8 rounded-xl border border-gray-200 bg-gradient-to-r from-gray-50 to-white p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-gray-500">Average price estimate</div>
                <div className="mt-1 text-2xl font-extrabold text-gray-900">
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
                <div className="rounded-lg bg-white px-4 py-3 shadow-sm ring-1 ring-gray-100">
                  <div className="text-xs font-semibold text-gray-500">Min</div>
                  <div className="mt-1 text-lg font-bold text-gray-900">
                    {totalMin !== null ? eur.format(totalMin) : "—"}
                  </div>
                </div>
                <div className="rounded-lg bg-white px-4 py-3 shadow-sm ring-1 ring-gray-100">
                  <div className="text-xs font-semibold text-gray-500">Max</div>
                  <div className="mt-1 text-lg font-bold text-gray-900">
                    {totalMax !== null ? eur.format(totalMax) : "—"}
                  </div>
                </div>
              </div>
            </div>

            {evaluationsRecentFirst.length > 0 && (
              <div className="mt-5 rounded-lg bg-white/70 px-4 py-3 ring-1 ring-gray-100">
                <div className="text-sm font-semibold text-gray-700">All evaluations ({evaluationsRecentFirst.length})</div>

                <div className="mt-3 space-y-2">
                  {evaluationsRecentFirst.map((v, idx) => {
                    const id = typeof v?.id === "string" ? v.id : null
                    const ts = typeof v?.timestamp === "string" ? v.timestamp : null
                    const minRaw = v?.result?.min
                    const maxRaw = v?.result?.max
                    const avgRaw = v?.result?.avg

                    const configurationFixValuesRaw = Array.isArray(v?.configurationFixValues)
                      ? (v.configurationFixValues as any[])
                      : []

                    const inputs = v?.inputs && typeof v.inputs === "object" ? (v.inputs as any) : null
                    const inputConfigurations = Array.isArray(inputs?.configurations) ? (inputs.configurations as any[]) : []

                    const configurationTitlesForEvaluation = Array.from(
                      new Set(
                        [...inputConfigurations, ...configurationFixValuesRaw.map((x) => x?.title)]
                          .filter((t) => typeof t === "string" && t.trim()) as string[],
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
                      <details
                        key={id ?? ts ?? `${idx}`}
                        className="rounded-lg bg-white px-4 py-3 shadow-sm ring-1 ring-gray-100 transition-colors hover:bg-gray-50"
                      >
                        <summary className="cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <div className="text-sm font-semibold text-gray-900">
                                {Number.isFinite(avg) ? eur.format(avg) : "—"}
                              </div>
                              <div className="text-xs text-gray-500">
                                {Number.isFinite(min) ? eur.format(min) : "—"} - {Number.isFinite(max) ? eur.format(max) : "—"}
                              </div>
                              <div className="text-xs text-gray-500">{ts ?? ""}</div>
                            </div>

                            <div className="flex items-center gap-2">
                              {id && (
                                pdfByValuationId.has(id) ? (
                                  <a
                                    href={`/houses/${houseId}/pdf/${id}`}
                                    className="rounded-md bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-700 ring-1 ring-gray-100 hover:bg-gray-100"
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    Show
                                  </a>
                                ) : (
                                  <a
                                    href={`/houses/${houseId}/pdf/${id}`}
                                    className="rounded-md bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-700 ring-1 ring-gray-100 hover:bg-gray-100"
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    Print
                                  </a>
                                )
                              )}
                              {id && (
                                <form action={deleteEvaluation.bind(null, id)}>
                                  <button
                                    type="submit"
                                    className="rounded-md bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 ring-1 ring-red-100 hover:bg-red-100"
                                  >
                                    Delete
                                  </button>
                                </form>
                              )}
                            </div>
                          </div>
                        </summary>

                        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <div className="rounded-lg bg-gray-50 px-4 py-3 ring-1 ring-gray-100">
                            <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Result</div>
                            <div className="mt-1 text-sm font-semibold text-gray-900">
                              Min: {Number.isFinite(min) ? eur.format(min) : "—"}
                            </div>
                            <div className="mt-1 text-sm font-semibold text-gray-900">
                              Max: {Number.isFinite(max) ? eur.format(max) : "—"}
                            </div>
                            <div className="mt-1 text-sm font-semibold text-gray-900">
                              Avg: {Number.isFinite(avg) ? eur.format(avg) : "—"}
                            </div>
                          </div>

                          <div className="rounded-lg bg-gray-50 px-4 py-3 ring-1 ring-gray-100">
                            <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Price per m²</div>
                            <div className="mt-1 text-sm font-semibold text-gray-900">
                              Base: {baseEurPerSqm?.comprMin ? `${eur.format(Number(baseEurPerSqm.comprMin))}/m²` : "—"} -{" "}
                              {baseEurPerSqm?.comprMax ? `${eur.format(Number(baseEurPerSqm.comprMax))}/m²` : "—"}
                            </div>
                            <div className="mt-1 text-sm font-semibold text-gray-900">
                              Adjusted: {Number.isFinite(adjustedEurPerSqmMin) ? `${eur.format(adjustedEurPerSqmMin)}/m²` : "—"} -{" "}
                              {Number.isFinite(adjustedEurPerSqmMax) ? `${eur.format(adjustedEurPerSqmMax)}/m²` : "—"}
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <div className="rounded-lg bg-gray-50 px-4 py-3 ring-1 ring-gray-100">
                            <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Configurations</div>
                            <div className="mt-2 space-y-1">
                              {configurationTitlesForEvaluation.length > 0 ? (
                                configurationTitlesForEvaluation.map((title: string, idx: number) => {
                                  const dbFixValue = evaluationDbFixValueByTitleLower.get(title.toLowerCase())
                                  return (
                                    <div key={`${title}-${idx}`} className="flex items-center justify-between gap-3">
                                      <div className="min-w-0 truncate text-sm font-semibold text-gray-900">{title}</div>
                                      <div className="shrink-0 text-sm font-semibold text-gray-700">
                                        {dbFixValue !== null && dbFixValue !== undefined ? String(dbFixValue) : "—"}
                                      </div>
                                    </div>
                                  )
                                })
                              ) : (
                                <div className="text-sm text-gray-500">No configuration fix values.</div>
                              )}
                            </div>
                          </div>

                          <div className="rounded-lg bg-gray-50 px-4 py-3 ring-1 ring-gray-100">
                            <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Adjustments</div>
                            <div className="mt-2 space-y-1">
                              {pricingAdjustments.length > 0 ? (
                                pricingAdjustments.map((a: any, idx: number) => (
                                  <div key={`${a?.title ?? "adj"}-${idx}`} className="flex items-center justify-between gap-3">
                                    <div className="min-w-0 truncate text-sm font-semibold text-gray-900">
                                      {typeof a?.title === "string" ? a.title : "—"}
                                    </div>
                                    <div className="shrink-0 text-sm font-semibold text-gray-700">
                                      {typeof a?.fixValue === "string" || typeof a?.fixValue === "number" ? String(a.fixValue) : "—"}
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <div className="text-sm text-gray-500">No adjustments.</div>
                              )}
                            </div>
                          </div>
                        </div>

                        {inputConfigurations.length > 0 && (
                          <div className="mt-3 rounded-lg bg-gray-50 px-4 py-3 ring-1 ring-gray-100">
                            <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Input configuration titles</div>
                            <div className="mt-2 text-sm font-semibold text-gray-900">
                              {inputConfigurations
                                .filter((x) => typeof x === "string" && x.trim())
                                .join(", ")}
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
          <section className="mb-8 rounded-xl border border-gray-200 bg-white p-5">
            <h2 className="text-lg font-bold text-gray-900">Price parameters</h2>
            <p className="mt-1 text-sm text-gray-500">
              These come from <span className="font-mono">aiCurrent.configurations</span> and are applied as multipliers during pricing.
            </p>

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
          </section>
        )}

        {(houseParameterEntries.length > 0 || houseParametersByKey) && (
          <section className="mb-8 rounded-xl border border-gray-200 bg-white p-5">
            <h2 className="text-lg font-bold text-gray-900">House parameters</h2>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="sm:col-span-3">
                <IndirizzoInlineEditor initialValue={indirizzoValue} onSave={saveIndirizzo} />
              </div>

              <div className="sm:col-span-3">
                <form action={addHouseParameter} className="flex flex-col gap-2 sm:flex-row sm:items-end">
                  <div className="flex-1">
                    <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Add house parameter</div>
                    <input
                      name="key"
                      list="house-parameter-keys"
                      placeholder="Search parameter…"
                      className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-900"
                    />
                    <datalist id="house-parameter-keys">
                      {houseParametersPropertyKeys.map((k) => (
                        <option key={k} value={k} />
                      ))}
                    </datalist>
                  </div>

                  <div className="flex-1">
                    <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Value</div>
                    <input
                      name="value"
                      placeholder="Value (type-aware)"
                      className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-900"
                    />
                  </div>

                  <button
                    type="submit"
                    className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 transition-colors"
                  >
                    Add
                  </button>
                </form>
              </div>

              {houseParameterEntries.map((p) => (
                <div key={p.key} className="rounded-lg bg-gray-50 px-4 py-3 ring-1 ring-gray-100">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">{p.key}</div>
                      <div className="mt-1 text-sm font-semibold text-gray-900 break-words">
                        {formatHouseParameterValue(p.value)}
                      </div>
                    </div>

                    <form action={removeHouseParameter.bind(null, p.key)} className="shrink-0">
                      <button
                        type="submit"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-white text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50"
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

        {/* User Information */}
        <p className="text-lg text-gray-600 mb-4">
          by <span className="font-medium text-gray-800">{house.user?.name || "Anonymous"}</span>
        </p>

        {/* Description Section */}
        <div className="text-lg text-gray-800 leading-relaxed space-y-6 border-t pt-6">
          <InlineTextEditor
            initialValue={house.description ?? ""}
            placeholder="No description available for this house. Click to add one."
            multiline
            onSave={saveHouseDescription}
            textClassName="whitespace-pre-wrap text-lg text-gray-800 leading-relaxed"
          />
        </div>

        <section className="mt-8 rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="text-lg font-bold text-gray-900">Locations</h2>
          {coordinateLatLon ? (
            <div className="mt-4 overflow-hidden rounded-lg ring-1 ring-gray-200">
              <iframe
                title="House location"
                className="h-[320px] w-full"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                src={(() => {
                  const { lat, lon } = coordinateLatLon
                  const delta = 0.0010
                  const left = lon - delta
                  const right = lon + delta
                  const top = lat + delta
                  const bottom = lat - delta
                  const bbox = `${left}%2C${bottom}%2C${right}%2C${top}`
                  const marker = `${lat}%2C${lon}`
                  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${marker}`
                })()}
              />
            </div>
          ) : (
            <p className="mt-2 text-sm text-gray-500">No valid coordinates available for this house.</p>
          )}
        </section>
      </article>

      {/* Delete Button */}
      <div className="mt-6 flex items-center gap-3">
        <form action={deleteHouse}>
          <button
            type="submit"
            className="px-6 py-3 bg-red-500 text-white font-semibold rounded-lg hover:bg-red-600 transition-colors"
          >
            Delete House
          </button>
        </form>
      </div>
    </div>
  );
}
