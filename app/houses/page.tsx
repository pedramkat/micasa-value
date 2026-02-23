"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import Link from "next/link";

interface House {
  id: string;
  title: string;
  description?: string;
  createdAt: string;
  user?: {
    name: string;
  };
}

// Disable static generation
export const dynamic = "force-dynamic";

function HousesList() {
  const searchParams = useSearchParams();
  const page = parseInt(searchParams.get("page") || "1");

  const [houses, setHouses] = useState<House[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchHouses() {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/houses?page=${page}`);
        if (!res.ok) {
          throw new Error("Failed to fetch houses");
        }
        const data = await res.json();
        setHouses(data.houses);
        setTotalPages(data.totalPages);
      } catch (error) {
        console.error("Error fetching houses:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchHouses();
  }, [page]);

  return (
    <>
      {isLoading ? (
        <div className="flex items-center justify-center space-x-2 min-h-[200px]">
          <div className="w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      ) : (
        <>
          {houses.length === 0 ? (
            <p className="text-gray-600">No houses available.</p>
          ) : (
            <ul className="space-y-6 w-full max-w-4xl mx-auto">
              {houses.map((house) => (
                <li key={house.id} className="border p-6 rounded-lg shadow-md bg-white">
                  <Link href={`/houses/${house.id}`} className="text-2xl font-semibold text-gray-900 hover:underline">
                    {house.title}
                  </Link>
                  <p className="text-sm text-gray-500">by {house.user?.name || "Anonymous"}</p>
                  <p className="text-xs text-gray-400">
                    {new Date(house.createdAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </li>
              ))}
            </ul>
          )}

          {/* Pagination Controls */}
          <div className="flex justify-center space-x-4 mt-8">
            {page > 1 && (
              <Link href={`/houses?page=${page - 1}`}>
                <button className="px-4 py-2 bg-gray-200 rounded-sm hover:bg-gray-300">Previous</button>
              </Link>
            )}
            {page < totalPages && (
              <Link href={`/houses?page=${page + 1}`}>
                <button className="px-4 py-2 bg-gray-200 rounded-sm hover:bg-gray-300">Next</button>
              </Link>
            )}
          </div>
        </>
      )}
    </>
  );
}

export default function HousesPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-start p-8">
      <Suspense
        fallback={
          <div className="flex items-center justify-center min-h-screen">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="ml-3 text-gray-600">Loading page...</p>
          </div>
        }
      >
        <HousesList />
      </Suspense>
    </div>
  );
}
