import prisma from "@/lib/prisma"
import path from "node:path"
import fs from "node:fs/promises"
import { PDFDocument, StandardFonts, rgb } from "pdf-lib"

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

    const pageSize: [number, number] = [595.28, 841.89]
    const margin = 50
    const contentWidth = pageSize[0] - margin * 2

    let page = pdfDoc.addPage(pageSize)
    let y = pageSize[1] - margin

    const newPage = () => {
      page = pdfDoc.addPage(pageSize)
      y = pageSize[1] - margin
    }

    const ensureSpace = (neededHeight: number) => {
      if (y - neededHeight < margin) {
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
    const owner = house.user?.name || house.user?.email || "—"
    drawParagraph(`Owner: ${owner}`)

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
