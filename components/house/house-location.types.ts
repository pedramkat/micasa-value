export type NearbyPlacePin = {
  id: string
  name: string
  lat: number
  lon: number
  distanceMeters?: number | null
  category?: string | null
  address?: string | null
}
