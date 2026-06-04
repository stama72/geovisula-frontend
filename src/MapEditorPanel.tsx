import { useEffect, useState } from 'react'
import { api } from './api'
import { APP_HEADER_HEIGHT } from './layoutConstants'
import useViewport from './useViewport'
import type { MapRecord } from './types'

type BaseProps = {
  onClose: () => void
}

type CreateProps = BaseProps & {
  mode: 'create'
  onCreated: (map: MapRecord) => void
}

type EditProps = BaseProps & {
  mode: 'edit'
  map: MapRecord
  onSaved: (map: MapRecord) => void
}

type Props = CreateProps | EditProps

type MapFormState = {
  name: string
  name_ja: string
  owner_id: number
  read_permission: string
  edit_permission: string
  exist_from: string
  exist_until: string
  time_scale: string
  summary: string
  summary_jp: string
  regulations: string
}

const permissionOptions = ['private', 'shared', 'public'] as const
const timeScaleOptions = ['hundred_years', 'ten_years', 'five_years', 'one_year', 'one_month', 'one_week', 'one_day'] as const

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

function buildInitialForm(map?: MapRecord): MapFormState {
  return {
    name: map?.name ?? '',
    name_ja: map?.name_ja ?? '',
    owner_id: map?.owner ?? 0,
    read_permission: map?.read_permission ?? 'private',
    edit_permission: map?.edit_permission ?? 'private',
    exist_from: map?.exist_from ? map.exist_from.slice(0, 10) : '1900-01-01',
    exist_until: map?.exist_until ? map.exist_until.slice(0, 10) : '9999-12-31',
    time_scale: map?.time_scale ?? 'one_year',
    summary: map?.summary ?? '',
    summary_jp: map?.summary_jp ?? '',
    regulations: map?.regulations ?? '',
  }
}

function validateForm(form: MapFormState) {
  if (!form.name.trim() || !form.name_ja.trim()) {
    return 'マップ名を入力してください'
  }
  if (!form.exist_from || !form.exist_until) {
    return 'マップがカバーする期間を入力してください'
  }
  if (form.exist_from > form.exist_until) {
    return '開始時点は終了時点以前である必要があります'
  }
  if (form.exist_from < '1000-01-01') {
    return '開始時点は1000-01-01以降である必要があります'
  }
  if (form.exist_until > '9999-12-31') {
    return '終了時点は9999-12-31以前である必要があります'
  }

  return ''
}

