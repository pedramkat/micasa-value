"use server";

import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";

export async function createConfiguration(formData: FormData) {
  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const fixValue = formData.get("fixValue") as string;
  const variableValue = formData.get("variableValue") as string;
  const propertiesStr = formData.get("properties") as string;
  const propertyValuation = formData.get("propertyValuation") === "on";
  const houseValuation = formData.get("houseValuation") === "on";

  let properties = null;
  if (propertiesStr && propertiesStr.trim()) {
    try {
      properties = JSON.parse(propertiesStr);
    } catch (error) {
      throw new Error("Invalid JSON in properties field");
    }
  }

  await prisma.configuration.create({
    data: {
      title,
      description: description || null,
      fixValue: fixValue ? parseFloat(fixValue) : null,
      variableValue: variableValue ? parseFloat(variableValue) : null,
      properties,
      propertyValuation,
      houseValuation,
    },
  });

  redirect("/configurations");
}
