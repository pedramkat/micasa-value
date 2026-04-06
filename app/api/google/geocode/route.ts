import { NextResponse } from "next/server";

const GOOGLE_GEOCODE_ENDPOINT = "https://maps.googleapis.com/maps/api/geocode/json";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.get("q");

  if (!query || !query.trim()) {
    return NextResponse.json({ error: "Missing query" }, { status: 400 });
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Missing Google Maps API key" }, { status: 500 });
  }

  const geocodeUrl = new URL(GOOGLE_GEOCODE_ENDPOINT);
  geocodeUrl.searchParams.set("address", query.trim());
  geocodeUrl.searchParams.set("key", apiKey);
  geocodeUrl.searchParams.set("region", "it");

  let response: Response;
  try {
    response = await fetch(geocodeUrl.toString(), {
      method: "GET",
      headers: { "Accept": "application/json" },
      cache: "no-store",
    });
  } catch (error) {
    console.error("[GoogleGeocode] Request failed", error);
    return NextResponse.json({ error: "Failed to contact geocoding service" }, { status: 502 });
  }

  if (!response.ok) {
    console.error("[GoogleGeocode] Non-200 response", response.status, response.statusText);
    return NextResponse.json({ error: "Geocoding request failed" }, { status: 502 });
  }

  const data: any = await response.json().catch(() => null);
  if (!data || data.status !== "OK" || !Array.isArray(data.results) || data.results.length === 0) {
    return NextResponse.json({ error: "No results" }, { status: 404 });
  }

  const first = data.results[0];
  const location = first?.geometry?.location;
  const formattedAddress = typeof first?.formatted_address === "string" ? first.formatted_address : undefined;

  if (!location || typeof location.lat !== "number" || typeof location.lng !== "number") {
    return NextResponse.json({ error: "Invalid geocoding response" }, { status: 502 });
  }

  return NextResponse.json({ lat: location.lat, lon: location.lng, address: formattedAddress ?? query.trim() });
}
