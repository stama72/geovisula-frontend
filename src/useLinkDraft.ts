import { useState } from 'react'
import { api } from './api'
import type { LinkDraft } from './types'

function normalizeDateForInput(value: string | null, fallback: string) {
  return value ? value.slice(0, 10) : fallback
}

type UseLinkDraftResult = {
  linkDraft: LinkDraft | null
  setLinkDraft: (draft: LinkDraft | null) => void
  handleLinkCreate(payload: { fromCountryId: string; toCountryId: string; fromCoords: [number, number]; toCoords: [number, number] }): Promise<void>
  handleLinkEdit(payload: { linkId: number; linkTypeId: number; fromCountryId: string; toCountryId: string; existFrom: string | null; existUntil: string | null }): void
  handleLinkSave(form: { linkTypeId: number; existFrom: string; existUntil: string }): Promise<void>
  handleLinkDelete(): Promise<void>
}

export default function useLinkDraft(
  selectedMapId: number | null,
  onSaved: (linkTypeId: number) => void,
  onPanelClose: () => void,
): UseLinkDraftResult {
  const [linkDraft, setLinkDraft] = useState<LinkDraft | null>(null)

  async function handleLinkCreate(payload: { fromCountryId: string; toCountryId: string; fromCoords: [number, number]; toCoords: [number, number] }) {
    console.log('handleLinkCreate:', payload)
    onPanelClose()
    setLinkDraft({ mode: 'create', ...payload })
  }

  function handleLinkEdit(payload: {
    linkId: number
    linkTypeId: number
    fromCountryId: string
    toCountryId: string
    existFrom: string | null
    existUntil: string | null
  }) {
    onPanelClose()
    setLinkDraft({
      mode: 'edit',
      linkId: payload.linkId,
      linkTypeId: payload.linkTypeId,
      fromCountryId: payload.fromCountryId,
      toCountryId: payload.toCountryId,
      existFrom: normalizeDateForInput(payload.existFrom, '1900-01-01'),
      existUntil: normalizeDateForInput(payload.existUntil, '9999-12-31'),
    })
  }

  async function handleLinkSave(form: { linkTypeId: number; existFrom: string; existUntil: string }): Promise<void> {
    if (!selectedMapId || !linkDraft) {
      return
    }

    const countryRows = await api.getCountries()
    const fromCountry = countryRows.find((country) => country.iso_id === linkDraft.fromCountryId)
    const toCountry = countryRows.find((country) => country.iso_id === linkDraft.toCountryId)

    if (!fromCountry?.capital_point_id || !toCountry?.capital_point_id) {
      throw new Error('国の首都座標が見つかりません')
    }

    if (linkDraft.mode === 'create') {
      await api.createLink({
        map_id: selectedMapId,
        link_type: form.linkTypeId,
        from_country: fromCountry.capital_point_id,
        to_country: toCountry.capital_point_id,
        exist_from: form.existFrom,
        exist_until: form.existUntil,
      })
      onSaved(form.linkTypeId)
      return
    }

    await api.updateLink(linkDraft.linkId, {
      map_id: selectedMapId,
      link_type: form.linkTypeId,
      from_country: fromCountry.capital_point_id,
      to_country: toCountry.capital_point_id,
      exist_from: form.existFrom,
      exist_until: form.existUntil,
    })

    onSaved(linkDraft.linkTypeId)
  }

  async function handleLinkDelete(): Promise<void> {
    if (!linkDraft || linkDraft.mode !== 'edit') {
      return
    }

    await api.deleteLink(linkDraft.linkId)
    onSaved(linkDraft.linkTypeId)
  }

  return { linkDraft, setLinkDraft, handleLinkCreate, handleLinkEdit, handleLinkSave, handleLinkDelete }
}
