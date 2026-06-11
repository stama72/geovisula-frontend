import { useEffect, useMemo, useRef } from 'react'
import type { GeoJSONSource } from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import useViewport from './useViewport'
import MapInfoPanel from './MapInfoPanel'
import useMapboxInit from './useMapboxInit'
import useMapLinks from './useMapLinks'
import { buildArcCoordinates, buildFeatureCollection } from './mapViewUtils'
import type { ActiveDraft, DraftFeatureProperties, DraftState } from './mapViewTypes'

type Props = {
  mapId: number | null
  editMode?: boolean
  onLinkCreate?: (payload: { fromCountryId: string; toCountryId: string; fromCoords: [number, number]; toCoords: [number, number] }) => void
  onLinkEdit?: (payload: {
    linkId: number
    linkTypeId: number
    fromCountryId: string
    toCountryId: string
    existFrom: string | null
    existUntil: string | null
  }) => void
  activeDraft?: ActiveDraft
  mapDataRefreshKey?: number
  refreshLinkTypeId?: number | null
  onLinksRefreshed?: (linkTypeId: number) => void
}

export default function MapView({ mapId, editMode = false, onLinkCreate, onLinkEdit, activeDraft, mapDataRefreshKey, refreshLinkTypeId, onLinksRefreshed }: Props) {
  const { isMobile } = useViewport()
  const containerRef = useRef<HTMLDivElement | null>(null)
  const editModeRef = useRef(editMode)
  const draftRef = useRef<DraftState>({})
  const activeDraftRef = useRef<ActiveDraft>(null)
  const mapboxToken = useMemo(() => import.meta.env.VITE_MAPBOX_TOKEN as string | undefined, [])

  const { mapRef, mapReady } = useMapboxInit({
    containerRef, mapboxToken, editModeRef, draftRef, activeDraftRef, onLinkCreate, onLinkEdit,
  })

  const { mapInfo, linkTypes, status, error } = useMapLinks(
    mapRef, mapId, mapReady, mapDataRefreshKey, refreshLinkTypeId, onLinksRefreshed,
  )

  useEffect(() => {
    editModeRef.current = editMode
  }, [editMode])

  useEffect(() => {
    activeDraftRef.current = activeDraft
  }, [activeDraft])

  useEffect(() => {
    if (!mapRef.current) return
    const map = mapRef.current
    const src = map.getSource('geovisula-link-draft') as GeoJSONSource | undefined
    if (!src) return

    if (!activeDraft) {
      src.setData(buildFeatureCollection([]))
      draftRef.current = {}
      return
    }

    const from = activeDraft.fromCoords
    const to = activeDraft.toCoords ?? activeDraft.fromCoords
    src.setData(buildFeatureCollection<DraftFeatureProperties>([{
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: buildArcCoordinates(from, to) },
      properties: {},
    }]))
    draftRef.current = { fromCountryId: activeDraft.fromCountryId, fromCoords: activeDraft.fromCoords, toCoords: activeDraft.toCoords }
  }, [activeDraft])

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <div
        ref={containerRef}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', background: '#dbeafe' }}
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
        <div style={{ position: 'absolute', left: isMobile ? 12 : 16, right: isMobile ? 12 : 'auto', bottom: isMobile ? 12 : 40, zIndex: 30 }}>
          <div style={statusPanelStyle(error ? '#b91c1c' : '#0f766e')}>{error || status}</div>
        </div>
      )}

      {mapInfo && <MapInfoPanel mapInfo={mapInfo} linkTypes={linkTypes} />}
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
  maxWidth: '100%',
  background: 'rgba(255,255,255,0.95)',
  color: '#111827',
  borderRadius: 12,
  padding: '10px 14px',
  border: `1px solid ${borderColor}`,
  boxShadow: '0 8px 24px rgba(15, 23, 42, 0.12)',
  fontSize: 13,
  animation: 'fadeout 5s ease-out 5s forwards',
})
