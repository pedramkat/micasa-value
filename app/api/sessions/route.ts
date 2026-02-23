import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { telegramId, userId } = body;

    if (!telegramId) {
      return NextResponse.json(
        { error: "telegramId is required" },
        { status: 400 }
      );
    }

    const existingActiveSession = await prisma.session.findFirst({
      where: {
        telegramId,
        isActive: true,
        expiresAt: {
          gte: new Date(),
        },
      },
    });

    if (existingActiveSession) {
      return NextResponse.json(
        { error: "Active session already exists", session: existingActiveSession },
        { status: 409 }
      );
    }

    const oneHourFromNow = new Date();
    oneHourFromNow.setHours(oneHourFromNow.getHours() + 1);

    const session = await prisma.session.create({
      data: {
        telegramId,
        userId: userId || null,
        expiresAt: oneHourFromNow,
        isActive: true,
      },
    });

    return NextResponse.json(session, { status: 201 });
  } catch (error) {
    console.error("Failed to create session:", error);
    return NextResponse.json(
      {
        error: "Failed to create session",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const telegramId = searchParams.get("telegramId");

    if (!telegramId) {
      return NextResponse.json(
        { error: "telegramId query parameter is required" },
        { status: 400 }
      );
    }

    const session = await prisma.session.findFirst({
      where: {
        telegramId,
        isActive: true,
        expiresAt: {
          gte: new Date(),
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!session) {
      return NextResponse.json(
        { error: "No active session found" },
        { status: 404 }
      );
    }

    return NextResponse.json(session);
  } catch (error) {
    console.error("Failed to fetch session:", error);
    return NextResponse.json(
      { error: "Failed to fetch session" },
      { status: 500 }
    );
  }
}
