import { NextResponse } from "next/server"
import path from "node:path"
import fs from "node:fs/promises"

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id: houseId } = await ctx.params

  const dir = path.join(process.cwd(), "generated", "pdfs")
  let files: string[]
  try {
    files = await fs.readdir(dir)
  } catch {
    return NextResponse.json({ error: "No PDFs folder" }, { status: 404 })
  }

  const prefix = `house_${houseId}_`
  const matches = files
    .filter((f) => f.startsWith(prefix) && f.toLowerCase().endsWith(".pdf"))
    .sort()

  const latest = matches[matches.length - 1]
  if (!latest) {
    return NextResponse.json({ error: "No PDF found" }, { status: 404 })
  }

  const filePath = path.join(dir, latest)
  const data = await fs.readFile(filePath)

  return new NextResponse(data, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename=\"${latest}\"`,
      "Cache-Control": "no-store",
    },
  })
}
