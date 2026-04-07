export const dynamic = "force-dynamic";

import Link from "next/link";
import prisma from "@/lib/prisma";
import { Building2, TrendingUp, Image as ImageIcon, FileText, ArrowRight } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HouseStatusBadge } from "@/components/house/HouseStatusBadge";
import type { MapHousePoint } from "@/components/dashboard/HousesClusterMap";
import { HousesClusterMap } from "@/components/dashboard/HousesClusterMap";

function toMediaUrl(storedPath: string): string {
  const normalized = storedPath.replace(/\\/g, "/")
  const prefix = "storage/"
  const idx = normalized.indexOf(prefix)
  const rel = idx >= 0 ? normalized.slice(idx + prefix.length) : normalized
  return `/media/${rel}`
}

function extractLatLon(coordinate: unknown): { lat: number; lon: number } | null {
  if (!coordinate || typeof coordinate !== "object") return null
  const point = coordinate as any
  if (point.type !== "Point" || !Array.isArray(point.coordinates) || point.coordinates.length < 2) return null

  const lat = Number(point.coordinates[0])
  const lon = Number(point.coordinates[1])
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null
  if (lat < -90 || lat > 90) return null
  if (lon < -180 || lon > 180) return null

  return { lat, lon }
}

export default async function DashboardPage() {
  const [houses, totalHouses, mapHouseRows] = await Promise.all([
    prisma.house.findMany({
      orderBy: { updatedAt: "desc" },
      take: 8,
      select: {
        id: true,
        title: true,
        status: true,
        updatedAt: true,
        media: true,
        featureImagePath: true,
        valuationHistory: true,
      },
    }),
    prisma.house.count(),
    prisma.house.findMany({
      select: {
        id: true,
        title: true,
        coordinate: true,
      },
    }),
  ]);

  const totalPhotos = houses.reduce((acc, h) => {
    const media = h.media && typeof h.media === "object" ? (h.media as any) : null;
    const photos = Array.isArray(media?.photos) ? media.photos : [];
    return acc + photos.length;
  }, 0);

  const totalValuations = houses.reduce((acc, h) => {
    const vh = h.valuationHistory;
    if (Array.isArray(vh)) return acc + vh.length;
    if (vh && typeof vh === "object") return acc + 1;
    return acc;
  }, 0);

  const totalPdfs = houses.reduce((acc, h) => {
    const vh = h.valuationHistory;
    const items = Array.isArray(vh) ? vh : [];
    return (
      acc +
      items.filter((v: any) => {
        const hasPdf = v?.hasPdf;
        return hasPdf === true;
      }).length
    );
  }, 0);

  const stats = [
    {
      label: "Total Properties",
      value: totalHouses,
      icon: Building2,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      label: "Valuations Done",
      value: totalValuations,
      icon: TrendingUp,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      label: "Total Photos",
      value: totalPhotos,
      icon: ImageIcon,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
    {
      label: "PDFs Generated",
      value: totalPdfs,
      icon: FileText,
      color: "text-violet-600",
      bg: "bg-violet-50",
    },
  ];

  const mapPoints: MapHousePoint[] = mapHouseRows
    .map((house) => {
      const coords = extractLatLon(house.coordinate)
      if (!coords) return null
      return {
        id: house.id,
        title: house.title || "Senza titolo",
        lat: coords.lat,
        lon: coords.lon,
      }
    })
    .filter(Boolean) as MapHousePoint[]

  return (
    <div className="p-4 lg:p-8 space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Panoramica del tuo portafoglio immobiliare</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-3xl font-bold mt-1">{stat.value}</p>
                </div>
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${stat.bg}`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Proprietà Recenti</h2>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/houses">
              Vedi tutte <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {houses.slice(0, 3).map((house) => (
            <Link key={house.id} href={`/houses/${house.id}`} className="block">
              <Card className="hover:shadow-md transition-all cursor-pointer">
                <div className="relative overflow-hidden rounded-t-xl aspect-[16/9] bg-muted">
                  {house.featureImagePath ? (
                    <img
                      src={toMediaUrl(house.featureImagePath)}
                      alt={house.title}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="h-full w-full" />
                  )}
                </div>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle className="text-base truncate">{house.title}</CardTitle>
                    <HouseStatusBadge status={(house as any).status ?? null} className="shrink-0" />
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Aggiorna {new Date(house.updatedAt).toLocaleDateString("en-GB")}</span>
                    <span className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <ImageIcon className="h-3.5 w-3.5" />
                        {(() => {
                          const media = house.media && typeof house.media === "object" ? (house.media as any) : null;
                          const photos = Array.isArray(media?.photos) ? media.photos : [];
                          return photos.length;
                        })()}
                      </span>
                      <span className="flex items-center gap-1">
                        <TrendingUp className="h-3.5 w-3.5" />
                        {Array.isArray(house.valuationHistory) ? house.valuationHistory.length : 0}
                      </span>
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold">Mappa delle proprietà</CardTitle>
        </CardHeader>
        <CardContent>
          {mapPoints.length > 0 ? (
            <div className="h-[460px] w-full rounded-2xl overflow-hidden border">
              <HousesClusterMap houses={mapPoints} />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Non ci sono case con coordinate salvate.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
