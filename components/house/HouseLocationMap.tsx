"use client"

import dynamic from "next/dynamic"

interface Props {
  lat: number
  lon: number
  omiPolygonId?: string | null
  omiPolygonGeoJson?: unknown | null
  adjacentOmiPolygons?: Array<{ id: string; geoJson: unknown; comprMin?: string | null; comprMax?: string | null }> | null
  showOmiPolygons?: boolean
  enableEditing?: boolean
  houseId?: string
  nearbyPlaces?: Array<{
    id: string
    name: string
    lat: number
    lon: number
    distanceMeters?: number | null
    category?: string | null
    address?: string | null
  }>
}

const HouseLocationMapInner = dynamic(
  () => import("@/components/house/HouseLocationMapInner").then((m) => m.HouseLocationMapInner),
  { ssr: false }
)

export function HouseLocationMap({
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
  const Inner: any = HouseLocationMapInner as any
  return (
    <Inner
      lat={lat}
      lon={lon}
      omiPolygonId={omiPolygonId}
      omiPolygonGeoJson={omiPolygonGeoJson}
      adjacentOmiPolygons={adjacentOmiPolygons}
      showOmiPolygons={showOmiPolygons}
      enableEditing={enableEditing}
      houseId={houseId}
      nearbyPlaces={nearbyPlaces}
    />
  )
}
