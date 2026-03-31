import "dotenv/config";
import { googlePlacesService } from "../lib/services/google-places.service";

function readArg(flag: string): string | null {
  const idx = process.argv.findIndex((a) => a === flag);
  if (idx === -1) return null;
  const value = process.argv[idx + 1];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

async function main() {
  const latRaw = readArg("--lat");
  const lonRaw = readArg("--lon");
  const radiusRaw = readArg("--radius");

  const lat = latRaw ? Number(latRaw) : Number.NaN;
  const lon = lonRaw ? Number(lonRaw) : Number.NaN;
  const radiusMeters = radiusRaw ? Number(radiusRaw) : 3000;

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    console.error("Usage: pnpm google:places -- --lat 43.708067 --lon 10.4062681 [--radius 3000]");
    process.exit(1);
  }

  if (!process.env.GOOGLE_PLACES_API_KEY) {
    console.error("Missing GOOGLE_PLACES_API_KEY in environment (.env)");
    process.exit(1);
  }

  const result = await googlePlacesService.getNearbyImportantPlaces({
    lat,
    lon,
    radiusMeters,
    limitPerCategory: 3,
  });

  console.log("\n--- RAW RESULT ---\n");
  console.log(JSON.stringify(result, null, 2));

  console.log("\n--- FORMATTED FOR PROMPT ---\n");
  console.log(googlePlacesService.formatNearbyPlacesForPrompt(result));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
