import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import type { Session } from "next-auth"
import { createHmac, randomUUID } from "node:crypto"

import { authOptions } from "@/auth"
import prisma from "@/lib/prisma"
import { houseService } from "@/lib/services/house.service"

const PREVIEW_SECRET = process.env.AI_PREVIEW_SECRET ?? process.env.NEXTAUTH_SECRET ?? "ai-preview-secret"

type FieldSelection = {
  title?: boolean
  description?: boolean
  houseParameters?: string[]
  configurations?: string[]
}

type PreviewPayload = {
  title?: string | null
  description?: string | null
  rawResponse?: string | null
  aiParsed?: {
    title?: string | null
    description?: string | null
    houseParameters?: Record<string, unknown> | null
    configurations?: Record<string, unknown> | null
  } | null
  houseParameters?: Record<string, unknown> | null
  configurations?: Record<string, unknown> | null
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function normalizePreview(preview: PreviewPayload) {
  const aiParsed = isPlainObject(preview.aiParsed) ? preview.aiParsed : {}

  const title = typeof aiParsed.title === "string" && aiParsed.title.trim() ? aiParsed.title.trim() : preview.title ?? null
  const description = typeof aiParsed.description === "string" && aiParsed.description.trim()
    ? aiParsed.description.trim()
    : typeof preview.description === "string"
      ? preview.description
      : null

  const houseParameters = (isPlainObject(aiParsed.houseParameters)
    ? aiParsed.houseParameters
    : isPlainObject(preview.houseParameters)
      ? preview.houseParameters
      : {}) as Record<string, unknown>

  const configurations = (isPlainObject(aiParsed.configurations)
    ? aiParsed.configurations
    : isPlainObject(preview.configurations)
      ? preview.configurations
      : {}) as Record<string, unknown>

  return { title, description, houseParameters, configurations }
}

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
  request: Request,
  context: { params: { id?: string } } | { params: Promise<{ id?: string }> },
) {
  const resolvedParams = await Promise.resolve(context.params)
  const houseId = typeof resolvedParams?.id === "string" && resolvedParams.id.trim() ? resolvedParams.id.trim() : null
  if (!houseId) {
    return NextResponse.json({ ok: false, error: "Missing house id" }, { status: 400 })
  }

  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ ok: false, error: "Non autenticato" }, { status: 401 })
  }

  const requesterUserId = await resolveRequesterUserId(session)

  const body = await request.json().catch(() => null)
  const preview = body?.preview as PreviewPayload | undefined
  const selection = body?.selection as FieldSelection | undefined
  const token = typeof body?.token === "string" ? body.token : null

  if (!preview || !selection || !token) {
    return NextResponse.json({ ok: false, error: "Payload mancante" }, { status: 400 })
  }

  const payload = JSON.stringify(preview)
  const expectedToken = createHmac("sha256", PREVIEW_SECRET).update(payload).digest("hex")
  if (token !== expectedToken) {
    return NextResponse.json({ ok: false, error: "Token di anteprima non valido" }, { status: 400 })
  }

  const house = await prisma.house.findUnique({ where: { id: houseId } })
  if (!house) {
    return NextResponse.json({ ok: false, error: "Casa non trovata" }, { status: 404 })
  }

  const normalized = normalizePreview(preview)
  const aiParsed = isPlainObject(preview.aiParsed) ? preview.aiParsed : {}
  const rawResponse = typeof preview.rawResponse === "string" ? preview.rawResponse : null

  const currentAi = house.aiCurrent && typeof house.aiCurrent === "object" ? (house.aiCurrent as Record<string, unknown>) : {}
  const nextAiCurrent: Record<string, unknown> = { ...currentAi }

  const currentHouseParams = isPlainObject(currentAi.houseParameters) ? (currentAi.houseParameters as Record<string, unknown>) : {}
  const currentConfigurations = isPlainObject(currentAi.configurations) ? (currentAi.configurations as Record<string, unknown>) : {}

  let nextHouseParams = { ...currentHouseParams }
  let nextConfigurations = { ...currentConfigurations }
  let titleToPersist: string | null = null
  let descriptionToPersist: string | null = null
  let updatedIndirizzo: string | null = null

  if (selection.title && normalized.title) {
    titleToPersist = normalized.title
    nextAiCurrent.title = normalized.title
  }

  if (selection.description && normalized.description) {
    descriptionToPersist = normalized.description
    nextAiCurrent.description = normalized.description
  }

  if (Array.isArray(selection.houseParameters) && selection.houseParameters.length > 0) {
    const source = normalized.houseParameters
    const updates: Record<string, unknown> = { ...nextHouseParams }
    for (const key of selection.houseParameters) {
      if (!key) continue
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        updates[key] = source[key]
        if (key.toLowerCase() === "indirizzo" && typeof source[key] === "string" && source[key].trim()) {
          updatedIndirizzo = source[key].trim()
        }
      }
    }
    nextHouseParams = updates
    nextAiCurrent.houseParameters = updates
  }

  if (Array.isArray(selection.configurations) && selection.configurations.length > 0) {
    const source = normalized.configurations
    const updates: Record<string, unknown> = { ...nextConfigurations }
    for (const key of selection.configurations) {
      if (!key) continue
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        updates[key] = source[key]
      }
    }
    nextConfigurations = updates
    nextAiCurrent.configurations = updates
  }

  const somethingSelected = Boolean(
    titleToPersist ||
      descriptionToPersist ||
      (Array.isArray(selection.houseParameters) && selection.houseParameters.length > 0) ||
      (Array.isArray(selection.configurations) && selection.configurations.length > 0),
  )

  if (!somethingSelected) {
    return NextResponse.json({ ok: false, error: "Nessun campo selezionato" }, { status: 400 })
  }

  const currentHistory = Array.isArray((house as any).aiHistory) ? ((house as any).aiHistory as any[]) : []
  const historyEntry = {
    id: randomUUID(),
    timestamp: new Date().toISOString(),
    source: "preview_dialog",
    model: "gpt-4o",
    promptVersion: "preview-v1",
    rawResponse,
    parsed: aiParsed,
    selection,
  }

  const updateData: any = {
    aiCurrent: nextAiCurrent,
    aiHistory: [...currentHistory, historyEntry],
  }

  if (titleToPersist) {
    updateData.title = titleToPersist
  }

  if (descriptionToPersist) {
    updateData.description = descriptionToPersist
  }

  const updatedHouse = await prisma.house.update({ where: { id: houseId }, data: updateData })

  if (updatedIndirizzo) {
    try {
      await houseService.setCoordinateFromStreet(houseId, updatedIndirizzo)
      await houseService.calculateGeom(houseId)
    } catch (error) {
      console.error(`[House ${houseId}] Failed to update coordinate from AI dialog`, error)
    }
  }

  return NextResponse.json({ ok: true, houseId: updatedHouse.id })
}
