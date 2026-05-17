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
  // When true, enable interactive link creation (click country A -> move -> click country B)
  editMode?: boolean
  // Called when a new link draft is completed (fromCountryId, toCountryId, coords)
  onLinkCreate?: (payload: { fromCountryId: string; toCountryId: string; fromCoords: [number, number]; toCoords: [number, number] }) => void
  // Parent can pass the currently active draft; when it becomes null, MapView should clear visualization
  activeDraft?: { fromCountryId: string; toCountryId: string; fromCoords: [number, number]; toCoords: [number, number] } | null
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

export default function MapView({ mapId, editMode = false, onLinkCreate, activeDraft }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const [mapInfo, setMapInfo] = useState<MapRecord | null>(null)
  const [linkTypes, setLinkTypes] = useState<LinkType[]>([])
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const mapboxToken = useMemo(() => import.meta.env.VITE_MAPBOX_TOKEN as string | undefined, [])
  const editModeRef = useRef<boolean>(editMode)
  // mutable draft state used by map event handlers to avoid re-renders
  const draftRef = useRef<{ fromCountryId?: string; fromCoords?: [number, number]; toCoords?: [number, number] }>({})
  // ref to reflect parent's activeDraft prop inside event handlers
  const activeDraftRef = useRef<any>(null)

  useEffect(() => {
    // keep ref in sync so map event handlers use latest editMode
    editModeRef.current = editMode
  }, [editMode])

  useEffect(() => {
    activeDraftRef.current = activeDraft
  }, [activeDraft])

  useEffect(() => {
    if (!containerRef.current || mapRef.current || !mapboxToken) {
      return
    }

    mapboxgl.accessToken = mapboxToken
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/standard',
      center: [139.6917, 35.6895],
      zoom: 2,
      antialias: true,
    })

    map.addControl(new mapboxgl.NavigationControl(), 'top-right')
    mapRef.current = map

    const resize = () => map.resize()
    window.addEventListener('resize', resize)

    map.on('load', () => {
      if (!map.getSource('geovisula-links')) {
        map.addSource('geovisula-links', {
          type: 'geojson',
          data: buildFeatureCollection<LinkFeatureProperties>([]),
        })
      }

      if (!map.getSource('geovisula-countries')) {
        map.addSource('geovisula-countries', {
          type: 'geojson',
          data: buildFeatureCollection<CountryFeatureProperties>([]),
        })
      }

      if (!map.getLayer('geovisula-links-line')) {
        map.addLayer({
          id: 'geovisula-links-line',
          type: 'line',
          source: 'geovisula-links',
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

      if (!map.getLayer('geovisula-countries-circle')) {
        map.addLayer({
          id: 'geovisula-countries-circle',
          type: 'circle',
          source: 'geovisula-countries',
          paint: {
            'circle-radius': 4.5,
            'circle-color': ['coalesce', ['get', 'color'], '#0f766e'],
            'circle-stroke-color': '#ffffff',
            'circle-stroke-width': 1.5,
          },
        })
      }

      if (!map.getLayer('geovisula-countries-label')) {
        map.addLayer({
          id: 'geovisula-countries-label',
          type: 'symbol',
          source: 'geovisula-countries',
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

      // source/layer for temporary link draft while creating a new link
      if (!map.getSource('geovisula-link-draft')) {
        map.addSource('geovisula-link-draft', {
          type: 'geojson',
          data: buildFeatureCollection<LinkFeatureProperties>([]),
        })
      }

      if (!map.getLayer('geovisula-link-draft-line')) {
        map.addLayer({
          id: 'geovisula-link-draft-line',
          type: 'line',
          source: 'geovisula-link-draft',
          layout: {
            'line-cap': 'round',
            'line-join': 'round',
          },
          paint: {
            'line-color': '#111827',
            'line-width': 3,
            'line-opacity': 0.9,
            'line-dasharray': [2, 2],
          },
        })
      }

      map.on('click', 'geovisula-links-line', (event) => {
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

      map.on('click', 'geovisula-countries-circle', (event) => {
        const feature = event.features?.[0]
        if (!feature) {
          return
        }

        const properties = feature.properties as unknown as CountryFeatureProperties

        // If edit mode is enabled, use clicks to start/complete draft links.
        if (editModeRef.current) {
          const countryId = properties.countryId
          const geom = feature.geometry as GeoJSON.Point
          const coords = geom.coordinates as [number, number]

          if (!draftRef.current.fromCountryId) {
            // start draft
            console.log('MapView: start draft', { countryId, coords })
            draftRef.current = { fromCountryId: countryId, fromCoords: coords }
            const src = map.getSource('geovisula-link-draft') as mapboxgl.GeoJSONSource | undefined
            src?.setData(buildFeatureCollection([{
              type: 'Feature',
              geometry: { type: 'LineString', coordinates: buildArcCoordinates(coords, coords, 8) },
              properties: {} as any,
            }]))
            return
          }

          // completing draft: ignore click on same country
          if (draftRef.current.fromCountryId && draftRef.current.fromCountryId !== countryId) {
            const fromCountryId = draftRef.current.fromCountryId
            const fromCoords = draftRef.current.fromCoords as [number, number]
            const toCountryId = countryId
            const toCoords = coords

              // notify parent to open editor / create draft
              console.log('MapView: completing draft -> calling onLinkCreate', { fromCountryId, toCountryId, fromCoords, toCoords })
              onLinkCreate?.({ fromCountryId, toCountryId, fromCoords, toCoords })

              // NOTE: do NOT clear draft visualization here. Keep the draft visible until
              // the parent component (App) clears its `linkDraft` (passed via `activeDraft`).
              // Clearing immediately here made the draft disappear when the editor opened.
              // We'll clear visualization in an effect that watches `props.activeDraft`.
              console.log('MapView: leaving draft visualization in place for editor')
              // leave draftRef.current intact
            return
          }

          // clicking same country: cancel
          const src = map.getSource('geovisula-link-draft') as mapboxgl.GeoJSONSource | undefined
          src?.setData(buildFeatureCollection([]))
          console.log('MapView: cancelled draft by clicking same country -> clearing draftRef')
          draftRef.current = {}
          return
        }

        // default: show popup when not editing
        new mapboxgl.Popup({ closeButton: true, closeOnClick: true })
          .setLngLat(event.lngLat)
          .setHTML(`
            <strong>${properties.countryNameJa}</strong><br />
            <div>${properties.countryName}</div>
          `)
          .addTo(map)

      })

      map.on('mouseenter', 'geovisula-links-line', () => {
        map.getCanvas().style.cursor = 'pointer'
      })
      map.on('mouseleave', 'geovisula-links-line', () => {
        map.getCanvas().style.cursor = ''
      })
      map.on('mouseenter', 'geovisula-countries-circle', () => {
        map.getCanvas().style.cursor = 'pointer'
      })
      map.on('mouseleave', 'geovisula-countries-circle', () => {
        map.getCanvas().style.cursor = ''
      })

      // mouse move updates temporary draft line when a draft is active
      map.on('mousemove', (event) => {
        // If parent opened the editor and provided an activeDraft, stop updating
        if (activeDraftRef.current) {
          return
        }

        if (!draftRef.current.fromCoords) {
          return
        }

        const toCoords: [number, number] = [event.lngLat.lng, event.lngLat.lat]
        draftRef.current.toCoords = toCoords
        const src = map.getSource('geovisula-link-draft') as mapboxgl.GeoJSONSource | undefined
        const lineCoords = buildArcCoordinates(draftRef.current.fromCoords as [number, number], toCoords)
        src?.setData(buildFeatureCollection([{
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: lineCoords },
          properties: {} as any,
        }]))
      })

      // clicking on map background cancels a draft
      map.on('click', (event) => {
        // if clicked a rendered feature, ignore — layer-specific handlers run first
        const features = map.queryRenderedFeatures(event.point, { layers: ['geovisula-countries-circle', 'geovisula-links-line'] })
        if (features.length > 0) {
          return
        }

        if (draftRef.current.fromCoords) {
          const src = map.getSource('geovisula-link-draft') as mapboxgl.GeoJSONSource | undefined
          src?.setData(buildFeatureCollection([]))
          console.log('MapView: cancelled draft by clicking background -> clearing draftRef')
          draftRef.current = {}
        }
      })

    // watch for parent-controlled activeDraft changes to clear or restore visualization
    // (handled below via React effect outside of map.on('load')).
    })

    return () => {
      window.removeEventListener('resize', resize)
      map.remove()
      mapRef.current = null
    }
  }, [mapboxToken])
  // Parent can pass `activeDraft` to control whether the draft visualization should remain.
  // When `activeDraft` becomes null, clear the draft visualization and internal draftRef.
  useEffect(() => {
    if (!mapRef.current) return
    const map = mapRef.current
    const src = map.getSource('geovisula-link-draft') as mapboxgl.GeoJSONSource | undefined
    if (!src) return

    if (!activeDraft) {
      // Parent cleared the draft: remove visualization
      src.setData(buildFeatureCollection([]))
      draftRef.current = {}
      console.log('MapView: activeDraft is null -> cleared draft visualization')
      return
    }

    // Parent provided an active draft: ensure visualization matches
    const from = activeDraft.fromCoords
    const to = activeDraft.toCoords ?? activeDraft.fromCoords
    const lineCoords = buildArcCoordinates(from, to)
    src.setData(buildFeatureCollection([{
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: lineCoords },
      properties: {} as any,
    }]))
    draftRef.current = { fromCountryId: activeDraft.fromCountryId, fromCoords: activeDraft.fromCoords, toCoords: activeDraft.toCoords }
    console.log('MapView: activeDraft present -> restored draft visualization')
  }, [activeDraft])

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

        const countryByPointId = new Map<number, EnrichedCountry>()
        countriesWithCoordinates.forEach((country) => {
          if (country.capital_point_id !== null && country.capital_point_id !== undefined) {
            countryByPointId.set(country.capital_point_id, country)
          }
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
            const fromCountry = countryByPointId.get(link.from_country)
            const toCountry = countryByPointId.get(link.to_country)
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
        const linksSource = mapInstance.getSource('geovisula-links') as mapboxgl.GeoJSONSource | undefined
        const countriesSource = mapInstance.getSource('geovisula-countries') as mapboxgl.GeoJSONSource | undefined
        linksSource?.setData(buildFeatureCollection(lineFeatures))
        countriesSource?.setData(buildFeatureCollection(countryFeatures))

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
        <div style={{ position: 'absolute', left: 16, bottom: 40, zIndex: 30 }}>
          <div style={statusPanelStyle(error ? '#b91c1c' : '#0f766e')}>{error || status}</div>
        </div>
      )}

      {mapInfo && (
        <div style={infoPanelStyle}>
          <div style={{ fontSize: 12, color: '#6b7280' }}>現在のマップ</div>
          <div style={{ fontWeight: 700, marginTop: 4 }}>{mapInfo.name_ja}</div>
          <div style={{ fontSize: 12, marginTop: 4 ,}}>{mapInfo.summary_jp}</div>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
            {linkTypes.length}種類のリンク
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6, marginRight: 8 }}>
            {linkTypes.map(({ name_ja, color }) => (
              <span key={name_ja} style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 12 }}>
                <span style={{
                  display: 'inline-block', width: 24, height: 3,
                  background: color, borderRadius: 2,
                }} />
                {name_ja}
              </span>
            ))}
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
  animation: 'fadeout 5s ease-out 5s forwards',
})

const infoPanelStyle: React.CSSProperties = {
  position: 'absolute',
  left: 16,
  top: 12,
  zIndex: 25,
  background: 'rgba(255,255,255,0.96)',
  borderRadius: 14,
  padding: '12px 14px',
  boxShadow: '0 8px 24px rgba(15, 23, 42, 0.12)',
  minWidth: 180,
  maxWidth: 240,
  wordBreak: 'break-word',
}
