export async function ensureLeafletDefaultIcon(): Promise<void> {
  if (typeof window === "undefined") return

  const leafletMod: any = await import("leaflet")
  const L: any = leafletMod?.default ?? leafletMod

  const DefaultIcon = L?.Icon?.Default
  if (!DefaultIcon?.mergeOptions) return

  DefaultIcon.mergeOptions({
    iconRetinaUrl: new URL("leaflet/dist/images/marker-icon-2x.png", import.meta.url).toString(),
    iconUrl: new URL("leaflet/dist/images/marker-icon.png", import.meta.url).toString(),
    shadowUrl: new URL("leaflet/dist/images/marker-shadow.png", import.meta.url).toString(),
  })
}
