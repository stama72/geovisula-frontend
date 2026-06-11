import { useEffect, useState } from 'react'
import { api } from '../api'
import { APP_HEADER_HEIGHT } from '../layoutConstants'
import useViewport from '../useViewport'
import type { CountryEditorEntry, LinkType } from '../types'

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

type Draft = LinkCreateDraft | LinkEditDraft

type Props = {
  draft: Draft
  linkTypes: LinkType[]
  countries: CountryEditorEntry[]
  onClose: () => void
  onSave: (form: { linkTypeId: number; existFrom: string; existUntil: string; summary: string; source_url: string }) => Promise<void>
  onDelete?: () => Promise<void>
}

const desktopPanelStyle: React.CSSProperties = {
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

export default function LinkEditorPanel({ draft, linkTypes, countries, onClose, onSave, onDelete }: Props) {
  const countryName = (isoId: string) => {
    const c = countries.find((c) => c.id === isoId)
    return c ? c.name_ja : isoId
  }
  const { isMobile } = useViewport()
  useEffect(() => {
    console.log('LinkEditorPanel mounted with draft:', draft)
    return () => {
      console.log('LinkEditorPanel unmounted')
    }
  }, [])
  const isEditMode = draft.mode === 'edit'
  const [linkTypeId, setLinkTypeId] = useState<number>(isEditMode ? draft.linkTypeId : (linkTypes[0]?.id ?? 0))
  const [existFrom, setExistFrom] = useState(isEditMode ? draft.existFrom : '1900-01-01')
  const [existUntil, setExistUntil] = useState(isEditMode ? draft.existUntil : '9999-12-31')
  const [summary, setSummary] = useState('')
  const [sourceUrl, setSourceUrl] = useState('')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

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
        zIndex: 1500,
        padding: 16,
        overflowY: 'auto',
        boxSizing: 'border-box',
      }
    : desktopPanelStyle

  useEffect(() => {
    if (draft.mode === 'edit') {
      setLinkTypeId(draft.linkTypeId)
      setExistFrom(draft.existFrom)
      setExistUntil(draft.existUntil)
      setSummary('')
      setSourceUrl('')
      api.getLinkDetails(draft.linkId).then((details) => {
        if (details) {
          setSummary(details.summary)
          setSourceUrl(details.source_url ?? '')
        }
      })
      return
    }

    setLinkTypeId(linkTypes[0]?.id ?? 0)
    setExistFrom('1900-01-01')
    setExistUntil('9999-12-31')
    setSummary('')
    setSourceUrl('')
  }, [draft, linkTypes])

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
      await onSave({ linkTypeId, existFrom, existUntil, summary, source_url: sourceUrl })
      console.log('LinkEditorPanel: onSave succeeded, calling onClose')
      onClose()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '保存に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!onDelete || !isEditMode) {
      return
    }

    if (!window.confirm('このリンクを削除しますか？')) {
      return
    }

    setMessage('')
    setDeleting(true)
    try {
      await onDelete()
      onClose()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '削除に失敗しました')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <aside style={panelStyle}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 12, color: '#64748b' }}>{isEditMode ? 'リンク編集' : 'リンク作成'}</div>
          <h3 style={{ margin: '4px 0 0', fontSize: 18 }}>{isEditMode ? '既存リンクを編集' : '新しいリンクを編集'}</h3>
        </div>
        <button onClick={() => { console.log('LinkEditorPanel: close button clicked'); onClose() }} style={{ ...buttonStyle('secondary'), width: 40, height: 40, padding: 0 }}>
          ✕
        </button>
      </div>

      <div style={{ marginBottom: 16, padding: 12, background: '#f8fafc', borderRadius: 10, fontSize: 13, color: '#334155' }}>
        <div><strong>開始国:</strong> {countryName(draft.fromCountryId)}</div>
        <div style={{ marginTop: 4 }}><strong>終了国:</strong> {countryName(draft.toCountryId)}</div>
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

      <label style={{ display: 'block', marginBottom: 12, fontSize: 13, color: '#334155' }}>
        終了日 (exist_until)
        <input type="date" value={existUntil} onChange={(event) => setExistUntil(event.target.value)} style={{ ...inputStyle, marginTop: 6 }} />
      </label>

      <label style={{ display: 'block', marginBottom: 12, fontSize: 13, color: '#334155' }}>
        説明
        <textarea
          value={summary}
          onChange={(event) => setSummary(event.target.value)}
          placeholder="このリンクの説明を入力..."
          rows={3}
          style={{ ...inputStyle, marginTop: 6, resize: 'vertical' }}
        />
      </label>

      <label style={{ display: 'block', marginBottom: 16, fontSize: 13, color: '#334155' }}>
        ソース・参考URL
        <input
          type="url"
          value={sourceUrl}
          onChange={(event) => setSourceUrl(event.target.value)}
          placeholder="https://..."
          style={{ ...inputStyle, marginTop: 6 }}
        />
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
        <button onClick={onClose} disabled={deleting} style={{ ...buttonStyle('secondary'), flex: 1 }}>
          キャンセル
        </button>
      </div>

      {isEditMode && onDelete && (
        <div style={{ marginTop: 10 }}>
          <button
            onClick={handleDelete}
            disabled={deleting || saving}
            style={{
              ...buttonStyle('secondary'),
              width: '100%',
              borderColor: '#ef4444',
              color: '#b91c1c',
              fontWeight: 700,
            }}
          >
            {deleting ? '削除中...' : 'リンクを削除'}
          </button>
        </div>
      )}
    </aside>
  )
}
