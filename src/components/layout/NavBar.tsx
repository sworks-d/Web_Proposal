'use client'
import Link from 'next/link'
import { useState } from 'react'

interface NavBarProps {
  context?: string
}

export default function NavBar({ context }: NavBarProps) {
  const [stopping, setStopping] = useState(false)
  const [stopped, setStopped] = useState(false)

  const handleStopAll = async () => {
    if (stopping) return
    setStopping(true)
    try {
      await fetch('/api/executions/stop-all', { method: 'POST' })
      setStopped(true)
      setTimeout(() => setStopped(false), 3000)
    } catch {}
    setStopping(false)
  }

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

      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
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
        <button
          onClick={handleStopAll}
          disabled={stopping}
          style={{
            fontFamily: 'var(--font-d)',
            fontSize: '8px',
            fontWeight: 700,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            padding: '6px 14px',
            border: `1px solid ${stopped ? 'var(--dot-g)' : 'var(--red)'}`,
            background: 'transparent',
            color: stopped ? 'var(--dot-g)' : 'var(--red)',
            cursor: stopping ? 'not-allowed' : 'pointer',
            borderRadius: '2px',
            opacity: stopping ? 0.5 : 1,
            transition: 'color 0.2s, border-color 0.2s',
          }}
        >
          {stopped ? '✓ 停止済み' : stopping ? '停止中...' : '■ 全停止'}
        </button>
      </div>
    </nav>
  )
}
