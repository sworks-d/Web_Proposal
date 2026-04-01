'use client'
import Link from 'next/link'

interface NavBarProps {
  context?: string
}

export default function NavBar({ context }: NavBarProps) {
  return (
    <nav style={{
      padding: '16px 44px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottom: '1px solid var(--line)',
      background: 'var(--bg)',
    }}>
      <Link href="/" style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        textDecoration: 'none',
        color: 'var(--ink)',
        fontFamily: 'var(--font-d)',
        fontSize: '10px',
        fontWeight: 900,
        letterSpacing: '0.08em',
      }}>
        <div style={{
          width: '24px', height: '24px',
          background: 'var(--ink)',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '2px',
          padding: '4px',
        }}>
          <span style={{ background: 'var(--bg)', display: 'block' }} />
          <span style={{ background: 'var(--bg)', display: 'block' }} />
          <span style={{ background: 'var(--bg)', display: 'block' }} />
          <span style={{ background: 'var(--bg)', display: 'block' }} />
        </div>
        Web Proposal Agent
      </Link>

      {context && (
        <span style={{
          fontFamily: 'var(--font-c)',
          fontSize: '11px',
          color: 'var(--ink3)',
          letterSpacing: '0.05em',
        }}>
          {context}
        </span>
      )}

      <div style={{ display: 'flex', gap: '24px' }}>
        {['Cases', 'Settings'].map(label => (
          <Link key={label} href="/" style={{
            fontFamily: 'var(--font-d)',
            fontSize: '9px',
            fontWeight: 400,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: 'var(--ink3)',
            textDecoration: 'none',
          }}>
            {label}
          </Link>
        ))}
      </div>
    </nav>
  )
}
