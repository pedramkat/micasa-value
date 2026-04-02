"use client"

import dynamic from "next/dynamic"

interface Props {
  lat: number
  lon: number
}

const HouseLocationMapInner = dynamic(
  () => import("@/components/house/HouseLocationMapInner").then((m) => m.HouseLocationMapInner),
  { ssr: false }
)

export function HouseLocationMap({ lat, lon }: Props) {
  return <HouseLocationMapInner lat={lat} lon={lon} />
}
