import { useState } from 'react'
import { APP_HEADER_HEIGHT } from './layoutConstants'
import useViewport from './useViewport'
import type { MapRecord } from './types'

type ActivePanel = 'mapEditor' | 'linkTypes' | 'countryManager' | null

type AppHeaderProps = {
  maps: MapRecord[]
  selectedMapId: number | null
  selectedMap: MapRecord | null
  mapEditable: boolean
  editMode: boolean
  activePanel: ActivePanel
  loadingError: string
  displayName: string
  role: string
  isGuest: boolean
  onSelectMap: (id: number | null) => void
  onCreateMapRequest: () => void
  onTogglePanel: (panel: 'mapEditor' | 'linkTypes' | 'countryManager') => void
  onToggleEditMode: () => void
  onSetShowAuthPanel: (v: boolean) => void
  onSetAuthPanelMessage: (msg: string) => void
  onLogout: () => void
}

const headerButtonStyle: React.CSSProperties = {
  padding: '7px 12px',
  borderRadius: 8,
  border: '1px solid rgba(255,255,255,0.18)',
  background: 'rgba(15, 23, 42, 0.95)',
  color: 'white',
  cursor: 'pointer',
  fontSize: 13,
  marginLeft: 'auto',
}

const mobilePanelButtonStyle: React.CSSProperties = {
  ...headerButtonStyle,
  width: '100%',
  textAlign: 'left',
}

