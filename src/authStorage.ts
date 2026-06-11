export const AUTH_TOKEN_KEY = 'token'
export const AUTH_DISPLAY_NAME_KEY = 'displayName'
export const AUTH_ROLE_KEY = 'role'
export const AUTH_MODE_KEY = 'authMode'
export const GUEST_SESSION_KEY = 'guestSessionId'

export function getOrCreateGuestSessionId(): string {
  const existing = localStorage.getItem(GUEST_SESSION_KEY)
  if (existing) {
    return existing
  }

  const generated =
    globalThis.crypto?.randomUUID?.() ??
    `guest-${Date.now()}-${Math.random().toString(16).slice(2)}`
  localStorage.setItem(GUEST_SESSION_KEY, generated)
  return generated
}

export function getMapEditableCacheKey(mapId: number): string {
  return `mapEditable:${mapId}`
}

export function clearMapEditableCache(): void {
  const keys = Object.keys(localStorage)
  for (const key of keys) {
    if (key.startsWith('mapEditable:')) {
      localStorage.removeItem(key)
    }
  }
}

export function clearStoredAuthFromStorage(): void {
  localStorage.removeItem(AUTH_TOKEN_KEY)
  localStorage.removeItem(AUTH_DISPLAY_NAME_KEY)
  localStorage.removeItem(AUTH_ROLE_KEY)
  localStorage.removeItem(AUTH_MODE_KEY)
}
