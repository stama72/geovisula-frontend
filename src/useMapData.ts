import { useEffect, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { ApiError, api } from './api'
import type { Country, CountryEditorEntry, MapRecord } from './types'

function formatErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message
  }
  return fallback
}

type UseMapDataResult = {
  maps: MapRecord[]
  countries: CountryEditorEntry[]
  selectedMapId: number | null
  loadingError: string
  selectedMap: MapRecord | null
  setSelectedMapId: (id: number | null) => void
  setMaps: Dispatch<SetStateAction<MapRecord[]>>
  setCountries: Dispatch<SetStateAction<CountryEditorEntry[]>>
  refreshCountries(): Promise<void>
}

export default function useMapData(
  token: string,
  onAuthError: (message: string) => void,
): UseMapDataResult {
  const [maps, setMaps] = useState<MapRecord[]>([])
  const [countries, setCountries] = useState<CountryEditorEntry[]>([])
  const [selectedMapId, setSelectedMapId] = useState<number | null>(() => {
    const v = localStorage.getItem('selectedMapId')
    return v ? Number(v) : null
  })
  const [loadingError, setLoadingError] = useState('')

  const selectedMap = maps.find((map) => map.id === selectedMapId) ?? null

  useEffect(() => {
    if (selectedMapId != null) {
      localStorage.setItem('selectedMapId', String(selectedMapId))
    } else {
      localStorage.removeItem('selectedMapId')
    }
  }, [selectedMapId])

  useEffect(() => {
    if (!token) {
      return
    }

    let cancelled = false

    async function loadInitialData() {
      try {
        const [mapRows, countryRows] = await Promise.all([api.getMaps(), api.getCountries()])
        const coordMap = await api.getCountriesCoordinates()
        const countriesWithCoordinates = countryRows.map((country) => ({
          id: country.iso_id,
          name_ja: country.name_ja,
          capital_point_id: country.capital_point_id,
          lat: coordMap[country.iso_id]?.lat ?? 0,
          lng: coordMap[country.iso_id]?.lng ?? 0,
        }))

        if (cancelled) {
          return
        }
        setMaps(mapRows)
        setCountries(countriesWithCoordinates)
        setLoadingError('')

        setSelectedMapId((currentSelectedMapId) => {
          if (currentSelectedMapId && mapRows.some((row) => row.id === currentSelectedMapId)) {
            return currentSelectedMapId
          }
          return mapRows[0]?.id ?? null
        })
      } catch (error) {
        if (cancelled) {
          return
        }

        if (error instanceof ApiError && error.status === 401) {
          onAuthError('保存されたログイン情報が無効だったため、ゲストとして再接続しました。')
          return
        }

        setLoadingError(formatErrorMessage(error, '初期データの読み込みに失敗しました'))
      }
    }

    void loadInitialData()

    return () => {
      cancelled = true
    }
  }, [token])

  async function refreshCountries() {
    const countryRows: Country[] = await api.getCountries()
    const coordMap = await api.getCountriesCoordinates()
    const countriesWithCoordinates = countryRows.map((country) => ({
      id: country.iso_id,
      name_ja: country.name_ja,
      capital_point_id: country.capital_point_id,
      lat: coordMap[country.iso_id]?.lat ?? 0,
      lng: coordMap[country.iso_id]?.lng ?? 0,
    }))

    setCountries(countriesWithCoordinates)
  }

  return {
    maps,
    countries,
    selectedMapId,
    loadingError,
    selectedMap,
    setSelectedMapId,
    setMaps,
    setCountries,
    refreshCountries,
  }
}
