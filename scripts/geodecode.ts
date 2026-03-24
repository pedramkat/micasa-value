import { HouseService } from "../lib/services/house.service";

async function main() {
  const service = new HouseService();
  const result = await service.getCoordinatesFromStreet("Via vespucci 50, Pisa");
  console.log(JSON.stringify(result, null, 2));
}

main().catch(console.error);