export default function AppHeader({
  maps,
  selectedMapId,
  selectedMap,
  mapEditable,
  editMode,
  activePanel,
  loadingError,
  displayName,
  role,
  isGuest,
  onSelectMap,
  onCreateMapRequest,
  onTogglePanel,
  onToggleEditMode,
  onSetShowAuthPanel,
  onSetAuthPanelMessage,
  onLogout,
}: AppHeaderProps) {
  const { isMobile } = useViewport()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const authButtonLabel = isGuest ? 'ログイン' : 'ログアウト'

  const headerStyle: React.CSSProperties = {
    position: 'relative',
    zIndex: 40,
    background: 'rgba(8, 17, 31, 0.88)',
    color: 'white',
    minHeight: APP_HEADER_HEIGHT,
    height: isMobile ? 'auto' : APP_HEADER_HEIGHT,
    padding: isMobile ? '10px 12px' : '0 16px',
    boxSizing: 'border-box',
    display: 'flex',
    alignItems: isMobile ? 'flex-start' : 'center',
    gap: 12,
    flexWrap: isMobile ? 'wrap' : 'nowrap',
    backdropFilter: 'blur(10px)',
    boxShadow: '0 1px 0 rgba(255,255,255,0.08)',
  }

  function handleAuthButtonClick() {
    if (isGuest) {
      onSetAuthPanelMessage('')
      onSetShowAuthPanel(true)
    } else {
      void onLogout()
    }
  }

  return (
    <>
      <div style={headerStyle}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#dbe4f0', width: 'auto' }}>
          <span style={{ fontWeight: 700, fontSize: 16 }}>Geovisula</span>
          <select
            value={selectedMapId ?? ''}
            onChange={(event) => {
              const v = event.target.value
              if (v === '__create_new') {
                if (isGuest) {
                  onSetAuthPanelMessage('マップの作成にはログインが必要です。')
                  onSetShowAuthPanel(true)
                  return
                }
                onCreateMapRequest()
                return
              }
              onSelectMap(v ? Number(v) : null)
            }}
            style={{
              minWidth: isMobile ? 'min(100%, 240px)' : 220,
              width: isMobile ? '100%' : 'auto',
              padding: '7px 10px',
              borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.18)',
              background: 'rgba(15, 23, 42, 0.95)',
              color: 'white',
            }}
          >
            {maps.length === 0 && <option value="">読み込み中...</option>}
            <option value="__create_new">(マップを新規作成...)</option>
            {maps.map((map) => (
              <option key={map.id} value={map.id}>
                {map.name_ja}
              </option>
            ))}
          </select>
        </label>

        {isMobile && (
          <button onClick={() => setMobileMenuOpen((current) => !current)} style={headerButtonStyle}>
            {mobileMenuOpen ? '✕' : '≡'}
          </button>
        )}

        {selectedMap && !isMobile && (
          <span style={{ fontSize: 12, color: '#9fb2cc' }}>
            {selectedMap.read_permission} / {selectedMap.edit_permission}
          </span>
        )}

        <span style={{ flex: 1, display: isMobile ? 'none' : 'block' }} />

        {loadingError && !isMobile && <span style={{ fontSize: 12, color: '#fda4af' }}>{loadingError}</span>}

        {mapEditable && !isMobile && (
          <>
            <button
              onClick={() => onTogglePanel('mapEditor')}
              style={headerButtonStyle}
            >
              {activePanel === 'mapEditor' ? 'マップ編集（閉じる）' : 'マップ編集'}
            </button>

            <button
              onClick={() => onTogglePanel('linkTypes')}
              style={headerButtonStyle}
            >
              {activePanel === 'linkTypes' ? 'リンクタイプ編集（閉じる）' : 'リンクタイプ編集'}
            </button>
          </>
        )}

        {mapEditable && (
          <button
            onClick={onToggleEditMode}
            style={{
              ...headerButtonStyle,
              background: editMode ? 'rgba(34, 197, 94, 0.12)' : 'rgba(15, 23, 42, 0.95)',
              color: editMode ? '#86efac' : 'white',
              fontWeight: editMode ? 700 : 400,
            }}
          >
            {editMode ? 'リンクを編集中' : 'リンクを編集する'}
          </button>
        )}

        {role === 'admin' && !isMobile && (
          <button
            onClick={() => onTogglePanel('countryManager')}
            style={headerButtonStyle}
          >
            {activePanel === 'countryManager' ? '国管理（閉じる）' : '国管理'}
          </button>
        )}

        <span style={{ fontSize: 13, color: '#dbe4f0', display: isMobile ? 'none' : 'inline' }}>
          {displayName || (isGuest ? 'ゲスト' : '')}（{role || (isGuest ? 'viewer' : '')}）
        </span>

        {!isMobile && (
          <button onClick={handleAuthButtonClick} style={headerButtonStyle}>
            {authButtonLabel}
          </button>
        )}
      </div>

      {isMobile && mobileMenuOpen && (
        <div
          style={{
            position: 'absolute',
            top: APP_HEADER_HEIGHT,
            right: 12,
            zIndex: 45,
            width: 'min(100vw - 24px, 320px)',
            background: 'rgba(8, 17, 31, 0.98)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 14,
            padding: 12,
            boxShadow: '0 16px 40px rgba(0,0,0,0.28)',
          }}
        >
          <div style={{ display: 'grid', gap: 10 }}>
            <div style={{ fontSize: 12, color: '#9fb2cc' }}>
              {displayName || (isGuest ? 'ゲスト' : '')}（{role || (isGuest ? 'viewer' : '')}）
            </div>

            {loadingError && <div style={{ fontSize: 12, color: '#fda4af' }}>{loadingError}</div>}

            {mapEditable && (
              <>
                <button
                  onClick={() => { onTogglePanel('mapEditor'); setMobileMenuOpen(false) }}
                  style={mobilePanelButtonStyle}
                >
                  マップ編集
                </button>
                <button
                  onClick={() => { onTogglePanel('linkTypes'); setMobileMenuOpen(false) }}
                  style={mobilePanelButtonStyle}
                >
                  リンクタイプ編集
                </button>
              </>
            )}

            {role === 'admin' && (
              <button
                onClick={() => { onTogglePanel('countryManager'); setMobileMenuOpen(false) }}
                style={mobilePanelButtonStyle}
              >
                国管理
              </button>
            )}

            <button
              onClick={() => {
                handleAuthButtonClick()
                setMobileMenuOpen(false)
              }}
              style={mobilePanelButtonStyle}
            >
              {authButtonLabel}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
