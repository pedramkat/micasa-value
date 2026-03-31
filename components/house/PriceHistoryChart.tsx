"use client"

import { TrendingUp } from "lucide-react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { PriceHistoryPoint } from "@/lib/market-data"
import { eurFormatter } from "@/lib/mock-data"

interface Props {
  data: PriceHistoryPoint[]
  yoyChange: number
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border bg-background/95 backdrop-blur-sm p-3 shadow-lg text-xs space-y-1.5">
      <p className="font-semibold text-foreground">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-mono font-medium">{eurFormatter.format(p.value)}</span>
        </div>
      ))}
      {payload.length === 2 && (
        <div className="pt-1 border-t text-muted-foreground">
          Delta:{" "}
          <span className="font-mono font-medium text-foreground">
            {eurFormatter.format(payload[0].value - payload[1].value)}
          </span>
          <span className="ml-1">({((1 - payload[1].value / payload[0].value) * 100).toFixed(1)}%)</span>
        </div>
      )}
    </div>
  )
}

export function PriceHistoryChart({ data, yoyChange }: Props) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Price Trend (24 months)
          </CardTitle>
          <Badge
            variant="secondary"
            className={`text-xs font-mono ${
              yoyChange >= 0 ? "text-emerald-700 bg-emerald-50" : "text-red-700 bg-red-50"
            }`}
          >
            {yoyChange >= 0 ? "+" : ""}
            {yoyChange}% YoY
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="marketGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="istatGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(25, 95%, 53%)" stopOpacity={0.1} />
                  <stop offset="95%" stopColor="hsl(25, 95%, 53%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
                interval={3}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => `€${(v / 1000).toFixed(0)}k`}
                width={55}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
              <Area
                type="monotone"
                dataKey="marketPrice"
                name="Market Price"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#marketGrad)"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2 }}
              />
              <Area
                type="monotone"
                dataKey="istatPrice"
                name="Agenzia Entrate (OMI)"
                stroke="hsl(25, 95%, 53%)"
                strokeWidth={2}
                strokeDasharray="6 3"
                fill="url(#istatGrad)"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
          Comparison between real market transaction prices and Osservatorio del Mercato Immobiliare (OMI) reference values from Agenzia delle Entrate.
        </p>
      </CardContent>
    </Card>
  )
}
