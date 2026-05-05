import type {
  AuthResponse,
  Country,
  CountryCoordinates,
  LinkType,
  MapPoint,
  MapRecord,
  RelationLink,
} from './types'

const BASE = 'http://localhost:8000'

function getToken() {
  return localStorage.getItem('token')
}

function buildHeaders(withJson = false) {
  const headers: Record<string, string> = {}
  const token = getToken()

  if (withJson) {
    headers['Content-Type'] = 'application/json'
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  return headers
}

async function getErrorMessage(res: Response) {
  try {
    const payload = await res.json()
    return payload?.detail ?? payload?.message ?? JSON.stringify(payload)
  } catch {
    return await res.text()
  }
}

async function requestJson<T>(url: string, init?: RequestInit) {
  const res = await fetch(url, init)
  if (!res.ok) {
    throw new Error(await getErrorMessage(res))
  }
  return res.json() as Promise<T>
}

export const api = {
  async register(name: string, password: string, displayName: string) {
    return requestJson<AuthResponse>(`${BASE}/api/auth/register`, {
      method: 'POST',
      headers: buildHeaders(true),
      body: JSON.stringify({ name, password, display_name: displayName }),
    })
  },

  async login(name: string, password: string) {
    return requestJson<AuthResponse>(`${BASE}/api/auth/login`, {
      method: 'POST',
      headers: buildHeaders(true),
      body: JSON.stringify({ name, password }),
    })
  },

  async getCountries() {
    return requestJson<Country[]>(`${BASE}/api/countries`)
  },

  async getCountry(countryId: string) {
    return requestJson<Country>(`${BASE}/api/countries/${countryId}`)
  },

  async getCountryCoordinates(countryId: string) {
    return requestJson<CountryCoordinates>(`${BASE}/api/countries/${countryId}/coordinates`)
  },

  async addCountry(data: {
    id: string
    name?: string
    name_ja: string
    lat: number
    lng: number
    exist_from?: string
    exist_until?: string
  }) {
    return requestJson<Country>(`${BASE}/api/countries`, {
      method: 'POST',
      headers: buildHeaders(true),
      body: JSON.stringify({
        iso_id: data.id,
        name: data.name ?? data.name_ja,
        name_ja: data.name_ja,
        lat: data.lat,
        lng: data.lng,
        exist_from: data.exist_from ?? '1900-01-01',
        exist_until: data.exist_until ?? '9999-12-31',
      }),
    })
  },

  async updateCountry(countryId: string, data: {
    name?: string
    name_ja: string
    lat: number
    lng: number
    exist_from?: string
    exist_until?: string
  }) {
    return requestJson<Country>(`${BASE}/api/countries/${countryId}`, {
      method: 'PUT',
      headers: buildHeaders(true),
      body: JSON.stringify({
        iso_id: countryId,
        name: data.name ?? data.name_ja,
        name_ja: data.name_ja,
        lat: data.lat,
        lng: data.lng,
        exist_from: data.exist_from ?? '1900-01-01',
        exist_until: data.exist_until ?? '9999-12-31',
      }),
    })
  },

  async updateCountrySummary(countryId: string, summary: string, summary_jp: string) {
    return requestJson<Country>(`${BASE}/api/countries/${countryId}/summary`, {
      method: 'PATCH',
      headers: buildHeaders(true),
      body: JSON.stringify({ summary, summary_jp }),
    })
  },

  async deleteCountry(id: string) {
    return requestJson<{ message: string }>(`${BASE}/api/countries/${id}`, {
      method: 'DELETE',
      headers: buildHeaders(),
    })
  },

  async getMaps() {
    return requestJson<MapRecord[]>(`${BASE}/api/maps`)
  },

  async getMap(mapId: number) {
    return requestJson<MapRecord>(`${BASE}/api/maps/${mapId}`)
  },

  async isMapEditable(mapId: number) {
    return requestJson<{ editable: boolean }>(`${BASE}/api/maps/${mapId}/editable`, {
      headers: buildHeaders(),
    })
  },

  async getLinkTypes(mapId: number) {
    return requestJson<LinkType[]>(`${BASE}/api/link_types?map_id=${encodeURIComponent(mapId)}`)
  },

  async getLinks(mapId: number, linkType: number, date: string) {
    const params = new URLSearchParams({
      link_type: String(linkType),
      date,
    })

    return requestJson<RelationLink[]>(`${BASE}/api/links/${mapId}?${params.toString()}`)
  },

  async createLink(data: {
    map_id: number
    link_type: number
    from_country: number
    to_country: number
    exist_from: string
    exist_until: string
  }) {
    return requestJson<RelationLink>(`${BASE}/api/links`, {
      method: 'POST',
      headers: buildHeaders(true),
      body: JSON.stringify(data),
    })
  },

  async updateLink(linkId: number, data: {
    map_id: number
    link_type: number
    from_country: number
    to_country: number
    exist_from: string
    exist_until: string
  }) {
    return requestJson<RelationLink>(`${BASE}/api/links/${linkId}`, {
      method: 'PUT',
      headers: buildHeaders(true),
      body: JSON.stringify(data),
    })
  },

  async deleteLink(linkId: number) {
    return requestJson<{ detail: string }>(`${BASE}/api/links/${linkId}`, {
      method: 'DELETE',
      headers: buildHeaders(),
    })
  },

  async getMapPoints(mapId: number) {
    return requestJson<MapPoint[]>(`${BASE}/api/maps/${mapId}/map_points`)
  },

  async updateMapPointColor(mapId: number, mapPointId: number, color: string) {
    return requestJson<MapPoint>(`${BASE}/api/maps/${mapId}/map_points/${mapPointId}?color=${encodeURIComponent(color)}`, {
      method: 'PATCH',
      headers: buildHeaders(),
    })
  },
}
