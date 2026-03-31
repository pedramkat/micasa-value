import prisma from "@/lib/prisma"
import path from "node:path"
import fs from "node:fs/promises"
import { PDFDocument, StandardFonts, rgb } from "pdf-lib"
import { openaiService } from "@/lib/openai"

type PdfResult = {
  filePath: string
  fileName: string
}

export class HousePdfService {
  async generateHouseEvaluationPdf(houseId: string, valuationId: string): Promise<PdfResult> {
    const house = await prisma.house.findUnique({
      where: { id: houseId },
      select: {
        id: true,
        title: true,
        description: true,
        owner: { select: { name: true, email: true } },
        user: { select: { name: true, email: true } },
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

    const pricingCurrent = snapshot?.pricingCurrent && typeof snapshot.pricingCurrent === "object" ? (snapshot.pricingCurrent as any) : {}
    const pricing = pricingCurrent?.pricing && typeof pricingCurrent.pricing === "object" ? (pricingCurrent.pricing as any) : null

    const outputDir = path.join(process.cwd(), "storage", "pdf", houseId)
    await fs.mkdir(outputDir, { recursive: true })

    const fileName = `${valuationId}.pdf`
    const filePath = path.join(outputDir, fileName)

    const pdfDoc = await PDFDocument.create()
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

    const logoPath = path.join(process.cwd(), "storage", "images", "logo-micasa.png")
    const logoBytes = await fs.readFile(logoPath)
    const logoImage = await pdfDoc.embedPng(logoBytes)

    const pageSize: [number, number] = [595.28, 841.89]
    const margin = 50
    const contentWidth = pageSize[0] - margin * 2

    const headerHeight = 96
    const footerHeight = 56

    const drawHeaderFooter = () => {
      const logoTargetHeight = 44
      const logoScale = logoTargetHeight / logoImage.height
      const logoW = logoImage.width * logoScale
      const logoH = logoImage.height * logoScale

      const headerTopY = pageSize[1] - margin
      const agencyName = "MICASA IMMOBILIARE S.R.L"
      const h1Size = 18
      const titleW = bold.widthOfTextAtSize(agencyName, h1Size)

      const centerX = pageSize[0] / 2
      const logoX = centerX - logoW / 2
      const logoY = headerTopY - logoH
      page.drawImage(logoImage, {
        x: logoX,
        y: logoY,
        width: logoW,
        height: logoH,
      })

      const textX = centerX - titleW / 2
      const textY = logoY - 10 - h1Size
      page.drawText(agencyName, { x: textX, y: textY, size: h1Size, font: bold, color: rgb(0, 0, 0) })

      const footerLines = ["050384015", "050384756", "329 7245601", "info@micasa.it"]
      const footerSize = 10
      const footerLineHeight = 12
      let fy = margin - 6 + (footerLines.length - 1) * footerLineHeight
      for (const line of footerLines) {
        const w = font.widthOfTextAtSize(line, footerSize)
        page.drawText(line, { x: centerX - w / 2, y: fy, size: footerSize, font, color: rgb(0.2, 0.2, 0.2) })
        fy -= footerLineHeight
      }
    }

    let page = pdfDoc.addPage(pageSize)
    drawHeaderFooter()
    let y = pageSize[1] - margin - headerHeight

    const newPage = () => {
      page = pdfDoc.addPage(pageSize)
      drawHeaderFooter()
      y = pageSize[1] - margin - headerHeight
    }

    const ensureSpace = (neededHeight: number) => {
      if (y - neededHeight < margin + footerHeight) {
        newPage()
      }
    }

    const wrapText = (text: string, size: number, useBold: boolean): string[] => {
      const activeFont = useBold ? bold : font
      const words = text.split(/\s+/).filter(Boolean)
      const lines: string[] = []
      let line = ""

      for (const w of words) {
        const next = line ? `${line} ${w}` : w
        const nextWidth = activeFont.widthOfTextAtSize(next, size)
        if (nextWidth <= contentWidth) {
          line = next
        } else {
          if (line) lines.push(line)
          // if a single word is too long, hard-split it
          if (activeFont.widthOfTextAtSize(w, size) > contentWidth) {
            let chunk = ""
            for (const ch of w) {
              const candidate = chunk + ch
              if (activeFont.widthOfTextAtSize(candidate, size) <= contentWidth) {
                chunk = candidate
              } else {
                if (chunk) lines.push(chunk)
                chunk = ch
              }
            }
            line = chunk
          } else {
            line = w
          }
        }
      }
      if (line) lines.push(line)
      return lines.length ? lines : [""]
    }

    const drawHeading = (text: string) => {
      const size = 16
      const lineHeight = 22
      ensureSpace(lineHeight)
      page.drawText(text, { x: margin, y, size, font: bold, color: rgb(0, 0, 0) })
      y -= lineHeight
    }

    const drawLabel = (text: string) => {
      const size = 12
      const lineHeight = 16
      ensureSpace(lineHeight)
      page.drawText(text, { x: margin, y, size, font: bold, color: rgb(0.2, 0.2, 0.2) })
      y -= lineHeight
    }

    const drawParagraph = (text: string, useBold: boolean = false) => {
      const size = 11
      const lineHeight = 14
      const lines = wrapText(text, size, useBold)
      for (const l of lines) {
        ensureSpace(lineHeight)
        page.drawText(l, { x: margin, y, size, font: useBold ? bold : font, color: rgb(0, 0, 0) })
        y -= lineHeight
      }
    }

    drawHeading(house.title || "House")
    drawParagraph(`House ID: ${house.id}`)
    drawParagraph(`Valuation ID: ${valuationId}`)
    if (typeof snapshot?.timestamp === "string") {
      drawParagraph(`Timestamp: ${snapshot.timestamp}`)
    }
    const ownerName = house.owner?.name || house.owner?.email || house.user?.name || house.user?.email || "—"
    drawParagraph(`Owner: ${ownerName}`)

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

      proposalText = (await openaiService.chatWithHistory(messages)).trim() || null
    } catch {
      proposalText = null
    }

    if (proposalText) {
      y -= 12
      drawLabel("Proposta di valutazione")
      for (const part of proposalText.split(/\n\s*\n/)) {
        const cleaned = part.trim()
        if (!cleaned) continue
        drawParagraph(cleaned)
        y -= 6
      }
    }

    if (typeof house.description === "string" && house.description.trim()) {
      y -= 8
      drawLabel("Description")
      for (const part of house.description.split("\n")) {
        if (part.trim()) drawParagraph(part.trim())
      }
    }

    y -= 10
    drawLabel("House parameters")
    const hpEntries = Object.entries(houseParameters)
    if (hpEntries.length === 0) {
      drawParagraph("—")
    } else {
      for (const [k, v] of hpEntries) {
        const value = typeof v === "string" ? v : v === null || v === undefined ? "—" : JSON.stringify(v)
        drawParagraph(`${k}: ${value}`)
      }
    }

    y -= 10
    drawLabel("Configurations")
    const cfgEntries = Array.isArray(configurations)
      ? (configurations as any[]).map((t) => [String(t), ""])
      : Object.entries(configurations)

    if (cfgEntries.length === 0) {
      drawParagraph("—")
    } else {
      for (const [k, v] of cfgEntries) {
        const value = typeof v === "string" || typeof v === "number" ? String(v) : v === null || v === undefined ? "" : JSON.stringify(v)
        drawParagraph(`${k}: ${value}`)
      }
    }

    y -= 10
    drawLabel("Pricing")
    if (!pricing) {
      drawParagraph("—")
    } else {
      const total = pricing?.total
      const baseEurPerSqm = pricing?.baseEurPerSqm
      const superficieCommerciale = pricing?.superficieCommerciale

      if (total && typeof total === "object") {
        drawParagraph(`Total min: ${String((total as any).comprMin ?? "—")}`)
        drawParagraph(`Total max: ${String((total as any).comprMax ?? "—")}`)
      }
      if (baseEurPerSqm && typeof baseEurPerSqm === "object") {
        drawParagraph(`Base €/m² min: ${String((baseEurPerSqm as any).comprMin ?? "—")}`)
        drawParagraph(`Base €/m² max: ${String((baseEurPerSqm as any).comprMax ?? "—")}`)
      }
      if (superficieCommerciale !== null && superficieCommerciale !== undefined) {
        drawParagraph(`Superficie commerciale: ${String(superficieCommerciale)}`)
      }

      const geometry = pricingCurrent?.geometry
      if (geometry && typeof geometry === "object") {
        drawParagraph(`OMI Zona: ${String((geometry as any).zona ?? "—")}`)
        drawParagraph(`OMI linkZona: ${String((geometry as any).linkZona ?? "—")}`)
        drawParagraph(`OMI comprMin €/m²: ${String((geometry as any).comprMin ?? "—")}`)
        drawParagraph(`OMI comprMax €/m²: ${String((geometry as any).comprMax ?? "—")}`)
      }
    }

    y -= 10
    drawLabel("Result")
    if (snapshot?.result && typeof snapshot.result === "object") {
      drawParagraph(`Min: ${String((snapshot.result as any).min ?? "—")}`)
      drawParagraph(`Max: ${String((snapshot.result as any).max ?? "—")}`)
      drawParagraph(`Avg: ${String((snapshot.result as any).avg ?? "—")}`)
    } else {
      drawParagraph("—")
    }

    const bytes = await pdfDoc.save()
    await fs.writeFile(filePath, Buffer.from(bytes))

    return { filePath, fileName }
  }
}

export const housePdfService = new HousePdfService()
