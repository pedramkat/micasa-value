import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") || "1");
  const housesPerPage = 5;
  const offset = (page - 1) * housesPerPage;

  // Fetch paginated houses
  const houses = await prisma.house.findMany({
    skip: offset,
    take: housesPerPage,
    orderBy: { createdAt: "desc" },
    include: { user: { select: { name: true } } },
  });

  const totalHouses = await prisma.house.count();
  const totalPages = Math.ceil(totalHouses / housesPerPage);

  return NextResponse.json({ houses, totalPages });
}
