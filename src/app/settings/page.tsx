'use client'
import { useState, useEffect } from 'react'
import NavBar from '@/components/layout/NavBar'
import Ticker from '@/components/layout/Ticker'

interface FeedbackSummary {
  totalFeedbacks: number
  avgOverallScore: string
  avgCompetitorScore: string
  avgTargetScore: string
  weakestAgentDistribution: Record<string, number>
  storyUsabilityDistribution: Record<string, number>
  recentFreeComments: { comment: string | null; agentFlags: string[]; date: string }[]
}

interface PendingImprovement {
  id: string
  agentId: string
  cdFeedback: string | null
  changeNote: string | null
  appliedAt: string
}

const AG_LABELS: Record<string, string> = {
  'ag-02-market': 'AG-02 市場・業界分析',
  'ag-03-competitor': 'AG-03 競合分析',
  'ag-04-insight': 'AG-04 課題構造化',
  'ag-06-draft': 'AG-06 設計草案',
  'ag-07-story': 'AG-07 ストーリー・コピー',
  'none': '特になし',
}

const USABILITY_LABELS: Record<string, string> = {
  'that_usable': 'このまま使える',
  'needs_edit': '一部修正で使える',
  'rebuild': '大幅に作り直し',
}

export default function SettingsPage() {
  const [summary, setSummary] = useState<FeedbackSummary | null>(null)
  const [pending, setPending] = useState<PendingImprovement[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/feedback').then(r => r.json()),
      fetch('/api/settings/pending-improvements').then(r => r.json()).catch(() => []),
    ]).then(([fb, pd]) => {
      setSummary(fb)
      setPending(Array.isArray(pd) ? pd : [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', color: 'var(--ink)' }}>
      <Ticker items={[{ text: 'Settings' }]} />
      <NavBar />

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 40px 80px' }}>
        <div style={{ marginBottom: '40px' }}>
          <div style={{ fontFamily: 'var(--font-d)', fontSize: '9px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--ink4)', marginBottom: '8px' }}>Settings</div>
          <div style={{ fontFamily: 'var(--font-d)', fontSize: '28px', fontWeight: 900, letterSpacing: '-0.02em', color: 'var(--ink)' }}>AGフィードバック & 改善管理</div>
        </div>

        {loading && (
          <div style={{ fontFamily: 'var(--font-c)', fontSize: '13px', color: 'var(--ink3)' }}>読み込み中...</div>
        )}

        {summary && !loading && (
          <>
            {/* スコア概要 */}
            <section style={{ marginBottom: '40px' }}>
              <div style={{ fontFamily: 'var(--font-d)', fontSize: '9px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--ink4)', marginBottom: '16px' }}>フィードバック集計</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                {[
                  { label: '総フィードバック数', value: `${summary.totalFeedbacks}件` },
                  { label: '全体満足度', value: `${summary.avgOverallScore} / 5` },
                  { label: '競合分析評価', value: `${summary.avgCompetitorScore} / 3` },
                  { label: 'ターゲット精度', value: `${summary.avgTargetScore} / 3` },
                ].map(item => (
                  <div key={item.label} style={{ padding: '16px', background: 'var(--bg2)', border: '1px solid var(--line)' }}>
                    <div style={{ fontFamily: 'var(--font-d)', fontSize: '22px', fontWeight: 900, color: 'var(--ink)', letterSpacing: '-0.02em' }}>{item.value}</div>
                    <div style={{ fontFamily: 'var(--font-c)', fontSize: '10px', color: 'var(--ink3)', marginTop: '4px' }}>{item.label}</div>
                  </div>
                ))}
              </div>
            </section>

            {/* 弱点AG分布 */}
            <section style={{ marginBottom: '40px' }}>
              <div style={{ fontFamily: 'var(--font-d)', fontSize: '9px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--ink4)', marginBottom: '16px' }}>最もフィードバックが多いAG</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {Object.entries(summary.weakestAgentDistribution)
                  .sort(([, a], [, b]) => b - a)
                  .map(([agId, count]) => {
                    const total = Object.values(summary.weakestAgentDistribution).reduce((a, b) => a + b, 0)
                    const pct = total > 0 ? Math.round((count / total) * 100) : 0
                    return (
                      <div key={agId} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ fontFamily: 'var(--font-c)', fontSize: '12px', color: 'var(--ink2)', width: '200px', flexShrink: 0 }}>{AG_LABELS[agId] ?? agId}</div>
                        <div style={{ flex: 1, height: '6px', background: 'var(--bg2)', border: '1px solid var(--line)' }}>
                          <div style={{ width: `${pct}%`, height: '100%', background: pct > 30 ? 'var(--red)' : 'var(--ink4)', transition: 'width 0.6s ease' }} />
                        </div>
                        <div style={{ fontFamily: 'var(--font-d)', fontSize: '11px', color: 'var(--ink3)', width: '48px', textAlign: 'right' }}>{count}件 ({pct}%)</div>
                      </div>
                    )
                  })}
              </div>
            </section>

            {/* ストーリー使用感 */}
            <section style={{ marginBottom: '40px' }}>
              <div style={{ fontFamily: 'var(--font-d)', fontSize: '9px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--ink4)', marginBottom: '16px' }}>ストーリー使用感</div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {Object.entries(summary.storyUsabilityDistribution).map(([key, count]) => (
                  <div key={key} style={{ flex: 1, padding: '14px', background: 'var(--bg2)', border: `1px solid ${key === 'rebuild' ? 'var(--red)' : 'var(--line)'}` }}>
                    <div style={{ fontFamily: 'var(--font-d)', fontSize: '20px', fontWeight: 900, color: key === 'rebuild' ? 'var(--red)' : 'var(--ink)' }}>{count}</div>
                    <div style={{ fontFamily: 'var(--font-c)', fontSize: '11px', color: 'var(--ink3)', marginTop: '4px' }}>{USABILITY_LABELS[key] ?? key}</div>
                  </div>
                ))}
              </div>
            </section>

            {/* 最近のフリーコメント */}
            {summary.recentFreeComments.length > 0 && (
              <section style={{ marginBottom: '40px' }}>
                <div style={{ fontFamily: 'var(--font-d)', fontSize: '9px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--ink4)', marginBottom: '16px' }}>最近のフィードバックコメント</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {summary.recentFreeComments.map((item, i) => (
                    <div key={i} style={{ padding: '14px 16px', background: 'var(--bg2)', border: '1px solid var(--line)', borderLeft: '3px solid var(--line2)' }}>
                      <div style={{ fontFamily: 'var(--font-c)', fontSize: '13px', color: 'var(--ink)', lineHeight: 1.6, marginBottom: '8px' }}>"{item.comment}"</div>
                      {item.agentFlags.length > 0 && (
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          {item.agentFlags.map((ag: string) => (
                            <span key={ag} style={{ background: 'rgba(230,48,34,0.08)', border: '1px solid var(--red)', borderRadius: '2px', padding: '2px 8px', fontFamily: 'var(--font-d)', fontSize: '8px', color: 'var(--red)', letterSpacing: '0.1em' }}>
                              {ag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        {/* pending改善候補 */}
        {pending.length > 0 && (
          <section>
            <div style={{ fontFamily: 'var(--font-d)', fontSize: '9px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--ink4)', marginBottom: '16px' }}>
              pending改善候補 ({pending.length}件)
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {pending.map(item => (
                <div key={item.id} style={{ padding: '16px', background: 'var(--bg2)', border: '1px solid var(--line)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: 'var(--font-d)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', color: 'var(--ink3)', marginBottom: '6px' }}>{AG_LABELS[item.agentId] ?? item.agentId}</div>
                    {item.cdFeedback && (
                      <div style={{ fontFamily: 'var(--font-c)', fontSize: '12px', color: 'var(--ink)', lineHeight: 1.6 }}>"{item.cdFeedback}"</div>
                    )}
                  </div>
                  <a
                    href={`/settings/improve/${item.agentId}?feedbackId=${item.id}`}
                    style={{ background: 'var(--ink)', color: 'var(--bg)', fontFamily: 'var(--font-d)', fontSize: '8px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '8px 14px', textDecoration: 'none', flexShrink: 0, display: 'inline-block' }}
                  >
                    改善案を生成 →
                  </a>
                </div>
              ))}
            </div>
          </section>
        )}

        {!loading && summary?.totalFeedbacks === 0 && pending.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{ fontFamily: 'var(--font-d)', fontSize: '36px', color: 'var(--ink4)', marginBottom: '16px' }}>□</div>
            <div style={{ fontFamily: 'var(--font-c)', fontSize: '14px', color: 'var(--ink3)' }}>
              まだフィードバックがありません。<br />提案書完了後にダウンロードボタンからフィードバックを送信してください。
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
