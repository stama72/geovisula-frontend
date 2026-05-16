import { useEffect, useState } from 'react'
import './App.css'
import { api } from './api'
import CountryManager from './CountryManager'
import EditMapPanel from './EditMapPanel'
import LinkTypesPanel from './LinkTypesPanel'
import LoginPage from './LoginPage'
import MapView from './MapView'
import LinkEditorPanel from './LinkEditorPanel'
import type { Country, CountryCoordinates, CountryEditorEntry, LinkType, MapRecord } from './types'

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token') ?? '')
  const [displayName, setDisplayName] = useState(localStorage.getItem('displayName') ?? '')
  const [role, setRole] = useState(localStorage.getItem('role') ?? '')
  const [maps, setMaps] = useState<MapRecord[]>([])
  const [selectedMapId, setSelectedMapId] = useState<number | null>(Number(localStorage.getItem('selectedMapId') ?? '1') || null)
  const [countries, setCountries] = useState<CountryEditorEntry[]>([])
  const [linkTypes, setLinkTypes] = useState<LinkType[]>([])
  const [showCountryManager, setShowCountryManager] = useState(false)
  const [showMapEditor, setShowMapEditor] = useState(false)
  const [showLinkTypeEditor, setShowLinkTypeEditor] = useState(false)
  const [loadingError, setLoadingError] = useState('')
  const [mapEditable, setMapEditable] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [linkDraft, setLinkDraft] = useState<{
    fromCountryId: string
    toCountryId: string
    fromCoords: [number, number]
    toCoords: [number, number]
  } | null>(null)

  const selectedMap = maps.find((map) => map.id === selectedMapId) ?? null

  useEffect(() => {
    if (!token) {
      return
    }

    let cancelled = false

    async function loadInitialData() {
      try {
        const [mapRows, countryRows] = await Promise.all([api.getMaps(), api.getCountries()])
        const countriesWithCoordinates = await Promise.all(
          countryRows.map(async (country) => {
            const coordinates: CountryCoordinates = await api.getCountryCoordinates(country.iso_id)
            return {
              id: country.iso_id,
              name_ja: country.name_ja,
              capital_point_id: country.capital_point_id,
              lat: coordinates.lat,
              lng: coordinates.lng,
            }
          }),
        )

        if (cancelled) {
          return
        }

        setMaps(mapRows)
        setCountries(countriesWithCoordinates)
        setLoadingError('')

        setSelectedMapId((currentSelectedMapId) => {
          if (currentSelectedMapId && mapRows.some((row) => row.id === currentSelectedMapId)) {
            return currentSelectedMapId
          }
          return mapRows[0]?.id ?? null
        })
      } catch (error) {
        if (!cancelled) {
          setLoadingError(error instanceof Error ? error.message : '初期データの読み込みに失敗しました')
        }
      }
    }

    void loadInitialData()

    return () => {
      cancelled = true
    }
  }, [token])

  useEffect(() => {
    if (!token || !selectedMapId) {
      setMapEditable(false)
      setEditMode(false)
      return
    }

    let cancelled = false
    const mapId = selectedMapId

    async function loadEditableState() {
      try {
        const { editable } = await api.isMapEditable(mapId)
        if (!cancelled) {
          setMapEditable(editable)
          setEditMode(editable)
        }
      } catch {
        if (!cancelled) {
          setMapEditable(false)
          setEditMode(false)
        }
      }
    }

    void loadEditableState()

    return () => {
      cancelled = true
    }
  }, [selectedMapId, token])

  useEffect(() => {
    if (!selectedMapId) {
      setLinkTypes([])
      return
    }

    let cancelled = false
    const mapId = selectedMapId

    async function loadLinkTypes() {
      try {
        const rows = await api.getLinkTypes(mapId)
        if (!cancelled) {
          setLinkTypes(rows)
        }
      } catch {
        if (!cancelled) {
          setLinkTypes([])
        }
      }
    }

    void loadLinkTypes()

    return () => {
      cancelled = true
    }
  }, [selectedMapId])

  function handleLogin(newToken: string, name: string, userRole: string) {
    setToken(newToken)
    setDisplayName(name)
    setRole(userRole)
    localStorage.setItem('token', newToken)
    localStorage.setItem('displayName', name)
    localStorage.setItem('role', userRole)
  }

  async function handleLinkCreate(payload: { fromCountryId: string; toCountryId: string; fromCoords: [number, number]; toCoords: [number, number] }) {
    setLinkDraft(payload)
  }

  async function handleLinkSave(form: { linkTypeId: number; existFrom: string; existUntil: string }) {
    if (!selectedMapId || !linkDraft) {
      return
    }

    const countryRows = await api.getCountries()
    const fromCountry = countryRows.find((country) => country.iso_id === linkDraft.fromCountryId)
    const toCountry = countryRows.find((country) => country.iso_id === linkDraft.toCountryId)

    if (!fromCountry?.capital_point_id || !toCountry?.capital_point_id) {
      throw new Error('国の首都座標が見つかりません')
    }

    await api.createLink({
      map_id: selectedMapId,
      link_type: form.linkTypeId,
      from_country: fromCountry.capital_point_id,
      to_country: toCountry.capital_point_id,
      exist_from: form.existFrom,
      exist_until: form.existUntil,
    })

    setLinkDraft(null)
  }

  function handleLogout() {
    localStorage.clear()
    setToken('')
    setDisplayName('')
    setRole('')
    setMaps([])
    setCountries([])
    setSelectedMapId(null)
    setShowCountryManager(false)
    setShowMapEditor(false)
    setShowLinkTypeEditor(false)
    setLoadingError('')
  }

  async function refreshCountries() {
    const countryRows: Country[] = await api.getCountries()
    const countriesWithCoordinates = await Promise.all(
      countryRows.map(async (country) => {
        const coordinates = await api.getCountryCoordinates(country.iso_id)
        return {
          id: country.iso_id,
          name_ja: country.name_ja,
          capital_point_id: country.capital_point_id,
          lat: coordinates.lat,
          lng: coordinates.lng,
        }
      }),
    )

    setCountries(countriesWithCoordinates)
  }

  if (!token) {
    return <LoginPage onLogin={handleLogin} />
  }

  return (
    <div style={{ position: 'relative', height: '100vh', overflow: 'hidden', background: '#08111f' }}>
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          background: 'rgba(8, 17, 31, 0.88)',
          color: 'white',
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          backdropFilter: 'blur(10px)',
          boxShadow: '0 1px 0 rgba(255,255,255,0.08)',
        }}
      >
        <span style={{ fontWeight: 700, fontSize: 16 }}>Geovisula</span>

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#dbe4f0' }}>
          マップ
          <select
            value={selectedMapId ?? ''}
            onChange={(event) => setSelectedMapId(event.target.value ? Number(event.target.value) : null)}
            style={{
              minWidth: 220,
              padding: '7px 10px',
              borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.18)',
              background: 'rgba(15, 23, 42, 0.95)',
              color: 'white',
            }}
          >
            {maps.length === 0 && <option value="">読み込み中...</option>}
            {maps.map((map) => (
              <option key={map.id} value={map.id}>
                {map.name_ja}
              </option>
            ))}
          </select>
        </label>

        {selectedMap && (
          <span style={{ fontSize: 12, color: '#9fb2cc' }}>
            {selectedMap.read_permission} / {selectedMap.edit_permission}
          </span>
        )}

        <span style={{ flex: 1 }} />

        {loadingError && <span style={{ fontSize: 12, color: '#fda4af' }}>{loadingError}</span>}

        {mapEditable && (
          <>
            <button
              onClick={() => setShowMapEditor(true)}
              style={{
                padding: '7px 12px',
                borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.18)',
                background: 'rgba(15, 23, 42, 0.95)',
                color: 'white',
                cursor: 'pointer',
                fontSize: 13,
              }}
            >
              マップ編集
            </button>

            <button
              onClick={() => setShowLinkTypeEditor(true)}
              style={{
                padding: '7px 12px',
                borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.18)',
                background: 'rgba(15, 23, 42, 0.95)',
                color: 'white',
                cursor: 'pointer',
                fontSize: 13,
              }}
            >
              リンクタイプ
            </button>
          </>
        )}
        
        {mapEditable && (
          <button
            onClick={() => setEditMode(!editMode)}
            style={{
              padding: '7px 12px',
              borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.18)',
              background: editMode ? 'rgba(34, 197, 94, 0.12)' : 'rgba(15, 23, 42, 0.95)',
              color: editMode ? '#86efac' : 'white',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: editMode ? 700 : 400,
            }}
          >
            {editMode ? '編集中' : '編集'}
          </button>
        )}

        <button
          onClick={() => setShowCountryManager(true)}
          style={{
            padding: '7px 12px',
            borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.18)',
            background: 'rgba(15, 23, 42, 0.95)',
            color: 'white',
            cursor: 'pointer',
            fontSize: 13,
          }}
        >
          国管理
        </button>

        <span style={{ fontSize: 13, color: '#dbe4f0' }}>
          {displayName}（{role}）
        </span>

        <button
          onClick={handleLogout}
          style={{
            padding: '7px 12px',
            borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.18)',
            background: 'rgba(15, 23, 42, 0.95)',
            color: 'white',
            cursor: 'pointer',
            fontSize: 13,
          }}
        >
          ログアウト
        </button>
      </div>

      <MapView mapId={selectedMapId} editMode={editMode} onLinkCreate={handleLinkCreate} />

      {linkDraft && selectedMap && (
        <LinkEditorPanel
          draft={linkDraft}
          linkTypes={linkTypes}
          onClose={() => setLinkDraft(null)}
          onSave={handleLinkSave}
        />
      )}

      {showMapEditor && selectedMap && (
        <EditMapPanel
          map={selectedMap}
          onClose={() => setShowMapEditor(false)}
          onSaved={(updatedMap) => {
            setMaps((currentMaps) => currentMaps.map((map) => (map.id === updatedMap.id ? updatedMap : map)))
            setShowMapEditor(false)
          }}
        />
      )}

      {showLinkTypeEditor && selectedMap && (
        <LinkTypesPanel
          mapId={selectedMap.id}
          linkTypes={linkTypes}
          onClose={() => setShowLinkTypeEditor(false)}
          onRefresh={async () => {
            setLinkTypes(await api.getLinkTypes(selectedMap.id))
          }}
        />
      )}

      {showCountryManager && (
        <CountryManager
          role={role}
          countries={countries}
          onClose={() => setShowCountryManager(false)}
          onUpdate={() => {
            void refreshCountries()
          }}
        />
      )}
    </div>
  )
}
