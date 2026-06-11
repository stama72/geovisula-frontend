import type { LinkType, MapRecord } from './types'

type Props = {
  mapInfo: MapRecord
  linkTypes: LinkType[]
}

export default function MapInfoPanel({ mapInfo, linkTypes }: Props) {
  return (
    <div style={infoPanelStyle}>
      <div style={{ fontSize: 12, color: '#6b7280' }}>現在のマップ</div>
      <div style={{ fontWeight: 700, marginTop: 4 }}>{mapInfo.name_ja}</div>
      <div style={{ fontSize: 12, marginTop: 4 }}>{mapInfo.summary_jp}</div>
      <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>{linkTypes.length}種類のリンク</div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6, marginRight: 8 }}>
        {linkTypes.map(({ name_ja, color }) => (
          <span key={name_ja} style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 12 }}>
            <span
              style={{
                display: 'inline-block',
                width: 24,
                height: 3,
                background: color,
                borderRadius: 2,
              }}
            />
            {name_ja}
          </span>
        ))}
      </div>
    </div>
  )
}

const infoPanelStyle: React.CSSProperties = {
  position: 'absolute',
  left: 16,
  top: 12,
  zIndex: 25,
  background: 'rgba(255,255,255,0.96)',
  borderRadius: 14,
  padding: '12px 14px',
  boxShadow: '0 8px 24px rgba(15, 23, 42, 0.12)',
  minWidth: 180,
  maxWidth: 240,
  wordBreak: 'break-word',
}
