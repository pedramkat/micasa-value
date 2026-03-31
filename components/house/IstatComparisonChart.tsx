"use client"

import { BarChart3 } from "lucide-react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { ZoneData } from "@/lib/market-data"
import { eurFormatter } from "@/lib/mock-data"

interface Props {
  zones: ZoneData[]
  activeZone?: string
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border bg-background/95 backdrop-blur-sm p-3 shadow-lg text-xs space-y-1">
      <p className="font-semibold">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.fill || p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-mono font-medium">{eurFormatter.format(p.value)}/m²</span>
        </div>
      ))}
    </div>
  )
}

export function IstatComparisonChart({ zones, activeZone }: Props) {
  const data = zones.map((z) => ({
    name: z.name,
    omi: (z.istatMinPerSqm + z.istatMaxPerSqm) / 2,
    market: (z.marketMinPerSqm + z.marketMaxPerSqm) / 2,
    isActive: z.name === activeZone,
  }))

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          OMI vs Market by Zone
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
                interval={0}
                angle={-25}
                textAnchor="end"
                height={50}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => `€${(v / 1000).toFixed(1)}k`}
                width={55}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 4 }} />
              <Bar dataKey="omi" name="OMI (Agenzia Entrate)" radius={[4, 4, 0, 0]} barSize={18}>
                {data.map((d, i) => (
                  <Cell
                    key={i}
                    fill={d.isActive ? "hsl(25, 95%, 45%)" : "hsl(25, 95%, 53%)"}
                    fillOpacity={d.isActive ? 1 : 0.6}
                  />
                ))}
              </Bar>
              <Bar dataKey="market" name="Real Market" radius={[4, 4, 0, 0]} barSize={18}>
                {data.map((d, i) => (
                  <Cell key={i} fill="hsl(var(--primary))" fillOpacity={d.isActive ? 1 : 0.5} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
