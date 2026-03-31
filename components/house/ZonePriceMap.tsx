"use client"

import { MapPin, TrendingUp, ArrowUpRight } from "lucide-react"
import { motion } from "framer-motion"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { ZoneData } from "@/lib/market-data"
import { eurFormatter } from "@/lib/mock-data"

interface Props {
  zones: ZoneData[]
  activeZone?: string
  coordinate: { lat: number; lon: number } | null
}

function getPriceColor(avgPrice: number, allAvgs: number[]): string {
  const sorted = [...allAvgs].sort((a, b) => a - b)
  const rank = sorted.indexOf(avgPrice) / (sorted.length - 1)
  if (rank >= 0.75) return "bg-rose-500"
  if (rank >= 0.5) return "bg-orange-400"
  if (rank >= 0.25) return "bg-amber-400"
  return "bg-emerald-500"
}

function getPriceBg(avgPrice: number, allAvgs: number[]): string {
  const sorted = [...allAvgs].sort((a, b) => a - b)
  const rank = sorted.indexOf(avgPrice) / (sorted.length - 1)
  if (rank >= 0.75) return "border-rose-200 bg-rose-50/50"
  if (rank >= 0.5) return "border-orange-200 bg-orange-50/50"
  if (rank >= 0.25) return "border-amber-200 bg-amber-50/50"
  return "border-emerald-200 bg-emerald-50/50"
}

export function ZonePriceMap({ zones, activeZone, coordinate }: Props) {
  const allAvgs = zones.map((z) => (z.marketMinPerSqm + z.marketMaxPerSqm) / 2)

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" />
          Zone Prices — OMI vs Market
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {coordinate && (
          <div className="relative overflow-hidden rounded-xl bg-muted h-52">
            <iframe
              className="w-full h-full border-0"
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${coordinate.lon - 0.03}%2C${coordinate.lat - 0.015}%2C${coordinate.lon + 0.03}%2C${coordinate.lat + 0.015}&layer=mapnik&marker=${coordinate.lat}%2C${coordinate.lon}`}
              loading="lazy"
            />
            <div className="absolute bottom-2 right-2 flex gap-1">
              {[
                { color: "bg-emerald-500", label: "€" },
                { color: "bg-amber-400", label: "€€" },
                { color: "bg-orange-400", label: "€€€" },
                { color: "bg-rose-500", label: "€€€€" },
              ].map((l) => (
                <span
                  key={l.label}
                  className={`${l.color} text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm`}
                >
                  {l.label}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2">
          {zones.map((zone, i) => {
            const avg = (zone.marketMinPerSqm + zone.marketMaxPerSqm) / 2
            const istatAvg = (zone.istatMinPerSqm + zone.istatMaxPerSqm) / 2
            const delta = (((avg - istatAvg) / istatAvg) * 100).toFixed(1)
            const isActive = zone.name === activeZone

            return (
              <motion.div
                key={zone.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className={`rounded-xl border p-3.5 transition-all ${
                  isActive
                    ? "ring-2 ring-primary/30 border-primary/40 bg-primary/[0.03]"
                    : getPriceBg(avg, allAvgs)
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={`h-3 w-3 rounded-full shrink-0 ${getPriceColor(avg, allAvgs)}`} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold truncate">{zone.name}</span>
                        {isActive && (
                          <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                            This property
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{zone.transactions} transactions / 12mo</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">OMI</p>
                        <p className="text-xs font-mono">
                          {eurFormatter.format(zone.istatMinPerSqm)}–{eurFormatter.format(zone.istatMaxPerSqm)}
                        </p>
                      </div>
                      <ArrowUpRight className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                      <div>
                        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Market</p>
                        <p className="text-xs font-mono font-semibold">
                          {eurFormatter.format(zone.marketMinPerSqm)}–{eurFormatter.format(zone.marketMaxPerSqm)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-1 mt-1">
                      <TrendingUp className={`h-3 w-3 ${zone.trend >= 0 ? "text-emerald-600" : "text-red-500"}`} />
                      <span
                        className={`text-[10px] font-mono font-semibold ${
                          zone.trend >= 0 ? "text-emerald-600" : "text-red-500"
                        }`}
                      >
                        {zone.trend >= 0 ? "+" : ""}
                        {zone.trend}%
                      </span>
                      <span className="text-[10px] text-muted-foreground ml-0.5">· +{delta}% vs OMI</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
