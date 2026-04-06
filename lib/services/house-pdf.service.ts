import prisma from "@/lib/prisma"
import path from "node:path"
import fs from "node:fs/promises"
import puppeteer from "puppeteer"
import { openaiService } from "@/lib/openai"

type PdfResult = {
  filePath: string
  fileName: string
}

type CardEntry = {
  label: string
  value: string
  helper?: string | null
}

type PdfTemplateData = {
  logoDataUrl: string | null
  title: string
  subtitle: string
  valuationId: string
  houseId: string
  metaSummaryEntries: CardEntry[]
  featureImageDataUrl: string | null
  descriptionHtml: string | null
  proposalHtml: string | null
  parameterEntries: CardEntry[]
  configurationItems: string[]
  pricingHighlights: CardEntry[]
  areaDetails: CardEntry[]
  valuationResult: CardEntry[]
}

const CURRENCY = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
})

const DECIMAL = new Intl.NumberFormat("it-IT", { maximumFractionDigits: 2 })

const CONTACT_LINES = ["050384015", "050384756", "329 7245601", "info@micasa.it"]
const HEADER_TITLE = "MICASA IMMOBILIARE S.R.L"
const NO_SANDBOX_ARGS = ["--no-sandbox", "--disable-setuid-sandbox"]

export class HousePdfService {
  async generateHouseEvaluationPdf(houseId: string, valuationId: string): Promise<PdfResult> {
    const house = await prisma.house.findUnique({
      where: { id: houseId },
      select: {
        id: true,
        title: true,
        description: true,
        featureImagePath: true,
        userId: true,
        aiCurrent: true,
        valuationHistory: true,
        pricingCurrent: true,
      },
    })

    if (!house) {
      throw new Error(`House not found: ${houseId}`)
    }

    const valuationHistory = Array.isArray(house.valuationHistory) ? (house.valuationHistory as any[]) : []
    const snapshot = valuationHistory.find((v) => v && typeof v === "object" && v.id === valuationId)
    if (!snapshot) {
      throw new Error(`Valuation snapshot not found: ${valuationId} (house=${houseId})`)
    }

    const aiCurrent = house.aiCurrent && typeof house.aiCurrent === "object" ? (house.aiCurrent as any) : {}
    const houseParameters =
      snapshot?.inputs?.houseParameters && typeof snapshot.inputs.houseParameters === "object"
        ? (snapshot.inputs.houseParameters as any)
        : aiCurrent?.houseParameters && typeof aiCurrent.houseParameters === "object"
          ? (aiCurrent.houseParameters as any)
          : {}

    const configurations =
      snapshot?.inputs?.configurations && typeof snapshot.inputs.configurations === "object"
        ? (snapshot.inputs.configurations as any)
        : aiCurrent?.configurations && typeof aiCurrent.configurations === "object"
          ? (aiCurrent.configurations as any)
          : {}

    const pricingSnapshot = snapshot?.pricingCurrent && typeof snapshot.pricingCurrent === "object" ? (snapshot.pricingCurrent as any) : null
    const pricingFallback = house.pricingCurrent && typeof house.pricingCurrent === "object" ? (house.pricingCurrent as any) : null
    const pricingCurrent = pricingSnapshot ?? pricingFallback ?? null
    const pricing = pricingCurrent?.pricing && typeof pricingCurrent.pricing === "object" ? (pricingCurrent.pricing as any) : null

    const outputDir = path.join(process.cwd(), "storage", "pdf", houseId)
    await fs.mkdir(outputDir, { recursive: true })

    const fileName = `${valuationId}.pdf`
    const filePath = path.join(outputDir, fileName)

    let proposalText: string | null = null
    try {
      const pricingSummary = {
        pricing,
        geometry: pricingCurrent?.geometry ?? null,
        snapshotResult: snapshot?.result ?? null,
        configurationFixValues: snapshot?.configurationFixValues ?? null,
      }

      const houseSummary = {
        title: house.title ?? null,
        description: typeof house.description === "string" ? house.description : null,
        houseParameters,
        configurations,
      }

      const payload = JSON.stringify({ house: houseSummary, pricing: pricingSummary })
      const capped = payload.length > 12_000 ? payload.slice(0, 12_000) : payload

      const messages = [
        {
          role: "system" as const,
          content:
            "Sei un agente immobiliare professionista. Stai scrivendo una proposta di valutazione per il proprietario. Usa solo le informazioni fornite. Spiega in modo chiaro e credibile come si arriva alla fascia di prezzo (min/max/media), includendo: zona OMI e range €/mq, superficie commerciale e pesi, eventuali aggiustamenti/configurazioni. Non inventare dati mancanti; se qualcosa manca, dichiaralo. Scrivi in italiano.",
        },
        {
          role: "user" as const,
          content:
            `Genera un testo strutturato con questi elementi:\n\n- Titolo: "Proposta di valutazione"\n- 5-10 paragrafi brevi\n- Sezione "Come abbiamo calcolato il prezzo" con punti elenco\n- Sezione "Ipotesi e dati mancanti" se necessario\n\nDati disponibili (JSON):\n${capped}`,
        },
      ]

      proposalText = (
        await openaiService.chatWithHistory(
          messages,
          house.userId
            ? {
                userId: house.userId,
                houseId,
                provider: "openai",
                category: "text",
                operation: "pdf_proposal",
                endpoint: "chat.completions",
                model: "gpt-4o",
              }
            : undefined,
        )
      ).trim() || null
    } catch {
      proposalText = null
    }

    const [logoDataUrl, featureImageDataUrl] = await Promise.all([
      this.loadImageAsDataUrl(path.join(process.cwd(), "storage", "images", "logo-micasa.png")),
      this.loadImageAsDataUrl(house.featureImagePath ?? null),
    ])

    const parameterEntries = buildParameterEntries(houseParameters)
    const configurationItems = buildConfigurationItems(configurations)
    const pricingHighlights = buildPricingHighlights(pricing)
    const areaDetails = buildAreaDetails(pricingCurrent?.geometry)
    const valuationResult = buildValuationResult(snapshot?.result)
    const metaSummaryEntries: CardEntry[] = [
      { label: "Immobile", value: house.id },
      { label: "Valutazione", value: valuationId },
    ]

    const html = buildHousePdfHtml({
      logoDataUrl,
      title: house.title || "Valutazione immobiliare",
      subtitle: "Dossier di valutazione",
      valuationId,
      houseId: house.id,
      metaSummaryEntries,
      featureImageDataUrl,
      descriptionHtml: renderParagraphs(typeof house.description === "string" ? house.description : null),
      proposalHtml: proposalText ? renderRichText(proposalText) : null,
      parameterEntries,
      configurationItems,
      pricingHighlights,
      areaDetails,
      valuationResult,
    })

    const pdfBuffer = await this.renderPdfFromHtml(html)
    await fs.writeFile(filePath, pdfBuffer)

    return { filePath, fileName }
  }

