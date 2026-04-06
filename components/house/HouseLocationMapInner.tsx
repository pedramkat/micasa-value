"use client"

import { createPortal } from "react-dom"
import { useEffect, useMemo, useState, useCallback, useRef } from "react"
import { MapContainer, TileLayer, Marker, Popup, GeoJSON, useMapEvents, useMap } from "react-leaflet"
import L, { Control, ControlPosition } from "leaflet"

import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { Crosshair } from "lucide-react"

import { toast } from "@/components/ui/sonner"

import { ensureLeafletDefaultIcon } from "@/lib/leaflet-icon-fix"
import type { NearbyPlacePin } from "@/components/house/house-location.types"

interface Props {
  lat: number
  lon: number
  omiPolygonId?: string | null
  omiPolygonGeoJson?: unknown | null
  adjacentOmiPolygons?: Array<{ id: string; geoJson: unknown; comprMin?: string | null; comprMax?: string | null }> | null
  showOmiPolygons?: boolean
  enableEditing?: boolean
  houseId?: string
  nearbyPlaces?: NearbyPlacePin[]
}

function MapClickHandler({ onMapClick }: { onMapClick: (coords: { lat: number; lng: number }) => void }) {
  useMapEvents({
    click(event) {
      onMapClick(event.latlng)
    },
  })
  return null
}

function LeafletControl({ children, position = "topright" }: { children: React.ReactNode; position?: ControlPosition }) {
  const map = useMap()
  const containerRef = useRef<HTMLDivElement | null>(null)
  const controlRef = useRef<Control | null>(null)

  useEffect(() => {
    if (!map) return
    const control = new Control({ position })
    control.onAdd = () => {
      const div = L.DomUtil.create("div", "leaflet-control leaflet-search-control")
      L.DomEvent.disableClickPropagation(div)
      L.DomEvent.disableScrollPropagation(div)
      containerRef.current = div
      return div
    }
    control.addTo(map)
    controlRef.current = control

    return () => {
      control.remove()
      containerRef.current = null
      controlRef.current = null
    }
  }, [map, position])

  return containerRef.current ? createPortal(children, containerRef.current) : null
}

function CenterMapControl({ target, position = "bottomright" }: { target: [number, number]; position?: ControlPosition }) {
  const map = useMap()
  const handleCenter = useCallback(() => {
    map.setView(target, map.getZoom(), { animate: true })
  }, [map, target])

  return (
    <LeafletControl position={position}>
      <button
        type="button"
        onClick={handleCenter}
        className="rounded-full bg-white/95 p-2 text-primary shadow-lg hover:bg-white"
      >
        <Crosshair className="h-4 w-4" />
      </button>
    </LeafletControl>
  )
}

