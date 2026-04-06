import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import { houseService } from "@/lib/services/house.service";

export async function PATCH(
  request: Request,
  { params }: { params: { id?: string } | Promise<{ id?: string }> },
) {
  const resolvedParams = await Promise.resolve(params);
  const id = typeof resolvedParams?.id === "string" ? resolvedParams.id : "";
  if (!id) {
    return NextResponse.json({ error: "Missing house id" }, { status: 400 });
  }

  let body: { lat?: unknown; lon?: unknown };
  try {
    body = (await request.json()) as { lat?: unknown; lon?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const lat = typeof body.lat === "number" ? body.lat : Number(body.lat);
  const lon = typeof body.lon === "number" ? body.lon : Number(body.lon);

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return NextResponse.json({ error: "lat and lon must be valid numbers" }, { status: 400 });
  }
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return NextResponse.json({ error: "lat/lon out of range" }, { status: 400 });
  }

  try {
    await prisma.house.update({
      where: { id },
      data: {
        coordinate: {
          type: "Point",
          coordinates: [lat, lon],
        } as any,
      },
      select: { id: true },
    });

    try {
      await houseService.calculateGeom(id);
    } catch (e) {
      console.error(`[House ${id}] Failed to recalculate geometry after coordinate update:`, e);
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Failed to update coordinate" }, { status: 400 });
  }
}