  private async renderPdfFromHtml(html: string): Promise<Buffer> {
    const browser = await puppeteer.launch({ headless: "new", args: NO_SANDBOX_ARGS })
    try {
      const page = await browser.newPage()
      await page.setContent(html, { waitUntil: "networkidle0" })
      const pdf = await page.pdf({
        format: "A4",
        printBackground: true,
        preferCSSPageSize: true,
        margin: { top: "20mm", bottom: "20mm", left: "16mm", right: "16mm" },
      })
      await page.close()
      return pdf
    } finally {
      await browser.close()
    }
  }

  private async loadImageAsDataUrl(filePathOrNull: string | null): Promise<string | null> {
    if (!filePathOrNull) return null

    const candidates = path.isAbsolute(filePathOrNull)
      ? [filePathOrNull]
      : [
          path.join(process.cwd(), filePathOrNull),
          path.join(process.cwd(), "storage", filePathOrNull),
        ]

    for (const candidate of candidates) {
      try {
        const bytes = await fs.readFile(candidate)
        const ext = path.extname(candidate).toLowerCase()
        const mime = ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg"
        return `data:${mime};base64,${bytes.toString("base64")}`
      } catch {
        continue
      }
    }

    return null
  }
}

export const housePdfService = new HousePdfService()

function buildParameterEntries(parameters: Record<string, unknown> | null | undefined): CardEntry[] {
  if (!parameters || typeof parameters !== "object") return []
  return Object.entries(parameters)
    .filter(([, value]) => shouldDisplayValue(value))
    .map(([key, value]) => ({
      label: humanizeKey(key),
      value: formatValueForDisplay(value),
    }))
    .filter((entry) => entry.value.trim().length > 0)
}

function buildConfigurationItems(config: unknown): string[] {
  if (!config) return []
  if (Array.isArray(config)) {
    return config
      .map((item) => formatValueForDisplay(item))
      .filter((value) => value.trim().length > 0)
  }

  if (typeof config === "object") {
    return Object.entries(config as Record<string, unknown>)
      .filter(([, value]) => shouldDisplayValue(value))
      .map(([key, value]) => `${humanizeKey(key)}: ${formatValueForDisplay(value)}`.trim())
      .filter((value) => value.trim().length > 0)
  }

  return []
}

