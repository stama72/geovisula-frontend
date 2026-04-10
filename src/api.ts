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

  // 貿易データ
  async getCountries() {
    const res = await fetch(`${BASE}/api/countries`)
    return res.json()
  },

  async getTradeLinks(category?: string, year?: number) {
    const params = new URLSearchParams({ year: String(year ?? 2023) })
    if (category) params.append('category', category)
    const res = await fetch(`${BASE}/api/trade-links?${params}`)
    return res.json()
  },

  // 外交提案
  async getProposals(status?: string) {
    const params = status ? `?status=${status}` : ''
    const res = await fetch(`${BASE}/api/diplomatic/${params}`, {
      headers: authHeaders(),
    })
    if (!res.ok) throw new Error((await res.json()).detail)
    return res.json()
  },

  async createProposal(data: {
    country_a: string
    country_b: string
    relation_type: string
    summary: string
    source_url: string
    source_note: string
  }) {
    const res = await fetch(`${BASE}/api/diplomatic/`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error((await res.json()).detail)
    return res.json()
  },

  async reviewProposal(id: number, action: 'approve' | 'reject', comment: string) {
    const res = await fetch(`${BASE}/api/diplomatic/${id}/review`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ action, comment }),
    })
    if (!res.ok) throw new Error((await res.json()).detail)
    return res.json()
  },

  async getApprovedRelations() {
    const res = await fetch(`${BASE}/api/diplomatic/approved`)
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
  },

  async getHistory() {
    const res = await fetch(`${BASE}/api/diplomatic/history`, {
        headers: authHeaders(),
    })
    if (!res.ok) throw new Error((await res.json()).detail)
    return res.json()
  },
}