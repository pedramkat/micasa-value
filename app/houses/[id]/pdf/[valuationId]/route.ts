import { NextResponse } from "next/server"
import path from "node:path"
import fs from "node:fs/promises"
import { housePdfService } from "@/lib/services/house-pdf.service"

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string; valuationId: string }> },
) {
  const { id: houseId, valuationId } = await ctx.params

  const filePath = path.join(process.cwd(), "storage", "pdf", houseId, `${valuationId}.pdf`)

  let data: Buffer
  try {
    data = await fs.readFile(filePath)
  } catch {
    try {
      await housePdfService.generateHouseEvaluationPdf(houseId, valuationId)
      data = await fs.readFile(filePath)
    } catch (e) {
      const message = e instanceof Error ? e.message : "PDF not found"
      return NextResponse.json({ error: message }, { status: 404 })
    }
  }

  return new NextResponse(new Uint8Array(data), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${valuationId}.pdf"`,
      "Cache-Control": "no-store",
    },
  })
}
