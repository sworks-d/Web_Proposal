'use client'
import { useState } from 'react'
import { GotInfoItem, MissingInfoItem } from '@/lib/checkpoint-summary'

interface CheckpointInlineSectionProps {
  phase: 1 | 2 | 3 | 4
  versionId: string
  gotInfo: GotInfoItem[]
  missingInfo: MissingInfoItem[]
  primaryOptions: { value: string; label: string; desc: string }[]
  subOptions: { value: string; label: string }[]
  selectedPrimary: string
  selectedSub: string[]
  onPrimaryChange: (v: string) => void
  onSubChange: (v: string[]) => void
  cdNotes: Record<string, string>
  onCdNoteChange: (key: string, val: string) => void
  onConfirm: () => void
  onRerunSection?: (agentId: string, sectionId: string | undefined, instruction: string) => Promise<void>
}

const PHASE_LABELS: Record<number, string> = {
  1: 'AG選択・確認',
  2: '市場/競合分析 確認',
  3: '課題/ファクト 確認',
  4: '設計/草案 完了',
}
const PHASE_NUMS: Record<number, string> = { 1: '①', 2: '②', 3: '③', 4: '④' }
const CONFIDENCE_COLOR: Record<string, string> = {
  high: 'var(--dot-g)', medium: '#E8C44A', low: 'var(--ink4)',
}

