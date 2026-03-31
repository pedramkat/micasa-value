"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { Building2, Loader2, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
        <div className="flex items-center justify-center gap-2 min-h-[220px] text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm font-medium">Loading...</span>
        </div>
      ) : (
        <>
          {houses.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Building2 className="h-5 w-5" />
                </div>
                <div className="text-base font-semibold">No houses available</div>
                <div className="mt-1 text-sm text-muted-foreground">Create your first property to start a valuation.</div>
                <div className="mt-5">
                  <Button asChild className="gap-2">
                    <Link href="/houses/new">
                      <Plus className="h-4 w-4" />
                      New house
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {houses.map((house) => (
                <Card key={house.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">
                      <Link href={`/houses/${house.id}`} className="hover:underline">
                        {house.title}
                      </Link>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex flex-col gap-1 text-sm">
                      <div className="text-muted-foreground">by {house.user?.name || "Anonymous"}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(house.createdAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Pagination Controls */}
          <div className="flex justify-center gap-3 mt-8">
            {page > 1 && (
              <Button asChild variant="outline" size="sm">
                <Link href={`/houses?page=${page - 1}`}>Previous</Link>
              </Button>
            )}
            {page < totalPages && (
              <Button asChild variant="outline" size="sm">
                <Link href={`/houses?page=${page + 1}`}>Next</Link>
              </Button>
            )}
          </div>
        </>
      )}
    </>
  );
}

export default function HousesPage() {
  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Houses</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage properties, media and valuations.</p>
        </div>
        <Button asChild className="gap-2">
          <Link href="/houses/new">
            <Plus className="h-4 w-4" />
            New house
          </Link>
        </Button>
      </div>

      <Suspense
        fallback={
          <div className="flex items-center justify-center min-h-[220px] gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm font-medium">Loading page...</span>
          </div>
        }
      >
        <HousesList />
      </Suspense>
    </div>
  );
}
