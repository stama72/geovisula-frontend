import { useEffect, useMemo, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { api } from './api'
import type { Country, LinkType, MapRecord, RelationLink } from './types'

type EnrichedCountry = Country & {
  lat: number
  lng: number
}

type Props = {
  mapId: number | null
}

type LinkFeatureProperties = {
  id: number
  linkTypeId: number
  linkTypeName: string
  fromCountryId: string
  toCountryId: string
  fromCountryName: string
  toCountryName: string
  color: string
  animated: boolean
  existFrom: string | null
  existUntil: string | null
}

type CountryFeatureProperties = {
  countryId: string
  countryName: string
  countryNameJa: string
  color: string
}

function buildArcCoordinates(from: [number, number], to: [number, number], segments = 48) {
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

function buildFeatureCollection<T>(features: GeoJSON.Feature<GeoJSON.Geometry, T>[]): GeoJSON.FeatureCollection<GeoJSON.Geometry, T> {
  return {
    type: 'FeatureCollection',
    features,
  }
}

function formatDateLabel(value: string | null) {
  if (!value) {
    return 'なし'
  }
  return value.slice(0, 10)
}

export default function MapView({ mapId }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const [mapInfo, setMapInfo] = useState<MapRecord | null>(null)
  const [linkTypes, setLinkTypes] = useState<LinkType[]>([])
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const mapboxToken = useMemo(() => import.meta.env.VITE_MAPBOX_TOKEN as string | undefined, [])

  useEffect(() => {
    if (!containerRef.current || mapRef.current || !mapboxToken) {
      return
    }

    mapboxgl.accessToken = mapboxToken
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/standard',
      center: [139.6917, 35.6895],
      zoom: 1.7,
      antialias: true,
    })

    map.addControl(new mapboxgl.NavigationControl(), 'top-right')
    mapRef.current = map

    const resize = () => map.resize()
    window.addEventListener('resize', resize)

    map.on('load', () => {
      if (!map.getSource('diplomap-links')) {
        map.addSource('diplomap-links', {
          type: 'geojson',
          data: buildFeatureCollection<LinkFeatureProperties>([]),
        })
      }

      if (!map.getSource('diplomap-countries')) {
        map.addSource('diplomap-countries', {
          type: 'geojson',
          data: buildFeatureCollection<CountryFeatureProperties>([]),
        })
      }

      if (!map.getLayer('diplomap-links-line')) {
        map.addLayer({
          id: 'diplomap-links-line',
          type: 'line',
          source: 'diplomap-links',
          layout: {
            'line-cap': 'round',
            'line-join': 'round',
          },
          paint: {
            'line-color': ['coalesce', ['get', 'color'], '#2563eb'],
            'line-width': ['case', ['boolean', ['get', 'animated'], false], 3.5, 2.5],
            'line-opacity': 0.9,
          },
        })
      }

      if (!map.getLayer('diplomap-countries-circle')) {
        map.addLayer({
          id: 'diplomap-countries-circle',
          type: 'circle',
          source: 'diplomap-countries',
          paint: {
            'circle-radius': 4.5,
            'circle-color': ['coalesce', ['get', 'color'], '#0f766e'],
            'circle-stroke-color': '#ffffff',
            'circle-stroke-width': 1.5,
          },
        })
      }

      if (!map.getLayer('diplomap-countries-label')) {
        map.addLayer({
          id: 'diplomap-countries-label',
          type: 'symbol',
          source: 'diplomap-countries',
          layout: {
            'text-field': ['get', 'countryNameJa'],
            'text-size': 12,
            'text-offset': [0, 1.1],
            'text-anchor': 'top',
          },
          paint: {
            'text-color': '#111827',
            'text-halo-color': '#ffffff',
            'text-halo-width': 1.2,
          },
        })
      }

      map.on('click', 'diplomap-links-line', (event) => {
        const feature = event.features?.[0]
        if (!feature) {
          return
        }

        const properties = feature.properties as unknown as LinkFeatureProperties
        new mapboxgl.Popup({ closeButton: true, closeOnClick: true })
          .setLngLat(event.lngLat)
          .setHTML(`
            <strong>${properties.fromCountryName} → ${properties.toCountryName}</strong><br />
            <div>Link type: ${properties.linkTypeName}</div>
            <div>Valid from: ${formatDateLabel(properties.existFrom)}</div>
            <div>Valid until: ${formatDateLabel(properties.existUntil)}</div>
          `)
          .addTo(map)
      })

      map.on('click', 'diplomap-countries-circle', (event) => {
        const feature = event.features?.[0]
        if (!feature) {
          return
        }

        const properties = feature.properties as unknown as CountryFeatureProperties
        new mapboxgl.Popup({ closeButton: true, closeOnClick: true })
          .setLngLat(event.lngLat)
          .setHTML(`
            <strong>${properties.countryNameJa}</strong><br />
            <div>${properties.countryName}</div>
          `)
          .addTo(map)
      })

      map.on('mouseenter', 'diplomap-links-line', () => {
        map.getCanvas().style.cursor = 'pointer'
      })
      map.on('mouseleave', 'diplomap-links-line', () => {
        map.getCanvas().style.cursor = ''
      })
      map.on('mouseenter', 'diplomap-countries-circle', () => {
        map.getCanvas().style.cursor = 'pointer'
      })
      map.on('mouseleave', 'diplomap-countries-circle', () => {
        map.getCanvas().style.cursor = ''
      })
    })

    return () => {
      window.removeEventListener('resize', resize)
      map.remove()
      mapRef.current = null
    }
  }, [mapboxToken])

  useEffect(() => {
    if (!mapRef.current || mapId === null) {
      return
    }

    let cancelled = false
    const activeMapId = mapId

    async function loadMapData() {
      setStatus('地図データを読み込み中...')
      setError('')

      try {
        const [map, countries, linkTypesResponse] = await Promise.all([
          api.getMap(activeMapId),
          api.getCountries(),
          api.getLinkTypes(activeMapId),
        ])

        const countriesWithCoordinates: EnrichedCountry[] = await Promise.all(
          countries.map(async (country) => ({
            ...country,
            ...(await api.getCountryCoordinates(country.iso_id)),
          })),
        )

        const currentDate = new Date().toISOString()
        const linksResponse: RelationLink[][] = await Promise.all(
          linkTypesResponse.map((linkType) => api.getLinks(activeMapId, linkType.id, currentDate)),
        )

        if (cancelled || !mapRef.current) {
          return
        }

        setMapInfo(map)
        setLinkTypes(linkTypesResponse)

        const countryByIso = new Map<string, EnrichedCountry>()
        countriesWithCoordinates.forEach((country) => {
          countryByIso.set(country.iso_id, country)
        })

        const linkTypeById = new Map<number, LinkType>()
        linkTypesResponse.forEach((linkType) => {
          linkTypeById.set(linkType.id, linkType)
        })

        const countryFeatures: GeoJSON.Feature<GeoJSON.Point, CountryFeatureProperties>[] = countriesWithCoordinates.map((country) => ({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [country.lng, country.lat],
          },
          properties: {
            countryId: country.iso_id,
            countryName: country.name,
            countryNameJa: country.name_ja,
            color: '#0f766e',
          },
        }))

        const lineFeatures: GeoJSON.Feature<GeoJSON.LineString, LinkFeatureProperties>[] = []
        linksResponse.forEach((links) => {
          links.forEach((link) => {
            const fromCountry = countryByIso.get(String(link.from_country))
            const toCountry = countryByIso.get(String(link.to_country))
            const linkType = linkTypeById.get(link.link_type)

            if (!fromCountry || !toCountry || !linkType) {
              return
            }

            lineFeatures.push({
              type: 'Feature',
              geometry: {
                type: 'LineString',
                coordinates: buildArcCoordinates([fromCountry.lng, fromCountry.lat], [toCountry.lng, toCountry.lat]),
              },
              properties: {
                id: link.id,
                linkTypeId: linkType.id,
                linkTypeName: linkType.name_ja || linkType.name,
                fromCountryId: fromCountry.iso_id,
                toCountryId: toCountry.iso_id,
                fromCountryName: fromCountry.name_ja,
                toCountryName: toCountry.name_ja,
                color: linkType.color,
                animated: linkType.animated,
                existFrom: link.exist_from,
                existUntil: link.exist_until,
              },
            })
          })
        })

        const mapInstance = mapRef.current
        const linksSource = mapInstance.getSource('diplomap-links') as mapboxgl.GeoJSONSource | undefined
        const countriesSource = mapInstance.getSource('diplomap-countries') as mapboxgl.GeoJSONSource | undefined
        linksSource?.setData(buildFeatureCollection(lineFeatures))
        countriesSource?.setData(buildFeatureCollection(countryFeatures))

        if (countryFeatures.length > 0) {
          const bounds = new mapboxgl.LngLatBounds()
          countryFeatures.forEach((feature) => {
            const [lng, lat] = feature.geometry.coordinates
            bounds.extend([lng, lat])
          })

          if (!bounds.isEmpty()) {
            mapInstance.fitBounds(bounds, {
              padding: { top: 96, bottom: 64, left: 64, right: 64 },
              duration: 700,
              maxZoom: 4.5,
            })
          }
        }

        setStatus(`${countriesWithCoordinates.length}件の国と${lineFeatures.length}件のリンクを描画しました`)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : '地図データの読み込みに失敗しました')
          setStatus('')
        }
      }
    }

    void loadMapData()

    return () => {
      cancelled = true
    }
  }, [mapId])

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <div
        ref={containerRef}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          background: '#dbeafe',
        }}
      />

      {!mapboxToken && (
        <div style={overlayStyle}>
          <div style={panelStyle}>
            <strong>Mapbox token が設定されていません</strong>
            <div style={{ marginTop: 8, fontSize: 13, lineHeight: 1.6 }}>
              VITE_MAPBOX_TOKEN を設定すると地図が表示されます。
            </div>
          </div>
        </div>
      )}

      {mapboxToken && !mapId && (
        <div style={overlayStyle}>
          <div style={panelStyle}>表示するマップを選択してください。</div>
        </div>
      )}

      {mapboxToken && mapId && (status || error) && (
        <div style={{ position: 'absolute', left: 16, bottom: 16, zIndex: 30 }}>
          <div style={statusPanelStyle(error ? '#b91c1c' : '#0f766e')}>{error || status}</div>
        </div>
      )}

      {mapInfo && (
        <div style={infoPanelStyle}>
          <div style={{ fontSize: 12, color: '#6b7280' }}>現在のマップ</div>
          <div style={{ fontWeight: 700, marginTop: 4 }}>{mapInfo.name_ja}</div>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
            {linkTypes.length}種類のリンク
          </div>
        </div>
      )}
    </div>
  )
}

const overlayStyle: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  zIndex: 20,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  pointerEvents: 'none',
}

const panelStyle: React.CSSProperties = {
  pointerEvents: 'auto',
  background: 'rgba(255,255,255,0.96)',
  color: '#111827',
  borderRadius: 14,
  boxShadow: '0 12px 40px rgba(15, 23, 42, 0.2)',
  padding: '18px 20px',
  fontSize: 14,
  lineHeight: 1.5,
}

const statusPanelStyle = (borderColor: string): React.CSSProperties => ({
  maxWidth: 420,
  background: 'rgba(255,255,255,0.95)',
  color: '#111827',
  borderRadius: 12,
  padding: '10px 14px',
  border: `1px solid ${borderColor}`,
  boxShadow: '0 8px 24px rgba(15, 23, 42, 0.12)',
  fontSize: 13,
})

const infoPanelStyle: React.CSSProperties = {
  position: 'absolute',
  left: 16,
  top: 16,
  zIndex: 25,
  background: 'rgba(255,255,255,0.96)',
  borderRadius: 14,
  padding: '12px 14px',
  boxShadow: '0 8px 24px rgba(15, 23, 42, 0.12)',
  minWidth: 180,
}
