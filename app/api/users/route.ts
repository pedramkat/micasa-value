import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      orderBy: [{ name: "asc" }, { email: "asc" }],
      select: {
        id: true,
        name: true,
        surname: true,
        email: true,
        role: true,
      },
    });

    return NextResponse.json(users);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Failed to fetch users" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    name?: string;
    surname?: string;
    email?: string;
    password?: string;
    telephone?: string;
    address?: string;
    role?: string;
  };

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const surname = typeof body.surname === "string" ? body.surname.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const telephone = typeof body.telephone === "string" ? body.telephone.trim() : "";
  const address = typeof body.address === "string" ? body.address.trim() : "";
  const role = typeof body.role === "string" ? body.role : "USER";

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  try {
    const user = await prisma.user.create({
      data: {
        name: name || null,
        surname: surname || null,
        email,
        telephone: telephone || null,
        address: address || null,
        role: role as any,
        password: password.trim() ? await bcrypt.hash(password, 10) : "",
      },
      select: { id: true },
    });

    return NextResponse.json({ id: user.id }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Failed to create user" }, { status: 400 });
  }
}
