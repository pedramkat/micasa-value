import { costTrackerService } from "@/lib/services/cost-tracker.service";
import prisma from "@/lib/prisma";

type PlacesCategory = "schools" | "supermarkets" | "trainStations";

export type NearbyPlace = {
  placeId: string;
  name: string;
  address?: string;
  rating?: number;
  userRatingsTotal?: number;
  types?: string[];
  lat?: number;
  lon?: number;
};

export type NearbyPlacesResult = {
  radiusMeters: number;
  location: { lat: number; lon: number };
  categories: Record<PlacesCategory, NearbyPlace[]>;
};

function pickString(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

function pickNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim()) {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function haversineDistanceMeters(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * (Math.sin(dLon / 2) ** 2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

async function fetchNearby(
  apiKey: string,
  lat: number,
  lon: number,
  radiusMeters: number,
  params: Record<string, string>,
): Promise<NearbyPlace[]> {
  const url = new URL("https://maps.googleapis.com/maps/api/place/nearbysearch/json");
  url.searchParams.set("key", apiKey);
  url.searchParams.set("location", `${lat},${lon}`);
  url.searchParams.set("radius", String(radiusMeters));

  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: {
      "Accept": "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Google Places request failed: ${res.status} ${res.statusText}${body ? ` - ${body}` : ""}`);
  }

  const data: any = await res.json();
  const results: any[] = Array.isArray(data?.results) ? data.results : [];

  return results
    .map((r) => {
      const placeId = pickString(r?.place_id) ?? "";
      const name = pickString(r?.name) ?? "";
      if (!placeId || !name) return null;

      const address = pickString(r?.vicinity) ?? pickString(r?.formatted_address) ?? undefined;
      const rating = pickNumber(r?.rating) ?? undefined;
      const userRatingsTotal = pickNumber(r?.user_ratings_total) ?? undefined;
      const types = Array.isArray(r?.types) ? r.types.filter((t: unknown) => typeof t === "string") : undefined;

      const placeLat = pickNumber(r?.geometry?.location?.lat) ?? undefined;
      const placeLon = pickNumber(r?.geometry?.location?.lng) ?? undefined;

      return {
        placeId,
        name,
        address,
        rating,
        userRatingsTotal,
        types,
        lat: placeLat,
        lon: placeLon,
      } satisfies NearbyPlace;
    })
    .filter(Boolean) as NearbyPlace[];
}

function isLikelyMiniMarket(place: NearbyPlace): boolean {
  const name = place.name.toLowerCase();
  if (name.includes("minimarket")) return true;
  if (name.includes("mini market")) return true;
  if (name.includes("mini-market")) return true;
  return false;
}

export class GooglePlacesService {
  private async loadCachedNearbyPlaces(params: {
    houseId: string;
    limitPerCategory: number;
    maxAgeMinutes: number;
  }): Promise<Record<PlacesCategory, NearbyPlace[]> | null> {
    const since = new Date(Date.now() - params.maxAgeMinutes * 60 * 1000);
    const rows = await (prisma as any).housePlace.findMany({
      where: {
        houseId: params.houseId,
        fetchedAt: { gte: since },
      },
      include: {
        place: {
          select: {
            googlePlaceId: true,
            name: true,
            address: true,
            rating: true,
            userRatingsTotal: true,
            types: true,
            raw: true,
          },
        },
      },
      orderBy: [{ fetchedAt: "desc" }],
    });

    const init: Record<PlacesCategory, NearbyPlace[]> = {
      schools: [],
      supermarkets: [],
      trainStations: [],
    };

    for (const r of rows as any[]) {
      const category = r?.category as PlacesCategory;
      if (category !== "schools" && category !== "supermarkets" && category !== "trainStations") continue;
      if (init[category].length >= params.limitPerCategory) continue;

      const p = r?.place;
      const placeId = pickString(p?.googlePlaceId);
      const name = pickString(p?.name);
      if (!placeId || !name) continue;

      init[category].push({
        placeId,
        name,
        address: pickString(p?.address) ?? undefined,
        rating: typeof p?.rating === "number" ? p.rating : undefined,
        userRatingsTotal: typeof p?.userRatingsTotal === "number" ? p.userRatingsTotal : undefined,
        types: Array.isArray(p?.types) ? p.types : undefined,
        lat: pickNumber(p?.raw?.lat) ?? undefined,
        lon: pickNumber(p?.raw?.lon) ?? undefined,
      });
    }

    const allHaveSome = (Object.keys(init) as PlacesCategory[]).every((k) => init[k].length > 0);
    return allHaveSome ? init : null;
  }

  private async persistNearbyPlaces(params: {
    houseId: string;
    origin: { lat: number; lon: number };
    categories: Record<PlacesCategory, NearbyPlace[]>;
  }): Promise<void> {
    const categoryEntries = Object.entries(params.categories) as Array<[PlacesCategory, NearbyPlace[]]>;

    for (const [category, places] of categoryEntries) {
      for (const p of places) {
        try {
          const place = await (prisma as any).place.upsert({
            where: { googlePlaceId: p.placeId },
            create: {
              googlePlaceId: p.placeId,
              name: p.name,
              address: p.address ?? null,
              rating: typeof p.rating === "number" ? p.rating : null,
              userRatingsTotal: typeof p.userRatingsTotal === "number" ? Math.trunc(p.userRatingsTotal) : null,
              types: Array.isArray(p.types) ? p.types : [],
              raw: p as any,
            },
            update: {
              name: p.name,
              address: p.address ?? null,
              rating: typeof p.rating === "number" ? p.rating : null,
              userRatingsTotal: typeof p.userRatingsTotal === "number" ? Math.trunc(p.userRatingsTotal) : null,
              types: Array.isArray(p.types) ? p.types : [],
              raw: p as any,
            },
            select: { id: true },
          });

          if (typeof p.lat === "number" && typeof p.lon === "number") {
            await (prisma as any).$executeRawUnsafe(
              'UPDATE "Place" SET "location" = ST_SetSRID(ST_MakePoint($1, $2), 4326) WHERE "id" = $3',
              p.lon,
              p.lat,
              place.id,
            );
          }

          await (prisma as any).housePlace.create({
            data: {
              houseId: params.houseId,
              placeId: place.id,
              category,
              distanceMeters:
                typeof p.lat === "number" && typeof p.lon === "number"
                  ? Math.round(haversineDistanceMeters(params.origin, { lat: p.lat, lon: p.lon }))
                  : null,
            },
            select: { id: true },
          });
        } catch (e: any) {
          const code = e?.code;
          if (code === "P2002") {
            continue;
          }
          if (process.env.NODE_ENV !== "production") {
            console.error("[GooglePlaces] persistNearbyPlaces failed", {
              houseId: params.houseId,
              category,
              placeId: p.placeId,
              error: e,
            });
          }
        }
      }
    }
  }

  async getNearbyImportantPlaces(params: {
    lat: number;
    lon: number;
    radiusMeters?: number;
    limitPerCategory?: number;
    cacheMaxAgeMinutes?: number;
    track?: { userId?: string | null; houseId?: string | null; endpoint?: string; operation?: string };
  }): Promise<NearbyPlacesResult | null> {
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) return null;

    const radiusMeters = typeof params.radiusMeters === "number" && Number.isFinite(params.radiusMeters)
      ? params.radiusMeters
      : 3000;

    const limitPerCategory = typeof params.limitPerCategory === "number" && Number.isFinite(params.limitPerCategory)
      ? params.limitPerCategory
      : 5;

    const cacheMaxAgeMinutes = typeof params.cacheMaxAgeMinutes === "number" && Number.isFinite(params.cacheMaxAgeMinutes)
      ? Math.max(1, params.cacheMaxAgeMinutes)
      : 60 * 24;

    const houseIdForCache = params.track?.houseId;
    if (typeof houseIdForCache === "string" && houseIdForCache.trim()) {
      try {
        const cached = await this.loadCachedNearbyPlaces({
          houseId: houseIdForCache,
          limitPerCategory,
          maxAgeMinutes: cacheMaxAgeMinutes,
        });
        if (cached) {
          return {
            radiusMeters,
            location: { lat: params.lat, lon: params.lon },
            categories: cached,
          };
        }
      } catch (e) {
        if (process.env.NODE_ENV !== "production") {
          console.error("[GooglePlaces] cache lookup failed", e);
        }
      }
    }

    const [schools, supermarkets, trainStations] = await Promise.all([
      fetchNearby(apiKey, params.lat, params.lon, radiusMeters, {
        type: "school",
        rankby: "prominence",
      }),
      fetchNearby(apiKey, params.lat, params.lon, radiusMeters, {
        type: "supermarket",
        rankby: "prominence",
      }),
      fetchNearby(apiKey, params.lat, params.lon, radiusMeters, {
        type: "train_station",
        rankby: "prominence",
      }),
    ]);

    const userId = params.track?.userId;
    if (userId) {
      const perRequestCostUsd = (() => {
        const raw = process.env.GOOGLE_PLACES_NEARBY_COST_USD
        if (typeof raw !== "string" || !raw.trim()) return 0
        const n = Number(raw)
        return Number.isFinite(n) ? n : 0
      })();

      const requestsMade = 3;
      const totalCostUsd = perRequestCostUsd * requestsMade;
      await costTrackerService.trackCost({
        userId,
        houseId: params.track?.houseId ?? null,
        provider: "google",
        category: "places",
        operation: params.track?.operation ?? "places_nearby",
        endpoint: params.track?.endpoint ?? "places.nearbysearch",
        costUsd: totalCostUsd,
        unitsUsed: requestsMade,
        metadata: {
          radiusMeters,
          categories: ["school", "supermarket", "train_station"],
          perRequestCostUsd,
          requestsMade,
        },
      });
    }

    const filteredSupermarkets = supermarkets
      .filter((p) => !isLikelyMiniMarket(p))
      .slice(0, limitPerCategory);

    const categories = {
      schools: schools.slice(0, limitPerCategory),
      supermarkets: filteredSupermarkets,
      trainStations: trainStations.slice(0, limitPerCategory),
    } satisfies Record<PlacesCategory, NearbyPlace[]>;

    const houseId = params.track?.houseId;
    if (typeof houseId === "string" && houseId.trim()) {
      await this.persistNearbyPlaces({
        houseId,
        origin: { lat: params.lat, lon: params.lon },
        categories,
      });
    }

    return {
      radiusMeters,
      location: { lat: params.lat, lon: params.lon },
      categories,
    };
  }

  formatNearbyPlacesForPrompt(result: NearbyPlacesResult | null): string {
    if (!result) return "";

    const fmt = (p: NearbyPlace) => {
      const rating = typeof p.rating === "number" ? ` (rating ${p.rating}${p.userRatingsTotal ? `, ${p.userRatingsTotal} reviews` : ""})` : "";
      const addr = p.address ? ` - ${p.address}` : "";
      return `${p.name}${addr}${rating}`;
    };

    const lines: string[] = [];
    lines.push(`Punti di interesse nel raggio di ${Math.round(result.radiusMeters / 1000)} km (da coordinate):`);

    const schools = result.categories.schools;
    const supermarkets = result.categories.supermarkets;
    const trainStations = result.categories.trainStations;

    if (schools.length) {
      lines.push("Scuole:");
      for (const p of schools) lines.push(`- ${fmt(p)}`);
    }

    if (supermarkets.length) {
      lines.push("Supermercati:");
      for (const p of supermarkets) lines.push(`- ${fmt(p)}`);
    }

    if (trainStations.length) {
      lines.push("Stazioni ferroviarie:");
      for (const p of trainStations) lines.push(`- ${fmt(p)}`);
    }

    return lines.join("\n");
  }
}

export const googlePlacesService = new GooglePlacesService();
