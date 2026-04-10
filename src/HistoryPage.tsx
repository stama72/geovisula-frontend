import { useEffect, useState } from 'react'
import { api } from './api'

type HistoryEntry = {
  id:             number
  country_a:      string
  country_b:      string
  relation_type:  string
  summary:        string
  source_url:     string
  source_note:    string | null
  status:         string
  review_comment: string | null
  proposed_by:    number
  reviewed_by:    number | null
  created_at:     string | null
  reviewed_at:    string | null
}

type Props = {
  onClose: () => void
}

const panelStyle: React.CSSProperties = {
  position: 'fixed', top: 0, right: 0, width: 520,
  height: '100vh', background: 'white', overflowY: 'auto',
  boxShadow: '-4px 0 24px rgba(0,0,0,0.15)', padding: 24, zIndex: 2000,
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('ja-JP', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function HistoryPage({ onClose }: Props) {
  const [entries, setEntries] = useState<HistoryEntry[]>([])
  const [filter, setFilter]   = useState<'all' | 'approved' | 'rejected'>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')

  useEffect(() => {
    api.getHistory()
      .then(setEntries)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const filtered = entries.filter(e =>
    filter === 'all' ? true : e.status === filter
  )

  return (
    <div style={panelStyle}>

      {/* ヘッダー */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h3 style={{ margin: 0 }}>編集履歴</h3>
        <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>✕</button>
      </div>

      {/* フィルター */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {([
          { value: 'all',      label: 'すべて' },
          { value: 'approved', label: '承認済み' },
          { value: 'rejected', label: '差し戻し' },
        ] as const).map(f => (
          <button key={f.value} onClick={() => setFilter(f.value)} style={{
            padding: '4px 14px', borderRadius: 4, border: '1px solid #ddd',
            cursor: 'pointer', fontSize: 13,
            background: filter === f.value ? '#2c3e50' : 'white',
            color:      filter === f.value ? 'white'   : '#333',
          }}>
            {f.label}
          </button>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: 13, color: '#999', lineHeight: '30px' }}>
          {filtered.length}件
        </span>
      </div>

      {loading && <p style={{ color: '#999', fontSize: 14 }}>読み込み中...</p>}
      {error   && <p style={{ color: '#e74c3c', fontSize: 14 }}>{error}</p>}

      {/* 履歴一覧 */}
      {filtered.map(entry => (
        <div key={entry.id} style={{
          border: '1px solid #eee', borderRadius: 8,
          padding: 16, marginBottom: 14,
          borderLeft: `4px solid ${entry.status === 'approved' ? '#27ae60' : '#e74c3c'}`,
        }}>

          {/* ステータスバッジ */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{
              padding: '2px 8px', borderRadius: 4, fontSize: 12, fontWeight: 500,
              background: entry.status === 'approved' ? '#e8f5e9' : '#fdecea',
              color:      entry.status === 'approved' ? '#27ae60' : '#e74c3c',
            }}>
              {entry.status === 'approved' ? '承認済み' : '差し戻し'}
            </span>
            <span style={{ fontSize: 12, color: '#999' }}>
              提案: {formatDate(entry.created_at)}
            </span>
          </div>

          {/* 内容 */}
          <div style={{ fontWeight: 500, marginBottom: 4 }}>
            {entry.country_a} ↔ {entry.country_b}
            <span style={{
              marginLeft: 8, padding: '2px 8px', borderRadius: 4,
              background: '#f0f0f0', color: '#555', fontSize: 12,
            }}>
              {entry.relation_type}
            </span>
          </div>
          <p style={{ fontSize: 13, color: '#444', margin: '6px 0' }}>
            {entry.summary}
          </p>

          {/* 出典 */}
          <div style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>
            出典：
            <a href={entry.source_url} target="_blank" rel="noreferrer"
              style={{ color: '#3498db', marginLeft: 4 }}>
              {entry.source_url}
            </a>
            {entry.source_note && (
              <span style={{ marginLeft: 8, color: '#999' }}>（{entry.source_note}）</span>
            )}
          </div>

          {/* レビュー情報 */}
          {entry.reviewed_at && (
            <div style={{
              marginTop: 8, padding: '8px 10px',
              background: '#f8f9fa', borderRadius: 6, fontSize: 12, color: '#666',
            }}>
              レビュー日時: {formatDate(entry.reviewed_at)}
              {entry.review_comment && (
                <div style={{ marginTop: 4, color: '#444' }}>
                  コメント: {entry.review_comment}
                </div>
              )}
            </div>
          )}
        </div>
      ))}

      {!loading && filtered.length === 0 && (
        <p style={{ color: '#999', fontSize: 14 }}>履歴がありません。</p>
      )}
    </div>
  )
}