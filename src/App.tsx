import { useEffect, useState } from 'react'
import './App.css'
import { api } from './api'
import CountryManager from './CountryManager'
import LoginPage from './LoginPage'
import MapView from './MapView'
import type { Country, CountryCoordinates, CountryEditorEntry, MapRecord } from './types'

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token') ?? '')
  const [displayName, setDisplayName] = useState(localStorage.getItem('displayName') ?? '')
  const [role, setRole] = useState(localStorage.getItem('role') ?? '')
  const [maps, setMaps] = useState<MapRecord[]>([])
  const [selectedMapId, setSelectedMapId] = useState<number | null>(null)
  const [countries, setCountries] = useState<CountryEditorEntry[]>([])
  const [showCountryManager, setShowCountryManager] = useState(false)
  const [loadingError, setLoadingError] = useState('')

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

  function handleLogin(newToken: string, name: string, userRole: string) {
    setToken(newToken)
    setDisplayName(name)
    setRole(userRole)
    localStorage.setItem('token', newToken)
    localStorage.setItem('displayName', name)
    localStorage.setItem('role', userRole)
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

  const selectedMap = maps.find((map) => map.id === selectedMapId) ?? null

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
        <span style={{ fontWeight: 700, fontSize: 16 }}>Diplomap</span>

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
                {map.name_ja} / {map.name}
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

      <MapView mapId={selectedMapId} />

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
