import { useEffect, useState } from 'react'
import './App.css'
import { api } from './api'
import CountryManager from './CountryManager'
import EditMapPanel from './EditMapPanel'
import CreateMapPanel from './CreateMapPanel'
import LinkTypesPanel from './LinkTypesPanel'
import LoginPage from './LoginPage'
import MapView from './MapView'
import LinkEditorPanel from './LinkEditorPanel'
import { APP_HEADER_HEIGHT } from './layoutConstants'
import useViewport from './useViewport'
import type { Country, CountryEditorEntry, LinkType, MapRecord } from './types'

type LinkCreateDraft = {
  mode: 'create'
  fromCountryId: string
  toCountryId: string
  fromCoords: [number, number]
  toCoords: [number, number]
}

type LinkEditDraft = {
  mode: 'edit'
  linkId: number
  fromCountryId: string
  toCountryId: string
  linkTypeId: number
  existFrom: string
  existUntil: string
}

type LinkDraft = LinkCreateDraft | LinkEditDraft

function normalizeDateForInput(value: string | null, fallback: string) {
  return value ? value.slice(0, 10) : fallback
}

function getMapEditableCacheKey(mapId: number) {
  return `mapEditable:${mapId}`
}

export default function App() {
  const { isMobile } = useViewport()
  const [token, setToken] = useState(localStorage.getItem('token') ?? '')
  const [displayName, setDisplayName] = useState(localStorage.getItem('displayName') ?? '')
  const [role, setRole] = useState(localStorage.getItem('role') ?? '')
  const [maps, setMaps] = useState<MapRecord[]>([])
  const [selectedMapId, setSelectedMapId] = useState<number | null>(() => {
    const v = localStorage.getItem('selectedMapId')
    return v ? Number(v) : null
  })
  const [countries, setCountries] = useState<CountryEditorEntry[]>([])
  const [linkTypes, setLinkTypes] = useState<LinkType[]>([])
  const [refreshLinkTypeId, setRefreshLinkTypeId] = useState<number | null>(null)
  const [mapDataRefreshKey, setMapDataRefreshKey] = useState(0)
  const [showCreateMapPanel, setShowCreateMapPanel] = useState(false)
  const [activePanel, setActivePanel] = useState<'mapEditor' | 'linkTypes' | 'countryManager' | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [loadingError, setLoadingError] = useState('')
  const [mapEditable, setMapEditable] = useState(() => {
    const storedMapId = localStorage.getItem('selectedMapId')
    if (!storedMapId) {
      return false
    }

    return localStorage.getItem(getMapEditableCacheKey(Number(storedMapId))) === 'true'
  })
  const [editMode, setEditMode] = useState(() => {
    const storedMapId = localStorage.getItem('selectedMapId')
    if (!storedMapId) {
      return false
    }

    return localStorage.getItem(getMapEditableCacheKey(Number(storedMapId))) === 'true'
  })
  const [linkDraft, setLinkDraft] = useState<LinkDraft | null>(null)

  const selectedMap = maps.find((map) => map.id === selectedMapId) ?? null

  useEffect(() => {
    if (!isMobile) {
      setMobileMenuOpen(false)
    }
  }, [isMobile])

  useEffect(() => {
    if (!token) {
      return
    }

    let cancelled = false

    async function loadInitialData() {
      try {
        const [mapRows, countryRows] = await Promise.all([(api.getMaps()), api.getCountries()])
        const coordMap = await api.getCountriesCoordinates()
        const countriesWithCoordinates = countryRows.map((country) => ({
          id: country.iso_id,
          name_ja: country.name_ja,
          capital_point_id: country.capital_point_id,
          lat: coordMap[country.iso_id]?.lat ?? 0,
          lng: coordMap[country.iso_id]?.lng ?? 0,
        }))

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
      queueMicrotask(() => {
        setMapEditable(false)
        setEditMode(false)
      })
      return
    }

    let cancelled = false
    const mapId = selectedMapId
    const cacheKey = getMapEditableCacheKey(mapId)
    const cachedEditable = localStorage.getItem(cacheKey)

    if (cachedEditable !== null) {
      const editable = cachedEditable === 'true'
      setMapEditable(editable)
      setEditMode(editable)
    }

    async function loadEditableState() {
      try {
        const { editable } = await api.isMapEditable(mapId)
        if (!cancelled) {
          localStorage.setItem(cacheKey, String(editable))
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
      queueMicrotask(() => {
        setLinkTypes([])
      })
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
    console.log('handleLinkCreate:', payload)
    // When starting a link edit, close any open side panels
    setActivePanel(null)
    setLinkDraft({ mode: 'create', ...payload })
  }

  function handleLinkEdit(payload: {
    linkId: number
    linkTypeId: number
    fromCountryId: string
    toCountryId: string
    existFrom: string | null
    existUntil: string | null
  }) {
    setActivePanel(null)
    setLinkDraft({
      mode: 'edit',
      linkId: payload.linkId,
      linkTypeId: payload.linkTypeId,
      fromCountryId: payload.fromCountryId,
      toCountryId: payload.toCountryId,
      existFrom: normalizeDateForInput(payload.existFrom, '1900-01-01'),
      existUntil: normalizeDateForInput(payload.existUntil, '9999-12-31'),
    })
  }

  async function handleLinkSave(form: { linkTypeId: number; existFrom: string; existUntil: string }): Promise<void> {
    if (!selectedMapId || !linkDraft) {
      return
    }

    const countryRows = await api.getCountries()
    const fromCountry = countryRows.find((country) => country.iso_id === linkDraft.fromCountryId)
    const toCountry = countryRows.find((country) => country.iso_id === linkDraft.toCountryId)

    if (!fromCountry?.capital_point_id || !toCountry?.capital_point_id) {
      throw new Error('国の首都座標が見つかりません')
    }

    if (linkDraft.mode === 'create') {
      await api.createLink({
        map_id: selectedMapId,
        link_type: form.linkTypeId,
        from_country: fromCountry.capital_point_id,
        to_country: toCountry.capital_point_id,
        exist_from: form.existFrom,
        exist_until: form.existUntil,
      })
      setRefreshLinkTypeId(form.linkTypeId)
      return
    }

    await api.updateLink(linkDraft.linkId, {
      map_id: selectedMapId,
      link_type: form.linkTypeId,
      from_country: fromCountry.capital_point_id,
      to_country: toCountry.capital_point_id,
      exist_from: form.existFrom,
      exist_until: form.existUntil,
    })

    // Refresh old type first so the moved/updated line is removed from its previous bucket.
    setRefreshLinkTypeId(linkDraft.linkTypeId)
    // Do not clear `linkDraft` here. Clearing is handled by LinkEditorPanel via `onClose`
    // after a successful save, so the draft remains visible until the panel closes.
  }

  async function handleLinkDelete(): Promise<void> {
    if (!linkDraft || linkDraft.mode !== 'edit') {
      return
    }

    await api.deleteLink(linkDraft.linkId)
    setRefreshLinkTypeId(linkDraft.linkTypeId)
  }

  function handleLogout() {
    localStorage.clear()
    setToken('')
    setDisplayName('')
    setRole('')
    setMaps([])
    setCountries([])
    setSelectedMapId(null)
    setActivePanel(null)
    setShowCreateMapPanel(false)
    setLoadingError('')
    setMobileMenuOpen(false)
  }

  async function refreshCountries() {
    const countryRows: Country[] = await api.getCountries()
    const coordMap = await api.getCountriesCoordinates()
    const countriesWithCoordinates = countryRows.map((country) => ({
      id: country.iso_id,
      name_ja: country.name_ja,
      capital_point_id: country.capital_point_id,
      lat: coordMap[country.iso_id]?.lat ?? 0,
      lng: coordMap[country.iso_id]?.lng ?? 0,
    }))

    setCountries(countriesWithCoordinates)
  }

  useEffect(() => {
    if (selectedMapId != null) {
      localStorage.setItem('selectedMapId', String(selectedMapId))
    } else {
      localStorage.removeItem('selectedMapId')
    }
  }, [selectedMapId])

  if (!token) {
    return <LoginPage onLogin={handleLogin} />
  }

  const headerStyle: React.CSSProperties = {
    position: 'relative',
    zIndex: 40,
    background: 'rgba(8, 17, 31, 0.88)',
    color: 'white',
    minHeight: APP_HEADER_HEIGHT,
    height: isMobile ? 'auto' : APP_HEADER_HEIGHT,
    padding: isMobile ? '10px 12px' : '0 16px',
    boxSizing: 'border-box',
    display: 'flex',
    alignItems: isMobile ? 'flex-start' : 'center',
    gap: 12,
    flexWrap: isMobile ? 'wrap' : 'nowrap',
    backdropFilter: 'blur(10px)',
    boxShadow: '0 1px 0 rgba(255,255,255,0.08)',
  }

  const headerButtonStyle: React.CSSProperties = {
    padding: '7px 12px',
    borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.18)',
    background: 'rgba(15, 23, 42, 0.95)',
    color: 'white',
    cursor: 'pointer',
    fontSize: 13,
  }

  const mobilePanelButtonStyle: React.CSSProperties = {
    ...headerButtonStyle,
    width: '100%',
    textAlign: 'left',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#08111f' }}>
      <div style={headerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: isMobile ? '100%' : 'auto' }}>
          <span style={{ fontWeight: 700, fontSize: 16 }}>Geovisula</span>
          {isMobile && (
            <button onClick={() => setMobileMenuOpen((current) => !current)} style={headerButtonStyle}>
              {mobileMenuOpen ? 'メニューを閉じる' : 'メニュー'}
            </button>
          )}
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#dbe4f0', width: isMobile ? '100%' : 'auto' }}>
          マップ
          <select
            value={selectedMapId ?? ''}
            onChange={(event) => {
              const v = event.target.value
              if (v === '__create_new') {
                setShowCreateMapPanel(true)
                return
              }
              setSelectedMapId(v ? Number(v) : null)
            }}
            style={{
              minWidth: isMobile ? 'min(100%, 240px)' : 220,
              width: isMobile ? '100%' : 'auto',
              padding: '7px 10px',
              borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.18)',
              background: 'rgba(15, 23, 42, 0.95)',
              color: 'white',
            }}
          >
            {maps.length === 0 && <option value="">読み込み中...</option>}
            <option value="__create_new">(マップを新規作成...)</option>
            {maps.map((map) => (
              <option key={map.id} value={map.id}>
                {map.name_ja}
              </option>
            ))}
          </select>
        </label>

        {selectedMap && !isMobile && (
          <span style={{ fontSize: 12, color: '#9fb2cc' }}>
            {selectedMap.read_permission} / {selectedMap.edit_permission}
          </span>
        )}

        <span style={{ flex: 1, display: isMobile ? 'none' : 'block' }} />

        {loadingError && !isMobile && <span style={{ fontSize: 12, color: '#fda4af' }}>{loadingError}</span>}

        {mapEditable && !isMobile && (
          <>
            <button
              onClick={() => setActivePanel(activePanel === 'mapEditor' ? null : 'mapEditor')}
              style={headerButtonStyle}
            >
              マップ編集
            </button>

            <button
              onClick={() => setActivePanel(activePanel === 'linkTypes' ? null : 'linkTypes')}
              style={headerButtonStyle}
            >
              リンクタイプ編集
            </button>
          </>
        )}
        
        {mapEditable && (
          <button
            onClick={() => setEditMode(!editMode)}
            style={{
              ...headerButtonStyle,
              background: editMode ? 'rgba(34, 197, 94, 0.12)' : 'rgba(15, 23, 42, 0.95)',
              color: editMode ? '#86efac' : 'white',
              fontWeight: editMode ? 700 : 400,
            }}
          >
            {editMode ? 'リンクを編集中' : 'リンクを編集する'}
          </button>
        )}

        {role === 'admin' && !isMobile && (
          <button
            onClick={() => setActivePanel(activePanel === 'countryManager' ? null : 'countryManager')}
            style={headerButtonStyle}
          >
            国管理
          </button>
        )}

        <span style={{ fontSize: 13, color: '#dbe4f0', display: isMobile ? 'none' : 'inline' }}>
          {displayName}（{role}）
        </span>

        {!isMobile && (
          <button onClick={handleLogout} style={headerButtonStyle}>
            ログアウト
          </button>
        )}
      </div>

      {isMobile && mobileMenuOpen && (
        <div
          style={{
            position: 'absolute',
            top: APP_HEADER_HEIGHT,
            right: 12,
            zIndex: 45,
            width: 'min(100vw - 24px, 320px)',
            background: 'rgba(8, 17, 31, 0.98)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 14,
            padding: 12,
            boxShadow: '0 16px 40px rgba(0,0,0,0.28)',
          }}
        >
          <div style={{ display: 'grid', gap: 10 }}>
            <div style={{ fontSize: 12, color: '#9fb2cc' }}>
              {displayName}（{role}）
            </div>

            {selectedMap && (
              <div style={{ fontSize: 12, color: '#dbe4f0' }}>
                {selectedMap.read_permission} / {selectedMap.edit_permission}
              </div>
            )}

            {loadingError && <div style={{ fontSize: 12, color: '#fda4af' }}>{loadingError}</div>}

            {mapEditable && (
              <>
                <button onClick={() => { setActivePanel(activePanel === 'mapEditor' ? null : 'mapEditor'); setMobileMenuOpen(false) }} style={mobilePanelButtonStyle}>
                  マップ編集
                </button>
                <button onClick={() => { setActivePanel(activePanel === 'linkTypes' ? null : 'linkTypes'); setMobileMenuOpen(false) }} style={mobilePanelButtonStyle}>
                  リンクタイプ編集
                </button>
                <button onClick={() => { setEditMode(!editMode); setMobileMenuOpen(false) }} style={mobilePanelButtonStyle}>
                  {editMode ? 'リンクを編集中' : 'リンクを編集する'}
                </button>
              </>
            )}

            {role === 'admin' && (
              <button onClick={() => { setActivePanel(activePanel === 'countryManager' ? null : 'countryManager'); setMobileMenuOpen(false) }} style={mobilePanelButtonStyle}>
                国管理
              </button>
            )}

            <button onClick={() => { handleLogout(); setMobileMenuOpen(false) }} style={mobilePanelButtonStyle}>
              ログアウト
            </button>
          </div>
        </div>
      )}

      <div style={{ position: 'relative', flex: 1, minHeight: 0 }}>
        <MapView
          mapId={selectedMapId}
          editMode={editMode}
          onLinkCreate={handleLinkCreate}
          onLinkEdit={handleLinkEdit}
          activeDraft={linkDraft?.mode === 'create' ? linkDraft : null}
          mapDataRefreshKey={mapDataRefreshKey}
          refreshLinkTypeId={refreshLinkTypeId}
          onLinksRefreshed={() => {
            // clear the trigger once MapView handled the partial refresh
            setRefreshLinkTypeId(null)
          }}
        />
      </div>

      {linkDraft && selectedMap && (
        <LinkEditorPanel
          draft={linkDraft}
          linkTypes={linkTypes}
          onClose={() => {
            console.log('App: LinkEditorPanel onClose -> clearing linkDraft')
            setLinkDraft(null)
          }}
          onSave={handleLinkSave}
          onDelete={linkDraft.mode === 'edit' ? handleLinkDelete : undefined}
        />
      )}

      {/* debug: log linkDraft changes */}
      <DebugLogger linkDraft={linkDraft} />

      {activePanel === 'mapEditor' && selectedMap && (
        <EditMapPanel
          map={selectedMap}
          onClose={() => setActivePanel(null)}
          onSaved={(updatedMap) => {
            setMaps((currentMaps) => currentMaps.map((map) => (map.id === updatedMap.id ? updatedMap : map)))
            setActivePanel(null)
          }}
        />
      )}

      {showCreateMapPanel && (
        <CreateMapPanel
          onClose={() => setShowCreateMapPanel(false)}
          onCreated={(map) => {
            setMaps((current) => [...current, map])
            setSelectedMapId(map.id)
            setShowCreateMapPanel(false)
          }}
        />
      )}

      {activePanel === 'linkTypes' && selectedMap && (
        <LinkTypesPanel
          mapId={selectedMap.id}
          linkTypes={linkTypes}
          onClose={() => setActivePanel(null)}
          onRefresh={async () => {
            const refreshedLinkTypes = await api.getLinkTypes(selectedMap.id)
            setLinkTypes(refreshedLinkTypes)
            setMapDataRefreshKey((current) => current + 1)
          }}
        />
      )}

      {activePanel === 'countryManager' && (
        <CountryManager
          role={role}
          countries={countries}
          onClose={() => setActivePanel(null)}
          onUpdate={() => {
            void refreshCountries()
          }}
        />
      )}
    </div>
  )
}

function DebugLogger({ linkDraft }: { linkDraft: LinkDraft | null }) {
  useEffect(() => {
    console.log('DebugLogger: linkDraft changed ->', linkDraft)
  }, [linkDraft])
  return null
}
