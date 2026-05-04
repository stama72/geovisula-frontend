import { useRef, useEffect, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { api } from './api'
import LoginPage from './LoginPage'
import DiplomaticEditor from './DiplomaticEditor'
import CountryManager from './CountryManager'
import HistoryPage from './HistoryPage'

type Country = { id: string; name_ja: string; lat: number; lng: number }
type TradeLink = { from: string; to: string; value: number; category: string; year: number }
type DiplomaticRelation = {
  id: number
  country_a: string
  country_b: string
  relation_type: string
  summary: string
  source_url: string
}

const CATEGORIES = [
  { value: '',       label: 'すべて' },
  { value: 'food',   label: '食料' },
  { value: 'energy', label: 'エネルギー' },
]

const RELATION_COLORS: Record<string, string> = {
  '同盟':   '#8f44ad',
  '友好的': '#27ae60',
  '中立':   '#95a5a6',
  '緊張':   '#e67e22',
  '対立':   '#e74c3c',
}

function getCurvedPoints(
  from: [number, number], to: [number, number],
  direction: 1 | -1 = 1, numPoints = 40
): [number, number][] {
  const points: [number, number][] = []
  const dLat = to[0] - from[0], dLng = to[1] - from[1]
  const len   = Math.sqrt(dLat * dLat + dLng * dLng)
  const perpLat = -dLng / len, perpLng = dLat / len
  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints
    const offset = direction * len * 0.015 * Math.sin(Math.PI * t)
    points.push([from[0] + dLat * t + perpLat * offset, from[1] + dLng * t + perpLng * offset])
  }
  return points
}

export default function App() {
  const [countries, setCountries]   = useState<Country[]>([])
  const [category, setCategory]     = useState('')
  const [year, setYear]             = useState(2023)

  const [token, setToken]               = useState(localStorage.getItem('token') ?? '')
  const [displayName, setDisplayName]   = useState(localStorage.getItem('displayName') ?? '')
  const [role, setRole]                 = useState(localStorage.getItem('role') ?? '')
  const [showEditor, setShowEditor]     = useState(false)
  
  const [diplomaticLinks, setDiplomaticLinks] = useState<DiplomaticRelation[]>([])
  const [showCountryManager, setShowCountryManager] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  const mapRef = useRef<mapboxgl.Map | null>(null)
  const mapContainerRef = useRef<HTMLDivElement>(null)

  const [lng, setLng] = useState(139.6917)
  const [lat, setLat] = useState(35.6895)
  const [zoom, setZoom] = useState(2)

  useEffect(() => {
    api.getCountries().then(setCountries)
  }, [])

  useEffect(() => {
    api.getTradeLinks(category || undefined, year).then(setTradeLinks)
  }, [category, year])

  useEffect(() => {
  if (!token) return
  api.getApprovedRelations().then(setDiplomaticLinks)
  }, [token])

  function handleLogin(newToken: string, name: string, userRole: string) {
    setToken(newToken)
    setDisplayName(name)
    setRole(userRole)
    localStorage.setItem('displayName', name)
    localStorage.setItem('role', userRole)
  }

  function handleLogout() {
    localStorage.clear()
    setToken(''); setDisplayName(''); setRole('')
  }
 
  function reloadCountries() {
    api.getCountries().then(setCountries)
  }

  useEffect(() => {
    // Load Mapbox token from environment variable
    const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN
    if (!mapboxToken) {
      console.error('VITE_MAPBOX_TOKEN is not set in .env')
      return
    }
    mapboxgl.accessToken = mapboxToken

    mapRef.current = new mapboxgl.Map({
      container: mapContainerRef.current as HTMLElement,
      style: 'mapbox://styles/mapbox/standard',
      center: [lng, lat],
      zoom: zoom,
      antialias: true,
    })

    return () => {
      mapRef.current?.remove()
    }
  }, [])

  // 未ログインはログイン画面を表示
  if (!token) return <LoginPage onLogin={handleLogin} />

  return (
    <div style={{ position: 'relative', height: '100vh' }}>

      {/* ヘッダー */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1000,
        background: 'rgba(255,255,255,0.95)', padding: '8px 16px',
        display: 'flex', alignItems: 'center', gap: 12,
        boxShadow: '0 1px 6px rgba(0,0,0,0.1)',
      }}>
        <span style={{ fontWeight: 600, fontSize: 16, color: '#2c3e50' }}>Diplomap</span>
        <span style={{ flex: 1 }} />
        
        {/* 外交関係の凡例 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 8 }}>
          {Object.entries(RELATION_COLORS).map(([label, color]) => (
            <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 12 }}>
              <span style={{
                display: 'inline-block', width: 24, height: 3,
                background: color, borderRadius: 2,
              }} />
              {label}
            </span>
          ))}
        </div>

        {/* カテゴリーフィルター */}
        {CATEGORIES.map(c => (
          <button key={c.value} onClick={() => setCategory(c.value)} style={{
            padding: '4px 12px', borderRadius: 4, border: '1px solid #ccc',
            cursor: 'pointer', fontSize: 13,
            background: category === c.value ? '#3498db' : 'white',
            color:      category === c.value ? 'white'   : '#333',
          }}>
            {c.label}
          </button>
        ))}

        {/* シークバー */}
        <span style={{ fontSize: 13, color: '#555' }}>年: {year}</span>
        <input type="range" min={2021} max={2023} value={year}
          onChange={e => setYear(Number(e.target.value))} style={{ width: 100 }} />

        {/* 編集ボタン */}
        <button onClick={() => setShowEditor(true)} style={{
          padding: '4px 14px', borderRadius: 4, border: 'none',
          background: '#2ecc71', color: 'white', cursor: 'pointer', fontSize: 13,
        }}>
          外交データ編集
        </button>
        
        {/* 国管理ボタン（adminのみ） */}
        <button onClick={() => setShowCountryManager(true)} style={{
          padding: '4px 14px', borderRadius: 4, border: 'none',
          background: '#e67e22', color: 'white', cursor: 'pointer', fontSize: 13,
        }}>
          国の管理
        </button>

        {/*編集履歴 */}
        <button onClick={() => setShowHistory(true)} style={{
          padding: '4px 14px', borderRadius: 4, border: 'none',
          background: '#2c3e50', color: 'white', cursor: 'pointer', fontSize: 13,
        }}>
          編集履歴
        </button>

        {/* ユーザー情報 */}
        <span style={{ fontSize: 13, color: '#555' }}>{displayName}（{role}）</span>
        <button onClick={handleLogout} style={{
          padding: '4px 12px', borderRadius: 4, border: '1px solid #ccc',
          background: 'white', cursor: 'pointer', fontSize: 13,
        }}>
          ログアウト
        </button>
      </div>

      {/* 地図 */}
      <div id="map-container" ref={mapContainerRef} style={{ height: '100%', width: '100%' }} />

      {/* 外交データ編集パネル */}
      {showEditor && (
        <DiplomaticEditor role={role} onClose={() => setShowEditor(false)} countries={countries}  />
      )}

      {/* 国管理パネル */}
      {showCountryManager && (
        <CountryManager
          role={role}
          countries={countries}
          onClose={() => setShowCountryManager(false)}
          onUpdate={reloadCountries}
        />
      )}
      {/* 編集履歴パネル */}
      {showHistory && (
        <HistoryPage onClose={() => setShowHistory(false)} />
      )}
    </div>
  )
}
