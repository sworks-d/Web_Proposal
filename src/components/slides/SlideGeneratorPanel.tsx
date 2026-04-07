'use client'
import { useState, useRef } from 'react'
import { SgParams, SlideProposalType, SlideTone, SlideAudience, FocusChapter } from '@/agents/sg-types'

const PROPOSAL_TYPES: { value: SlideProposalType; label: string; desc: string }[] = [
  { value: 'full',         label: 'フル提案',       desc: '新規制作・フルリニューアル' },
  { value: 'strategy',     label: '戦略提案',       desc: 'コンペ初期・方向性合意' },
  { value: 'analysis',     label: '分析提案',       desc: '現状分析・改善方向提示' },
  { value: 'content',      label: 'コンテンツ提案', desc: 'コンテンツ追加・拡充' },
  { value: 'improvement',  label: '改善施策提案',   desc: '部分改善・CV改善' },
]

const FOCUS_CHAPTERS: { value: FocusChapter; label: string }[] = [
  { value: 'issue',    label: '課題・現状認識' },
  { value: 'analysis', label: '分析・競合' },
  { value: 'target',   label: 'ターゲット・ジャーニー' },
  { value: 'insight',  label: 'インサイト・コンセプト' },
  { value: 'design',   label: '設計・IA' },
]

const TONES: { value: SlideTone; label: string; desc: string }[] = [
  { value: 'simple', label: 'Simple', desc: 'Apple的。余白大・1メッセージ' },
  { value: 'rich',   label: 'Rich',   desc: 'FAS的。情報量多・高級感' },
  { value: 'pop',    label: 'Pop',    desc: '明るい多色・イラスト多用' },
]

const AUDIENCES: { value: SlideAudience; label: string; desc: string }[] = [
  { value: 'executive', label: '経営層',        desc: '結論先行・数字重視' },
  { value: 'manager',   label: '担当者',        desc: '詳細説明・根拠重視' },
  { value: 'creative',  label: 'クリエイター',  desc: 'ビジュアル重視・感性訴求' },
]

type Status = 'idle' | 'running' | 'done' | 'error'

interface Props {
  versionId: string
  onClose: () => void
}

