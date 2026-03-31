import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, Image, TrendingUp, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { mockHouses, eurFormatter } from "@/lib/mock-data";
import { motion, AnimatePresence } from "framer-motion";

export default function HousesList() {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return mockHouses;
    return mockHouses.filter(
      (h) =>
        h.title.toLowerCase().includes(q) ||
        h.indirizzo.toLowerCase().includes(q) ||
        h.userName.toLowerCase().includes(q)
    );
  }, [search]);

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Properties</h1>
          <p className="text-muted-foreground mt-1">{mockHouses.length} properties in your portfolio</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> New Property
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by name, address, or agent..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <Card className="py-16">
          <CardContent className="flex flex-col items-center text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted mb-4">
              <Search className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg">No properties found</h3>
            <p className="text-muted-foreground mt-1 max-w-sm">
              Try adjusting your search or add a new property.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {filtered.map((house, i) => (
              <motion.div
                key={house.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.05 }}
              >
                <Link to={`/houses/${house.id}`}>
                  <Card className="overflow-hidden hover:shadow-lg transition-all duration-300 group cursor-pointer h-full">
                    <div className="relative h-48 overflow-hidden bg-muted">
                      {house.photos[0] ? (
                        <img
                          src={house.photos[0].url}
                          alt={house.title}
                          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <Image className="h-10 w-10 text-muted-foreground/40" />
                        </div>
                      )}
                      {(house.totalMin || house.totalMax) && (
                        <div className="absolute bottom-3 left-3 rounded-lg bg-card/95 backdrop-blur-sm px-3 py-1.5 text-sm font-bold shadow-sm">
                          {house.totalMin && house.totalMax
                            ? eurFormatter.format((house.totalMin + house.totalMax) / 2)
                            : house.totalMin
                            ? eurFormatter.format(house.totalMin)
                            : "—"}
                        </div>
                      )}
                      {house.enhancedPhotos.length > 0 && (
                        <Badge className="absolute top-3 right-3 bg-primary/90 backdrop-blur-sm text-xs">
                          Enhanced
                        </Badge>
                      )}
                    </div>
                    <CardContent className="p-4 space-y-3">
                      <div>
                        <h3 className="font-semibold text-base truncate group-hover:text-primary transition-colors">
                          {house.title}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-0.5 truncate">
                          {house.indirizzo}
                        </p>
                      </div>

                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1">
                            <Image className="h-3.5 w-3.5" /> {house.photos.length}
                          </span>
                          <span className="flex items-center gap-1">
                            <TrendingUp className="h-3.5 w-3.5" /> {house.valuationHistory.length}
                          </span>
                        </div>
                        <span>
                          {new Date(house.updatedAt).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                          })}
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t">
                        <span className="text-xs text-muted-foreground">{house.userName}</span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
