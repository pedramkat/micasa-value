export const dynamic = "force-dynamic"; // This disables SSG and ISR

import prisma from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { houseService } from "@/lib/services/house.service";
import { processHouseDataWithOpenAI } from "@/lib/services/house-ai.service";
import { randomUUID } from "node:crypto";

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

  let totalMin: number | null = null
  let totalMax: number | null = null

  const pricingCurrent = house.pricingCurrent && typeof house.pricingCurrent === "object" ? (house.pricingCurrent as any) : null
  const valuationHistory = Array.isArray((house as any).valuationHistory) ? ((house as any).valuationHistory as any[]) : []

  const aiCurrent = house.aiCurrent && typeof house.aiCurrent === "object" ? (house.aiCurrent as any) : null
  const configurationsFromAi = aiCurrent?.configurations
  const aiConfigurationsByTitle =
    configurationsFromAi && typeof configurationsFromAi === "object" && !Array.isArray(configurationsFromAi)
      ? (configurationsFromAi as Record<string, unknown>)
      : null

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

  const configurationFixValues = configurationTitles.map((t) => {
    const row = configurationRows.find((r) => r.title.toLowerCase() === t.toLowerCase())
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

    const nextAiCurrent = {
      ...(currentAi || {}),
      configurationOverrides: overrides,
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

  async function regenerateAI() {
    "use server";

    await processHouseDataWithOpenAI(houseId, `web-${houseId}`)
    redirect(`/houses/${houseId}`)
  }

  async function deleteEvaluation(valuationId: string) {
    "use server";

    await houseService.deleteValuationSnapshot(houseId, valuationId)
    redirect(`/houses/${houseId}`)
  }

  const evaluationsRecentFirst = [...valuationHistory].reverse()

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-8">
      <article className="max-w-3xl w-full bg-white shadow-lg rounded-lg p-8">
        {/* House Title */}
        <h1 className="text-5xl font-extrabold text-gray-900 mb-4">
          {house.title}
        </h1>

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
              <details className="mt-5 rounded-lg bg-white/70 px-4 py-3 ring-1 ring-gray-100">
                <summary className="cursor-pointer select-none text-sm font-semibold text-gray-700">
                  All evaluations ({evaluationsRecentFirst.length})
                </summary>

                <div className="mt-3 space-y-2">
                  {evaluationsRecentFirst.map((v) => {
                    const id = typeof v?.id === "string" ? v.id : null
                    const ts = typeof v?.timestamp === "string" ? v.timestamp : null
                    const minRaw = v?.result?.min
                    const maxRaw = v?.result?.max
                    const avgRaw = v?.result?.avg

                    const min = typeof minRaw === "string" || typeof minRaw === "number" ? Number(minRaw) : Number.NaN
                    const max = typeof maxRaw === "string" || typeof maxRaw === "number" ? Number(maxRaw) : Number.NaN
                    const avg = typeof avgRaw === "string" || typeof avgRaw === "number" ? Number(avgRaw) : Number.NaN

                    return (
                      <div key={id ?? ts ?? Math.random()} className="flex flex-col gap-2 rounded-lg bg-white px-4 py-3 shadow-sm ring-1 ring-gray-100 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <div className="text-sm font-semibold text-gray-900">
                            {Number.isFinite(avg) ? eur.format(avg) : "—"}
                          </div>
                          <div className="text-xs text-gray-500">
                            {Number.isFinite(min) ? eur.format(min) : "—"} - {Number.isFinite(max) ? eur.format(max) : "—"}
                          </div>
                          <div className="text-xs text-gray-500">
                            {ts ? new Date(ts).toLocaleString() : ""}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
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
                    )
                  })}
                </div>
              </details>
            )}
          </section>
        )}

        {configurationFixValues.length > 0 && (
          <section className="mb-8 rounded-xl border border-gray-200 bg-white p-5">
            <h2 className="text-lg font-bold text-gray-900">Price parameters</h2>
            <p className="mt-1 text-sm text-gray-500">
              These come from <span className="font-mono">aiCurrent.configurations</span> and are applied as multipliers during pricing.
            </p>

            <div className="mt-4 space-y-2">
              {configurationFixValues.map((c, idx) => (
                <div
                  key={c.title}
                  className="flex flex-col gap-2 rounded-lg bg-gray-50 px-4 py-3 ring-1 ring-gray-100 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="text-sm font-semibold text-gray-900">{c.title}</div>
                  <div className="flex items-center gap-2">
                    <input type="hidden" name={`cfg_title_${idx}`} value={c.title} form="calculate-price-form" />
                    <input
                      name={`cfg_value_${idx}`}
                      form="calculate-price-form"
                      inputMode="decimal"
                      defaultValue={c.fixValue !== null && c.fixValue !== undefined ? String(c.fixValue) : ""}
                      placeholder={c.fixValue !== null && c.fixValue !== undefined ? undefined : "%"}
                      className="w-28 rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 ring-1 ring-gray-200"
                    />
                    {!c.found && (
                      <div className="text-xs font-semibold text-amber-700">Not found in Configuration table</div>
                    )}
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
          {house.description ? (
            <p className="whitespace-pre-wrap">{house.description}</p>
          ) : (
            <p className="italic text-gray-500">No description available for this house.</p>
          )}
        </div>
      </article>

      {/* Delete Button */}
      <form action={deleteHouse} className="mt-6">
        <button
          type="submit"
          className="px-6 py-3 bg-red-500 text-white font-semibold rounded-lg hover:bg-red-600 transition-colors"
        >
          Delete House
        </button>
      </form>
    </div>
  );
}
