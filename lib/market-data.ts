export type PriceHistoryPoint = {
  label: string
  marketPrice: number
  istatPrice: number
}

export type ZoneData = {
  id: string
  name: string
  marketMinPerSqm: number
  marketMaxPerSqm: number
  istatMinPerSqm: number
  istatMaxPerSqm: number
  transactions: number
  trend: number
}

export type MarketMetrics = {
  pricePerSqm: number
  avgDaysOnMarket: number
  istatDelta: number
  liquidityIndex: number
  demandSupplyRatio: number
  avgNegotiationDiscount: number
  yoyChange: number
  zone: string
}

function mulberry32(seed: number) {
  let t = seed
  return () => {
    t += 0x6d2b79f5
    let x = t
    x = Math.imul(x ^ (x >>> 15), x | 1)
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61)
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296
  }
}

function seedFromString(input: string): number {
  let h = 2166136261
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export function generatePriceHistory(avgPrice: number): PriceHistoryPoint[] {
  const seed = seedFromString(String(Math.round(avgPrice)))
  const rnd = mulberry32(seed)

  const now = new Date()
  const points: PriceHistoryPoint[] = []

  let market = avgPrice
  let istat = avgPrice * (0.92 + rnd() * 0.06)

  for (let i = 23; i >= 0; i--) {
    const d = new Date(now)
    d.setMonth(d.getMonth() - i)

    const label = d.toLocaleDateString("en-GB", { month: "short", year: "2-digit" })

    const drift = (rnd() - 0.48) * 0.02
    const shock = (rnd() - 0.5) * 0.015

    market = Math.max(50000, market * (1 + drift + shock))
    istat = Math.max(50000, istat * (1 + drift * 0.6 + shock * 0.3))

    points.push({
      label,
      marketPrice: Math.round(market),
      istatPrice: Math.round(istat),
    })
  }

  return points
}

export function getZonesForCity(indirizzo: string): ZoneData[] {
  const seed = seedFromString(indirizzo || "unknown")
  const rnd = mulberry32(seed)

  const base = 1800 + rnd() * 4200

  const names = ["Centro", "Semi-centrale", "Periferia", "Residenziale", "Commerciale", "Storico"]

  return names.slice(0, 5).map((name, i) => {
    const factor = 0.85 + i * 0.06 + (rnd() - 0.5) * 0.08
    const istatAvg = base * factor * (0.9 + rnd() * 0.08)
    const marketAvg = istatAvg * (1.03 + (rnd() - 0.5) * 0.12)

    const istatSpread = 0.06 + rnd() * 0.05
    const marketSpread = 0.08 + rnd() * 0.06

    return {
      id: `${seed}-${i}`,
      name,
      istatMinPerSqm: Math.round(istatAvg * (1 - istatSpread)),
      istatMaxPerSqm: Math.round(istatAvg * (1 + istatSpread)),
      marketMinPerSqm: Math.round(marketAvg * (1 - marketSpread)),
      marketMaxPerSqm: Math.round(marketAvg * (1 + marketSpread)),
      transactions: Math.round(40 + rnd() * 220),
      trend: Number(((rnd() - 0.45) * 10).toFixed(1)),
    }
  })
}

export function getMarketMetrics(houseId: string): MarketMetrics {
  const seed = seedFromString(houseId)
  const rnd = mulberry32(seed)

  const zones = getZonesForCity(houseId)
  const zone = zones[Math.floor(rnd() * zones.length)]?.name ?? zones[0]?.name ?? "Centro"

  const pricePerSqm = Math.round(1800 + rnd() * 4200)
  const avgDaysOnMarket = Math.round(25 + rnd() * 65)
  const liquidityIndex = Math.round(20 + rnd() * 75)
  const demandSupplyRatio = Number((0.7 + rnd() * 1.2).toFixed(2))
  const avgNegotiationDiscount = Math.round(2 + rnd() * 10)

  const istatDelta = Math.round(-4 + rnd() * 18)
  const yoyChange = Number(((-2 + rnd() * 10)).toFixed(1))

  return {
    pricePerSqm,
    avgDaysOnMarket,
    istatDelta,
    liquidityIndex,
    demandSupplyRatio,
    avgNegotiationDiscount,
    yoyChange,
    zone,
  }
}
