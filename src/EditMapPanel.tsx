import { useEffect, useState } from 'react'
import { api } from './api'
import { APP_HEADER_HEIGHT } from './layoutConstants'
import type { MapRecord } from './types'

type Props = {
  map: MapRecord
  onClose: () => void
  onSaved: (map: MapRecord) => void
}

const panelStyle: React.CSSProperties = {
  position: 'fixed',
  top: APP_HEADER_HEIGHT,
  right: 0,
  width: 440,
  height: `calc(100vh - ${APP_HEADER_HEIGHT}px)`,
  background: 'rgba(255,255,255,0.98)',
  boxShadow: '-6px 0 28px rgba(15, 23, 42, 0.18)',
  borderLeft: '1px solid rgba(148,163,184,0.3)',
  zIndex: 1600,
  padding: 20,
  overflowY: 'auto',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  border: '1px solid #cbd5e1',
  borderRadius: 8,
  padding: '9px 12px',
  fontSize: 14,
  background: '#fff',
}

const buttonStyle = (kind: 'primary' | 'secondary'): React.CSSProperties => ({
  padding: '9px 12px',
  borderRadius: 8,
  border: kind === 'primary' ? '1px solid #2563eb' : '1px solid #cbd5e1',
  background: kind === 'primary' ? '#2563eb' : '#fff',
  color: kind === 'primary' ? '#fff' : '#334155',
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: 600,
})

const permissionOptions = ['private', 'shared', 'public'] as const
const timeScaleOptions = ['hundred_years', 'ten_years', 'five_years', 'one_year', 'one_month', 'one_week', 'one_day'] as const

function dateValue(value: string | null) {
  return value ? value.slice(0, 10) : ''
}

