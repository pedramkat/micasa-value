"use client"

import { motion } from "framer-motion"
import { Activity, BarChart3, Clock, Percent, TrendingUp, Users } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import type { MarketMetrics } from "@/lib/market-data"
import { eurFormatter } from "@/lib/mock-data"

interface Props {
  metrics: MarketMetrics
}

export function MarketMetricsCards({ metrics }: Props) {
  const items = [
    {
      icon: TrendingUp,
      label: "Price / m²",
      value: metrics.pricePerSqm > 0 ? eurFormatter.format(metrics.pricePerSqm) : "—",
      sub: metrics.zone,
      accent: "text-primary bg-primary/10",
    },
    {
      icon: Clock,
      label: "Avg. Days on Market",
      value: `${metrics.avgDaysOnMarket}`,
      sub: metrics.avgDaysOnMarket < 40 ? "Fast market" : metrics.avgDaysOnMarket < 60 ? "Normal" : "Slow market",
      accent: "text-amber-600 bg-amber-50",
    },
    {
      icon: BarChart3,
      label: "ISTAT Delta",
      value: `+${metrics.istatDelta}%`,
      sub: "Market vs OMI",
      accent: "text-orange-600 bg-orange-50",
    },
    {
      icon: Activity,
      label: "Liquidity Index",
      value: `${metrics.liquidityIndex}/100`,
      sub: metrics.liquidityIndex >= 70 ? "High liquidity" : metrics.liquidityIndex >= 40 ? "Medium" : "Low liquidity",
      accent: "text-emerald-600 bg-emerald-50",
    },
    {
      icon: Users,
      label: "Demand / Supply",
      value: `${metrics.demandSupplyRatio.toFixed(2)}`,
      sub: metrics.demandSupplyRatio > 1.2 ? "Seller's market" : metrics.demandSupplyRatio < 0.9 ? "Buyer's market" : "Balanced",
      accent: "text-blue-600 bg-blue-50",
    },
    {
      icon: Percent,
      label: "Avg. Negotiation",
      value: `-${metrics.avgNegotiationDiscount}%`,
      sub: "From asking price",
      accent: "text-rose-600 bg-rose-50",
    },
  ]

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item, i) => (
        <motion.div key={item.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4 flex items-start gap-3">
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${item.accent}`}>
                <item.icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className="text-lg font-bold tracking-tight mt-0.5">{item.value}</p>
                <p className="text-xs text-muted-foreground">{item.sub}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  )
}
