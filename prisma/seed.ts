import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient, Role } from "../prisma/generated/client";

import { spawnSync } from "node:child_process";

import bcrypt from 'bcryptjs';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Create 5 users with hashed passwords
  // Create or update 5 users with hashed passwords
  const users = await Promise.all([
    prisma.user.upsert({
      where: { email: 'alice@example.com' },
      update: { role: Role.ADMIN },
      create: {
        email: 'alice@example.com',
        name: 'Alice',
        password: await bcrypt.hash('password123', 10),
        role: Role.ADMIN,
      },
    }),
    prisma.user.upsert({
      where: { email: 'bob@example.com' },
      update: { role: Role.MANAGER },
      create: {
        email: 'bob@example.com',
        name: 'Bob',
        password: await bcrypt.hash('password123', 10),
        role: Role.MANAGER,
      },
    }),
    prisma.user.upsert({
      where: { email: 'charlie@example.com' },
      update: { role: Role.AGENT },
      create: {
        email: 'charlie@example.com',
        name: 'Charlie',
        password: await bcrypt.hash('password123', 10),
        role: Role.AGENT,
      },
    }),
    prisma.user.upsert({
      where: { email: 'diana@example.com' },
      update: { role: Role.AGENT },
      create: {
        email: 'diana@example.com',
        name: 'Diana',
        password: await bcrypt.hash('password123', 10),
        role: Role.AGENT,
      },
    }),
    prisma.user.upsert({
      where: { email: 'edward@example.com' },
      update: { role: Role.AGENT },
      create: {
        email: 'edward@example.com',
        name: 'Edward',
        password: await bcrypt.hash('password123', 10),
        role: Role.AGENT,
      },
    }),
  ]);

  const configurationsToSeed = [
    { title: "vista mare", fixValue: 105, houseValuation: true },
    { title: "con ascensore", fixValue: 102, houseValuation: true },
    { title: "senza ascensore", fixValue: 95, houseValuation: true },
    { title: "giardino", fixValue: 101, houseValuation: true },
    { title: "buona condizione", fixValue: 102, houseValuation: true },
    { title: "ottima condizione", fixValue: 104, houseValuation: true },
    { title: "da ristrutturare", fixValue: 90, houseValuation: true },
    { title: "parcheggio", fixValue: 102, houseValuation: true },
    { title: "terrazza", fixValue: 103, houseValuation: true },
    { title: "balcone", fixValue: 103, houseValuation: true },
    { title: "ben servito", fixValue: 101, houseValuation: true },
    { title: "classe energetica alta", fixValue: 105, houseValuation: true },
    { title: "piano terra", fixValue: 105, houseValuation: true },
  ] as const;

  for (const cfg of configurationsToSeed) {
    const existing = await prisma.configuration.findFirst({ where: { title: cfg.title } })

    if (existing) {
      await prisma.configuration.update({
        where: { id: existing.id },
        data: {
          fixValue: new Prisma.Decimal(cfg.fixValue),
          houseValuation: cfg.houseValuation,
        },
      })
      continue
    }

    await prisma.configuration.create({
      data: {
        title: cfg.title,
        fixValue: new Prisma.Decimal(cfg.fixValue),
        houseValuation: cfg.houseValuation,
      },
    })
  }

  const houseParametersProperties: Prisma.InputJsonValue = {
    "Stato": "string",
    "Superficie": "int",
    "Supperficie commerciale": "int",
    "Supperficie balconi": "int",
    "Locali/vani": "int",
    "Piano": "string",
    "Piani totali": "int",
    "Ingresso indipendente": "bool",
    "Ingresso tradizionale": "bool",
    "Numero di balconi": "int",
    "Camere totali": "int",
    "Camere matrimoniali": "int",
    "Camere doppie": "int",
    "Bagni": "int",
    "Arredato": "bool",
    "Cucina": "string",
    "Soggiorno": "string",
    "Sala": "string",
    "Sala pranzo": "string",
    "Studio": "bool",
    "Allarme": "bool",
    "Fotovoltaico": "bool",
    "Soffitta": "bool",
    "Superficie soffitta": "int",
    "Riscaldamento": "bool",
    "Climatizzatore": "bool",
    "Posti auto": "int",
    "Posti auto scoperti": "int",
    "Giardino": "string",
    "Superficie giardino": "int",
    "Resede": "string",
    "Superficie resede": "int",
    "Cantina": "string",
    "Superficie cantina": "int",
    "Terrazza": "string",
    "Superficie terrazza": "int",
    "Camino": "bool",
    "Porta blindata": "bool",
    "Immobile di prestigio": "bool",
    "Classe energetica": "string",
    "Indirizzo": "string",
  }

  const existingHouseParameters = await prisma.configuration.findFirst({
    where: { title: "house_parameters" },
  })

  if (existingHouseParameters) {
    await prisma.configuration.update({
      where: { id: existingHouseParameters.id },
      data: {
        properties: houseParametersProperties,
      },
    })
  } else {
    await prisma.configuration.create({
      data: {
        title: "house_parameters",
        properties: houseParametersProperties,
      },
    })
  }

  const runOmiImport = (scriptPath: string) => {
    const res = spawnSync("npx", ["tsx", scriptPath], {
      stdio: "inherit",
      env: process.env,
    })

    if (res.status !== 0) {
      throw new Error(`OMI import failed for ${scriptPath} (exit code: ${res.status})`)
    }
  }

  runOmiImport("scripts/import-omi-market-values.ts")
  runOmiImport("scripts/import-omi-zones.ts")
  runOmiImport("scripts/import-omi-polygons.ts")

  console.log('Seeding completed.');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
