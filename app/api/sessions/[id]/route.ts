import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { action } = body;

    if (action !== "end") {
      return NextResponse.json(
        { error: "Invalid action. Use 'end' to end the session" },
        { status: 400 }
      );
    }

    const session = await prisma.session.update({
      where: { id },
      data: {
        isActive: false,
        endedAt: new Date(),
      },
    });

    return NextResponse.json(session);
  } catch (error) {
    console.error("Failed to end session:", error);
    return NextResponse.json(
      {
        error: "Failed to end session",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.session.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete session:", error);
    return NextResponse.json(
      { error: "Failed to delete session" },
      { status: 500 }
    );
  }
}
