"use server";

import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";

export async function createHouse(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    throw new Error("You must be logged in to create a house");
  }

  await prisma.house.create({
    data: {
      title: formData.get("title") as string,
      description: formData.get("description") as string,
      userId: session.user.id,
    },
  });

  redirect("/houses");
}
