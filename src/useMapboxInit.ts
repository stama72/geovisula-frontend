import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import { api } from './api'
import { buildArcCoordinates, buildFeatureCollection, formatDateLabel } from './mapViewUtils'
import type { ActiveDraft, CountryFeatureProperties, DraftFeatureProperties, DraftState, LinkFeatureProperties } from './mapViewTypes'

type UseMapboxInitParams = {
  containerRef: { current: HTMLDivElement | null }
  mapboxToken: string | undefined
  editModeRef: { current: boolean }
  draftRef: { current: DraftState }
  activeDraftRef: { current: ActiveDraft }
  onLinkCreate?: (payload: { fromCountryId: string; toCountryId: string; fromCoords: [number, number]; toCoords: [number, number] }) => void
  onLinkEdit?: (payload: { linkId: number; linkTypeId: number; fromCountryId: string; toCountryId: string; existFrom: string | null; existUntil: string | null }) => void
}

export default function useMapboxInit({
  containerRef,
  mapboxToken,
  editModeRef,
  draftRef,
  activeDraftRef,
  onLinkCreate,
  onLinkEdit,
}: UseMapboxInitParams): {
  mapRef: { current: mapboxgl.Map | null }
  mapReady: boolean
} {
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const [mapReady, setMapReady] = useState(false)

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
        map.addSource('geovisula-links', { type: 'geojson', data: buildFeatureCollection<LinkFeatureProperties>([]) })
      }

      if (!map.getSource('geovisula-countries')) {
        map.addSource('geovisula-countries', { type: 'geojson', data: buildFeatureCollection<CountryFeatureProperties>([]) })
      }

      if (!map.getLayer('geovisula-links-line')) {
        map.addLayer({
          id: 'geovisula-links-line',
          type: 'line',
          source: 'geovisula-links',
          layout: { 'line-cap': 'round', 'line-join': 'round' },
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

      if (!map.getSource('geovisula-link-draft')) {
        map.addSource('geovisula-link-draft', { type: 'geojson', data: buildFeatureCollection<LinkFeatureProperties>([]) })
      }

      if (!map.getLayer('geovisula-link-draft-line')) {
        map.addLayer({
          id: 'geovisula-link-draft-line',
          type: 'line',
          source: 'geovisula-link-draft',
          layout: { 'line-cap': 'round', 'line-join': 'round' },
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
        if (!feature) return

        const properties = feature.properties as unknown as LinkFeatureProperties
        if (editModeRef.current) {
          onLinkEdit?.({
            linkId: properties.id,
            linkTypeId: properties.linkTypeId,
            fromCountryId: properties.fromCountryId,
            toCountryId: properties.toCountryId,
            existFrom: properties.existFrom,
            existUntil: properties.existUntil,
          })
          return
        }

        const baseHtml = `
          <strong>${properties.fromCountryName} ⇒ ${properties.toCountryName}</strong><br />
          <div>${properties.linkTypeName}</div>
          <div>${formatDateLabel(properties.existFrom)} ～ ${formatDateLabel(properties.existUntil)}</div>
        `
        const popup = new mapboxgl.Popup({ closeButton: true, closeOnClick: true })
          .setLngLat(event.lngLat)
          .setHTML(baseHtml)
          .addTo(map)

        api.getLinkDetails(properties.id).then((details) => {
          if (!details || (!details.summary && !details.source_url)) return
          const summaryHtml = details.summary
            ? `<div style="margin-top:6px;font-size:13px;color:#334155">${details.summary}</div>`
            : ''
          const urlHtml = details.source_url
            ? `<div style="margin-top:4px"><a href="${details.source_url}" target="_blank" rel="noopener noreferrer" style="font-size:13px;color:#2563eb">詳細URL</a></div>`
            : ''
          popup.setHTML(baseHtml + summaryHtml + urlHtml)
        }).catch(() => { /* 詳細なしは正常 */ })
      })

      map.on('click', 'geovisula-countries-circle', (event) => {
        const feature = event.features?.[0]
        if (!feature) return

        const properties = feature.properties as unknown as CountryFeatureProperties

        if (editModeRef.current) {
          const countryId = properties.countryId
          const geom = feature.geometry as GeoJSON.Point
          const coords = geom.coordinates as [number, number]

          if (!draftRef.current.fromCountryId) {
            draftRef.current = { fromCountryId: countryId, fromCoords: coords }
            const src = map.getSource('geovisula-link-draft') as mapboxgl.GeoJSONSource | undefined
            src?.setData(buildFeatureCollection<DraftFeatureProperties>([{
              type: 'Feature',
              geometry: { type: 'LineString', coordinates: buildArcCoordinates(coords, coords, 8) },
              properties: {},
            }]))
            return
          }

          if (draftRef.current.fromCountryId && draftRef.current.fromCountryId !== countryId) {
            const fromCountryId = draftRef.current.fromCountryId
            const fromCoords = draftRef.current.fromCoords as [number, number]
            const toCountryId = countryId
            const toCoords = coords
            onLinkCreate?.({ fromCountryId, toCountryId, fromCoords, toCoords })
            return
          }

          const src = map.getSource('geovisula-link-draft') as mapboxgl.GeoJSONSource | undefined
          src?.setData(buildFeatureCollection([]))
          draftRef.current = {}
          return
        }

        new mapboxgl.Popup({ closeButton: true, closeOnClick: true })
          .setLngLat(event.lngLat)
          .setHTML(`
            <strong>${properties.countryNameJa}</strong><br />
            <div>${properties.countryName}</div>
          `)
          .addTo(map)
      })

      map.on('mouseenter', 'geovisula-links-line', () => { map.getCanvas().style.cursor = 'pointer' })
      map.on('mouseleave', 'geovisula-links-line', () => { map.getCanvas().style.cursor = '' })
      map.on('mouseenter', 'geovisula-countries-circle', () => { map.getCanvas().style.cursor = 'pointer' })
      map.on('mouseleave', 'geovisula-countries-circle', () => { map.getCanvas().style.cursor = '' })

      map.on('mousemove', (event) => {
        if (activeDraftRef.current || !draftRef.current.fromCoords) {
          return
        }

        const toCoords: [number, number] = [event.lngLat.lng, event.lngLat.lat]
        draftRef.current.toCoords = toCoords
        const src = map.getSource('geovisula-link-draft') as mapboxgl.GeoJSONSource | undefined
        const lineCoords = buildArcCoordinates(draftRef.current.fromCoords as [number, number], toCoords)
        src?.setData(buildFeatureCollection<DraftFeatureProperties>([{
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: lineCoords },
          properties: {},
        }]))
      })

      map.on('click', (event) => {
        const features = map.queryRenderedFeatures(event.point, { layers: ['geovisula-countries-circle', 'geovisula-links-line'] })
        if (features.length > 0) return

        if (draftRef.current.fromCoords) {
          const src = map.getSource('geovisula-link-draft') as mapboxgl.GeoJSONSource | undefined
          src?.setData(buildFeatureCollection([]))
          draftRef.current = {}
        }
      })

      setMapReady(true)
    })

    return () => {
      window.removeEventListener('resize', resize)
      map.remove()
      mapRef.current = null
      setMapReady(false)
    }
  }, [mapboxToken])

  return { mapRef, mapReady }
}
