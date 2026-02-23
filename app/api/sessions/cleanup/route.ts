import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const result = await prisma.session.updateMany({
      where: {
        isActive: true,
        expiresAt: {
          lt: new Date(),
        },
      },
      data: {
        isActive: false,
        endedAt: new Date(),
      },
    });

    return NextResponse.json({
      message: "Expired sessions cleaned up",
      count: result.count,
    });
  } catch (error) {
    console.error("Failed to cleanup sessions:", error);
    return NextResponse.json(
      { error: "Failed to cleanup expired sessions" },
      { status: 500 }
    );
  }
}