export default function EditMapPanel({ map, onClose, onSaved }: Props) {
  const [form, setForm] = useState({
    name: map.name,
    name_ja: map.name_ja,
    owner_id: map.owner,
    read_permission: map.read_permission,
    edit_permission: map.edit_permission,
    exist_from: dateValue(map.exist_from),
    exist_until: dateValue(map.exist_until),
    time_scale: map.time_scale,
    summary: map.summary ?? '',
    summary_jp: map.summary_jp ?? '',
    regulations: map.regulations ?? '',
  })
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setForm({
      name: map.name,
      name_ja: map.name_ja,
      owner_id: map.owner,
      read_permission: map.read_permission,
      edit_permission: map.edit_permission,
      exist_from: dateValue(map.exist_from),
      exist_until: dateValue(map.exist_until),
      time_scale: map.time_scale,
      summary: map.summary ?? '',
      summary_jp: map.summary_jp ?? '',
      regulations: map.regulations ?? '',
    })
  }, [map])

  async function handleSave() {
    setMessage('')
    if (!form.name.trim() || !form.name_ja.trim()) {
      setMessage('マップ名を入力してください')
      return
    }
    if (!form.exist_from || !form.exist_until) {
      setMessage('マップがカバーする期間を入力してください')
      return
    }
    if (form.exist_from > form.exist_until) {
      setMessage('開始時点は終了時点以前である必要があります')
      return
    }
    if (form.exist_from < '1000-01-01') {
      setMessage('開始時点は1000-01-01以降である必要があります')
      return
    }
    if (form.exist_until > '9999-12-31') {
      setMessage('終了時点は9999-12-31以前である必要があります')
      return
    }

    setSaving(true)
    try {
      const updated = await api.updateMap(map.id, {
        ...form,
        name: form.name.trim(),
        name_ja: form.name_ja.trim(),
      })
      onSaved(updated)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'マップの保存に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  return (
    <aside style={panelStyle}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 12, color: '#64748b' }}>マップ編集</div>
          <h3 style={{ margin: '4px 0 0', fontSize: 18 }}>{map.name_ja}</h3>
        </div>
        <button onClick={onClose} style={{ ...buttonStyle('secondary'), width: 40, height: 40, padding: 0 }}>
          ✕
        </button>
      </div>

      <label style={{ display: 'block', marginBottom: 12, fontSize: 13, color: '#334155' }}>
        マップ名
        <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} style={{ ...inputStyle, marginTop: 6 }} />
      </label>

      <label style={{ display: 'block', marginBottom: 12, fontSize: 13, color: '#334155' }}>
        日本語名
        <input value={form.name_ja} onChange={(event) => setForm({ ...form, name_ja: event.target.value })} style={{ ...inputStyle, marginTop: 6 }} />
      </label>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <label style={{ display: 'block', marginBottom: 12, fontSize: 13, color: '#334155' }}>
          開始時点
          <input type="date" value={form.exist_from} onChange={(event) => setForm({ ...form, exist_from: event.target.value })} style={{ ...inputStyle, marginTop: 6 }} />
        </label>
        <label style={{ display: 'block', marginBottom: 12, fontSize: 13, color: '#334155' }}>
          終了時点
          <input type="date" value={form.exist_until} onChange={(event) => setForm({ ...form, exist_until: event.target.value })} style={{ ...inputStyle, marginTop: 6 }} />
        </label>
      </div>
      <label style={{ display: 'block', marginBottom: 12, fontSize: 13, color: '#334155' }}>
        tips: 終了時点をデフォルト値(9999-12-31)に設定すると、"マップ閲覧日現在まで"として設定できます。
      </label>
      <label style={{ display: 'block', marginBottom: 12, fontSize: 13, color: '#334155' }}>
        表示スケール(準備中)
        <select value={form.time_scale} onChange={(event) => setForm({ ...form, time_scale: event.target.value })} style={{ ...inputStyle, marginTop: 6 }}>
          {timeScaleOptions.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      </label>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <label style={{ display: 'block', marginBottom: 12, fontSize: 13, color: '#334155' }}>
          閲覧
          <select value={form.read_permission} onChange={(event) => setForm({ ...form, read_permission: event.target.value })} style={{ ...inputStyle, marginTop: 6 }}>
            {permissionOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </label>
        <label style={{ display: 'block', marginBottom: 12, fontSize: 13, color: '#334155' }}>
          編集
          <select value={form.edit_permission} onChange={(event) => setForm({ ...form, edit_permission: event.target.value })} style={{ ...inputStyle, marginTop: 6 }}>
            {permissionOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </label>
      </div>
      <label style={{ display: 'block', marginBottom: 12, fontSize: 13, color: '#334155' }}>
          private：自分だけが閲覧/編集できます。
          public：誰でも閲覧/編集できます。
          shared：(準備中)
      </label>

      <label style={{ display: 'block', marginBottom: 12, fontSize: 13, color: '#334155' }}>
        概要（英語）
        <textarea value={form.summary} onChange={(event) => setForm({ ...form, summary: event.target.value })} rows={4} style={{ ...inputStyle, marginTop: 6, resize: 'vertical' }} />
      </label>

      <label style={{ display: 'block', marginBottom: 12, fontSize: 13, color: '#334155' }}>
        概要（日本語）
        <textarea value={form.summary_jp} onChange={(event) => setForm({ ...form, summary_jp: event.target.value })} rows={4} style={{ ...inputStyle, marginTop: 6, resize: 'vertical' }} />
      </label>

      <label style={{ display: 'block', marginBottom: 16, fontSize: 13, color: '#334155' }}>
        編集ルール・ソースなど
        <textarea value={form.regulations} onChange={(event) => setForm({ ...form, regulations: event.target.value })} rows={4} style={{ ...inputStyle, marginTop: 6, resize: 'vertical' }} />
      </label>

      {message && (
        <div style={{ marginBottom: 12, padding: '10px 12px', borderRadius: 8, background: '#fef2f2', color: '#b91c1c', fontSize: 13 }}>
          {message}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={handleSave} disabled={saving} style={{ ...buttonStyle('primary'), flex: 1 }}>
          {saving ? '保存中...' : '保存'}
        </button>
        <button onClick={onClose} style={{ ...buttonStyle('secondary'), flex: 1 }}>
          閉じる
        </button>
      </div>
    </aside>
  )
}