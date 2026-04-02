import { costTrackerService } from "@/lib/services/cost-tracker.service";

type PlacesCategory = "schools" | "supermarkets" | "trainStations";

export type NearbyPlace = {
  placeId: string;
  name: string;
  address?: string;
  rating?: number;
  userRatingsTotal?: number;
  types?: string[];
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

      return {
        placeId,
        name,
        address,
        rating,
        userRatingsTotal,
        types,
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
  async getNearbyImportantPlaces(params: {
    lat: number;
    lon: number;
    radiusMeters?: number;
    limitPerCategory?: number;
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

    return {
      radiusMeters,
      location: { lat: params.lat, lon: params.lon },
      categories: {
        schools: schools.slice(0, limitPerCategory),
        supermarkets: filteredSupermarkets,
        trainStations: trainStations.slice(0, limitPerCategory),
      },
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
