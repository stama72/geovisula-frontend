import { useState } from 'react'
import { api } from './api'

type Props = {
  onLogin: (token: string, displayName: string, role: string) => void
}

export default function LoginPage({ onLogin }: Props) {
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
    password.length > 72 && setError('パスワードは72文字以下である必要があります')
    password.trim() !== password && setError('パスワードの前後にスペースは使用できません')
    
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
    <div style={{ background: '#f0f2f5', minHeight: '100vh' }}>
      <div style={cardStyle}>
        <h2 style={{ textAlign: 'center', marginBottom: 24, color: '#333' }}>
          GeoVisula
        </h2>

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