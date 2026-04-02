'use client'
import { OutputSection, OutputItem } from '@/lib/output-renderer'

export function OutputSectionRenderer({ sections }: { sections: OutputSection[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {sections.map((sec, i) => (
        <div key={i} style={{ borderBottom: '1px solid rgba(28,28,23,0.1)', padding: '22px 40px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
            <span style={{ fontFamily: 'var(--font-d)', fontSize: '9.5px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--ink)' }}>
              {sec.label}
            </span>
            {sec.confidence && (
              <span style={{
                fontFamily: 'var(--font-c)', fontSize: '8px', fontWeight: 700,
                letterSpacing: '0.1em', textTransform: 'uppercase',
                padding: '2px 9px', borderRadius: '99px',
                background: 'var(--bg2)', border: '1px solid rgba(28,28,23,0.16)',
                color: sec.confidence === 'high' ? 'var(--ink)' : sec.confidence === 'medium' ? 'var(--ink3)' : 'var(--ink4)'
              }}>
                {sec.confidence.toUpperCase()}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {sec.items.filter(item => item.content && (Array.isArray(item.content) ? item.content.length > 0 : item.content !== '' && item.content !== 'undefined' && item.content !== 'null')).map((item, j) => (
              <OutputItemRenderer key={j} item={item} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function OutputItemRenderer({ item }: { item: OutputItem }) {
  const baseStyle: React.CSSProperties = {
    fontFamily: 'var(--font-c)',
    fontSize: '13px',
    lineHeight: 1.82,
    color: item.note === 'secondary' ? 'var(--ink3)' : 'var(--ink2)'
  }

  switch (item.type) {
    case 'text':
      return (
        <div>
          <p style={baseStyle}>{item.content as string}</p>
          {item.note && item.note !== 'secondary' && (
            <p style={{ ...baseStyle, fontSize: '11px', color: 'var(--ink3)', marginTop: '2px' }}>
              {item.note}
            </p>
          )}
        </div>
      )

    case 'list':
      return (
        <ul style={{ paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {(item.content as string[]).map((line, i) => (
            <li key={i} style={baseStyle}>{line}</li>
          ))}
        </ul>
      )

    case 'badge-list':
      return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {(item.content as string[]).filter(Boolean).map((badge, i) => (
            <span key={i} style={{ background: 'var(--bg2)', border: '1px solid rgba(28,28,23,0.16)', borderRadius: '99px', padding: '3px 12px', fontFamily: 'var(--font-c)', fontSize: '11px', color: 'var(--ink2)' }}>
              {badge}
            </span>
          ))}
        </div>
      )

    case 'warning':
      return (
        <div style={{ background: 'rgba(232,196,74,0.08)', border: '1px solid rgba(232,196,74,0.4)', padding: '10px 14px', borderRadius: '2px' }}>
          <p style={{ ...baseStyle, color: 'var(--ink)' }}>{item.content as string}</p>
          {item.note && (
            <p style={{ ...baseStyle, fontSize: '11px', color: 'var(--ink3)', marginTop: '3px' }}>{item.note}</p>
          )}
        </div>
      )

    case 'principle':
      return (
        <div style={{ borderLeft: '2px solid var(--red)', paddingLeft: '12px' }}>
          <p style={{ ...baseStyle, color: 'var(--ink)', fontWeight: 500 }}>{item.content as string}</p>
          {item.note && (
            <p style={{ ...baseStyle, fontSize: '11px', color: 'var(--ink3)', marginTop: '2px' }}>{item.note}</p>
          )}
        </div>
      )

    default:
      return null
  }
}
