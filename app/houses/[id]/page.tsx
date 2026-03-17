export const dynamic = "force-dynamic"; // This disables SSG and ISR

import prisma from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { houseService } from "@/lib/services/house.service";

export default async function House({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const houseId = id;

  const house = await prisma.house.findUnique({
    where: { id: houseId },
    include: {
      user: true,
    },
  });

  if (!house) {
    notFound();
  }

  // Server action to delete the house
  async function deleteHouse() {
    "use server";

    await prisma.house.delete({
      where: {
        id: houseId,
      },
    });

    redirect("/houses");
  }

  async function calculateGeom() {
    "use server";

    await houseService.calculateGeom(houseId)
  }

  async function calculatePrice() {
    "use server";

    await houseService.calculatePrice(houseId)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-8">
      <article className="max-w-3xl w-full bg-white shadow-lg rounded-lg p-8">
        {/* House Title */}
        <h1 className="text-5xl font-extrabold text-gray-900 mb-4">
          {house.title}
        </h1>

        <div className="mb-6 flex items-center gap-3">
        <form action={calculateGeom}>
          <button
            type="submit"
            className="px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors"
          >
            Calculate geom
          </button>
        </form>

        <form action={calculatePrice}>
          <button
            type="submit"
            className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
          >
            Calculate price
          </button>
        </form>
        </div>

        {/* User Information */}
        <p className="text-lg text-gray-600 mb-4">
          by <span className="font-medium text-gray-800">{house.user?.name || "Anonymous"}</span>
        </p>

        {/* Description Section */}
        <div className="text-lg text-gray-800 leading-relaxed space-y-6 border-t pt-6">
          {house.description ? (
            <p className="whitespace-pre-wrap">{house.description}</p>
          ) : (
            <p className="italic text-gray-500">No description available for this house.</p>
          )}
        </div>
      </article>

      {/* Delete Button */}
      <form action={deleteHouse} className="mt-6">
        <button
          type="submit"
          className="px-6 py-3 bg-red-500 text-white font-semibold rounded-lg hover:bg-red-600 transition-colors"
        >
          Delete House
        </button>
      </form>
    </div>
  );
}
