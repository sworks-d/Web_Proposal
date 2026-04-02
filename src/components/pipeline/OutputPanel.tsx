'use client'
import { safeParseJson } from '@/lib/json-cleaner'
import { renderAgentOutput, renderParseError } from '@/lib/output-renderer'
import { OutputSectionRenderer } from '@/components/preview/OutputSectionRenderer'
import { GotInfoItem, MissingInfoItem } from '@/lib/checkpoint-summary'
import { CheckpointInlineSection } from '@/components/checkpoint/CheckpointInlineSection'

export interface VersionExecution {
  id: string
  agentId: string
  status: string
  results: { id: string; outputJson: string; editedJson?: string | null }[]
}

const AG_LABELS: Record<string, string> = {
  'AG-01': 'インテーク担当',
  'AG-02': '市場・業界分析',
  'AG-03': '競合・ポジション分析',
  'AG-04': '課題構造化',
  'AG-05': 'ファクトチェック',
  'AG-06': '設計草案',
  'AG-07': '提案書草案',
}

const AGENT_ORDER = ['AG-01', 'AG-02', 'AG-03', 'AG-04', 'AG-05', 'AG-06', 'AG-07']

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
  versionExecutions, currentAG, appStatus, selectedAgentId, onAgSelect,
  checkpointState, primaryOptions, subOptions,
  selectedPrimary, selectedSub, onPrimaryChange, onSubChange,
  cdNotes, onCdNoteChange, onCheckpointConfirm,
}: OutputPanelProps) {

  // Completed executions sorted newest first (AG-07 → AG-01)
  const completedExecutions = [...AGENT_ORDER]
    .map(id => versionExecutions.find(e => e.agentId === id && e.status === 'COMPLETED'))
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
      {currentAG && appStatus === 'running' && (
        <div style={{ padding: '18px 40px', background: 'var(--bg2)', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
          <div style={{ width: '20px', height: '20px', background: 'var(--red)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '2px', flexShrink: 0 }}>
            <span style={{ display: 'flex', gap: '2px' }}>
              {[0, 0.2, 0.4].map((d, i) => (
                <span key={i} style={{ width: '3px', height: '3px', borderRadius: '50%', background: '#fff', animation: `td 1.4s ease-in-out ${d}s infinite`, display: 'inline-block' }} />
              ))}
            </span>
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-d)', fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink3)' }}>{currentAG}</div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ink)' }}>{AG_LABELS[currentAG] ?? ''} — 実行中...</div>
          </div>
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
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
