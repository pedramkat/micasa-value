import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const configurations = await prisma.configuration.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(configurations);
  } catch (error) {
    console.error("Error fetching configurations:", error);
    return NextResponse.json(
      { error: "Failed to fetch configurations" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
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

    if (!title) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }

    const configuration = await prisma.configuration.create({
      data: {
        title,
        description: description || null,
        fixValue: fixValue ? parseFloat(fixValue) : null,
        variableValue: variableValue ? parseFloat(variableValue) : null,
        properties: properties || null,
        propertyValuation: propertyValuation || false,
        houseValuation: houseValuation || false,
      },
    });

    return NextResponse.json(configuration, { status: 201 });
  } catch (error) {
    console.error("Error creating configuration:", error);
    return NextResponse.json(
      { error: "Failed to create configuration" },
      { status: 500 }
    );
  }
}
