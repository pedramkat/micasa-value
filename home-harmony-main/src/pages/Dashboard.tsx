import { Link } from "react-router-dom";
import { Building2, TrendingUp, Image, FileText, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { mockHouses, eurFormatter } from "@/lib/mock-data";
import { motion } from "framer-motion";

const stats = [
  {
    label: "Total Properties",
    value: mockHouses.length,
    icon: Building2,
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    label: "Valuations Done",
    value: mockHouses.reduce((s, h) => s + h.valuationHistory.length, 0),
    icon: TrendingUp,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
  },
  {
    label: "Total Photos",
    value: mockHouses.reduce((s, h) => s + h.photos.length, 0),
    icon: Image,
    color: "text-amber-600",
    bg: "bg-amber-50",
  },
  {
    label: "PDFs Generated",
    value: mockHouses.reduce(
      (s, h) => s + h.valuationHistory.filter((v) => v.hasPdf).length,
      0
    ),
    icon: FileText,
    color: "text-violet-600",
    bg: "bg-violet-50",
  },
];

export default function Dashboard() {
  const recentHouses = [...mockHouses]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 4);

  return (
    <div className="p-4 lg:p-8 space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Overview of your property portfolio</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="text-3xl font-bold mt-1">{stat.value}</p>
                  </div>
                  <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${stat.bg}`}>
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Recent Properties */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Recent Properties</h2>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/houses">
              View all <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {recentHouses.map((house, i) => (
            <motion.div
              key={house.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + i * 0.1 }}
            >
              <Link to={`/houses/${house.id}`}>
                <Card className="overflow-hidden hover:shadow-md transition-all group cursor-pointer">
                  <div className="relative h-40 overflow-hidden">
                    <img
                      src={house.photos[0]?.url}
                      alt={house.title}
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    {(house.totalMin || house.totalMax) && (
                      <div className="absolute bottom-3 left-3 rounded-lg bg-card/90 backdrop-blur-sm px-3 py-1.5 text-sm font-semibold">
                        {house.totalMin && house.totalMax
                          ? eurFormatter.format((house.totalMin + house.totalMax) / 2)
                          : "—"}
                      </div>
                    )}
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-semibold truncate">{house.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1 truncate">{house.indirizzo}</p>
                    <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Image className="h-3.5 w-3.5" /> {house.photos.length}
                      </span>
                      <span className="flex items-center gap-1">
                        <TrendingUp className="h-3.5 w-3.5" /> {house.valuationHistory.length}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
