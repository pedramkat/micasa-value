"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import dynamic from "next/dynamic"
import type { FitBoundsOptions, LatLngBoundsExpression } from "leaflet"

import { ensureLeafletDefaultIcon } from "@/lib/leaflet-icon-fix"

export type MapHousePoint = {
  id: string
  title: string
  lat: number
  lon: number
}

const fallbackCenter: [number, number] = [41.9028, 12.4964]

const MapContainer = dynamic(() => import("react-leaflet").then((mod) => mod.MapContainer), { ssr: false })
const TileLayer = dynamic(() => import("react-leaflet").then((mod) => mod.TileLayer), { ssr: false })
const Marker = dynamic(() => import("react-leaflet").then((mod) => mod.Marker), { ssr: false })
const Popup = dynamic(() => import("react-leaflet").then((mod) => mod.Popup), { ssr: false })
const MarkerClusterGroup = dynamic(() => import("react-leaflet-cluster"), { ssr: false })
const FitMapBounds = dynamic<{ bounds: LatLngBoundsExpression; options?: FitBoundsOptions }>(
  () =>
    import("react-leaflet").then(({ useMap }) => {
      const FitComponent = ({ bounds, options }: { bounds: LatLngBoundsExpression; options?: FitBoundsOptions }) => {
        const map = useMap()

        useEffect(() => {
          if (!bounds || !map) return
          map.fitBounds(bounds, options)
        }, [bounds, map, options])

        return null
      }

      return { default: FitComponent }
    }),
  { ssr: false },
)

export function HousesClusterMap({ houses }: { readonly houses: MapHousePoint[] }) {
  const [iconsReady, setIconsReady] = useState(false)

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

  const center = useMemo(() => {
    if (!houses.length) return fallbackCenter
    const { lat, lon } = houses.reduce(
      (acc, house) => {
        acc.lat += house.lat
        acc.lon += house.lon
        return acc
      },
      { lat: 0, lon: 0 },
    )
    return [lat / houses.length, lon / houses.length] as [number, number]
  }, [houses])

  const bounds = useMemo<LatLngBoundsExpression | null>(() => {
    if (!houses.length) return null
    if (houses.length === 1) {
      const single = houses[0]
      const delta = 0.01
      return [
        [single.lat - delta, single.lon - delta],
        [single.lat + delta, single.lon + delta],
      ]
    }

    let minLat = Number.POSITIVE_INFINITY
    let maxLat = Number.NEGATIVE_INFINITY
    let minLon = Number.POSITIVE_INFINITY
    let maxLon = Number.NEGATIVE_INFINITY

    houses.forEach((house) => {
      if (house.lat < minLat) minLat = house.lat
      if (house.lat > maxLat) maxLat = house.lat
      if (house.lon < minLon) minLon = house.lon
      if (house.lon > maxLon) maxLon = house.lon
    })

    return [
      [minLat, minLon],
      [maxLat, maxLon],
    ]
  }, [houses])

  const boundsOptions = useMemo<FitBoundsOptions | undefined>(() => {
    if (!bounds) return undefined
    return {
      padding: [40, 40],
      maxZoom: 15,
    }
  }, [bounds])

  if (!iconsReady) {
    return <div className="h-full w-full rounded-2xl bg-muted animate-pulse" />
  }

  return (
    <MapContainer center={center} zoom={6} minZoom={4} className="h-full w-full" worldCopyJump>
      {bounds ? <FitMapBounds bounds={bounds} options={boundsOptions} /> : null}
      <TileLayer attribution="&copy; Google Maps" url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}" />

      <MarkerClusterGroup chunkedLoading showCoverageOnHover={false} spiderfyOnMaxZoom disableClusteringAtZoom={15}>
        {houses.map((house) => (
          <Marker key={house.id} position={[house.lat, house.lon]}>
            <Popup>
              <div className="space-y-1">
                <div className="text-sm font-semibold">{house.title || "Senza titolo"}</div>
                <Link
                  href={`/houses/${house.id}`}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  Vai alla scheda →
                </Link>
              </div>
            </Popup>
          </Marker>
        ))}
      </MarkerClusterGroup>
    </MapContainer>
  )
}
