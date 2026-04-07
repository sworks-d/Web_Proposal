'use client'
import { useEffect, useState } from 'react'

interface AgentStat {
  agentId: string
  durationMs: number | null
  durationFormatted: string
  status: string
}

interface StatsData {
  totalDurationMs: number
  totalDurationFormatted: string
  agentStats: AgentStat[]
}

interface ExecutionStatsProps {
  versionId: string
}

export function ExecutionStats({ versionId }: ExecutionStatsProps) {
  const [stats, setStats] = useState<StatsData | null>(null)
  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    if (!versionId) return
    fetch(`/api/executions/${versionId}/stats`)
      .then(r => r.ok ? r.json() : null)
      .then(setStats)
      .catch(() => {})
  }, [versionId])

  if (!stats || stats.agentStats.length === 0) return null

  return (
    <div style={{
      margin: '12px 40px 0',
      padding: '12px 16px',
      background: 'var(--bg2)',
      border: '1px solid var(--line)',
      borderRadius: '4px',
      flexShrink: 0,
    }}>
      <div
        onClick={() => setIsExpanded(p => !p)}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '14px' }}>⏱️</span>
          <span style={{ fontFamily: 'var(--font-d)', fontSize: '9px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink3)' }}>
            総実行時間
          </span>
          <span style={{ fontFamily: 'var(--font-d)', fontSize: '14px', fontWeight: 900, color: 'var(--ink)', letterSpacing: '-0.01em' }}>
            {stats.totalDurationFormatted}
          </span>
        </div>
        <span style={{ fontFamily: 'var(--font-d)', fontSize: '9px', color: 'var(--ink4)', letterSpacing: '0.08em' }}>
          {isExpanded ? '▲ 閉じる' : '▼ 詳細'}
        </span>
      </div>

      {isExpanded && (
        <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '300px', overflowY: 'auto' }}>
          {stats.agentStats.map((stat, i) => (
            <div key={i} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '5px 8px',
              background: stat.status === 'COMPLETED' ? 'transparent' : 'rgba(230,48,34,0.05)',
              borderRadius: '2px',
            }}>
              <span style={{ fontFamily: 'var(--font-d)', fontSize: '9px', color: 'var(--ink3)', letterSpacing: '0.06em' }}>
                {stat.agentId}
              </span>
              <span style={{
                fontFamily: 'var(--font-d)', fontSize: '10px', fontWeight: 700,
                color: stat.status === 'COMPLETED' ? 'var(--ink)' : 'var(--red)',
              }}>
                {stat.durationFormatted}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
