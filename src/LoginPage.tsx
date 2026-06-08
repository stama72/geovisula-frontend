import { useState } from 'react'
import { api } from './api'

type Props = {
  onLogin: (token: string, displayName: string, role: string) => void
  onClose: () => void
  message?: string
}

export default function LoginPage({ onLogin, onClose, message = '' }: Props) {
  const [mode, setMode]       = useState<'login' | 'register'>('login')
  const [password, setPass]   = useState('')
  const [name, setName]       = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  const cardStyle: React.CSSProperties = {
    maxWidth: 400, margin: '80px auto', padding: '32px',
    background: 'white', borderRadius: 12,
    boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
  }
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 12px', marginBottom: 12,
    border: '1px solid #ddd', borderRadius: 6, fontSize: 14,
    boxSizing: 'border-box',
  }
  const btnStyle: React.CSSProperties = {
    width: '100%', padding: '10px', background: '#3498db',
    color: 'white', border: 'none', borderRadius: 6,
    fontSize: 15, cursor: 'pointer',
  }

  async function handleSubmit() {
    setError('')
    setLoading(true)
    
    //項目の入力チェック
    if (mode === 'register') {
      for (const inst of [name, password, displayName]) {
        if (!inst) {
          setError('全ての項目を入力してください')
          setLoading(false)
          return
        }
      }
      if (displayName.length > 30) {
        setError('ユーザー表示名は30文字以下である必要があります')
        setLoading(false)
        return
      }
    }
    for (const inst of [name, password]) {
      if (!inst) {
        setError('ユーザーIDとパスワードを入力してください')
        setLoading(false)
        return
      }
    }
        
    if (!/^[a-zA-Z0-9_]+$/.test(name)) {
      setError('ユーザーIDは半角英数字とアンダースコアのみ使用できます')
      setLoading(false)
      return
    }
    if (!/^[a-zA-Z0-9]+$/.test(password)) {
      setError('パスワードは半角英数字のみ使用できます')
      setLoading(false)
      return
    }
    if (password.length < 8) {
      setError('パスワードは8文字以上である必要があります')
      setLoading(false)
      return
    }
    if (password.length > 72) {
      setError('パスワードは72文字以下である必要があります')
      setLoading(false)
      return
    }
    if (password.trim() !== password) {
      setError('パスワードの前後にスペースは使用できません')
      setLoading(false)
      return
    }
    
    try {
      if (mode === 'register') {
        await api.register(name, password, displayName)
      }
      const data = await api.login(name, password)
      localStorage.setItem('token', data.access_token)
      onLogin(data.access_token, data.display_name, data.role)
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : '不明なエラーです')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={overlayStyle}>
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 12, color: '#64748b' }}>GeoVisula</div>
            <h2 style={{ margin: '4px 0 0', color: '#0f172a', fontSize: 24 }}>ログイン / 新規登録</h2>
          </div>
          <button
            onClick={onClose}
            style={{
              border: 'none',
              background: 'transparent',
              color: '#64748b',
              fontSize: 20,
              cursor: 'pointer',
              lineHeight: 1,
            }}
            aria-label="閉じる"
          >
            ×
          </button>
        </div>

        <p style={{ margin: '0 0 12px', color: '#475569', fontSize: 13, lineHeight: 1.6 }}>
          ログインするとマップの作成、編集ができます。
        </p>

        {message && (
          <div
            style={{
              marginBottom: 16,
              padding: '10px 12px',
              borderRadius: 10,
              background: '#fef3c7',
              color: '#92400e',
              fontSize: 13,
              lineHeight: 1.5,
            }}
          >
            {message}
          </div>
        )}

        {/* ログイン / 登録 切り替え */}
        <div style={{ display: 'flex', marginBottom: 24, border: '1px solid #ddd', borderRadius: 6, overflow: 'hidden' }}>
          {(['login', 'register'] as const).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              style={{
                flex: 1, padding: '8px', border: 'none', cursor: 'pointer',
                background: mode === m ? '#3498db' : 'white',
                color:      mode === m ? 'white'   : '#666',
                fontSize: 14,
              }}
            >
              {m === 'login' ? 'ログイン' : '新規登録'}
            </button>
          ))}
        </div>
        
        <input
          style={inputStyle}
          placeholder="ユーザーID (半角英数字)"
          value={name}
          onChange={e => setName(e.target.value)}
        />
        {mode === 'register' && (
          <input
            style={inputStyle}
            placeholder="ユーザー表示名"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
          />
        )}
        <input
          style={inputStyle}
          type="password"
          placeholder="パスワード"
          value={password}
          onChange={e => setPass(e.target.value)}
        />

        {error && (
          <div style={{ color: '#e74c3c', fontSize: 13, marginBottom: 12 }}>
            {error}
          </div>
        )}

        <button style={btnStyle} onClick={handleSubmit} disabled={loading}>
          {loading ? '処理中...' : mode === 'login' ? 'ログイン' : '登録してログイン'}
        </button>
      </div>
    </div>
  )
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 80,
  background: 'rgba(15, 23, 42, 0.58)',
  backdropFilter: 'blur(8px)',
  display: 'grid',
  placeItems: 'center',
  padding: 16,
}
