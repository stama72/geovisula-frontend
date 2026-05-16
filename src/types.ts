export type AuthResponse = {
  access_token: string
  token_type: string
  display_name: string
  role: string
}

export type Country = {
  iso_id: string
  name: string
  name_ja: string
  capital_point_id: number | null
  exist_from: string | null
  exist_until: string | null
  summary: string | null
  summary_jp: string | null
}

export type CountryCoordinates = {
  lat: number
  lng: number
}

export type MapRecord = {
  id: number
  name: string
  name_ja: string
  owner: number
  read_permission: string
  edit_permission: string
  exist_from: string | null
  exist_until: string | null
  time_scale: string
  summary: string | null
  summary_jp: string | null
  regulations: string | null
}

export type LinkType = {
  id: number
  name: string
  name_ja: string
  map_id: number
  color: string
  animated: boolean
}

export type RelationLink = {
  id: number
  map_id: number
  link_type: number
  from_country: number
  to_country: number
  exist_from: string | null
  exist_until: string | null
}

export type MapPoint = {
  id: number
  map_id: number
  point_id: number
  color: string
}

export type CountryEditorEntry = {
  id: string
  name_ja: string
  capital_point_id?: number | null
  lat: number
  lng: number
}
