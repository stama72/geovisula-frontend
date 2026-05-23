import { useEffect, useState } from 'react'
import { api } from './api'
import { APP_HEADER_HEIGHT } from './layoutConstants'
import type { LinkType } from './types'

type Props = {
  mapId: number
  linkTypes: LinkType[]
  onClose: () => void
  onRefresh: () => Promise<void>
}

type Draft = {
  name: string
  name_ja: string
  color: string
  animated: boolean
}

const palette = ['#2563eb', '#0ea5e9', '#14b8a6', '#22c55e', '#eab308', '#f97316', '#ef4444', '#8b5cf6', '#808080', '#ffffff']

const panelStyle: React.CSSProperties = {
  position: 'fixed',
  top: APP_HEADER_HEIGHT,
  right: 0,
  width: 460,
  height: `calc(100vh - ${APP_HEADER_HEIGHT}px)`,
  background: 'rgba(255,255,255,0.98)',
  boxShadow: '-6px 0 28px rgba(15, 23, 42, 0.18)',
  borderLeft: '1px solid rgba(148,163,184,0.3)',
  zIndex: 1650,
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

const buttonStyle = (kind: 'primary' | 'secondary' | 'danger'): React.CSSProperties => ({
  padding: '9px 12px',
  borderRadius: 8,
  border: kind === 'primary' ? '1px solid #2563eb' : kind === 'danger' ? '1px solid #dc2626' : '1px solid #cbd5e1',
  background: kind === 'primary' ? '#2563eb' : kind === 'danger' ? '#fff' : '#fff',
  color: kind === 'primary' ? '#fff' : kind === 'danger' ? '#dc2626' : '#334155',
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: 600,
})

function createEmptyDraft(): Draft {
  return { name: '', name_ja: '', color: palette[0], animated: false }
}

export default function LinkTypesPanel({ mapId, linkTypes, onClose, onRefresh }: Props) {
  const [draft, setDraft] = useState<Draft>(createEmptyDraft())
  const [message, setMessage] = useState('')
  const [messageTone, setMessageTone] = useState<'error' | 'success'>('error')
  const [saving, setSaving] = useState(false)
  const [savingTypeId, setSavingTypeId] = useState<number | null>(null)
  const [editingTypes, setEditingTypes] = useState<LinkType[]>(linkTypes)

  useEffect(() => {
    setEditingTypes(linkTypes)
  }, [linkTypes])

  async function handleCreate() {
    setMessage('')
    if (!draft.name.trim() || !draft.name_ja.trim()) {
      setMessageTone('error')
      setMessage('名前を入力してください')
      return
    }

    setSaving(true)
    try {
      await api.createLinkType({
        name: draft.name.trim(),
        name_ja: draft.name_ja.trim(),
        map_id: mapId,
        color: draft.color,
        animated: draft.animated,
      })
      setDraft(createEmptyDraft())
      await onRefresh()
    } catch (error) {
      setMessageTone('error')
      setMessage(error instanceof Error ? error.message : 'リンクタイプの作成に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  async function handleUpdate(type: LinkType) {
    setMessage('')
    setSavingTypeId(type.id)
    try {
      await api.updateLinkType(type.id, {
        name: type.name,
        name_ja: type.name_ja,
        map_id: mapId,
        color: type.color,
        animated: type.animated,
      })
      await onRefresh()
      setMessageTone('success')
      setMessage('更新しました。マップ情報とリンクを再読み込みしました。')
    } catch (error) {
      setMessageTone('error')
      setMessage(error instanceof Error ? error.message : 'リンクタイプの更新に失敗しました')
    } finally {
      setSavingTypeId(null)
    }
  }

  async function handleDelete(type: LinkType) {
    if (!confirm(`${type.name_ja || type.name} を削除しますか？`)) {
      return
    }
    setMessage('')
    try {
      await api.deleteLinkType(type.id, mapId)
      await onRefresh()
    } catch (error) {
      setMessageTone('error')
      setMessage(error instanceof Error ? error.message : 'リンクタイプの削除に失敗しました')
    }
  }

  return (
    <aside style={panelStyle}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 12, color: '#64748b' }}>リンクタイプ編集</div>
          <h3 style={{ margin: '4px 0 0', fontSize: 18 }}>色と種類を管理</h3>
        </div>
        <button onClick={onClose} style={{ ...buttonStyle('secondary'), width: 40, height: 40, padding: 0 }}>
          ✕
        </button>
      </div>

      <div style={{ marginBottom: 18, padding: 14, borderRadius: 12, background: '#f8fafc' }}>
        <div style={{ fontWeight: 700, marginBottom: 10 }}>新規リンクタイプ</div>
        <label style={{ display: 'block', marginBottom: 10, fontSize: 13, color: '#334155' }}>
          英語名
          <input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} style={{ ...inputStyle, marginTop: 6 }} />
        </label>
        <label style={{ display: 'block', marginBottom: 10, fontSize: 13, color: '#334155' }}>
          日本語名
          <input value={draft.name_ja} onChange={(event) => setDraft({ ...draft, name_ja: event.target.value })} style={{ ...inputStyle, marginTop: 6 }} />
        </label>
        <div style={{ marginBottom: 10, fontSize: 13, color: '#334155' }}>色</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
          {palette.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => setDraft({ ...draft, color })}
              style={{
                width: 30,
                height: 30,
                borderRadius: 999,
                border: draft.color === color ? '3px solid #0f172a' : '2px solid transparent',
                background: color,
                cursor: 'pointer',
                boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.8)',
              }}
            />
          ))}
          <input
            type="color"
            value={draft.color}
            onChange={(e) => setDraft({ ...draft, color: e.target.value })}
            title="カスタムカラー"
            style={{ width: 36, height: 36, border: 'none', padding: 0, background: 'transparent', cursor: 'pointer' }}
          />
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, fontSize: 13, color: '#334155' }}>
          <input type="checkbox" checked={draft.animated} onChange={(event) => setDraft({ ...draft, animated: event.target.checked })} />
          アニメーションを有効にする(準備中)
        </label>
        <button disabled={saving} onClick={handleCreate} style={{ ...buttonStyle('primary'), width: '100%' }}>
          {saving ? '作成中...' : '新規作成'}
        </button>
      </div>

      <div style={{ fontWeight: 700, marginBottom: 10 }}>既存のリンクタイプ</div>
      <div style={{ display: 'grid', gap: 12 }}>
        {editingTypes.map((type, index) => (
          <div key={type.id} style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 14, background: '#fff' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <span style={{ width: 16, height: 16, borderRadius: 999, background: type.color || palette[index % palette.length], display: 'inline-block' }} />
              <strong>{type.name_ja || type.name}</strong>
            </div>

            <label style={{ display: 'block', marginBottom: 10, fontSize: 13, color: '#334155' }}>
              英語名
              <input
                value={type.name}
                onChange={(event) => setEditingTypes((current) => current.map((item) => (item.id === type.id ? { ...item, name: event.target.value } : item)))}
                style={{ ...inputStyle, marginTop: 6 }}
              />
            </label>

            <label style={{ display: 'block', marginBottom: 10, fontSize: 13, color: '#334155' }}>
              日本語名
              <input
                value={type.name_ja}
                onChange={(event) => setEditingTypes((current) => current.map((item) => (item.id === type.id ? { ...item, name_ja: event.target.value } : item)))}
                style={{ ...inputStyle, marginTop: 6 }}
              />
            </label>

            <div style={{ marginBottom: 10, fontSize: 13, color: '#334155' }}>色</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
              {palette.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setEditingTypes((current) => current.map((item) => (item.id === type.id ? { ...item, color } : item)))}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 999,
                    border: type.color === color ? '3px solid #0f172a' : '2px solid transparent',
                    background: color,
                    cursor: 'pointer',
                  }}
                />
              ))}
              <input
                type="color"
                value={type.color || '#000000'}
                onChange={(e) => setEditingTypes((current) => current.map((item) => (item.id === type.id ? { ...item, color: e.target.value } : item)))}
                title="カスタムカラー"
                style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid #e2e8f0', padding: 0, cursor: 'pointer' }}
              />
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, fontSize: 13, color: '#334155' }}>
              <input
                type="checkbox"
                checked={type.animated}
                onChange={(event) => setEditingTypes((current) => current.map((item) => (item.id === type.id ? { ...item, animated: event.target.checked } : item)))}
              />
              アニメーションを有効にする(準備中)
            </label>

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => handleUpdate(type)} disabled={savingTypeId === type.id} style={{ ...buttonStyle('primary'), flex: 1 }}>
                {savingTypeId === type.id ? '保存中...' : '保存'}
              </button>
              <button onClick={() => handleDelete(type)} style={{ ...buttonStyle('danger'), flex: 1 }}>
                削除
              </button>
            </div>
          </div>
        ))}
        {editingTypes.length === 0 && (
          <div style={{ padding: 16, borderRadius: 10, border: '1px dashed #cbd5e1', color: '#64748b', fontSize: 13 }}>
            このマップにはリンクタイプがありません。
          </div>
        )}
      </div>

      {message && (
        <div
          style={{
            marginTop: 14,
            padding: '10px 12px',
            borderRadius: 8,
            background: messageTone === 'success' ? '#f0fdf4' : '#fef2f2',
            color: messageTone === 'success' ? '#166534' : '#b91c1c',
            fontSize: 13,
          }}
        >
          {message}
        </div>
      )}
    </aside>
  )
}