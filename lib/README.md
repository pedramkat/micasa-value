# Service Layer Architecture

This project uses a service-based architecture for organizing business logic, similar to Laravel's model pattern but adapted for TypeScript/Prisma.

## Directory Structure

```
lib/
├── db.ts                      # Shared Prisma client instance
├── services/                  # Business logic services
│   └── house.service.ts       # House operations and calculations
├── types/                     # Type definitions
│   └── house.types.ts         # House-related types
└── openai.ts                  # OpenAI integration
```

## Usage Examples

### Creating a House

```typescript
import { houseService } from "@/lib/services/house.service"

const house = await houseService.create({
    title: "Beautiful Beach House",
    description: "3 bed, 2 bath oceanfront property",
    agencyId: "agency_123",
    agentId: "agent_456",
    ownerId: "owner_789",
    valuation: 500000,
})
```

### Adding Bot Texts

```typescript
await houseService.addBotText(house.id, {
    timestamp: new Date().toISOString(),
    userId: 96143098,
    message: "The house has a pool",
    type: "text",
})

await houseService.addBotText(house.id, {
    timestamp: new Date().toISOString(),
    userId: 96143098,
    message: "Large backyard with garden",
    type: "voice",
})
```

### Calculate Valuation

```typescript
const valuation = await houseService.calculateValuation(house.id)
await houseService.updateValuation(house.id, valuation)
```

### Search Houses

```typescript
const results = await houseService.search("beach")
```

## Adding New Services

When adding new models (e.g., Agency, Agent), follow this pattern:

1. **Create Prisma model** in `prisma/schema.prisma`
2. **Run migration**: `npx prisma migrate dev --name add_<model>_model`
3. **Create types**: `lib/types/<model>.types.ts`
4. **Create service**: `lib/services/<model>.service.ts`

Example for Agency:

```typescript
// lib/services/agency.service.ts
import { prisma } from "../db"

export class AgencyService {
    async create(data: CreateAgencyInput) { /* ... */ }
    async findById(id: string) { /* ... */ }
    // ... other methods
}

export const agencyService = new AgencyService()
```

## Best Practices

- **Keep services focused**: One service per model/domain
- **Use types**: Always define input/output types
- **Export singletons**: Export a single instance for convenience
- **Complex logic in services**: Keep controllers/API routes thin
- **Use Prisma client from `lib/db.ts`**: Never create new instances
