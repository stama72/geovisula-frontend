export function buildArcCoordinates(from: [number, number], to: [number, number], segments = 48): [number, number][] {
  const [fromLng, fromLat] = from
  let toLng = to[0]
  const toLat = to[1]

  if (Math.abs(toLng - fromLng) > 180) {
    toLng += toLng > fromLng ? -360 : 360
  }

  const deltaLng = toLng - fromLng
  const deltaLat = toLat - fromLat
  const magnitude = Math.max(Math.hypot(deltaLng, deltaLat) * 0.12, 1.1)

  const coordinates: [number, number][] = []
  for (let index = 0; index <= segments; index += 1) {
    const t = index / segments
    const lift = Math.sin(Math.PI * t) * magnitude
    coordinates.push([fromLng + deltaLng * t, fromLat + deltaLat * t + lift])
  }

  return coordinates
}

export function buildFeatureCollection<T>(features: GeoJSON.Feature<GeoJSON.Geometry, T>[]): GeoJSON.FeatureCollection<GeoJSON.Geometry, T> {
  return { type: 'FeatureCollection', features }
}

export function formatDateLabel(value: string | null): string {
  return value ? value.slice(0, 10) : 'なし'
}
