import { useState } from 'react'
import { api } from './api'
import { APP_HEADER_HEIGHT } from './layoutConstants'
import useViewport from './useViewport'

type Country = { id: string; name_ja: string; lat: number; lng: number }

type Props = {
  role:      string
  countries: Country[]
  onClose:   () => void
  onUpdate:  () => void  // 国リストを再取得するコールバック
}

const desktopPanelStyle: React.CSSProperties = {
  position: 'fixed', top: APP_HEADER_HEIGHT, right: 0, width: 440,
  height: `calc(100vh - ${APP_HEADER_HEIGHT}px)`, background: 'white', overflowY: 'auto',
  boxShadow: '-4px 0 24px rgba(0,0,0,0.15)', padding: 24, zIndex: 2000,
}
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', marginBottom: 10,
  border: '1px solid #ddd', borderRadius: 6, fontSize: 14,
  boxSizing: 'border-box',
}
const btnStyle = (color: string): React.CSSProperties => ({
  padding: '8px 14px', background: color, color: 'white',
  border: 'none', borderRadius: 6, cursor: 'pointer',
  fontSize: 13, marginRight: 8,
})

export default function CountryManager({ role, countries, onClose, onUpdate }: Props) {
  const { isMobile } = useViewport()
  const [form, setForm] = useState({ id: '', name: '', name_ja: '', lat: '', lng: '' })
  const [message, setMessage] = useState('')

  const isAdmin = role === 'admin'

  const panelStyle: React.CSSProperties = isMobile
    ? {
        position: 'fixed',
        top: APP_HEADER_HEIGHT,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: `calc(100vh - ${APP_HEADER_HEIGHT}px)`,
        background: 'white',
        overflowY: 'auto',
        boxShadow: 'none',
        padding: 16,
        zIndex: 2000,
        boxSizing: 'border-box',
      }
    : desktopPanelStyle

  async function handleAdd() {
    setMessage('')
    if (!form.id || !form.name || !form.name_ja || !form.lat || !form.lng) {
      setMessage('エラー: すべての項目を入力してください')
      return
    }
    try {
      await api.addCountry({
        id:    form.id.toLowerCase().trim(),
        name:  form.name.trim(),
        name_ja: form.name_ja.trim(),
        lat:     parseFloat(form.lat),
        lng:     parseFloat(form.lng),
      })
      setMessage(`${form.name_ja} を追加しました`)
      setForm({ id: '', name: '', name_ja: '', lat: '', lng: '' })
      onUpdate()
    } catch (error: unknown) {
      setMessage(`エラー: ${error instanceof Error ? error.message : '不明なエラーです'}`)
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`${name} を削除しますか？関連する外交データも影響を受ける可能性があります。`)) return
    setMessage('')
    try {
      await api.deleteCountry(id)
      setMessage(`${name} を削除しました`)
      onUpdate()
    } catch (error: unknown) {
      setMessage(`エラー: ${error instanceof Error ? error.message : '不明なエラーです'}`)
    }
  }

  return (
    <div style={panelStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h3 style={{ margin: 0 }}>国の管理</h3>
        <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>✕</button>
      </div>

      {!isAdmin && (
        <p style={{ color: '#999', fontSize: 14 }}>
          国の追加・削除は管理者のみ行えます。
        </p>
      )}

      {message && (
        <div style={{
          padding: '10px 14px', borderRadius: 6, marginBottom: 16, fontSize: 13,
          background: message.startsWith('エラー') ? '#fdecea' : '#e8f5e9',
          color:      message.startsWith('エラー') ? '#c0392b' : '#27ae60',
        }}>
          {message}
        </div>
      )}

      {/* 追加フォーム（adminのみ） */}
      {isAdmin && (
        <div style={{ marginBottom: 24, padding: 16, background: '#f8f9fa', borderRadius: 8 }}>
          <div style={{ fontWeight: 500, marginBottom: 12, fontSize: 14 }}>新しい国を追加</div>
          <label style={{ fontSize: 12, color: '#666' }}>国ID（ISOコード2文字）</label>
          <input style={inputStyle} placeholder="FR" maxLength={2}
            value={form.id} onChange={e => setForm({ ...form, id: e.target.value })} />
          <label style={{ fontSize: 12, color: '#666' }}>国名（英語）</label>
          <input style={inputStyle} placeholder="France"
            value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          <label style={{ fontSize: 12, color: '#666' }}>国名（日本語）</label>
          <input style={inputStyle} placeholder="フランス"
            value={form.name_ja} onChange={e => setForm({ ...form, name_ja: e.target.value })} />
          <label style={{ fontSize: 12, color: '#666' }}>緯度（例: 46.2276）</label>
          <input style={inputStyle} placeholder="46.2276"
            value={form.lat} onChange={e => setForm({ ...form, lat: e.target.value })} />
          <label style={{ fontSize: 12, color: '#666' }}>経度（例: 2.2137）</label>
          <input style={inputStyle} placeholder="2.2137"
            value={form.lng} onChange={e => setForm({ ...form, lng: e.target.value })} />
          <button style={btnStyle('#3498db')} onClick={handleAdd}>追加する</button>
          <div style={{ marginTop: 8, fontSize: 11, color: '#999' }}>
            ISOコードは以下のwikipediaで調べられます。
            <a href="https://ja.wikipedia.org/wiki/ISO_3166-1" target="_blank" rel="noopener noreferrer" style={{ color: '#3498db', textDecoration: 'underline' }}>
              https://ja.wikipedia.org/wiki/ISO_3166-1
            </a>
            <br></br>
            緯度経度はGoogle マップで調べられます（地図上で右クリック→座標をコピー）
          </div>
        </div>
      )}

      {/* 国一覧 */}
      <div style={{ fontWeight: 500, marginBottom: isMobile ? 48 : 10, fontSize: 14 }}>
        登録済みの国（{countries.length}件）
      </div>
      {countries.map(c => (
        <div key={c.id} style={{
          display: 'flex', alignItems: 'center',
          padding: '10px 12px', marginBottom: 8,
          border: '1px solid #eee', borderRadius: 8,
        }}>
          <div style={{ flex: 1 }}>
            <span style={{ fontWeight: 500 }}>{c.name_ja}</span>
            <span style={{ marginLeft: 8, fontSize: 12, color: '#999' }}>{c.id}</span>
            <div style={{ fontSize: 11, color: '#bbb', marginTop: 2 }}>
              {c.lat}, {c.lng}
            </div>
          </div>
          {isAdmin && (
            <button
              onClick={() => handleDelete(c.id, c.name_ja)}
              style={{
                padding: '4px 10px', background: 'white', border: '1px solid #e74c3c',
                color: '#e74c3c', borderRadius: 4, cursor: 'pointer', fontSize: 12,
              }}
            >
              削除
            </button>
          )}
        </div>
      ))}
    </div>
  )
}