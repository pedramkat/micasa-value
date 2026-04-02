import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function PATCH(
  request: Request,
  { params }: { params: { id?: string } | Promise<{ id?: string }> },
) {
  const resolvedParams = await Promise.resolve(params);
  const id = typeof resolvedParams?.id === "string" ? resolvedParams.id : "";
  if (!id) {
    return NextResponse.json({ error: "Missing house id" }, { status: 400 });
  }

  const body = (await request.json()) as { ownerId?: string | null; featureImagePath?: string | null };
  const ownerIdRaw = body?.ownerId;
  const featureImagePathRaw = body?.featureImagePath;

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

  try {
    await prisma.house.update({
      where: { id },
      data: {
        ownerId,
        ...(featureImagePath !== undefined ? { featureImagePath } : {}),
      },
      select: { id: true, ownerId: true },
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Failed to update house" }, { status: 400 });
  }
}
