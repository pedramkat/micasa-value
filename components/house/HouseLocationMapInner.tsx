"use client"

import { useEffect, useState } from "react"
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet"

import { ensureLeafletDefaultIcon } from "@/lib/leaflet-icon-fix"

interface Props {
  lat: number
  lon: number
}

export function HouseLocationMapInner({ lat, lon }: Props) {
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

  return (
    <MapContainer center={[lat, lon]} zoom={17} scrollWheelZoom={false} className="h-full w-full">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {iconsReady && (
        <Marker position={[lat, lon]}>
          <Popup>
            {lat.toFixed(6)}, {lon.toFixed(6)}
          </Popup>
        </Marker>
      )}
    </MapContainer>
  )
}
