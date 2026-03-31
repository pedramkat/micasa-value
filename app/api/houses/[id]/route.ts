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

  const body = (await request.json()) as { ownerId?: string | null };
  const ownerIdRaw = body?.ownerId;

  let ownerId: string | null = null;
  if (typeof ownerIdRaw === "string") {
    const trimmed = ownerIdRaw.trim();
    if (trimmed) ownerId = trimmed;
  }

  try {
    await prisma.house.update({
      where: { id },
      data: {
        ownerId,
      },
      select: { id: true, ownerId: true },
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Failed to update house" }, { status: 400 });
  }
}
