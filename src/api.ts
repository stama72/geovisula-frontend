const BASE = 'http://localhost:8000'

function getToken() {
  return localStorage.getItem('token')
}

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${getToken()}`,
  }
}

export const api = {
  // 認証
  async register(email: string, password: string, displayName: string) {
    const res = await fetch(`${BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, display_name: displayName }),
    })
    if (!res.ok) throw new Error((await res.json()).detail)
    return res.json()
  },

  async login(email: string, password: string) {
    const res = await fetch(`${BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    if (!res.ok) throw new Error((await res.json()).detail)
    return res.json()
  },

// データ取得
  async getCountries() {
    const res = await fetch(`${BASE}/api/countries`)
    return res.json()
  },

  async addCountry(data: { id: string; name_ja: string; lat: number; lng: number }) {
    const res = await fetch(`${BASE}/api/countries`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error((await res.json()).detail)
    return res.json()
  },

  async deleteCountry(id: string) {
    const res = await fetch(`${BASE}/api/countries/${id}`, {
        method: 'DELETE',
        headers: authHeaders(),
    })
    if (!res.ok) throw new Error((await res.json()).detail)
    return res.json()
  }

}