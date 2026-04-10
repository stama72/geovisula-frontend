import { useEffect, useState } from 'react'
import { api } from './api'

type Proposal = {
  id: number
  country_a: string
  country_b: string
  relation_type: string
  summary: string
  source_url: string
  source_note: string
  status: string
  review_comment: string | null
}
type Props = {
  role: string
  onClose: () => void
  countries: { id: string; name_ja: string }[]  // ← 追加
}


const RELATION_TYPES = ['同盟', '友好的', '中立', '緊張', '対立']

const panelStyle: React.CSSProperties = {
  position: 'fixed', top: 0, right: 0, width: 480,
  height: '100vh', background: 'white', overflowY: 'auto',
  boxShadow: '-4px 0 24px rgba(0,0,0,0.15)', padding: 24, zIndex: 2000,
}
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', marginBottom: 12,
  border: '1px solid #ddd', borderRadius: 6, fontSize: 14,
  boxSizing: 'border-box',
}
const btnStyle = (color: string): React.CSSProperties => ({
  padding: '8px 16px', background: color, color: 'white',
  border: 'none', borderRadius: 6, cursor: 'pointer', marginRight: 8,
})

export default function DiplomaticEditor({ role, onClose, countries }: Props) {
  const [tab, setTab]             = useState<'propose' | 'review'>('propose')
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [message, setMessage]     = useState('')

  // 提案フォームの状態
  const [form, setForm] = useState({
    country_a: '', country_b: '', relation_type: '友好的',
    summary: '', source_url: '', source_note: '',
  })

  // レビューコメントの状態（提案IDをキーにする）
  const [comments, setComments] = useState<Record<number, string>>({})

  useEffect(() => {
    if (tab === 'review') loadProposals()
  }, [tab])

  async function loadProposals() {
    try {
      const data = await api.getProposals('pending')
      setProposals(data)
    } catch (e: any) {
      setMessage(e.message)
    }
  }

  async function handlePropose() {
    setMessage('')
    try {
      await api.createProposal(form)
      setMessage('提案を送信しました。レビュー担当者の承認をお待ちください。')
      setForm({ country_a: '', country_b: '', relation_type: '友好的',
                summary: '', source_url: '', source_note: '' })
    } catch (e: any) {
      setMessage(`エラー: ${e.message}`)
    }
  }

  async function handleReview(id: number, action: 'approve' | 'reject') {
    setMessage('')
    try {
      await api.reviewProposal(id, action, comments[id] ?? '')
      setMessage(action === 'approve' ? '承認しました。' : '差し戻しました。')
      loadProposals()
    } catch (e: any) {
      setMessage(`エラー: ${e.message}`)
    }
  }

  return (
    <div style={panelStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h3 style={{ margin: 0 }}>外交データ編集</h3>
        <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>✕</button>
      </div>

      {/* タブ */}
      <div style={{ display: 'flex', marginBottom: 20, borderBottom: '2px solid #eee' }}>
        {(['propose', 'review'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '8px 16px', border: 'none', cursor: 'pointer',
              background: 'none', fontSize: 14,
              borderBottom: tab === t ? '2px solid #3498db' : '2px solid transparent',
              color: tab === t ? '#3498db' : '#666',
            }}
          >
            {t === 'propose' ? '新規提案' : 'レビュー（承認待ち）'}
          </button>
        ))}
      </div>

      {message && (
        <div style={{
          padding: '10px 14px', borderRadius: 6, marginBottom: 16, fontSize: 13,
          background: message.startsWith('エラー') ? '#fdecea' : '#e8f5e9',
          color:      message.startsWith('エラー') ? '#c0392b' : '#27ae60',
        }}>
          {message}
        </div>
      )}

      {/* 提案フォーム */}
      {tab === 'propose' && (
        <div>
          <label style={{ fontSize: 12, color: '#666' }}>国A</label>
          <select style={inputStyle} value={form.country_a}
            onChange={e => setForm({ ...form, country_a: e.target.value })}>
            <option value="">選択してください</option>
            {countries.map(c => (
              <option key={c.id} value={c.id}>{c.name_ja}（{c.id}）</option>
            ))}
          </select>
          <label style={{ fontSize: 12, color: '#666' }}>国B</label>
          <select style={inputStyle} value={form.country_b}
            onChange={e => setForm({ ...form, country_b: e.target.value })}>
            <option value="">選択してください</option>
            {countries.map(c => (
              <option key={c.id} value={c.id}>{c.name_ja}（{c.id}）</option>
            ))}
          </select>
          
          <label style={{ fontSize: 12, color: '#666' }}>関係タイプ</label>
          <select style={inputStyle} value={form.relation_type}
            onChange={e => setForm({ ...form, relation_type: e.target.value })}>
            {RELATION_TYPES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>

          <label style={{ fontSize: 12, color: '#666' }}>要約（100文字以内）</label>
          <textarea style={{ ...inputStyle, height: 80, resize: 'vertical' }}
            placeholder="二国間関係の要約"
            value={form.summary}
            onChange={e => setForm({ ...form, summary: e.target.value })} />

          <label style={{ fontSize: 12, color: '#666' }}>出典URL（必須）</label>
          <input style={inputStyle} placeholder="https://www.mofa.go.jp/..."
            value={form.source_url} onChange={e => setForm({ ...form, source_url: e.target.value })} />

          <label style={{ fontSize: 12, color: '#666' }}>出典メモ（任意）</label>
          <input style={inputStyle} placeholder="外務省 ○○に関する声明 2024年3月"
            value={form.source_note} onChange={e => setForm({ ...form, source_note: e.target.value })} />

          <button style={btnStyle('#3498db')} onClick={handlePropose}>
            提案を送信する
          </button>
        </div>
      )}

      {/* レビュー画面（reviewer / admin のみ） */}
      {tab === 'review' && (
        <div>
          {role !== 'reviewer' && role !== 'admin' ? (
            <p style={{ color: '#999', fontSize: 14 }}>
              レビュー権限がありません。管理者にお問い合わせください。
            </p>
          ) : proposals.length === 0 ? (
            <p style={{ color: '#999', fontSize: 14 }}>承認待ちの提案はありません。</p>
          ) : (
            proposals.map(p => (
              <div key={p.id} style={{
                border: '1px solid #eee', borderRadius: 8, padding: 16, marginBottom: 16,
              }}>
                <div style={{ fontWeight: 500, marginBottom: 6 }}>
                  {p.country_a} ↔ {p.country_b}
                  <span style={{
                    marginLeft: 8, padding: '2px 8px', borderRadius: 4,
                    background: '#fff3cd', color: '#856404', fontSize: 12,
                  }}>
                    {p.relation_type}
                  </span>
                </div>
                <p style={{ fontSize: 13, color: '#444', marginBottom: 6 }}>{p.summary}</p>
                <a href={p.source_url} target="_blank" rel="noreferrer"
                  style={{ fontSize: 12, color: '#3498db' }}>
                  出典: {p.source_url}
                </a>
                {p.source_note && (
                  <p style={{ fontSize: 12, color: '#666', margin: '4px 0' }}>{p.source_note}</p>
                )}
                <textarea
                  style={{ ...inputStyle, height: 60, marginTop: 10 }}
                  placeholder="コメント（任意）"
                  value={comments[p.id] ?? ''}
                  onChange={e => setComments({ ...comments, [p.id]: e.target.value })}
                />
                <div>
                  <button style={btnStyle('#27ae60')} onClick={() => handleReview(p.id, 'approve')}>
                    承認
                  </button>
                  <button style={btnStyle('#e74c3c')} onClick={() => handleReview(p.id, 'reject')}>
                    差し戻し
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}