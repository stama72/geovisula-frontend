import { useRef, useState } from 'react'
import { api } from './api'
import {
  AUTH_DISPLAY_NAME_KEY,
  AUTH_MODE_KEY,
  AUTH_ROLE_KEY,
  AUTH_TOKEN_KEY,
  GUEST_SESSION_KEY,
  clearMapEditableCache,
  clearStoredAuthFromStorage,
  getOrCreateGuestSessionId,
} from './authStorage'
import type { AuthMode } from './types'

type UseAuthResult = {
  token: string
  displayName: string
  role: string
  authMode: AuthMode
  authReady: boolean
  isAuthenticated: boolean
  isGuest: boolean
  showAuthPanel: boolean
  authPanelMessage: string
  setShowAuthPanel: (v: boolean) => void
  setAuthPanelMessage: (msg: string) => void
  handleLogin(newToken: string, name: string, userRole: string): void
  handleLogout(): Promise<void>
  handleGuestLogin(): Promise<void>
  bootstrapGuestSession(message?: string): Promise<void>
}

type UseAuthOptions = {
  onBeforeReset?: () => void
}

export default function useAuth(opts?: UseAuthOptions): UseAuthResult {
  const storedToken = localStorage.getItem(AUTH_TOKEN_KEY) ?? ''
  const storedMode = localStorage.getItem(AUTH_MODE_KEY)

  const [token, setToken] = useState(storedToken)
  const [displayName, setDisplayName] = useState(localStorage.getItem(AUTH_DISPLAY_NAME_KEY) ?? '')
  const [role, setRole] = useState(localStorage.getItem(AUTH_ROLE_KEY) ?? '')
  const [authMode, setAuthMode] = useState<AuthMode>(
    storedMode === 'guest' || storedMode === 'user'
      ? storedMode
      : storedToken
        ? 'user'
        : 'guest',
  )
  const [authReady, setAuthReady] = useState(Boolean(storedToken))
  const [showAuthPanel, setShowAuthPanel] = useState(false)
  const [authPanelMessage, setAuthPanelMessage] = useState('')
  const guestBootstrapInProgress = useRef(false)

  const isAuthenticated = authMode === 'user' && Boolean(token)
  const isGuest = !isAuthenticated

  function clearStoredAuth() {
    clearStoredAuthFromStorage()
    setToken('')
    setDisplayName('')
    setRole('')
    setAuthMode('guest')
  }

  function persistAuthSession(payload: {
    accessToken: string
    displayName: string
    role: string
    mode: AuthMode
    guestSessionId?: string
  }) {
    clearMapEditableCache()
    setToken(payload.accessToken)
    setDisplayName(payload.displayName)
    setRole(payload.role)
    setAuthMode(payload.mode)
    setAuthReady(true)
    setShowAuthPanel(false)
    setAuthPanelMessage('')
    localStorage.setItem(AUTH_TOKEN_KEY, payload.accessToken)
    localStorage.setItem(AUTH_DISPLAY_NAME_KEY, payload.displayName)
    localStorage.setItem(AUTH_ROLE_KEY, payload.role)
    localStorage.setItem(AUTH_MODE_KEY, payload.mode)
    if (payload.guestSessionId) {
      localStorage.setItem(GUEST_SESSION_KEY, payload.guestSessionId)
    }
  }

  async function bootstrapGuestSession(message = '') {
    if (guestBootstrapInProgress.current) {
      return
    }

    guestBootstrapInProgress.current = true
    setAuthReady(false)
    setShowAuthPanel(false)
    setAuthPanelMessage(message)
    clearStoredAuth()
    clearMapEditableCache()
    opts?.onBeforeReset?.()

    try {
      const guestSessionId = getOrCreateGuestSessionId()
      const response = await api.guestLogin(guestSessionId)
      persistAuthSession({
        accessToken: response.access_token,
        displayName: response.display_name || 'ゲスト',
        role: response.role,
        mode: 'guest',
        guestSessionId: response.guestSessionId ?? guestSessionId,
      })
    } catch (error) {
      setAuthReady(true)
      setShowAuthPanel(true)
      setAuthPanelMessage(message || 'ゲスト閲覧を開始できませんでした。ログインして続行してください。')
      const msg = error instanceof Error && error.message ? error.message : 'ゲスト閲覧の開始に失敗しました'
      console.error(msg)
    } finally {
      guestBootstrapInProgress.current = false
    }
  }

  function handleLogin(newToken: string, name: string, userRole: string) {
    opts?.onBeforeReset?.()
    clearMapEditableCache()
    setToken(newToken)
    setDisplayName(name)
    setRole(userRole)
    setAuthMode('user')
    setAuthReady(true)
    setShowAuthPanel(false)
    setAuthPanelMessage('')
    localStorage.setItem(AUTH_TOKEN_KEY, newToken)
    localStorage.setItem(AUTH_DISPLAY_NAME_KEY, name)
    localStorage.setItem(AUTH_ROLE_KEY, userRole)
    localStorage.setItem(AUTH_MODE_KEY, 'user')
  }

  async function handleGuestLogin() {
    await bootstrapGuestSession()
  }

  async function handleLogout() {
    clearStoredAuth()
    clearMapEditableCache()
    await handleGuestLogin()
  }

  return {
    token,
    displayName,
    role,
    authMode,
    authReady,
    isAuthenticated,
    isGuest,
    showAuthPanel,
    authPanelMessage,
    setShowAuthPanel,
    setAuthPanelMessage,
    handleLogin,
    handleLogout,
    handleGuestLogin,
    bootstrapGuestSession,
  }
}
