import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"

import { authOptions } from "@/auth"
import prisma from "@/lib/prisma"
import { settingsService } from "@/lib/services/settings.service"

export async function GET() {
  const session = await getServerSession(authOptions)
  const sessionUserId = session?.user?.id
  const sessionEmail = session?.user?.email

  let requesterUserId: string | undefined =
    typeof sessionUserId === "string" && sessionUserId.trim() ? sessionUserId : undefined

  if (requesterUserId) {
    const exists = await prisma.user.findUnique({ where: { id: requesterUserId }, select: { id: true } })
    if (!exists) requesterUserId = undefined
  }

  if (!requesterUserId && typeof sessionEmail === "string" && sessionEmail.trim()) {
    const user = await prisma.user.findUnique({ where: { email: sessionEmail.trim() }, select: { id: true } })
    requesterUserId = user?.id
  }

  if (!requesterUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const requester = await prisma.user.findUnique({
    where: { id: requesterUserId },
    select: { role: true },
  })

  const isAdmin = requester?.role === "ADMIN" || requester?.role === "MANAGER"
  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const setting = await settingsService.getGeneralSettings()
  return NextResponse.json(setting)
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions)
  const sessionUserId = session?.user?.id
  const sessionEmail = session?.user?.email

  let requesterUserId: string | undefined =
    typeof sessionUserId === "string" && sessionUserId.trim() ? sessionUserId : undefined

  if (requesterUserId) {
    const exists = await prisma.user.findUnique({ where: { id: requesterUserId }, select: { id: true } })
    if (!exists) requesterUserId = undefined
  }

  if (!requesterUserId && typeof sessionEmail === "string" && sessionEmail.trim()) {
    const user = await prisma.user.findUnique({ where: { email: sessionEmail.trim() }, select: { id: true } })
    requesterUserId = user?.id
  }

  if (!requesterUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const requester = await prisma.user.findUnique({
    where: { id: requesterUserId },
    select: { role: true },
  })

  const isAdmin = requester?.role === "ADMIN" || requester?.role === "MANAGER"
  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = (await request.json().catch(() => null)) as any
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
  }

  try {
    const setting = await settingsService.updateGeneralSettings({
      agencyName: body.agencyName,
      agencyBio: body.agencyBio,
      agencyLogoUrl: body.agencyLogoUrl,
      contactEmail: body.contactEmail,
      contactPhone: body.contactPhone,
      websiteUrl: body.websiteUrl,
      headquartersAddress: body.headquartersAddress,
      defaultOpenAiModel: body.defaultOpenAiModel,
      apiCostModels: body.apiCostModels,
    })

    return NextResponse.json(setting)
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Failed to update settings" }, { status: 400 })
  }
}
