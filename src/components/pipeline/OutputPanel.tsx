'use client'
import { useState, useEffect, useRef } from 'react'
import { safeParseJson } from '@/lib/json-cleaner'
import { renderAgentOutput, renderParseError } from '@/lib/output-renderer'
import { OutputSectionRenderer } from '@/components/preview/OutputSectionRenderer'
import { GotInfoItem, MissingInfoItem } from '@/lib/checkpoint-summary'
import { CheckpointInlineSection } from '@/components/checkpoint/CheckpointInlineSection'
import { ChartRenderer } from '@/components/pipeline/ChartRenderer'

function ElapsedTimer({ running }: { running: boolean }) {
  const [secs, setSecs] = useState(0)
  useEffect(() => {
    if (!running) { setSecs(0); return }
    const t = setInterval(() => setSecs(s => s + 1), 1000)
    return () => clearInterval(t)
  }, [running])
  if (!running) return null
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return (
    <span style={{ fontFamily: 'var(--font-d)', fontSize: '9px', color: 'var(--ink3)', letterSpacing: '0.1em' }}>
      {m > 0 ? `${m}m ` : ''}{s}s
    </span>
  )
}

export interface VersionExecution {
  id: string
  agentId: string
  status: string
  results: { id: string; outputJson: string; editedJson?: string | null; parseErrorMessage?: string | null }[]
}

const AG_LABELS: Record<string, string> = {
  'AG-01':            'インテーク担当',
  'AG-01-RESEARCH':   '会社情報リサーチ',
  'AG-01-MERGE':      'インテーク統合',
  'AG-02':            '市場骨格分析',
  'AG-02-STP':        'STPセグメンテーション',
  'AG-02-JOURNEY':    'カスタマージャーニー',
  'AG-02-VPC':        'バリュープロポジション',
  'AG-02-POSITION':   '4軸ポジショニング',
  'AG-02-MERGE':      '市場分析統合',
  'AG-03':            '競合特定・ポジション',
  'AG-03-HEURISTIC':  'ヒューリスティック評価（上位2社）',
  'AG-03-HEURISTIC2': 'ヒューリスティック評価（残競合）',
  'AG-03-GAP':        'コンテンツギャップ',
  'AG-03-DATA':       'GA4・SC分析',
  'AG-03-MERGE':      '競合分析統合',
  'AG-04-MAIN':       '5Whys・HMW',
  'AG-04-INSIGHT':    'インサイト・JTBD',
  'AG-04-MERGE':      '課題定義統合',
  'AG-05':            'ファクトチェック',
  'AG-06':            '設計草案',
  'AG-07A':           '設計根拠ライター',
  'AG-07B':           'リファレンス戦略',
  'AG-07C':           '提案書草案',
  'AG-07C-1':         '素材セット Ch.01-02',
  'AG-07C-2':         '素材セット Ch.03-04',
  'AG-07C-3':         '素材セット Ch.05-06',
  'AG-07C-4':         '素材 サマリー',
}

const AGENT_ORDER = [
  'AG-01', 'AG-01-RESEARCH', 'AG-01-MERGE',
  'AG-02', 'AG-02-STP', 'AG-02-JOURNEY', 'AG-02-VPC', 'AG-02-POSITION', 'AG-02-MERGE',
  'AG-03', 'AG-03-HEURISTIC', 'AG-03-HEURISTIC2', 'AG-03-GAP', 'AG-03-DATA', 'AG-03-MERGE',
  'AG-04-MAIN', 'AG-04-INSIGHT', 'AG-04-MERGE',
  'AG-05', 'AG-06',
  'AG-07A', 'AG-07B', 'AG-07C-1', 'AG-07C-2', 'AG-07C-3', 'AG-07C-4',
]

interface CheckpointState {
  versionId: string
  phase: 1 | 2 | 3 | 4
  gotInfo: GotInfoItem[]
  missingInfo: MissingInfoItem[]
}

interface OutputPanelProps {
  versionExecutions: VersionExecution[]
  currentAG: string | null
  appStatus: string
  statusMessages: string[]
  selectedAgentId: string | null
  onAgSelect: (agentId: string | null) => void
  checkpointState: CheckpointState | null
  primaryOptions: { value: string; label: string; desc: string }[]
  subOptions: { value: string; label: string }[]
  selectedPrimary: string
  selectedSub: string[]
  onPrimaryChange: (v: string) => void
  onSubChange: (v: string[]) => void
  cdNotes: Record<string, string>
  onCdNoteChange: (key: string, val: string) => void
  onCheckpointConfirm: () => void
}

