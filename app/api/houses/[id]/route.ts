import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { HouseStatus } from "@/prisma/generated/client";

export async function PATCH(
  request: Request,
  { params }: { params: { id?: string } | Promise<{ id?: string }> },
) {
  const resolvedParams = await Promise.resolve(params);
  const id = typeof resolvedParams?.id === "string" ? resolvedParams.id : "";
  if (!id) {
    return NextResponse.json({ error: "Missing house id" }, { status: 400 });
  }

  const body = (await request.json()) as {
    ownerId?: string | null
    featureImagePath?: string | null
    status?: string | null
  };
  
  const ownerIdRaw = body?.ownerId;
  const featureImagePathRaw = body?.featureImagePath;
  const statusRaw = body?.status;

  let ownerId: string | null = null;
  if (typeof ownerIdRaw === "string") {
    const trimmed = ownerIdRaw.trim();
    if (trimmed) ownerId = trimmed;
  }

  let featureImagePath: string | null | undefined = undefined;
  if (featureImagePathRaw === null) {
    featureImagePath = null;
  } else if (typeof featureImagePathRaw === "string") {
    const trimmed = featureImagePathRaw.trim();
    featureImagePath = trimmed ? trimmed : null;

    if (featureImagePath) {
      const normalized = featureImagePath.replace(/\\/g, "/");
      const allowedPrefixes = [`storage/media/${id}/`, `storage/enhanced_media/${id}/`];
      if (normalized.includes("..") || !allowedPrefixes.some((p) => normalized.startsWith(p))) {
        return NextResponse.json({ error: "Invalid featureImagePath" }, { status: 400 });
      }
      featureImagePath = normalized;
    }
  }

  let status: HouseStatus | undefined = undefined;
  if (typeof statusRaw === "string") {
    const trimmed = statusRaw.trim();
    const allowed = Object.keys(HouseStatus) as HouseStatus[];
    
    if (!allowed.includes(trimmed as HouseStatus)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    status = trimmed as HouseStatus;
  } else if (statusRaw === null) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  try {
    await prisma.house.update({
      where: { id },
      data: {
        ownerId,
        ...(featureImagePath !== undefined ? { featureImagePath } : {}),
        ...(status !== undefined ? { status } : {}),
      },
      select: { id: true, ownerId: true, status: true },
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Failed to update house" }, { status: 400 });
  }
}
