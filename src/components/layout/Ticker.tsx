interface TickerProps {
  items: Array<{ text: string; hot?: boolean }>
}

export default function Ticker({ items }: TickerProps) {
  const doubled = [...items, ...items]
  return (
    <div style={{ background: 'var(--ink)', height: '28px', overflow: 'hidden', display: 'flex', alignItems: 'center' }}>
      <div style={{ display: 'flex', whiteSpace: 'nowrap', animation: 'roll 30s linear infinite' }}>
        {doubled.map((item, i) => (
          <span key={i} style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '14px',
            padding: '0 28px',
            fontFamily: 'var(--font-d)',
            fontSize: '8.5px',
            fontWeight: 700,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: item.hot ? 'var(--red)' : 'var(--bg)',
          }}>
            {item.text}
            <span style={{ color: 'var(--ink3)' }}>—</span>
          </span>
        ))}
      </div>
    </div>
  )
}
