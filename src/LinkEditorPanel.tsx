import { useEffect, useState } from 'react'
import { APP_HEADER_HEIGHT } from './layoutConstants'
import type { LinkType } from './types'

type Draft = {
  fromCountryId: string
  toCountryId: string
  fromCoords: [number, number]
  toCoords: [number, number]
}

type Props = {
  draft: Draft
  linkTypes: LinkType[]
  onClose: () => void
  onSave: (form: { linkTypeId: number; existFrom: string; existUntil: string }) => Promise<void>
}

const panelStyle: React.CSSProperties = {
  position: 'fixed',
  top: APP_HEADER_HEIGHT,
  right: 0,
  width: 420,
  height: `calc(100vh - ${APP_HEADER_HEIGHT}px)`,
  background: 'rgba(255,255,255,0.98)',
  boxShadow: '-6px 0 28px rgba(15, 23, 42, 0.18)',
  borderLeft: '1px solid rgba(148,163,184,0.3)',
  zIndex: 1500,
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

export default function LinkEditorPanel({ draft, linkTypes, onClose, onSave }: Props) {
  useEffect(() => {
    console.log('LinkEditorPanel mounted with draft:', draft)
    return () => {
      console.log('LinkEditorPanel unmounted')
    }
  }, [])
  const [linkTypeId, setLinkTypeId] = useState<number>(linkTypes[0]?.id ?? 0)
  const [existFrom, setExistFrom] = useState('1900-01-01')
  const [existUntil, setExistUntil] = useState('9999-12-31')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (linkTypes.length > 0 && !linkTypes.some((type) => type.id === linkTypeId)) {
      setLinkTypeId(linkTypes[0].id)
    }
  }, [linkTypes, linkTypeId])

  async function handleSave() {
    console.log('LinkEditorPanel: handleSave start')
    setMessage('')
    if (!linkTypeId) {
      setMessage('リンクタイプを選択してください')
      return
    }
    if (!existFrom || !existUntil) {
      setMessage('開始日と終了日を入力してください')
      return
    }
    if (existFrom > existUntil) {
      setMessage('開始日は終了日以前である必要があります')
      return
    }

    setSaving(true)
    try {
      await onSave({ linkTypeId, existFrom, existUntil })
      console.log('LinkEditorPanel: onSave succeeded, calling onClose')
      onClose()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '保存に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  return (
    <aside style={panelStyle}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 12, color: '#64748b' }}>リンク作成</div>
          <h3 style={{ margin: '4px 0 0', fontSize: 18 }}>新しいリンクを編集</h3>
        </div>
        <button onClick={() => { console.log('LinkEditorPanel: close button clicked'); onClose() }} style={{ ...buttonStyle('secondary'), width: 40, height: 40, padding: 0 }}>
          ✕
        </button>
      </div>

      <div style={{ marginBottom: 16, padding: 12, background: '#f8fafc', borderRadius: 10, fontSize: 13, color: '#334155' }}>
        <div><strong>開始国:</strong> {draft.fromCountryId}</div>
        <div style={{ marginTop: 4 }}><strong>終了国:</strong> {draft.toCountryId}</div>
      </div>

      <label style={{ display: 'block', marginBottom: 12, fontSize: 13, color: '#334155' }}>
        リンクタイプ
        <select
          value={linkTypeId}
          onChange={(event) => setLinkTypeId(Number(event.target.value))}
          style={{ ...inputStyle, marginTop: 6 }}
        >
          {linkTypes.length === 0 && <option value={0}>リンクタイプがありません</option>}
          {linkTypes.map((type) => (
            <option key={type.id} value={type.id}>
              {type.name_ja || type.name}
            </option>
          ))}
        </select>
      </label>

      <label style={{ display: 'block', marginBottom: 12, fontSize: 13, color: '#334155' }}>
        開始日 (exist_from)
        <input type="date" value={existFrom} onChange={(event) => setExistFrom(event.target.value)} style={{ ...inputStyle, marginTop: 6 }} />
      </label>

      <label style={{ display: 'block', marginBottom: 16, fontSize: 13, color: '#334155' }}>
        終了日 (exist_until)
        <input type="date" value={existUntil} onChange={(event) => setExistUntil(event.target.value)} style={{ ...inputStyle, marginTop: 6 }} />
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
          キャンセル
        </button>
      </div>
    </aside>
  )
}