import { NextResponse } from "next/server"
import path from "node:path"
import fs from "node:fs/promises"

function contentTypeForExt(ext: string): string {
  switch (ext) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg"
    case ".png":
      return "image/png"
    case ".webp":
      return "image/webp"
    case ".gif":
      return "image/gif"
    default:
      return "application/octet-stream"
  }
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ path: string[] }> },
) {
  const { path: parts } = await ctx.params

  if (!Array.isArray(parts) || parts.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const root = parts[0]
  if (root !== "media" && root !== "enhanced_media") {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const baseDir = path.join(process.cwd(), "storage")
  const requested = path.join(baseDir, ...parts)
  const resolved = path.resolve(requested)

  if (!resolved.startsWith(baseDir + path.sep)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  let data: Buffer
  try {
    data = await fs.readFile(resolved)
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const ext = path.extname(resolved).toLowerCase()
  const contentType = contentTypeForExt(ext)

  return new NextResponse(new Uint8Array(data), {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  })
}
