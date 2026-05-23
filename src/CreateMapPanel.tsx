import { useState } from 'react'
import { api } from './api'
import { APP_HEADER_HEIGHT } from './layoutConstants'
import type { MapRecord } from './types'

type Props = {
  onClose: () => void
  onCreated: (map: MapRecord) => void
}

const panelStyle: React.CSSProperties = {
  position: 'fixed',
  top: APP_HEADER_HEIGHT + 12 ,
  left: '50%',
  transform: 'translate(-50%, 0%)',
  width: 640,
  maxHeight: `calc(100vh - ${APP_HEADER_HEIGHT + 40}px)`,
  background: 'rgba(255,255,255,0.98)',
  boxShadow: '0 10px 40px rgba(15, 23, 42, 0.18)',
  borderRadius: 12,
  zIndex: 2000,
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

export default function CreateMapPanel({ onClose, onCreated }: Props) {
  const [form, setForm] = useState({
    name: '',
    name_ja: '',
    read_permission: 'private',
    edit_permission: 'private',
    exist_from: '1900-01-01',
    exist_until: '9999-12-31',
    time_scale: 'one_year',
    summary: '',
    summary_jp: '',
    regulations: '',
  })
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleCreate() {
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
      const created = await api.createMap({
        name: form.name.trim(),
        name_ja: form.name_ja.trim(),
        read_permission: form.read_permission,
        edit_permission: form.edit_permission,
        exist_from: form.exist_from,
        exist_until: form.exist_until,
        time_scale: form.time_scale,
        summary: form.summary,
        summary_jp: form.summary_jp,
        regulations: form.regulations,
      })
      onCreated(created)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'マップの作成に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  return (
    <aside style={panelStyle}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 12, color: '#64748b' }}>マップ新規作成</div>
          <h3 style={{ margin: '4px 0 0', fontSize: 18 }}>{form.name_ja || '新しいマップ'}</h3>
        </div>
        <button onClick={onClose} style={{ ...buttonStyle('secondary'), width: 40, height: 40, padding: 0 }}>
          ✕
        </button>
      </div>

      <label style={{ display: 'block', marginBottom: 12, fontSize: 13, color: '#334155' }}>
        Map Name
        <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} style={{ ...inputStyle, marginTop: 6 }} />
      </label>

      <label style={{ display: 'block', marginBottom: 12, fontSize: 13, color: '#334155' }}>
        マップ名
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
          public：全員が閲覧/編集できます。
          shared：(準備中)
      </label>

      <label style={{ display: 'block', marginBottom: 12, fontSize: 13, color: '#334155' }}>
        説明（日本語）
        <textarea value={form.summary_jp} onChange={(event) => setForm({ ...form, summary_jp: event.target.value })} rows={4} style={{ ...inputStyle, marginTop: 6, resize: 'vertical' }} />
      </label>

      <label style={{ display: 'block', marginBottom: 12, fontSize: 13, color: '#334155' }}>
        Description (English) (optional)
        <textarea value={form.summary} onChange={(event) => setForm({ ...form, summary: event.target.value })} rows={4} style={{ ...inputStyle, marginTop: 6, resize: 'vertical' }} />
      </label>

      <label style={{ display: 'block', marginBottom: 16, fontSize: 13, color: '#334155' }}>
        共同編集ルール/ガイド (optional)
        <textarea value={form.regulations} onChange={(event) => setForm({ ...form, regulations: event.target.value })} rows={4} style={{ ...inputStyle, marginTop: 6, resize: 'vertical' }} />
      </label>
      <label style={{ display: 'block', marginBottom: 12, fontSize: 13, color: '#334155' }}>
          tips: 共同編集のためのルールや参考情報を記載する欄です。例：「外務省の国・地域のページに基づいた内容にしてください」「リンクタイプOOには～、XXは～を入れてください」「wikipediaのこのページが参考になります」など。
      </label>

      {message && (
        <div style={{ marginBottom: 12, padding: '10px 12px', borderRadius: 8, background: '#fef2f2', color: '#b91c1c', fontSize: 13 }}>
          {message}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={handleCreate} disabled={saving} style={{ ...buttonStyle('primary'), flex: 1 }}>
          {saving ? '作成中...' : 'マップを新規作成'}
        </button>
        <button onClick={onClose} style={{ ...buttonStyle('secondary'), flex: 1 }}>
          閉じる
        </button>
      </div>
    </aside>
  )
}
