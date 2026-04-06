import prisma from "@/lib/prisma"

export type ApiCostModelEntry = {
  provider: "openai" | "google"
  category: "text" | "image" | "voice" | "places"
  model: string
  unit: "per_1m_tokens" | "per_minute" | "per_image" | "per_request"
  costUsd: number
}

export type SettingsGeneralUpdateInput = {
  agencyName?: string | null
  agencyBio?: string | null
  agencyLogoUrl?: string | null
  contactEmail?: string | null
  contactPhone?: string | null
  websiteUrl?: string | null
  headquartersAddress?: string | null
  defaultOpenAiModel?: string | null
  apiCostModels?: ApiCostModelEntry[] | null
}

function normalizeNullableString(v: unknown): string | null | undefined {
  if (v === undefined) return undefined
  if (v === null) return null
  if (typeof v !== "string") return undefined
  const s = v.trim()
  return s ? s : null
}

function normalizeApiCostModels(v: unknown): ApiCostModelEntry[] | null | undefined {
  if (v === undefined) return undefined
  if (v === null) return null
  if (!Array.isArray(v)) return undefined

  const out: ApiCostModelEntry[] = []
  for (const item of v) {
    if (!item || typeof item !== "object") continue
    const provider = (item as any).provider
    const category = (item as any).category
    const model = (item as any).model
    const unit = (item as any).unit
    const costUsd = (item as any).costUsd

    if (provider !== "openai" && provider !== "google") continue
    if (category !== "text" && category !== "image" && category !== "voice" && category !== "places") continue
    if (typeof model !== "string" || !model.trim()) continue
    if (unit !== "per_1m_tokens" && unit !== "per_minute" && unit !== "per_image" && unit !== "per_request") continue

    const n = Number(costUsd)
    if (!Number.isFinite(n) || n < 0) continue

    out.push({
      provider,
      category,
      model: model.trim(),
      unit,
      costUsd: n,
    })
  }

  return out
}

export class SettingsService {
  private singletonId = "singleton"
  private cache: { value: any; expiresAt: number } | null = null

  private cacheTtlMs = 30_000

  private readCache(): any | null {
    if (!this.cache) return null
    if (Date.now() > this.cache.expiresAt) return null
    return this.cache.value
  }

  private writeCache(value: any) {
    this.cache = { value, expiresAt: Date.now() + this.cacheTtlMs }
  }

  async getGeneralSettings() {
    const cached = this.readCache()
    if (cached) return cached

    const setting = await (prisma as any).setting.findUnique({
      where: { id: this.singletonId },
    })

    if (setting) {
      this.writeCache(setting)
      return setting
    }

    const created = await (prisma as any).setting.create({
      data: { id: this.singletonId },
    })

    this.writeCache(created)
    return created
  }

  async getDefaultOpenAiModel(): Promise<string> {
    const setting = await this.getGeneralSettings()
    const model = typeof setting?.defaultOpenAiModel === "string" ? setting.defaultOpenAiModel.trim() : ""
    return model || "gpt-4o"
  }

  async updateGeneralSettings(input: SettingsGeneralUpdateInput) {
    const data: any = {
      agencyName: normalizeNullableString(input.agencyName),
      agencyBio: normalizeNullableString(input.agencyBio),
      agencyLogoUrl: normalizeNullableString(input.agencyLogoUrl),
      contactEmail: normalizeNullableString(input.contactEmail),
      contactPhone: normalizeNullableString(input.contactPhone),
      websiteUrl: normalizeNullableString(input.websiteUrl),
      headquartersAddress: normalizeNullableString(input.headquartersAddress),
      defaultOpenAiModel: normalizeNullableString(input.defaultOpenAiModel),
      apiCostModels: normalizeApiCostModels(input.apiCostModels) as any,
    }

    Object.keys(data).forEach((k) => {
      if (data[k] === undefined) delete data[k]
    })

    const updated = await (prisma as any).setting.upsert({
      where: { id: this.singletonId },
      create: { id: this.singletonId, ...data },
      update: data,
    })

    this.writeCache(updated)
    return updated
  }
}

export const settingsService = new SettingsService()