export function OutputPanel({
  versionExecutions, currentAG, appStatus, statusMessages, selectedAgentId, onAgSelect,
  checkpointState, primaryOptions, subOptions,
  selectedPrimary, selectedSub, onPrimaryChange, onSubChange,
  cdNotes, onCdNoteChange, onCheckpointConfirm,
}: OutputPanelProps) {
  const msgRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    msgRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [statusMessages])

  // Completed executions sorted newest first (AG-07 → AG-01)
  // 最新のCOMPLETEDを使う（feedbackによる再実行結果を優先）
  const completedExecutions = [...AGENT_ORDER]
    .map(id => versionExecutions.slice().reverse().find(e => e.agentId === id && e.status === 'COMPLETED'))
    .filter((e): e is VersionExecution => Boolean(e))
    .reverse()

  const isEmpty = completedExecutions.length === 0 && !currentAG && appStatus === 'idle'

  return (
    <div style={{ overflowY: 'auto', height: '100%', display: 'flex', flexDirection: 'column' }}>

      {/* Checkpoint inline section */}
      {checkpointState && appStatus === 'checkpoint' && (
        <CheckpointInlineSection
          phase={checkpointState.phase}
          versionId={checkpointState.versionId}
          gotInfo={checkpointState.gotInfo}
          missingInfo={checkpointState.missingInfo}
          primaryOptions={primaryOptions}
          subOptions={subOptions}
          selectedPrimary={selectedPrimary}
          selectedSub={selectedSub}
          onPrimaryChange={onPrimaryChange}
          onSubChange={onSubChange}
          cdNotes={cdNotes}
          onCdNoteChange={onCdNoteChange}
          onConfirm={onCheckpointConfirm}
        />
      )}

      {/* Currently running AG indicator */}
      {appStatus === 'running' && (
        <div style={{ background: 'var(--bg2)', borderBottom: '1px solid var(--line)', borderLeft: '2px solid var(--red)', flexShrink: 0 }}>
          {/* Header */}
          <div style={{ padding: '14px 40px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '20px', height: '20px', background: 'var(--red)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '2px', flexShrink: 0 }}>
              <span style={{ display: 'flex', gap: '2px' }}>
                {[0, 0.2, 0.4].map((d, i) => (
                  <span key={i} style={{ width: '3px', height: '3px', borderRadius: '50%', background: '#fff', animation: `td 1.4s ease-in-out ${d}s infinite`, display: 'inline-block' }} />
                ))}
              </span>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'var(--font-d)', fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--red)' }}>
                {currentAG ?? 'パイプライン'} — 実行中
              </div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ink)' }}>
                {currentAG ? (AG_LABELS[currentAG] ?? currentAG) : 'エージェント準備中...'}
              </div>
            </div>
            <ElapsedTimer running={appStatus === 'running'} />
          </div>
          {/* Status log */}
          {statusMessages.length > 0 && (
            <div style={{
              margin: '0 40px 14px',
              padding: '10px 14px',
              background: 'var(--bg)',
              border: '1px solid var(--line)',
              borderRadius: '2px',
              maxHeight: '120px',
              overflowY: 'auto',
            }}>
              {statusMessages.map((msg, i) => (
                <div key={i} style={{
                  fontFamily: 'var(--font-c)',
                  fontSize: '11px',
                  color: i === statusMessages.length - 1 ? 'var(--ink)' : 'var(--ink3)',
                  lineHeight: 1.7,
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: '6px',
                }}>
                  <span style={{ color: 'var(--red)', flexShrink: 0, fontSize: '9px' }}>
                    {i === statusMessages.length - 1 ? '▶' : '✓'}
                  </span>
                  {msg}
                </div>
              ))}
              <div ref={msgRef} />
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {isEmpty && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg2)' }}>
          <div style={{ textAlign: 'center', maxWidth: '360px', padding: '40px' }}>
            <div style={{ fontFamily: 'var(--font-d)', fontSize: '32px', marginBottom: '20px', color: 'var(--ink4)' }}>▶</div>
            <h3 style={{ fontFamily: 'var(--font-d)', fontSize: '14px', fontWeight: 900, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '12px', color: 'var(--ink)' }}>
              AG-01 インテークを実行してください
            </h3>
            <p style={{ fontFamily: 'var(--font-c)', fontSize: '13px', lineHeight: 1.75, color: 'var(--ink3)' }}>
              案件情報の整理・AG推奨・仮説設定を行います<br />所要時間: 約10〜30秒
            </p>
          </div>
        </div>
      )}

      {/* Completed AG outputs (newest first, collapsible) */}
      {completedExecutions.map(execution => {
        const result = execution.results[0]
        const rawText = result?.editedJson ?? result?.outputJson ?? ''
        const parsed = safeParseJson(rawText)
        const sections = parsed
          ? renderAgentOutput(execution.agentId, parsed)
          : renderParseError(execution.agentId, rawText)

        const isSelected = selectedAgentId === execution.agentId

        return (
          <div
            key={execution.agentId}
            id={`ag-section-${execution.agentId}`}
            style={{ borderBottom: '1px solid var(--line)', flexShrink: 0 }}
          >
            <div
              onClick={() => onAgSelect(isSelected ? null : execution.agentId)}
              style={{
                padding: '16px 40px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                cursor: 'pointer',
                background: isSelected ? 'var(--bg2)' : 'transparent',
                borderLeft: isSelected ? '2px solid var(--red)' : '2px solid transparent',
                transition: 'background 0.15s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '20px', height: '20px',
                  background: isSelected ? 'var(--red)' : 'var(--ink)',
                  color: 'var(--bg)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '10px', borderRadius: '2px', flexShrink: 0,
                  transition: 'background 0.15s',
                }}>✓</div>
                <span style={{ fontFamily: 'var(--font-d)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--ink)' }}>
                  {execution.agentId} — {AG_LABELS[execution.agentId] ?? ''}
                </span>
              </div>
              <span style={{ fontFamily: 'var(--font-c)', fontSize: '10px', color: 'var(--ink3)' }}>
                {isSelected ? '閉じる ▴' : '参照する ▾'}
              </span>
            </div>

            {isSelected && (
              <div style={{ borderTop: '1px solid var(--line)' }}>
                <OutputSectionRenderer sections={sections} />
                {parsed?.chartData && (
                  <div style={{ padding: '0 40px 24px' }}>
                    {Object.entries(parsed.chartData as Record<string, Record<string, unknown>>).map(([key, chart]) => (
                      <ChartRenderer key={key} data={chart as Parameters<typeof ChartRenderer>[0]['data']} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
