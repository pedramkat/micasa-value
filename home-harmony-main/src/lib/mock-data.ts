export interface HousePhoto {
  id: string;
  path: string;
  url: string;
  createdAt: string;
  source?: "telegram" | "upload" | "openai";
}

export interface ValuationSnapshot {
  id: string;
  timestamp: string;
  min: number;
  max: number;
  avg: number;
  hasPdf: boolean;
  configurations: { title: string; fixValue: string | number | null }[];
  adjustments: { title: string; fixValue: string | number }[];
  baseEurPerSqm: { comprMin: number; comprMax: number };
  superficieCommerciale: number;
}

export interface House {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  userName: string;
  indirizzo: string;
  coordinate: { lat: number; lon: number } | null;
  totalMin: number | null;
  totalMax: number | null;
  photos: HousePhoto[];
  enhancedPhotos: HousePhoto[];
  houseParameters: Record<string, unknown>;
  configurations: { title: string; fixValue: string | number | null; found: boolean }[];
  valuationHistory: ValuationSnapshot[];
  aiNarrative?: string;
}

const PHOTO_URLS = [
  "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&h=400&fit=crop",
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&h=400&fit=crop",
  "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=600&h=400&fit=crop",
  "https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?w=600&h=400&fit=crop",
  "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=600&h=400&fit=crop",
  "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=600&h=400&fit=crop",
  "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=600&h=400&fit=crop",
  "https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?w=600&h=400&fit=crop",
];

const ENHANCED_URLS = [
  "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&h=400&fit=crop&sat=50&contrast=10",
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&h=400&fit=crop&sat=50&contrast=10",
  "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=600&h=400&fit=crop&sat=50&contrast=10",
];

function makePhotos(count: number, enhanced = false): HousePhoto[] {
  const urls = enhanced ? ENHANCED_URLS : PHOTO_URLS;
  return Array.from({ length: Math.min(count, urls.length) }, (_, i) => ({
    id: `${enhanced ? "enh" : "photo"}-${i}`,
    path: `storage/${enhanced ? "enhanced_media" : "media"}/house/img_${i}.jpg`,
    url: urls[i],
    createdAt: new Date(Date.now() - i * 86400000).toISOString(),
    source: (enhanced ? "openai" : i % 2 === 0 ? "telegram" : "upload") as HousePhoto["source"],
  }));
}

