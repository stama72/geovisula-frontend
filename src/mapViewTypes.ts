import type { Country } from './types'

export type EnrichedCountry = Country & {
  lat: number
  lng: number
}

export type LinkFeatureProperties = {
  id: number
  linkTypeId: number
  linkTypeName: string
  fromCountryId: string
  toCountryId: string
  fromCountryName: string
  toCountryName: string
  color: string
  animated: boolean
  existFrom: string | null
  existUntil: string | null
}

export type CountryFeatureProperties = {
  countryId: string
  countryName: string
  countryNameJa: string
  color: string
}

export type DraftFeatureProperties = Record<string, never>

export type DraftState = {
  fromCountryId?: string
  fromCoords?: [number, number]
  toCoords?: [number, number]
}

export type ActiveDraft = {
  fromCountryId: string
  toCountryId: string
  fromCoords: [number, number]
  toCoords: [number, number]
} | null | undefined
