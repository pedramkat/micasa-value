import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export async function PATCH(
  request: Request,
  { params }: { params: { id?: string } | Promise<{ id?: string }> },
) {
  const resolvedParams = await Promise.resolve(params)
  const id = typeof resolvedParams?.id === "string" ? resolvedParams.id : "";
  if (!id) {
    return NextResponse.json({ error: "Missing user id" }, { status: 400 });
  }

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
  const telephone = typeof body.telephone === "string" ? body.telephone.trim() : "";
  const address = typeof body.address === "string" ? body.address.trim() : "";
  const role = typeof body.role === "string" ? body.role : undefined;
  const password = typeof body.password === "string" ? body.password : "";

  try {
    const data: any = {
      name: name || null,
      surname: surname || null,
      email: email || undefined,
      telephone: telephone || null,
      address: address || null,
      role: role || undefined,
    };

    if (password.trim()) {
      data.password = await bcrypt.hash(password, 10);
    }

    await prisma.user.update({ where: { id }, data });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Failed to update user" }, { status: 400 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id?: string } | Promise<{ id?: string }> },
) {
  const resolvedParams = await Promise.resolve(params)
  const id = typeof resolvedParams?.id === "string" ? resolvedParams.id : "";
  if (!id) {
    return NextResponse.json({ error: "Missing user id" }, { status: 400 });
  }

  try {
    await prisma.user.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Failed to delete user" }, { status: 400 });
  }
}