function buildPricingHighlights(pricing: any | null): CardEntry[] {
  if (!pricing || typeof pricing !== "object") return []

  const total = pricing?.total && typeof pricing.total === "object" ? pricing.total : null
  const baseEurPerSqm = pricing?.baseEurPerSqm && typeof pricing.baseEurPerSqm === "object" ? pricing.baseEurPerSqm : null
  const superficieCommerciale = pricing?.superficieCommerciale

  const entries: CardEntry[] = []

  const minTotal = valueToMoneyString(total?.comprMin)
  if (minTotal) entries.push({ label: "Prezzo minimo", value: minTotal })

  const maxTotal = valueToMoneyString(total?.comprMax)
  if (maxTotal) entries.push({ label: "Prezzo massimo", value: maxTotal })

  const baseMin = valueToMoneyString(baseEurPerSqm?.comprMin)
  if (baseMin) entries.push({ label: "€/m² base (min)", value: baseMin })

  const baseMax = valueToMoneyString(baseEurPerSqm?.comprMax)
  if (baseMax) entries.push({ label: "€/m² base (max)", value: baseMax })

  const superficie = valueToNumberString(superficieCommerciale)
  if (superficie) entries.push({ label: "Superficie commerciale", value: `${superficie} m²` })

  return entries
}

function buildAreaDetails(geometry: any | null | undefined): CardEntry[] {
  if (!geometry || typeof geometry !== "object") return []
  const entries: CardEntry[] = []
  if (geometry?.zona) entries.push({ label: "Zona OMI", value: String(geometry.zona) })
  if (geometry?.semester) entries.push({ label: "Semestre", value: String(geometry.semester) })
  if (geometry?.comprMin) entries.push({ label: "OMI €/m² min", value: String(geometry.comprMin) })
  if (geometry?.comprMax) entries.push({ label: "OMI €/m² max", value: String(geometry.comprMax) })
  if (geometry?.linkZona) entries.push({ label: "linkZona", value: String(geometry.linkZona) })
  return entries
}

function buildValuationResult(result: any | null | undefined): CardEntry[] {
  if (!result || typeof result !== "object") return []
  const entries: CardEntry[] = []
  if (result.min !== undefined) entries.push({ label: "Stima bassa", value: valueToMoneyString(result.min) ?? formatValueForDisplay(result.min) })
  if (result.avg !== undefined) entries.push({ label: "Stima media", value: valueToMoneyString(result.avg) ?? formatValueForDisplay(result.avg) })
  if (result.max !== undefined) entries.push({ label: "Stima alta", value: valueToMoneyString(result.max) ?? formatValueForDisplay(result.max) })
  return entries
}

function renderParagraphs(text: string | null): string | null {
  if (!text) return null
  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
  if (!paragraphs.length) return null
  return paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join("")
}