export const mockHouses: House[] = [
  {
    id: "house-1",
    title: "Villa Bella Vista",
    description: "Elegante villa con vista panoramica sulle colline toscane. Ampio giardino e piscina.",
    createdAt: "2026-03-15T10:30:00Z",
    updatedAt: "2026-03-27T14:20:00Z",
    userName: "Marco Rossi",
    indirizzo: "Via Roma 42, Firenze, Italia",
    coordinate: { lat: 43.7696, lon: 11.2558 },
    totalMin: 520000,
    totalMax: 680000,
    photos: makePhotos(6),
    enhancedPhotos: makePhotos(3, true),
    houseParameters: {
      Indirizzo: "Via Roma 42, Firenze",
      "Superficie commerciale": "145 mq",
      Piano: "2",
      Ascensore: "Sì",
      "Stato conservazione": "Buono",
      Riscaldamento: "Autonomo",
      "Classe energetica": "C",
    },
    configurations: [
      { title: "Stato locativo", fixValue: 1.0, found: true },
      { title: "Livello piano", fixValue: 0.95, found: true },
      { title: "Stato conservativo", fixValue: 1.05, found: true },
    ],
    valuationHistory: [
      {
        id: "val-1a",
        timestamp: "2026-03-27T14:20:00Z",
        min: 520000,
        max: 680000,
        avg: 600000,
        hasPdf: true,
        configurations: [
          { title: "Stato locativo", fixValue: 1.0 },
          { title: "Livello piano", fixValue: 0.95 },
        ],
        adjustments: [
          { title: "Ristrutturazione recente", fixValue: "+5%" },
          { title: "Vista panoramica", fixValue: "+3%" },
        ],
        baseEurPerSqm: { comprMin: 3200, comprMax: 4200 },
        superficieCommerciale: 145,
      },
      {
        id: "val-1b",
        timestamp: "2026-03-20T09:15:00Z",
        min: 500000,
        max: 650000,
        avg: 575000,
        hasPdf: false,
        configurations: [
          { title: "Stato locativo", fixValue: 1.0 },
        ],
        adjustments: [],
        baseEurPerSqm: { comprMin: 3100, comprMax: 4000 },
        superficieCommerciale: 145,
      },
    ],
    aiNarrative: "La proprietà si trova in una posizione privilegiata nel centro storico di Firenze, con una vista panoramica sulle colline circostanti. L'immobile presenta caratteristiche di pregio, tra cui ampi spazi, finiture di qualità e un giardino privato con piscina.",
  },
  {
    id: "house-2",
    title: "Appartamento Centro Storico",
    description: "Luminoso trilocale nel cuore di Milano, recentemente ristrutturato con finiture di pregio.",
    createdAt: "2026-03-10T08:00:00Z",
    updatedAt: "2026-03-26T11:45:00Z",
    userName: "Giulia Bianchi",
    indirizzo: "Corso Buenos Aires 15, Milano, Italia",
    coordinate: { lat: 45.4773, lon: 9.2057 },
    totalMin: 380000,
    totalMax: 450000,
    photos: makePhotos(4),
    enhancedPhotos: makePhotos(2, true),
    houseParameters: {
      Indirizzo: "Corso Buenos Aires 15, Milano",
      "Superficie commerciale": "95 mq",
      Piano: "4",
      Ascensore: "Sì",
      "Stato conservazione": "Ottimo",
    },
    configurations: [
      { title: "Stato locativo", fixValue: 1.0, found: true },
      { title: "Livello piano", fixValue: 1.02, found: true },
    ],
    valuationHistory: [
      {
        id: "val-2a",
        timestamp: "2026-03-26T11:45:00Z",
        min: 380000,
        max: 450000,
        avg: 415000,
        hasPdf: true,
        configurations: [{ title: "Stato locativo", fixValue: 1.0 }],
        adjustments: [{ title: "Ristrutturazione recente", fixValue: "+8%" }],
        baseEurPerSqm: { comprMin: 3800, comprMax: 4500 },
        superficieCommerciale: 95,
      },
    ],
  },
  {
    id: "house-3",
    title: "Casale Rustico Toscano",
    description: "Antico casale in pietra immerso nelle colline del Chianti, con uliveto e vigneto.",
    createdAt: "2026-02-20T15:00:00Z",
    updatedAt: "2026-03-25T09:30:00Z",
    userName: "Marco Rossi",
    indirizzo: "Strada del Chianti 8, Greve in Chianti, Italia",
    coordinate: { lat: 43.5843, lon: 11.3189 },
    totalMin: 750000,
    totalMax: 950000,
    photos: makePhotos(8),
    enhancedPhotos: makePhotos(3, true),
    houseParameters: {
      Indirizzo: "Strada del Chianti 8, Greve in Chianti",
      "Superficie commerciale": "280 mq",
      Piano: "1-2",
      Terreno: "5000 mq",
    },
    configurations: [
      { title: "Stato locativo", fixValue: 1.0, found: true },
      { title: "Tipologia immobile", fixValue: 0.9, found: true },
    ],
    valuationHistory: [],
  },
  {
    id: "house-4",
    title: "Attico Vista Mare",
    description: "Spettacolare attico con terrazza panoramica e vista mare a 180 gradi.",
    createdAt: "2026-03-01T12:00:00Z",
    updatedAt: "2026-03-24T16:00:00Z",
    userName: "Giulia Bianchi",
    indirizzo: "Lungomare Cristoforo Colombo 120, Genova, Italia",
    coordinate: { lat: 44.4056, lon: 8.9463 },
    totalMin: null,
    totalMax: null,
    photos: makePhotos(3),
    enhancedPhotos: [],
    houseParameters: {
      Indirizzo: "Lungomare C. Colombo 120, Genova",
      "Superficie commerciale": "120 mq",
    },
    configurations: [],
    valuationHistory: [],
  },
  {
    id: "house-5",
    title: "Loft Industriale",
    description: "Ex spazio industriale convertito in un loft moderno con soffitti alti e grandi finestre.",
    createdAt: "2026-03-18T09:00:00Z",
    updatedAt: "2026-03-23T10:30:00Z",
    userName: "Marco Rossi",
    indirizzo: "Via Tortona 33, Milano, Italia",
    coordinate: { lat: 45.4510, lon: 9.1645 },
    totalMin: 420000,
    totalMax: 510000,
    photos: makePhotos(5),
    enhancedPhotos: makePhotos(2, true),
    houseParameters: {
      Indirizzo: "Via Tortona 33, Milano",
      "Superficie commerciale": "110 mq",
      Piano: "1",
      Ascensore: "No",
    },
    configurations: [
      { title: "Stato locativo", fixValue: 1.0, found: true },
    ],
    valuationHistory: [
      {
        id: "val-5a",
        timestamp: "2026-03-23T10:30:00Z",
        min: 420000,
        max: 510000,
        avg: 465000,
        hasPdf: false,
        configurations: [{ title: "Stato locativo", fixValue: 1.0 }],
        adjustments: [{ title: "Loft premium", fixValue: "+10%" }],
        baseEurPerSqm: { comprMin: 3500, comprMax: 4300 },
        superficieCommerciale: 110,
      },
    ],
  },
];

export function getHouseById(id: string): House | undefined {
  return mockHouses.find((h) => h.id === id);
}

export const eurFormatter = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});
