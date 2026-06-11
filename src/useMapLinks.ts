import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import { api } from './api'
import type { LinkType, MapRecord, RelationLink } from './types'
import { buildArcCoordinates, buildFeatureCollection } from './mapViewUtils'
import type { CountryFeatureProperties, EnrichedCountry, LinkFeatureProperties } from './mapViewTypes'

type UseMapLinksResult = {
  mapInfo: MapRecord | null
  linkTypes: LinkType[]
  status: string
  error: string
}

export default function useMapLinks(
  mapRef: { current: mapboxgl.Map | null },
  mapId: number | null,
  mapReady: boolean,
  mapDataRefreshKey: number | undefined,
  refreshLinkTypeId: number | null | undefined,
  onLinksRefreshed: ((linkTypeId: number) => void) | undefined,
): UseMapLinksResult {
  const [mapInfo, setMapInfo] = useState<MapRecord | null>(null)
  const [linkTypes, setLinkTypes] = useState<LinkType[]>([])
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const countryByPointIdRef = useRef<Map<number, EnrichedCountry> | null>(null)
  const linksFeaturesRef = useRef<GeoJSON.Feature<GeoJSON.LineString, LinkFeatureProperties>[]>([])

  useEffect(() => {
    if (!mapRef.current || mapId === null || !mapReady) return

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

        const coordMap = await api.getCountriesCoordinates()
        const countriesWithCoordinates: EnrichedCountry[] = countries.map((country) => ({
          ...country,
          lat: coordMap[country.iso_id]?.lat ?? 0,
          lng: coordMap[country.iso_id]?.lng ?? 0,
        }))

        const currentDate = new Date().toISOString()
        const linksResponse: RelationLink[][] = await Promise.all(
          linkTypesResponse.map((linkType) => api.getLinks(activeMapId, linkType.id, currentDate)),
        )

        if (cancelled || !mapRef.current) return

        setMapInfo(map)
        setLinkTypes(linkTypesResponse)

        const countryByPointId = new Map<number, EnrichedCountry>()
        countriesWithCoordinates.forEach((country) => {
          if (country.capital_point_id !== null && country.capital_point_id !== undefined) {
            countryByPointId.set(country.capital_point_id, country)
          }
        })
        countryByPointIdRef.current = countryByPointId

        const linkTypeById = new Map<number, LinkType>()
        linkTypesResponse.forEach((linkType) => {
          linkTypeById.set(linkType.id, linkType)
        })

        const countryFeatures: GeoJSON.Feature<GeoJSON.Point, CountryFeatureProperties>[] = countriesWithCoordinates.map((country) => ({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [country.lng, country.lat] },
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
            if (!fromCountry || !toCountry || !linkType) return

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
        if (!mapInstance) return
        const linksSource = mapInstance.getSource('geovisula-links') as mapboxgl.GeoJSONSource | undefined
        const countriesSource = mapInstance.getSource('geovisula-countries') as mapboxgl.GeoJSONSource | undefined
        linksSource?.setData(buildFeatureCollection(lineFeatures))
        linksFeaturesRef.current = lineFeatures
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
  }, [mapId, mapReady, mapDataRefreshKey])

  useEffect(() => {
    if (!mapRef.current || mapId === null || refreshLinkTypeId == null) return

    let cancelled = false

    void (async () => {
      try {
        const currentDate = new Date().toISOString()
        const links = await api.getLinks(mapId, refreshLinkTypeId, currentDate)
        const countryByPointId = countryByPointIdRef.current
        const linkType = linkTypes.find((item) => item.id === refreshLinkTypeId)
        if (!countryByPointId || !linkType) return

        const newFeatures: GeoJSON.Feature<GeoJSON.LineString, LinkFeatureProperties>[] = []
        links.forEach((link) => {
          const fromCountry = countryByPointId.get(link.from_country)
          const toCountry = countryByPointId.get(link.to_country)
          if (!fromCountry || !toCountry) return

          newFeatures.push({
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

        const mapInstance = mapRef.current as mapboxgl.Map
        const linksSource = mapInstance.getSource('geovisula-links') as mapboxgl.GeoJSONSource | undefined
        if (!linksSource) return

        const kept = linksFeaturesRef.current.filter((feature) => (feature.properties?.linkTypeId as number) !== refreshLinkTypeId)
        const merged = [...kept, ...newFeatures]
        linksSource.setData(buildFeatureCollection(merged))
        linksFeaturesRef.current = merged
        onLinksRefreshed?.(refreshLinkTypeId)
        if (!cancelled) {
          setStatus(`${merged.length}件のリンクを描画しました`)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'リンクの再取得に失敗しました')
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [refreshLinkTypeId, mapId, linkTypes, onLinksRefreshed])

  return { mapInfo, linkTypes, status, error }
}