function renderRichText(text: string): string {
  const clean = text.replace(/\r/g, "").trim()
  if (!clean) return ""
  const blocks: string[] = []
  const segments = clean.split(/\n{2,}/)
  for (const segment of segments) {
    const trimmedSegment = segment.trim()
    if (!trimmedSegment) continue

    const headingMatch = trimmedSegment.match(/^#{1,6}\s+(.+)$/)
    if (headingMatch) {
      blocks.push(`<h3 class="rich-heading">${applyInlineFormatting(headingMatch[1])}</h3>`)
      continue
    }

    const lines = trimmedSegment
      .split(/\n/)
      .map((line) => line.trim())
      .filter(Boolean)
    if (!lines.length) continue

    const isBulletBlock = lines.every((line) => /^[-*•]\s+/.test(line))
    if (isBulletBlock) {
      const items = lines.map((line) => line.replace(/^[-*•]\s+/, ""))
      blocks.push(`<ul>${items.map((item) => `<li>${applyInlineFormatting(item)}</li>`).join("")}</ul>`)
    } else {
      blocks.push(`<p>${applyInlineFormatting(lines.join(" "))}</p>`)
    }
  }
  return blocks.join("")
}

function applyInlineFormatting(content: string): string {
  const escaped = escapeHtml(content)
  return escaped.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
}

function buildHousePdfHtml(data: PdfTemplateData): string {
  const {
    logoDataUrl,
    title,
    subtitle,
    metaSummaryEntries,
    featureImageDataUrl,
    descriptionHtml,
    proposalHtml,
    parameterEntries,
    configurationItems,
    pricingHighlights,
    areaDetails,
    valuationResult,
  } = data

  return `<!DOCTYPE html>
<html lang="it">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      @page {
        margin: 32mm 18mm 28mm 18mm;
        @top-center {
          content: element(page-header);
        }
        @bottom-center {
          content: element(page-footer);
        }
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: 'Manrope', 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
        background: #f8f6f0;
        color: #1f1f1f;
      }
      main {
        display: flex;
        flex-direction: column;
        gap: 24px;
      }
      .print-header,
      .print-footer {
        text-align: center;
        color: #8b8575;
        background: rgba(250, 248, 241, 0.92);
      }
      .print-header {
        padding: 16px 0 10px;
        border-bottom: 1px solid #ede7d9;
        font-size: 13px;
        letter-spacing: 0.3em;
        text-transform: uppercase;
        position: running(page-header);
      }
      .print-header img {
        height: 40px;
        display: block;
        margin: 0 auto 6px;
      }
      .print-footer {
        padding: 10px 0 6px;
        border-top: 1px solid #ede7d9;
        letter-spacing: 0.2em;
        font-size: 11px;
        position: running(page-footer);
      }
      .hero {
        background: linear-gradient(135deg, #1b325f, #3f6b87);
        border-radius: 28px;
        padding: 28px;
        text-align: center;
        color: #fffdf7;
        box-shadow: 0 18px 40px rgba(23, 49, 93, 0.35);
      }
      .hero h1 {
        margin: 6px 0 12px;
        font-size: 28px;
        letter-spacing: -0.02em;
      }
      .hero p {
        margin: 0;
        opacity: 0.85;
        font-size: 14px;
      }
      .feature-image {
        margin: 0;
        border-radius: 24px;
        overflow: hidden;
        box-shadow: 0 16px 35px rgba(0, 0, 0, 0.18);
      }
      .feature-image img {
        width: 100%;
        height: 320px;
        object-fit: cover;
        display: block;
      }
      section {
        background: #fffdf7;
        border-radius: 22px;
        padding: 22px 24px;
        border: 1px solid #f0ede3;
        box-shadow: 0 12px 26px rgba(193, 187, 168, 0.18);
      }
      .hero,
      .feature-image,
      section,
      .meta-summary {
        break-inside: avoid;
        page-break-inside: avoid;
      }
      .section-title {
        text-transform: uppercase;
        font-size: 12px;
        color: #8b8575;
        letter-spacing: 0.35em;
        margin-bottom: 14px;
      }
      .rich-text p {
        margin: 0 0 12px;
        line-height: 1.6;
        font-size: 14px;
      }
      .rich-text ul {
        margin: 0 0 12px 16px;
        padding-left: 12px;
        line-height: 1.6;
      }
      .rich-text li {
        margin-bottom: 6px;
        font-size: 14px;
      }
      .card-grid {
        display: grid;
        gap: 12px;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      }
      .info-card {
        border-radius: 16px;
        padding: 14px;
        background: #f6f2e6;
        border: 1px solid #e7decb;
        min-height: 88px;
      }
      .info-card .label {
        font-size: 10px;
        letter-spacing: 0.25em;
        text-transform: uppercase;
        color: #968f7b;
        margin-bottom: 6px;
      }
      .info-card .value {
        font-size: 14px;
        font-weight: 600;
        color: #1f1f1f;
      }
      .tag-list {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }
      .tag {
        padding: 6px 12px;
        border-radius: 999px;
        background: #eef2e3;
        font-size: 12px;
        color: #4f583a;
      }
      .empty-state {
        font-size: 13px;
        color: #8b8575;
      }
      .meta-summary {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        justify-content: flex-end;
        margin-top: 24px;
      }
      .meta-pill {
        font-size: 10px;
        letter-spacing: 0.25em;
        text-transform: uppercase;
        padding: 6px 12px;
        border-radius: 999px;
        background: #ede6d5;
        color: #7b7565;
      }
      h3.rich-heading {
        font-size: 15px;
        letter-spacing: 0.3em;
        text-transform: uppercase;
        color: #25364d;
        margin: 16px 0 10px;
      }
      .rich-text strong {
        font-weight: 700;
        color: #1f1f1f;
      }
    </style>
  </head>
  <body>
    <div class="print-header">
      ${logoDataUrl ? `<img src="${logoDataUrl}" alt="Micasa logo" />` : `<span>${escapeHtml(HEADER_TITLE)}</span>`}
      <span>${escapeHtml(HEADER_TITLE)}</span>
    </div>

    <div class="print-footer">${CONTACT_LINES.map((line) => escapeHtml(line)).join(" · ")}</div>

    <main>
      <div class="hero">
        <p>${escapeHtml(subtitle)}</p>
        <h1>${escapeHtml(title)}</h1>
      </div>

      ${featureImageDataUrl ? `<div class="feature-image"><img src="${featureImageDataUrl}" alt="Feature" /></div>` : ""}

      ${descriptionHtml ? `<section><div class="section-title">Descrizione</div><div class="rich-text">${descriptionHtml}</div></section>` : ""}

      ${proposalHtml ? `<section><div class="section-title">Proposta di valutazione</div><div class="rich-text">${proposalHtml}</div></section>` : ""}

      <section>
        <div class="section-title">Caratteristiche principali</div>
        ${parameterEntries.length
          ? `<div class="card-grid">${parameterEntries
              .map(
                (entry) => `<div class="info-card"><div class="label">${escapeHtml(entry.label)}</div><div class="value">${escapeHtml(entry.value)}</div></div>`,
              )
              .join("")}</div>`
          : `<div class="empty-state">Nessun parametro disponibile.</div>`}
      </section>

      <section>
        <div class="section-title">Configurazioni & note</div>
        ${configurationItems.length
          ? `<div class="tag-list">${configurationItems.map((item) => `<span class="tag">${escapeHtml(item)}</span>`).join("")}</div>`
          : `<div class="empty-state">Nessuna configurazione specificata.</div>`}
      </section>

      <section>
        <div class="section-title">Pricing & metrica</div>
        ${pricingHighlights.length
          ? `<div class="card-grid">${pricingHighlights
              .map(
                (entry) => `<div class="info-card"><div class="label">${escapeHtml(entry.label)}</div><div class="value">${escapeHtml(entry.value)}</div>${entry.helper ? `<small>${escapeHtml(entry.helper)}</small>` : ""}</div>`,
              )
              .join("")}</div>`
          : `<div class="empty-state">Nessun dato di pricing disponibile.</div>`}
      </section>

      ${areaDetails.length
        ? `<section><div class="section-title">Contesto OMI</div><div class="card-grid">${areaDetails
            .map(
              (entry) => `<div class="info-card"><div class="label">${escapeHtml(entry.label)}</div><div class="value">${escapeHtml(entry.value)}</div></div>`,
            )
            .join("")}</div></section>`
        : ""}

      ${valuationResult.length
        ? `<section><div class="section-title">Risultato della valutazione</div><div class="card-grid">${valuationResult
            .map(
              (entry) => `<div class="info-card"><div class="label">${escapeHtml(entry.label)}</div><div class="value">${escapeHtml(entry.value)}</div></div>`,
            )
            .join("")}</div></section>`
        : ""}

      ${metaSummaryEntries.length
        ? `<div class="meta-summary">${metaSummaryEntries
            .map((entry) => `<span class="meta-pill">${escapeHtml(entry.label)} · ${escapeHtml(entry.value)}</span>`)
            .join("")}</div>`
        : ""}
    </main>
  </body>
</html>`
}

function shouldDisplayValue(value: unknown): boolean {
  if (value === null || value === undefined) return false
  if (typeof value === "string") return value.trim().length > 0
  if (Array.isArray(value)) return value.some((item) => shouldDisplayValue(item))
  if (typeof value === "object") return Object.values(value).some((v) => shouldDisplayValue(v))
  return true
}

function formatValueForDisplay(value: unknown): string {
  if (value === null || value === undefined) return ""
  if (typeof value === "number") return DECIMAL.format(value)
  if (typeof value === "boolean") return value ? "Sì" : "No"
  if (typeof value === "string") return value
  if (Array.isArray(value)) {
    return value
      .map((item) => formatValueForDisplay(item))
      .filter((part) => part.trim().length > 0)
      .join(", ")
  }
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .map(([key, val]) => `${humanizeKey(key)}: ${formatValueForDisplay(val)}`.trim())
      .filter((part) => part.trim().length > 0)
      .join(" · ")
  }
  return String(value)
}

function humanizeKey(key: string): string {
  return key
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (ch) => ch.toUpperCase())
}

function valueToMoneyString(value: unknown): string | null {
  const numeric = typeof value === "number" ? value : typeof value === "string" ? Number(value) : null
  if (typeof numeric === "number" && Number.isFinite(numeric)) {
    return CURRENCY.format(numeric)
  }
  if (typeof value === "string" && value.trim()) {
    return value.trim()
  }
  return null
}

function valueToNumberString(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return DECIMAL.format(value)
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) {
      return DECIMAL.format(parsed)
    }
    return value.trim()
  }
  return null
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}