export function CheckpointInlineSection({
  phase, gotInfo, missingInfo,
  primaryOptions, subOptions,
  selectedPrimary, selectedSub,
  onPrimaryChange, onSubChange,
  cdNotes, onCdNoteChange, onConfirm,
  onRerunSection,
}: CheckpointInlineSectionProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [rerunTarget, setRerunTarget] = useState<{ agentId: string; sectionId?: string; title: string } | null>(null)
  const [rerunInstruction, setRerunInstruction] = useState('')
  const [isRerunning, setIsRerunning] = useState(false)

  const handleRerun = async () => {
    if (!rerunTarget || !rerunInstruction.trim() || !onRerunSection) return
    setIsRerunning(true)
    try {
      await onRerunSection(rerunTarget.agentId, rerunTarget.sectionId, rerunInstruction)
      setRerunTarget(null)
      setRerunInstruction('')
    } finally {
      setIsRerunning(false)
    }
  }

  return (
    <div style={{ borderBottom: '3px solid #E8C44A', background: 'rgba(232,196,74,0.04)' }}>
      {/* Banner */}
      <div
        onClick={() => setIsCollapsed(p => !p)}
        style={{ padding: '14px 40px', background: '#E8C44A', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '16px' }}>✋</span>
          <div>
            <div style={{ fontFamily: 'var(--font-i)', fontSize: '10px', fontStyle: 'italic', color: '#7A5F00', letterSpacing: '0.04em' }}>
              チェックポイント {PHASE_NUMS[phase]}
            </div>
            <div style={{ fontFamily: 'var(--font-d)', fontSize: '13px', fontWeight: 900, letterSpacing: '-0.01em', color: '#4A3800' }}>
              {PHASE_LABELS[phase]} — あなたの判断が必要です
            </div>
          </div>
        </div>
        <span style={{ fontFamily: 'var(--font-d)', fontSize: '9px', letterSpacing: '0.1em', color: '#4A3800', textTransform: 'uppercase' }}>
          {isCollapsed ? '開く ▾' : '閉じる ▴'}
        </span>
      </div>

      {!isCollapsed && (
        <div style={{ padding: '24px 40px 28px' }}>

          {/* Phase 1: AG selector */}
          {phase === 1 && (
            <>
              <p style={{ fontFamily: 'var(--font-c)', fontSize: '13px', color: 'var(--ink3)', lineHeight: 1.75, marginBottom: '22px' }}>
                AG-01のインテーク結果をもとに使用するエージェントを確認・選択してください。
              </p>
              <div style={{ fontFamily: 'var(--font-d)', fontSize: '8.5px', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--ink3)', marginBottom: '11px' }}>
                大分類AG <span style={{ fontWeight: 400, color: 'var(--red)' }}>必須 · 1つ</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '22px' }}>
                {primaryOptions.map(opt => (
                  <label key={opt.value} onClick={() => onPrimaryChange(opt.value)} style={{ display: 'flex', alignItems: 'center', gap: '13px', padding: '13px 16px', border: `1px solid ${selectedPrimary === opt.value ? 'var(--red)' : 'var(--line)'}`, background: selectedPrimary === opt.value ? 'var(--red2)' : 'transparent', cursor: 'pointer', borderRadius: '2px' }}>
                    <div style={{ width: '15px', height: '15px', border: `1.5px solid ${selectedPrimary === opt.value ? 'var(--red)' : 'var(--line2)'}`, borderRadius: '50%', flexShrink: 0, position: 'relative', background: selectedPrimary === opt.value ? 'var(--red)' : 'transparent' }}>
                      {selectedPrimary === opt.value && <span style={{ position: 'absolute', top: '2.5px', left: '2.5px', width: '8px', height: '8px', background: '#fff', borderRadius: '50%', display: 'block' }} />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: 'var(--font-c)', fontSize: '9.5px', color: 'var(--ink3)', marginBottom: '2px' }}>{opt.value.toUpperCase()}</div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)' }}>{opt.label}</div>
                      <div style={{ fontFamily: 'var(--font-c)', fontSize: '10.5px', color: 'var(--ink3)', marginTop: '2px' }}>{opt.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
              <div style={{ fontFamily: 'var(--font-d)', fontSize: '8.5px', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--ink3)', marginBottom: '11px' }}>
                業種コンテキスト SUB <span style={{ fontWeight: 400, color: 'var(--ink3)' }}>任意 · 複数可</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '22px' }}>
                {subOptions.map(opt => {
                  const isOn = selectedSub.includes(opt.value)
                  return (
                    <label key={opt.value} onClick={() => onSubChange(isOn ? selectedSub.filter(s => s !== opt.value) : [...selectedSub, opt.value])} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', border: `1px solid ${isOn ? 'var(--red)' : 'var(--line)'}`, background: isOn ? 'var(--red2)' : 'transparent', cursor: 'pointer', borderRadius: '2px' }}>
                      <div style={{ width: '14px', height: '14px', border: `1.5px solid ${isOn ? 'var(--red)' : 'var(--line2)'}`, flexShrink: 0, background: isOn ? 'var(--red)' : 'transparent', borderRadius: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {isOn && <span style={{ color: '#fff', fontSize: '9px', lineHeight: 1 }}>✓</span>}
                      </div>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ink)' }}>{opt.label}</span>
                    </label>
                  )
                })}
              </div>
            </>
          )}

          {/* Phase 2,3,4: Summary */}
          {phase >= 2 && (
            <>
              {gotInfo.length > 0 && (
                <div style={{ marginBottom: '22px' }}>
                  <div style={{ fontFamily: 'var(--font-d)', fontSize: '8.5px', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--ink3)', marginBottom: '11px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ color: 'var(--dot-g)' }}>✅</span> 取れた情報
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {gotInfo.slice(0, 6).map((item, i) => {
                      const isTargeted = rerunTarget?.agentId === item.source && rerunTarget?.sectionId === item.sectionId
                      return (
                        <div key={i} style={{ background: 'var(--bg2)', borderLeft: `3px solid ${CONFIDENCE_COLOR[item.confidence] ?? 'var(--line2)'}` }}>
                          <div style={{ display: 'flex', gap: '12px', padding: '11px 14px', alignItems: 'flex-start' }}>
                            <span style={{ fontFamily: 'var(--font-d)', fontSize: '8px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: CONFIDENCE_COLOR[item.confidence], flexShrink: 0, marginTop: '2px' }}>{item.confidence}</span>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ink)', marginBottom: '3px' }}>{item.title}</div>
                              {item.summary && <div style={{ fontFamily: 'var(--font-c)', fontSize: '11px', color: 'var(--ink3)', lineHeight: 1.6 }}>{item.summary}</div>}
                              <div style={{ fontFamily: 'var(--font-d)', fontSize: '8px', color: 'var(--ink4)', marginTop: '4px', letterSpacing: '0.06em' }}>{item.source}</div>
                            </div>
                            {onRerunSection && (
                              <button
                                onClick={() => {
                                  if (isTargeted) {
                                    setRerunTarget(null)
                                    setRerunInstruction('')
                                  } else {
                                    setRerunTarget({ agentId: item.source, sectionId: item.sectionId, title: item.title })
                                    setRerunInstruction('')
                                  }
                                }}
                                style={{
                                  flexShrink: 0, padding: '4px 9px', whiteSpace: 'nowrap',
                                  fontFamily: 'var(--font-d)', fontSize: '8px', fontWeight: 700,
                                  letterSpacing: '0.1em', textTransform: 'uppercase',
                                  background: isTargeted ? 'var(--ink)' : 'transparent',
                                  color: isTargeted ? 'var(--bg)' : 'var(--ink3)',
                                  border: '1px solid var(--line2)', borderRadius: '2px', cursor: 'pointer',
                                }}
                              >
                                修正指示 ✏️
                              </button>
                            )}
                          </div>

                          {/* 修正指示入力エリア */}
                          {isTargeted && (
                            <div style={{ padding: '0 14px 12px', borderTop: '1px solid var(--line)' }}>
                              <div style={{ paddingTop: '10px', marginBottom: '6px', fontFamily: 'var(--font-d)', fontSize: '8px', fontWeight: 700, letterSpacing: '0.1em', color: 'var(--ink3)' }}>
                                {item.source}「{item.title}」への修正指示
                              </div>
                              <textarea
                                value={rerunInstruction}
                                onChange={e => setRerunInstruction(e.target.value)}
                                placeholder="例：競合C社の分析が不足しています。UI/UX観点でも追加してください。"
                                rows={3}
                                style={{
                                  width: '100%', boxSizing: 'border-box',
                                  background: 'var(--bg)', border: '1px solid var(--line2)',
                                  padding: '8px 10px', fontSize: '12px', fontFamily: 'var(--font-c)',
                                  color: 'var(--ink)', lineHeight: 1.6, resize: 'vertical', borderRadius: '2px',
                                }}
                              />
                              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                                <button
                                  onClick={() => { setRerunTarget(null); setRerunInstruction('') }}
                                  style={{ padding: '7px 14px', background: 'transparent', border: '1px solid var(--line2)', color: 'var(--ink3)', fontFamily: 'var(--font-d)', fontSize: '8px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', borderRadius: '2px', cursor: 'pointer' }}
                                >
                                  キャンセル
                                </button>
                                <button
                                  onClick={handleRerun}
                                  disabled={!rerunInstruction.trim() || isRerunning}
                                  style={{
                                    padding: '7px 14px', background: rerunInstruction.trim() && !isRerunning ? 'var(--red)' : 'var(--line2)',
                                    color: '#fff', border: 'none', fontFamily: 'var(--font-d)', fontSize: '8px',
                                    fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                                    borderRadius: '2px', cursor: rerunInstruction.trim() && !isRerunning ? 'pointer' : 'not-allowed',
                                  }}
                                >
                                  {isRerunning ? '実行中...' : '再実行 →'}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {missingInfo.length > 0 && (
                <div style={{ marginBottom: '22px' }}>
                  <div style={{ fontFamily: 'var(--font-d)', fontSize: '8.5px', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--ink3)', marginBottom: '11px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>❓</span> 取れなかった情報 → ヒアリング項目
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {missingInfo.slice(0, 5).map((item, i) => (
                      <div key={i} style={{ padding: '12px 14px', border: '1px solid var(--line2)', borderRadius: '2px' }}>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ink)', marginBottom: '4px' }}>{item.item}</div>
                        {item.reason && <div style={{ fontFamily: 'var(--font-c)', fontSize: '11px', color: 'var(--ink3)', marginBottom: '8px', lineHeight: 1.5 }}>{item.reason}</div>}
                        <input
                          placeholder="確認した内容を入力..."
                          value={cdNotes[`missing-${i}`] ?? ''}
                          onChange={e => onCdNoteChange(`missing-${i}`, e.target.value)}
                          style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid var(--line2)', padding: '6px 0', fontSize: '12px', fontFamily: 'var(--font-c)', color: 'var(--ink)', outline: 'none' }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          <button
            onClick={onConfirm}
            style={{ background: 'var(--ink)', color: 'var(--bg)', fontFamily: 'var(--font-d)', fontSize: '9px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', padding: '13px 26px', border: 'none', cursor: 'pointer', borderRadius: '2px', whiteSpace: 'nowrap' }}
          >
            {phase === 1 ? 'この選択で実行する →' : phase < 4 ? '次のフェーズへ進む →' : '完了 — 提案書を確認する →'}
          </button>
        </div>
      )}
    </div>
  )
}
