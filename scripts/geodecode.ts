import { HouseService } from "../lib/services/house.service";

async function main() {
  const service = new HouseService();
  const result = await service.getCoordinatesFromStreet("via del castagno 12, Fauglia");
  console.log(JSON.stringify(result, null, 2));
}

main().catch(console.error);