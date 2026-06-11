import { useEffect, useState } from 'react'
import './App.css'
import { api } from './api'
import AppHeader from './AppHeader'
import CountryManager from './CountryManager'
import LinkEditorPanel from './LinkEditorPanel'
import LinkTypesPanel from './LinkTypesPanel'
import LoginPage from './LoginPage'
import MapEditorPanel from './MapEditorPanel'
import MapView from './MapView'
import useAuth from './useAuth'
import useLinkDraft from './useLinkDraft'
import useLinkTypes from './useLinkTypes'
import useMapData from './useMapData'
import useMapEditable from './useMapEditable'
import type { LinkDraft } from './types'

export default function App() {
  const [activePanel, setActivePanel] = useState<'mapEditor' | 'linkTypes' | 'countryManager' | null>(null)
  const [showCreateMapPanel, setShowCreateMapPanel] = useState(false)
  const [mapDataRefreshKey, setMapDataRefreshKey] = useState(0)

  const auth = useAuth({
    onBeforeReset: () => {
      setActivePanel(null)
      setShowCreateMapPanel(false)
      setMapDataRefreshKey(0)
    },
  })

  const mapData = useMapData(auth.token, (message) => {
    void auth.bootstrapGuestSession(message)
  })

  const mapEditable = useMapEditable(mapData.selectedMapId, auth.token)

  const linkTypes = useLinkTypes(mapData.selectedMapId)

  const linkDraft = useLinkDraft(
    mapData.selectedMapId,
    (linkTypeId) => linkTypes.setRefreshLinkTypeId(linkTypeId),
    () => setActivePanel(null),
  )

  useEffect(() => {
    if (!auth.token && !auth.authReady) {
      return
    }
    if (!auth.token) {
      void auth.bootstrapGuestSession()
    }
  }, [auth.token])

  if (!auth.authReady) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          background: 'linear-gradient(180deg, #08111f 0%, #0f172a 100%)',
          color: 'white',
          fontSize: 14,
        }}
      >
        認証情報を確認しています...
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#08111f' }}>
      <AppHeader
        maps={mapData.maps}
        selectedMapId={mapData.selectedMapId}
        selectedMap={mapData.selectedMap}
        mapEditable={mapEditable.mapEditable}
        editMode={mapEditable.editMode}
        activePanel={activePanel}
        loadingError={mapData.loadingError}
        displayName={auth.displayName}
        role={auth.role}
        isGuest={auth.isGuest}
        onSelectMap={(id) => mapData.setSelectedMapId(id)}
        onCreateMapRequest={() => setShowCreateMapPanel(true)}
        onTogglePanel={(panel) => setActivePanel(activePanel === panel ? null : panel)}
        onToggleEditMode={() => mapEditable.setEditMode(!mapEditable.editMode)}
        onSetShowAuthPanel={auth.setShowAuthPanel}
        onSetAuthPanelMessage={auth.setAuthPanelMessage}
        onLogout={auth.handleLogout}
      />

      <div style={{ position: 'relative', flex: 1, minHeight: 0 }}>
        <MapView
          mapId={mapData.selectedMapId}
          editMode={mapEditable.editMode}
          onLinkCreate={linkDraft.handleLinkCreate}
          onLinkEdit={linkDraft.handleLinkEdit}
          activeDraft={linkDraft.linkDraft?.mode === 'create' ? linkDraft.linkDraft : null}
          mapDataRefreshKey={mapDataRefreshKey}
          refreshLinkTypeId={linkTypes.refreshLinkTypeId}
          onLinksRefreshed={() => {
            linkTypes.setRefreshLinkTypeId(null)
          }}
        />
      </div>

      {linkDraft.linkDraft && mapData.selectedMap && (
        <LinkEditorPanel
          draft={linkDraft.linkDraft}
          linkTypes={linkTypes.linkTypes}
          onClose={() => {
            console.log('App: LinkEditorPanel onClose -> clearing linkDraft')
            linkDraft.setLinkDraft(null)
          }}
          onSave={linkDraft.handleLinkSave}
          onDelete={linkDraft.linkDraft.mode === 'edit' ? linkDraft.handleLinkDelete : undefined}
        />
      )}

      <DebugLogger linkDraft={linkDraft.linkDraft} />

      {activePanel === 'mapEditor' && mapData.selectedMap && (
        <MapEditorPanel
          mode="edit"
          map={mapData.selectedMap}
          onClose={() => setActivePanel(null)}
          onSaved={(updatedMap) => {
            mapData.setMaps((current) => current.map((map) => (map.id === updatedMap.id ? updatedMap : map)))
            setActivePanel(null)
          }}
        />
      )}

      {showCreateMapPanel && (
        <MapEditorPanel
          mode="create"
          onClose={() => setShowCreateMapPanel(false)}
          onCreated={(map) => {
            mapData.setMaps((current) => [...current, map])
            mapData.setSelectedMapId(map.id)
            setShowCreateMapPanel(false)
          }}
        />
      )}

      {activePanel === 'linkTypes' && mapData.selectedMap && (
        <LinkTypesPanel
          mapId={mapData.selectedMap.id}
          linkTypes={linkTypes.linkTypes}
          onClose={() => setActivePanel(null)}
          onRefresh={async () => {
            const refreshedLinkTypes = await api.getLinkTypes(mapData.selectedMap!.id)
            linkTypes.setLinkTypes(refreshedLinkTypes)
            setMapDataRefreshKey((current) => current + 1)
          }}
        />
      )}

      {activePanel === 'countryManager' && (
        <CountryManager
          role={auth.role}
          countries={mapData.countries}
          onClose={() => setActivePanel(null)}
          onUpdate={() => {
            void mapData.refreshCountries()
          }}
        />
      )}

      {auth.showAuthPanel && (
        <LoginPage
          onLogin={auth.handleLogin}
          onClose={() => {
            auth.setShowAuthPanel(false)
            auth.setAuthPanelMessage('')
          }}
          message={auth.authPanelMessage}
        />
      )}
    </div>
  )
}

function DebugLogger({ linkDraft }: { linkDraft: LinkDraft | null }) {
  useEffect(() => {
    console.log('DebugLogger: linkDraft changed ->', linkDraft)
  }, [linkDraft])
  return null
}