export function HouseLocationMapInner({
  lat,
  lon,
  omiPolygonId,
  omiPolygonGeoJson,
  adjacentOmiPolygons,
  showOmiPolygons = true,
  enableEditing = false,
  houseId,
  nearbyPlaces,
}: Props) {
  const [iconsReady, setIconsReady] = useState(false)
  const [position, setPosition] = useState<[number, number]>([lat, lon])
  const [isSavingPosition, setIsSavingPosition] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [isSearching, setIsSearching] = useState(false)

  useEffect(() => {
    setPosition([lat, lon])
  }, [lat, lon])

  const canEdit = enableEditing && typeof houseId === "string" && houseId.trim().length > 0

  const adjacentPalette = useMemo(() => {
    return [
      { stroke: "#16a34a", fill: "#22c55e" },
      { stroke: "#0ea5e9", fill: "#38bdf8" },
      { stroke: "#a855f7", fill: "#c084fc" },
      { stroke: "#f97316", fill: "#fb923c" },
      { stroke: "#ef4444", fill: "#f87171" },
      { stroke: "#eab308", fill: "#facc15" },
    ]
  }, [])

  const adjacentStyleById = useMemo(() => {
    const hashString = (s: string): number => {
      let h = 0
      for (let i = 0; i < s.length; i++) {
        h = (h * 31 + s.charCodeAt(i)) >>> 0
      }
      return h
    }

    return (id: string) => {
      const idx = adjacentPalette.length > 0 ? hashString(id) % adjacentPalette.length : 0
      return adjacentPalette[idx] ?? { stroke: "#334155", fill: "#94a3b8" }
    }
  }, [adjacentPalette])

  const polygonData = useMemo(() => {
    if (!omiPolygonGeoJson) return null
    return omiPolygonGeoJson as any
  }, [omiPolygonGeoJson])

  const adjacent = useMemo(() => {
    if (!Array.isArray(adjacentOmiPolygons) || adjacentOmiPolygons.length === 0) return []
    return adjacentOmiPolygons.filter((p) => p && typeof p.id === "string" && p.geoJson)
  }, [adjacentOmiPolygons])

  const poiIcon = useMemo(() => {
    if (!Array.isArray(nearbyPlaces) || nearbyPlaces.length === 0) return undefined

    const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 25 41'>
      <path d='M12.5 0C5.6 0 0 5.6 0 12.5c0 10.2 12.5 28.5 12.5 28.5S25 22.7 25 12.5C25 5.6 19.4 0 12.5 0z' fill='#f97316'/>
      <circle cx='12.5' cy='12.5' r='5.5' fill='#fff'/>
    </svg>`
    const svgUrl = `data:image/svg+xml,${encodeURIComponent(svg)}`
    const shadowUrl = new URL("leaflet/dist/images/marker-shadow.png", import.meta.url).toString()

    return L.icon({
      iconUrl: svgUrl,
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [0, -32],
      shadowUrl,
      shadowSize: [41, 41],
      shadowAnchor: [13, 41],
    })
  }, [nearbyPlaces])

  const nearbyPins = useMemo(() => {
    if (!Array.isArray(nearbyPlaces)) return []
    return nearbyPlaces.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lon))
  }, [nearbyPlaces])

  const formatDistance = useCallback((meters?: number | null) => {
    if (typeof meters !== "number" || !Number.isFinite(meters)) return ""
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(2)} km`
    }
    return `${Math.round(meters)} m`
  }, [])

  const persistPosition = useCallback(
    (nextPosition: [number, number]) => {
      if (!canEdit || !houseId) return
      const previousPosition = position

      setPosition(nextPosition)
      setIsSavingPosition(true)

      void (async () => {
        try {
          const res = await fetch(`/api/houses/${houseId}/coordinate`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lat: nextPosition[0], lon: nextPosition[1] }),
          })

          if (!res.ok) {
            const data = await res.json().catch(() => null)
            throw new Error(data?.error ?? "Aggiornamento posizione fallito")
          }

          toast.success("Posizione aggiornata")
        } catch (error: any) {
          setPosition(previousPosition)
          toast.error("Impossibile salvare la posizione", { description: error?.message })
        } finally {
          setIsSavingPosition(false)
        }
      })()
    },
    [canEdit, houseId, position],
  )

  const handleMapClick = useCallback(
    (coords: { lat: number; lng: number }) => {
      if (!canEdit) return
      persistPosition([coords.lat, coords.lng])
    },
    [canEdit, persistPosition],
  )

  const handleSearchSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      if (!canEdit || !searchQuery.trim()) return

      setIsSearching(true)
      try {
        const res = await fetch(`/api/google/geocode?q=${encodeURIComponent(searchQuery.trim())}`)

        if (!res.ok) {
          const data = await res.json().catch(() => null)
          throw new Error(data?.error ?? `Geocoding fallito (${res.status})`)
        }

        const payload = (await res.json()) as { lat?: number; lon?: number; address?: string }
        const nextLat = typeof payload.lat === "number" ? payload.lat : NaN
        const nextLon = typeof payload.lon === "number" ? payload.lon : NaN
        if (!Number.isFinite(nextLat) || !Number.isFinite(nextLon)) {
          throw new Error("Nessun risultato valido trovato")
        }

        persistPosition([nextLat, nextLon])
        toast.success("Posizione aggiornata dall'indirizzo")
      } catch (error: any) {
        toast.error("Impossibile ricavare la posizione", { description: error?.message })
      } finally {
        setIsSearching(false)
      }
    },
    [canEdit, persistPosition, searchQuery],
  )

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      await ensureLeafletDefaultIcon()
      if (!cancelled) setIconsReady(true)
    })()

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="relative h-full w-full">
      <MapContainer center={position} zoom={17} scrollWheelZoom={false} className="h-full w-full">
        {canEdit ? (
          <LeafletControl position="topright">
            <div className="flex flex-col gap-2 rounded-xl bg-white/95 px-3 py-2 text-[11px] font-medium text-muted-foreground shadow-lg min-w-[220px]">
              <form onSubmit={handleSearchSubmit} className="flex gap-2">
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cerca indirizzo..."
                  className="h-7 flex-1 rounded-full border border-input bg-background px-2 text-[11px] focus-visible:ring-1"
                />
                <button
                  type="submit"
                  disabled={isSearching}
                  className={cn(
                    "rounded-full px-3 py-1 text-[11px] font-semibold text-white transition-colors",
                    isSearching ? "bg-muted" : "bg-primary hover:bg-primary/90",
                  )}
                >
                  {isSearching ? "..." : "Cerca"}
                </button>
              </form>
              <div className="text-[11px] font-semibold text-muted-foreground">
                {isSavingPosition ? "Salvataggio..." : "Clicca sulla mappa per aggiornare la posizione"}
              </div>
            </div>
          </LeafletControl>
        ) : null}
        <CenterMapControl target={position} position="bottomright" />
        {canEdit ? <MapClickHandler onMapClick={handleMapClick} /> : null}
        <TileLayer
          attribution='&copy; Google Maps contributors'
          url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
        />

      {showOmiPolygons && polygonData && (
        <GeoJSON
          data={polygonData}
          pathOptions={{ color: "#2563eb", weight: 2, fillColor: "#2563eb", fillOpacity: 0.12 }}
        >
          {omiPolygonId ? <Popup>OMI Polygon: {omiPolygonId}</Popup> : null}
        </GeoJSON>
      )}

      {showOmiPolygons && adjacent.map((p) => (
        (() => {
          const c = adjacentStyleById(p.id)
          return (
        <GeoJSON
          key={p.id}
          data={p.geoJson as any}
          pathOptions={{ color: c.stroke, weight: 2, fillColor: c.fill, fillOpacity: 0.35 }}
        >
          <Popup>
            <div className="space-y-1">
              <div className="font-medium">Adjacent OMI Polygon</div>
              <div className="text-xs">{p.id}</div>
              <div className="text-xs">
                Abitazioni civili:
                <br />
                min: {p.comprMin ?? "n/a"}
                <br />
                max: {p.comprMax ?? "n/a"}
              </div>
            </div>
          </Popup>
        </GeoJSON>
          )
        })()
      ))}

        {iconsReady && (
          <Marker position={position}>
            <Popup>{canEdit ? "Posizione casa (clicca sulla mappa per aggiornare)" : "Posizione della casa"}</Popup>
          </Marker>
        )}

        {poiIcon &&
          nearbyPins.map((place) => (
            <Marker key={place.id} position={[place.lat, place.lon]} icon={poiIcon}>
            <Popup>
              <div className="space-y-1">
                <div className="font-semibold text-sm">{place.name}</div>
                {place.address ? <div className="text-xs text-muted-foreground">{place.address}</div> : null}
                {place.distanceMeters ? (
                  <div className="text-xs font-medium">{formatDistance(place.distanceMeters)}</div>
                ) : null}
              </div>
            </Popup>
            </Marker>
          ))}
      </MapContainer>
    </div>
  )
}