export default function MapEditorPanel(props: Props) {
  const { isMobile } = useViewport()
  const [form, setForm] = useState<MapFormState>(() => buildInitialForm(props.mode === 'edit' ? props.map : undefined))
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (props.mode === 'edit') {
      setForm(buildInitialForm(props.map))
    }
  }, [props])

  const panelStyle: React.CSSProperties = isMobile
    ? {
        position: 'fixed',
        top: APP_HEADER_HEIGHT,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: `calc(100vh - ${APP_HEADER_HEIGHT}px)`,
        background: 'rgba(255,255,255,0.98)',
        boxShadow: 'none',
        borderRadius: 0,
        zIndex: props.mode === 'create' ? 2000 : 1600,
        padding: 16,
        overflowY: 'auto',
        boxSizing: 'border-box',
      }
    : props.mode === 'create'
      ? {
          position: 'fixed',
          top: APP_HEADER_HEIGHT + 12,
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
      : {
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

  const actionBarStyle: React.CSSProperties = isMobile
    ? {
        position: 'sticky',
        bottom: 30,
        margin: '0 -16px',
        padding: '12px 16px 16px',
        background: 'linear-gradient(to top, rgba(255,255,255,0.98) 70%, rgba(255,255,255,0))',
        backdropFilter: 'blur(8px)',
        borderTop: '1px solid rgba(203,213,225,0.8)',
      }
    : {
        display: 'flex',
        gap: 10,
      }

  async function handleSubmit() {
    setMessage('')

    const validationMessage = validateForm(form)
    if (validationMessage) {
      setMessage(validationMessage)
      return
    }

    setSaving(true)
    try {
      if (props.mode === 'create') {
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
        props.onCreated(created)
        return
      }

      const updated = await api.updateMap(props.map.id, {
        name: form.name.trim(),
        name_ja: form.name_ja.trim(),
        owner_id: form.owner_id,
        read_permission: form.read_permission,
        edit_permission: form.edit_permission,
        exist_from: form.exist_from,
        exist_until: form.exist_until,
        time_scale: form.time_scale,
        summary: form.summary,
        summary_jp: form.summary_jp,
        regulations: form.regulations,
      })
      props.onSaved(updated)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : props.mode === 'create' ? 'マップの作成に失敗しました' : 'マップの保存に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  const title = props.mode === 'create' ? 'マップ新規作成' : 'マップ編集'
  const currentName = form.name_ja || (props.mode === 'create' ? '新しいマップ' : props.map.name_ja)
  const submitLabel = props.mode === 'create' ? (saving ? '作成中...' : 'マップを新規作成') : (saving ? '保存中...' : '保存')

  return (
    <aside style={panelStyle}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 12, color: '#64748b' }}>{title}</div>
          <h3 style={{ margin: '4px 0 0', fontSize: 18 }}>{currentName}</h3>
        </div>
        <button onClick={props.onClose} style={{ ...buttonStyle('secondary'), width: 40, height: 40, padding: 0 }}>
          ✕
        </button>
      </div>

      <label style={{ display: 'block', marginBottom: 12, fontSize: 13, color: '#334155' }}>
        {props.mode === 'create' ? 'Map Name' : 'マップ名'}
        <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} style={{ ...inputStyle, marginTop: 6 }} />
      </label>

      <label style={{ display: 'block', marginBottom: 12, fontSize: 13, color: '#334155' }}>
        {props.mode === 'create' ? 'マップ名' : '日本語名'}
        <input value={form.name_ja} onChange={(event) => setForm({ ...form, name_ja: event.target.value })} style={{ ...inputStyle, marginTop: 6 }} />
      </label>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
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
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
        <label style={{ display: 'block', marginBottom: 12, fontSize: 13, color: '#334155' }}>
          閲覧
          <select value={form.read_permission} onChange={(event) => setForm({ ...form, read_permission: event.target.value })} style={{ ...inputStyle, marginTop: 6 }}>
            {permissionOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label style={{ display: 'block', marginBottom: 12, fontSize: 13, color: '#334155' }}>
          編集
          <select value={form.edit_permission} onChange={(event) => setForm({ ...form, edit_permission: event.target.value })} style={{ ...inputStyle, marginTop: 6 }}>
            {permissionOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label style={{ display: 'block', marginBottom: 12, fontSize: 13, color: '#334155', whiteSpace: 'pre-line' }}>
        private：自分だけが閲覧/編集できます。
        {'\n'}public：誰でも閲覧/編集できます。
        {'\n'}shared：(準備中)
      </label>

      <label style={{ display: 'block', marginBottom: 12, fontSize: 13, color: '#334155' }}>
        {props.mode === 'create' ? '説明 (optional)' : '説明'}
        <textarea value={form.summary_jp} onChange={(event) => setForm({ ...form, summary_jp: event.target.value })} rows={4} style={{ ...inputStyle, marginTop: 6, resize: 'vertical' }} />
      </label>

      <label style={{ display: 'block', marginBottom: isMobile ? 48 : 16, fontSize: 13, color: '#334155' }}>
        {props.mode === 'create' ? '編集ルール・ソースなど (optional)' : '編集ルール・ソースなど'}
        <textarea value={form.regulations} onChange={(event) => setForm({ ...form, regulations: event.target.value })} rows={4} style={{ ...inputStyle, marginTop: 6, resize: 'vertical' }} />
      </label>

      <div style={actionBarStyle}>
        {message && (
          <div style={{ marginBottom: 12, padding: '10px 12px', borderRadius: 8, background: '#fef2f2', color: '#b91c1c', fontSize: 13 }}>
            {message}
          </div>
        )}
        <button onClick={handleSubmit} disabled={saving} style={{ ...buttonStyle('primary'), flex: 1 }}>
          {submitLabel}
        </button>
        <button onClick={props.onClose} style={{ ...buttonStyle('secondary'), flex: 1, marginLeft: 'auto' }}>
          閉じる
        </button>
      </div>
    </aside>
  )
}