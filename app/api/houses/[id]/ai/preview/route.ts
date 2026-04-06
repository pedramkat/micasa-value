import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import type { Session } from "next-auth"
import { createHmac } from "node:crypto"

import { authOptions } from "@/auth"
import prisma from "@/lib/prisma"
import { processHouseDataWithOpenAI } from "@/lib/services/house-ai.service"

const PREVIEW_SECRET = process.env.AI_PREVIEW_SECRET ?? process.env.NEXTAUTH_SECRET ?? "ai-preview-secret"

async function resolveRequesterUserId(session: Session | null): Promise<string | null> {
  const sessionUserId = session?.user?.id
  let requesterUserId = typeof sessionUserId === "string" && sessionUserId.trim() ? sessionUserId : null

  if (requesterUserId) {
    const exists = await prisma.user.findUnique({ where: { id: requesterUserId }, select: { id: true } })
    if (!exists) requesterUserId = null
  }

  if (!requesterUserId) {
    const email = session?.user?.email
    if (typeof email === "string" && email.trim()) {
      const user = await prisma.user.findUnique({ where: { email: email.trim() }, select: { id: true } })
      requesterUserId = user?.id ?? null
    }
  }

  return requesterUserId
}

export async function POST(
  _request: Request,
  context: { params: { id?: string } } | { params: Promise<{ id?: string }> },
) {
  const resolvedParams = await Promise.resolve(context.params)
  const houseId = typeof resolvedParams?.id === "string" && resolvedParams.id.trim() ? resolvedParams.id.trim() : null
  if (!houseId) {
    return NextResponse.json({ ok: false, error: "Missing house id" }, { status: 400 })
  }

  const session = await getServerSession(authOptions)
  const requesterUserId = await resolveRequesterUserId(session)

  try {
    const preview = await processHouseDataWithOpenAI(houseId, `web-${houseId}`, requesterUserId, { previewOnly: true })
    if (!preview) {
      return NextResponse.json({ ok: false, error: "Nessun output AI disponibile" }, { status: 422 })
    }

    const payload = JSON.stringify(preview)
    const token = createHmac("sha256", PREVIEW_SECRET).update(payload).digest("hex")

    return NextResponse.json({ ok: true, preview, token })
  } catch (error) {
    console.error(`[House ${houseId}] AI preview failed`, error)
    return NextResponse.json({ ok: false, error: "Impossibile generare il suggerimento AI" }, { status: 500 })
  }
}