export function SlideGeneratorPanel({ versionId, onClose }: Props) {
  const [type, setType] = useState<SlideProposalType>('full')
  const [slideCount, setSlideCount] = useState(25)
  const [focusChapters, setFocusChapters] = useState<FocusChapter[]>([])
  const [tone, setTone] = useState<SlideTone>('simple')
  const [audience, setAudience] = useState<SlideAudience>('executive')

  const [status, setStatus] = useState<Status>('idle')
  const [statusMessages, setStatusMessages] = useState<string[]>([])
  const [sgId, setSgId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  function toggleFocus(v: FocusChapter) {
    setFocusChapters(prev =>
      prev.includes(v)
        ? prev.filter(f => f !== v)
        : prev.length < 2 ? [...prev, v] : prev
    )
  }

  async function handleGenerate() {
    setStatus('running')
    setStatusMessages([])
    setError(null)
    setSgId(null)

    const sgParams: SgParams = { type, slideCount, focusChapters, tone, audience }

    abortRef.current = new AbortController()
    try {
      const res = await fetch(`/api/versions/${versionId}/sg-pipeline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ params: sgParams }),
        signal: abortRef.current.signal,
      })

      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      if (!res.body) throw new Error('No response body')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buf = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        const lines = buf.split('\n')
        buf = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const ev = JSON.parse(line.slice(6))
            if (ev.type === 'status' || ev.type === 'step') {
              setStatusMessages(prev => [...prev, ev.message ?? `${ev.agentId} 実行中`])
            } else if (ev.type === 'complete') {
              setSgId(ev.sgId ?? null)
              setStatus('done')
            } else if (ev.type === 'error') {
              throw new Error(ev.message)
            }
          } catch (e) {
            if (e instanceof Error && e.message !== 'Unexpected end of JSON input') {
              setError(e.message)
              setStatus('error')
            }
          }
        }
      }
    } catch (e) {
      if (e instanceof Error && e.name !== 'AbortError') {
        setError(e.message)
        setStatus('error')
      }
    }
  }

  function handleDownload() {
    window.open(`/api/versions/${versionId}/sg-download`, '_blank')
  }

  const isRunning = status === 'running'

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: 'var(--bg)',
        border: '1px solid var(--line)',
        borderRadius: '4px',
        width: '560px',
        maxHeight: '90vh',
        overflowY: 'auto',
        padding: '32px 40px',
        position: 'relative',
      }}>
        {/* Header */}
        <div style={{ marginBottom: '28px' }}>
          <div style={{ fontFamily: 'var(--font-d)', fontSize: '9px', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--red)', marginBottom: '6px' }}>
            SLIDE GENERATOR
          </div>
          <h2 style={{ fontFamily: 'var(--font-d)', fontSize: '18px', fontWeight: 900, color: 'var(--ink)', margin: 0 }}>
            提案書を生成する
          </h2>
          <button
            onClick={onClose}
            style={{ position: 'absolute', top: '20px', right: '24px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: 'var(--ink3)' }}
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {/* Proposal type */}
          <div>
            <label style={{ fontFamily: 'var(--font-d)', fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink3)', display: 'block', marginBottom: '10px' }}>
              提案書種別
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {PROPOSAL_TYPES.map(t => (
                <button
                  key={t.value}
                  onClick={() => setType(t.value)}
                  disabled={isRunning}
                  style={{
                    padding: '8px 14px',
                    background: type === t.value ? 'var(--ink)' : 'var(--bg2)',
                    color: type === t.value ? 'var(--bg)' : 'var(--ink)',
                    border: `1px solid ${type === t.value ? 'var(--ink)' : 'var(--line)'}`,
                    borderRadius: '3px',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-d)',
                    fontSize: '11px',
                    fontWeight: 700,
                  }}
                  title={t.desc}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Slide count */}
          <div>
            <label style={{ fontFamily: 'var(--font-d)', fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink3)', display: 'block', marginBottom: '10px' }}>
              枚数: <span style={{ color: 'var(--ink)', fontWeight: 900 }}>{slideCount}枚</span>
            </label>
            <input
              type="range" min={10} max={50} step={5}
              value={slideCount}
              onChange={e => setSlideCount(Number(e.target.value))}
              disabled={isRunning}
              style={{ width: '100%', accentColor: 'var(--red)' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--ink3)', marginTop: '4px' }}>
              <span>10</span><span>50</span>
            </div>
          </div>

          {/* Focus chapters */}
          <div>
            <label style={{ fontFamily: 'var(--font-d)', fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink3)', display: 'block', marginBottom: '10px' }}>
              重点章（最大2つ）
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {FOCUS_CHAPTERS.map(f => {
                const isSelected = focusChapters.includes(f.value)
                const isDisabled = !isSelected && focusChapters.length >= 2
                return (
                  <button
                    key={f.value}
                    onClick={() => !isDisabled && toggleFocus(f.value)}
                    disabled={isRunning || isDisabled}
                    style={{
                      padding: '7px 12px',
                      background: isSelected ? 'var(--red)' : 'var(--bg2)',
                      color: isSelected ? '#fff' : isDisabled ? 'var(--ink4)' : 'var(--ink)',
                      border: `1px solid ${isSelected ? 'var(--red)' : 'var(--line)'}`,
                      borderRadius: '3px',
                      cursor: isDisabled ? 'default' : 'pointer',
                      fontFamily: 'var(--font-d)',
                      fontSize: '10px',
                      fontWeight: 700,
                    }}
                  >
                    {isSelected && '✓ '}{f.label}
                  </button>
                )
              })}
            </div>
            <div style={{ fontSize: '10px', color: 'var(--ink3)', marginTop: '6px' }}>
              選択した章は+60%のページを割り当てます
            </div>
          </div>

          {/* Tone */}
          <div>
            <label style={{ fontFamily: 'var(--font-d)', fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink3)', display: 'block', marginBottom: '10px' }}>
              デザイントーン
            </label>
            <div style={{ display: 'flex', gap: '10px' }}>
              {TONES.map(t => (
                <button
                  key={t.value}
                  onClick={() => setTone(t.value)}
                  disabled={isRunning}
                  style={{
                    flex: 1, padding: '12px 8px',
                    background: tone === t.value ? 'var(--ink)' : 'var(--bg2)',
                    color: tone === t.value ? 'var(--bg)' : 'var(--ink)',
                    border: `1px solid ${tone === t.value ? 'var(--ink)' : 'var(--line)'}`,
                    borderRadius: '3px',
                    cursor: 'pointer',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontFamily: 'var(--font-d)', fontSize: '12px', fontWeight: 900, marginBottom: '4px' }}>{t.label}</div>
                  <div style={{ fontFamily: 'var(--font-c)', fontSize: '10px', color: tone === t.value ? 'rgba(255,255,255,0.7)' : 'var(--ink3)' }}>{t.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Audience */}
          <div>
            <label style={{ fontFamily: 'var(--font-d)', fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink3)', display: 'block', marginBottom: '10px' }}>
              プレゼン相手
            </label>
            <div style={{ display: 'flex', gap: '10px' }}>
              {AUDIENCES.map(a => (
                <button
                  key={a.value}
                  onClick={() => setAudience(a.value)}
                  disabled={isRunning}
                  style={{
                    flex: 1, padding: '12px 8px',
                    background: audience === a.value ? 'var(--ink)' : 'var(--bg2)',
                    color: audience === a.value ? 'var(--bg)' : 'var(--ink)',
                    border: `1px solid ${audience === a.value ? 'var(--ink)' : 'var(--line)'}`,
                    borderRadius: '3px',
                    cursor: 'pointer',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontFamily: 'var(--font-d)', fontSize: '12px', fontWeight: 900, marginBottom: '4px' }}>{a.label}</div>
                  <div style={{ fontFamily: 'var(--font-c)', fontSize: '10px', color: audience === a.value ? 'rgba(255,255,255,0.7)' : 'var(--ink3)' }}>{a.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Status log */}
          {statusMessages.length > 0 && (
            <div style={{
              padding: '12px 14px',
              background: 'var(--bg2)',
              border: '1px solid var(--line)',
              borderRadius: '3px',
              maxHeight: '120px',
              overflowY: 'auto',
            }}>
              {statusMessages.map((msg, i) => (
                <div key={i} style={{
                  fontFamily: 'var(--font-c)',
                  fontSize: '11px',
                  color: i === statusMessages.length - 1 && isRunning ? 'var(--ink)' : 'var(--ink3)',
                  lineHeight: 1.7,
                  display: 'flex', gap: '6px',
                }}>
                  <span style={{ color: 'var(--red)', flexShrink: 0, fontSize: '9px' }}>
                    {i === statusMessages.length - 1 && isRunning ? '▶' : '✓'}
                  </span>
                  {msg}
                </div>
              ))}
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{ padding: '10px 14px', background: 'rgba(230,48,34,0.08)', border: '1px solid rgba(230,48,34,0.3)', borderRadius: '3px', fontSize: '12px', color: 'var(--red)', fontFamily: 'var(--font-c)' }}>
              {error}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
            {status === 'done' ? (
              <>
                <button
                  onClick={handleDownload}
                  style={{
                    flex: 1, padding: '14px',
                    background: 'var(--red)', color: '#fff',
                    border: 'none', borderRadius: '3px',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-d)', fontSize: '12px', fontWeight: 900, letterSpacing: '0.08em',
                  }}
                >
                  pptxをダウンロード ↓
                </button>
                <button
                  onClick={() => { setStatus('idle'); setStatusMessages([]); setSgId(null) }}
                  style={{
                    padding: '14px 20px',
                    background: 'var(--bg2)', color: 'var(--ink)',
                    border: '1px solid var(--line)', borderRadius: '3px',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-d)', fontSize: '11px',
                  }}
                >
                  再設定
                </button>
              </>
            ) : (
              <button
                onClick={handleGenerate}
                disabled={isRunning}
                style={{
                  flex: 1, padding: '14px',
                  background: isRunning ? 'var(--ink3)' : 'var(--ink)',
                  color: '#fff',
                  border: 'none', borderRadius: '3px',
                  cursor: isRunning ? 'default' : 'pointer',
                  fontFamily: 'var(--font-d)', fontSize: '12px', fontWeight: 900, letterSpacing: '0.08em',
                }}
              >
                {isRunning ? '生成中...' : '提案書を生成する →'}
              </button>
            )}
          </div>

          {sgId && status !== 'running' && (
            <div style={{ fontSize: '10px', color: 'var(--ink3)', textAlign: 'center', fontFamily: 'var(--font-c)' }}>
              生成ID: {sgId}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
