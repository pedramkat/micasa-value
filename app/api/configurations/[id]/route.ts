import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const configuration = await prisma.configuration.findUnique({
      where: { id },
    });

    if (!configuration) {
      return NextResponse.json(
        { error: "Configuration not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(configuration);
  } catch (error) {
    console.error("Error fetching configuration:", error);
    return NextResponse.json(
      { error: "Failed to fetch configuration" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      title,
      description,
      fixValue,
      variableValue,
      properties,
      propertyValuation,
      houseValuation,
    } = body;

    const configuration = await prisma.configuration.update({
      where: { id },
      data: {
        title,
        description: description || null,
        fixValue: fixValue === 0 || fixValue ? Number.parseFloat(fixValue) : null,
        variableValue: variableValue === 0 || variableValue ? Number.parseFloat(variableValue) : null,
        properties: properties || null,
        propertyValuation: propertyValuation || false,
        houseValuation: houseValuation || false,
      },
    });

    return NextResponse.json(configuration);
  } catch (error) {
    console.error("Error updating configuration:", error);
    return NextResponse.json(
      { error: "Failed to update configuration" },
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
    await prisma.configuration.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting configuration:", error);
    return NextResponse.json(
      { error: "Failed to delete configuration" },
      { status: 500 }
    );
  }
}
