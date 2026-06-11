import { useEffect, useState } from 'react'
import { api } from './api'
import { getMapEditableCacheKey } from './authStorage'

type UseMapEditableResult = {
  mapEditable: boolean
  editMode: boolean
  setEditMode: (v: boolean) => void
}

export default function useMapEditable(selectedMapId: number | null, token: string): UseMapEditableResult {
  const [mapEditable, setMapEditable] = useState(false)
  const [editMode, setEditMode] = useState(false)

  useEffect(() => {
    if (!token || !selectedMapId) {
      queueMicrotask(() => {
        setMapEditable(false)
        setEditMode(false)
      })
      return
    }

    let cancelled = false
    const mapId = selectedMapId
    const cacheKey = getMapEditableCacheKey(mapId)
    const cachedEditable = localStorage.getItem(cacheKey)

    if (cachedEditable !== null) {
      const editable = cachedEditable === 'true'
      setMapEditable(editable)
      setEditMode(editable)
    }

    async function loadEditableState() {
      try {
        const { editable } = await api.isMapEditable(mapId)
        if (!cancelled) {
          localStorage.setItem(cacheKey, String(editable))
          setMapEditable(editable)
          setEditMode(editable)
        }
      } catch {
        if (!cancelled) {
          setMapEditable(false)
          setEditMode(false)
        }
      }
    }

    void loadEditableState()

    return () => {
      cancelled = true
    }
  }, [selectedMapId, token])

  return { mapEditable, editMode, setEditMode }
}
