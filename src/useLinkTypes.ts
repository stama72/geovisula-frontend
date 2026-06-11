import { useEffect, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { api } from './api'
import type { LinkType } from './types'

type UseLinkTypesResult = {
  linkTypes: LinkType[]
  refreshLinkTypeId: number | null
  setLinkTypes: Dispatch<SetStateAction<LinkType[]>>
  setRefreshLinkTypeId: (id: number | null) => void
}

export default function useLinkTypes(selectedMapId: number | null): UseLinkTypesResult {
  const [linkTypes, setLinkTypes] = useState<LinkType[]>([])
  const [refreshLinkTypeId, setRefreshLinkTypeId] = useState<number | null>(null)

  useEffect(() => {
    if (!selectedMapId) {
      queueMicrotask(() => {
        setLinkTypes([])
      })
      return
    }

    let cancelled = false
    const mapId = selectedMapId

    async function loadLinkTypes() {
      try {
        const rows = await api.getLinkTypes(mapId)
        if (!cancelled) {
          setLinkTypes(rows)
        }
      } catch {
        if (!cancelled) {
          setLinkTypes([])
        }
      }
    }

    void loadLinkTypes()

    return () => {
      cancelled = true
    }
  }, [selectedMapId])

  return { linkTypes, refreshLinkTypeId, setLinkTypes, setRefreshLinkTypeId }
}
