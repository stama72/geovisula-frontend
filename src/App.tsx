import { useRef, useEffect, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css';
import './App.css'
import { api } from './api'
import LoginPage from './LoginPage'


type Country = {
  iso_id:   string
  name:     string
  name_ja:  string
  lat:      number
  lng:      number
  exist_from : Date
  exist_until : Date
  summary: string
  summary_ja: string
}

type RelationLink = {
  map_id: number
  link_type: number
  from_country: number
  to_country: number
  exist_from: Date
  exist_until: Date
}

type LinkDetails = {
  link_id: number
  summary: string
  summary_ja: string
  source_url: string
}
type Map = {
    id: number
    name: string
    name_ja: string
    owner_id: number
    read_permission: string
    edit_permission: string
    exist_from: Date
    exist_until: Date
    time_scale: string
    summary: string
    summary_jp: string
    regulations: string
}
type LinkType = {
    id: number
    name: string
    name_ja: string
    map_id: number
    color: string
    animated: boolean
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

  // 認証状態
  const [token, setToken]               = useState(localStorage.getItem('token') ?? '')
  const [displayName, setDisplayName]   = useState(localStorage.getItem('displayName') ?? '')
  const [role, setRole]                 = useState(localStorage.getItem('role') ?? '')
  const [showEditor, setShowEditor]     = useState(false)
  
  const [showCountryManager, setShowCountryManager] = useState(false)

  // Map data
  const [map, setMap] = useState<Map | null>(null)
  const [linkTypes, setLinkTypes] = useState<LinkType[]>([])

  // Map Box
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const mapContainerRef = useRef<HTMLDivElement>(null)

  const [lng, setLng] = useState(139.6917);
  const [lat, setLat] = useState(35.6895);
  const [zoom, setZoom] = useState(2);

  useEffect(() => {
    api.getCountries().then(setCountries)
  }, [])

  // 認証の有無で表示を切り替え
  const accountActions = () => {
    //if(token) {
      return (
        <button onClick={handleLogout} style={{
          padding: '4px 12px', borderRadius: 4, border: '1px solid #ccc',
          background: 'white', cursor: 'pointer', fontSize: 13,
        }}>
          ログアウト
        </button>
      );
    /*} else {(
        <button onClick={handleLoginClick} style={{
          padding: '4px 12px', borderRadius: 4, border: '1px solid #ccc',
          background: 'white', cursor: 'pointer', fontSize: 13,
        }}>
          ログイン/登録
        </button>)
    };*/
  };


  function handleLogin(newToken: string, name: string, userRole: string) {
    setToken(newToken)
    setDisplayName(name)
    setRole(userRole)
    localStorage.setItem('displayName', name)
    localStorage.setItem('role', userRole)
  }
  /*
  function handleLoginClick() {
    return (<LoginPage onLogin={handleLogin} />)
  }
  */

  if (!token) {
    return (<LoginPage onLogin={handleLogin} />)
  }

  function handleLogout() {
    localStorage.clear()
    setToken(''); setDisplayName(''); setRole('')
  }
 
  function reloadCountries() {
    api.getCountries().then(setCountries)
  }

  function createGeometry(doesCrossAntimeridian: boolean,lat1: number, lng1: number, lat2: number, lng2: number) {
    const geometry = {
      type: 'LineString' as const,
      coordinates: [
          [lng1, lat1],
          [lng2, lat2]
      ] as [number, number][]
    } as const;

    // To draw a line across the 180th meridian,
    // if the longitude of the second point minus
    // the longitude of original (or previous) point is >= 180,
    // subtract 360 from the longitude of the second point.
    // If it is less than 180, add 360 to the second point.
    if (doesCrossAntimeridian) {
      const startLng = geometry.coordinates[0][0];
      const endLng = geometry.coordinates[1][0];

      if (endLng - startLng >= 180) {
        geometry.coordinates[1][0] -= 360;
      } else if (endLng - startLng < 180) {
        geometry.coordinates[1][0] += 360;
      }
    }
    return geometry;
  }


  useEffect(() => {
    mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN ?? '';

    mapRef.current = new mapboxgl.Map({
      container: mapContainerRef.current as HTMLElement,
      style: 'mapbox://styles/mapbox/standard',
      center: [lng, lat],
      zoom: zoom,
      antialias: true,
    });

    mapRef.current.on('load', () => {
      if (!mapRef.current) return;
      mapRef.current.addLayer({
        id: 'route',
        type: 'line',
        source: {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: createGeometry(false, -16.59408, -72.42187, 35.67514, 140.27343)
          }
        },
        layout: { 'line-cap': 'round' },
        paint: {
          'line-color': '#007296',
          'line-width': 4
        }
      });

      mapRef.current.addLayer({
        id: 'route-label',
        type: 'symbol',
        source: 'route',
        layout: {
          'symbol-placement': 'line-center',
          'text-field': 'Crosses the world'
        }
      });

      mapRef.current.addLayer({
        id: 'route-two',
        type: 'line',
        source: {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: createGeometry(true, 35.67514, 140.27343, -16.59408, -72.42187)
          }
        },
        layout: { 'line-cap': 'round' },
        paint: {
          'line-color': '#F06317',
          'line-width': 4
        }
      });
      //ラベル
      mapRef.current.addLayer({
        id: 'route-two-label',
        type: 'symbol',
        source: 'route-two',
        layout: {
          'symbol-placement': 'line-center',
          'text-field': 'Crosses 180th meridian'
        }
      });
    });

    return () => {
      mapRef.current?.remove();
    };
  }, []);

  // 地図画面
  return (
    <div style={{ position: 'relative', height: '100vh' }}>

      {/* ヘッダー */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1000,
        background: 'rgba(255,255,255,0.95)', padding: '8px 16px',
        display: 'flex', alignItems: 'center', gap: 12,
        boxShadow: '0 1px 6px rgba(0,0,0,0.1)',
      }}>
        <span style={{ fontWeight: 600, fontSize: 16, color: '#2c3e50' }}>GeoVisula</span>
        <span style={{ flex: 1 }} />
        
        {/* 関係性の凡例 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 8 }}>
          {Object.entries(linkTypes).map(([label, color]) => (
            <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 12 }}>
              <span style={{
                display: 'inline-block', width: 24, height: 3,
                background: `rgba(${color}, 0.8)`, borderRadius: 2,
              }} />
              {label}
            </span>
          ))}
        </div>

        {/* 編集ボタン */}
        <button onClick={() => setShowEditor(true)} style={{
          padding: '4px 14px', borderRadius: 4, border: 'none',
          background: '#2ecc71', color: 'white', cursor: 'pointer', fontSize: 13,
        }}>
          マップ編集
        </button>
        
        {/* 国管理ボタン（adminのみ） */}
        <button onClick={() => setShowCountryManager(true)} style={{
          padding: '4px 14px', borderRadius: 4, border: 'none',
          background: '#e67e22', color: 'white', cursor: 'pointer', fontSize: 13,
        }}>
          国データ管理
        </button>

        {/* ユーザー情報 */}
        <span style={{ fontSize: 13, color: '#555' }}>{displayName}（{role}）</span>
        {accountActions()}
      </div>

      {/* 地図 Mapbox*/}      
      <div id='map-container' ref={mapContainerRef}/>
      {/* フッター */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 1000,
        background: 'rgba(255,255,255,0)', padding: '8px 16px',
        display: 'flex', alignItems: 'center', gap: 12,
        boxShadow: '0 -1px 6px rgba(0,0,0,0.1)',
      }}>
      </div>
    </div>
  )
}
