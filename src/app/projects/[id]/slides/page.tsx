'use client'
import { useState, useEffect, useCallback, use } from 'react'
import { useRouter } from 'next/navigation'
import { SgParams, SlideProposalType, SlideTone, SlideAudience, FocusChapter, SgAgentId } from '@/agents/sg-types'

const PROPOSAL_TYPES: { value: SlideProposalType; label: string; desc: string }[] = [
  { value: 'full',        label: 'フル提案',       desc: '新規制作・フルリニューアル' },
  { value: 'strategy',    label: '戦略提案',       desc: 'コンペ初期・方向性合意' },
  { value: 'analysis',    label: '分析提案',       desc: '現状分析・改善方向提示' },
  { value: 'content',     label: 'コンテンツ提案', desc: 'コンテンツ追加・拡充' },
  { value: 'improvement', label: '改善施策提案',   desc: '部分改善・CV改善' },
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
  { value: 'executive', label: '経営層',       desc: '結論先行・数字重視' },
  { value: 'manager',   label: '担当者',       desc: '詳細説明・根拠重視' },
  { value: 'creative',  label: 'クリエイター', desc: 'ビジュアル重視・感性訴求' },
]

const SG_STEPS: { id: SgAgentId; label: string }[] = [
  { id: 'SG-01', label: '構成設計' },
  { id: 'SG-02', label: 'コンセプト・コピー生成' },
  { id: 'SG-03', label: 'ストーリー設計' },
  { id: 'SG-04', label: '本文生成' },
  { id: 'SG-05', label: 'ビジュアル指示' },
  { id: 'SG-06', label: 'スタイル適用・最終出力' },
]

interface StatusData {
  id: string
  status: 'RUNNING' | 'COMPLETED' | 'ERROR'
  currentStep: string | null
  errorMessage: string | null
  startedAt: string
  completedAt: string | null
  hasOutput: Record<SgAgentId, boolean>
}

export default function SlidesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params)
  const router = useRouter()

  // パラメータ設定
  const [type, setType] = useState<SlideProposalType>('full')
  const [slideCount, setSlideCount] = useState(25)
  const [focusChapters, setFocusChapters] = useState<FocusChapter[]>([])
  const [tone, setTone] = useState<SlideTone>('simple')
  const [audience, setAudience] = useState<SlideAudience>('executive')

  // 実行状態
  const [generationId, setGenerationId] = useState<string | null>(null)
  const [statusData, setStatusData] = useState<StatusData | null>(null)
  const [versionId, setVersionId] = useState<string | null>(null)
  const [isStarting, setIsStarting] = useState(false)

  // 最新バージョンIDを取得
  useEffect(() => {
    fetch(`/api/projects/${projectId}/versions`)
      .then(r => r.ok ? r.json() : null)
      .then((versions: { id: string; status: string }[] | null) => {
        if (!versions || versions.length === 0) return
        const completed = versions.filter(v => v.status === 'COMPLETED')
        const target = completed[completed.length - 1] ?? versions[versions.length - 1]
        setVersionId(target.id)
        // 既存のgeneration確認
        return fetch(`/api/versions/${target.id}/sg-pipeline`)
      })
      .then(r => r?.ok ? r.json() : null)
      .then((gen: { id: string; status: string } | null) => {
        if (gen) {
          setGenerationId(gen.id)
        }
      })
      .catch(() => {})
  }, [projectId])

  // ポーリングでステータス取得
  const pollStatus = useCallback(async () => {
    if (!generationId) return
    const res = await fetch(`/api/sg-generation/${generationId}`)
    if (!res.ok) return
    const data: StatusData = await res.json()
    setStatusData(data)
  }, [generationId])

  useEffect(() => {
    if (!generationId) return
    pollStatus()
    const interval = setInterval(() => {
      pollStatus()
    }, 2000)
    return () => clearInterval(interval)
  }, [generationId, pollStatus])

  // ポーリング停止（完了/エラー時）
  useEffect(() => {
    if (statusData?.status === 'COMPLETED' || statusData?.status === 'ERROR') {
      // ポーリングはuseEffectのcleanupで止まる
    }
  }, [statusData?.status])

  function toggleFocus(v: FocusChapter) {
    setFocusChapters(prev =>
      prev.includes(v)
        ? prev.filter(f => f !== v)
        : prev.length < 2 ? [...prev, v] : prev
    )
  }

  async function handleStart() {
    if (!versionId) return
    setIsStarting(true)
    try {
      const sgParams: SgParams = { type, slideCount, focusChapters, tone, audience }
      const res = await fetch(`/api/versions/${versionId}/sg-pipeline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ params: sgParams }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const { generationId: id } = await res.json()
      setGenerationId(id)
      setStatusData(null)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'エラーが発生しました')
    } finally {
      setIsStarting(false)
    }
  }

  async function handleResume() {
    if (!versionId || !statusData) return
    setIsStarting(true)
    try {
      const res = await fetch(`/api/versions/${versionId}/sg-pipeline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeFrom: statusData.currentStep }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const { generationId: id } = await res.json()
      setGenerationId(id)
      setStatusData(null)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'エラーが発生しました')
    } finally {
      setIsStarting(false)
    }
  }

  function handleDownload() {
    if (!versionId) return
    window.open(`/api/versions/${versionId}/sg-download`, '_blank')
  }

  const isRunning = statusData?.status === 'RUNNING'
  const isCompleted = statusData?.status === 'COMPLETED'
  const isError = statusData?.status === 'ERROR'
  const hasGeneration = !!generationId && !!statusData

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ padding: '14px 44px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '9px', fontFamily: 'var(--font-d)', fontSize: '9px', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
          <button onClick={() => router.back()} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink3)', fontFamily: 'var(--font-d)', fontSize: '9px', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
            ← 戻る
          </button>
          <span style={{ color: 'var(--ink4)' }}>/</span>
          <span style={{ color: 'var(--ink)' }}>提案書生成</span>
        </div>
        <div style={{ fontFamily: 'var(--font-d)', fontSize: '9px', color: 'var(--ink3)', letterSpacing: '0.1em' }}>
          SLIDE GENERATOR
        </div>
      </div>

      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '360px 1fr', minHeight: 0 }}>

        {/* 左: パラメータ設定 */}
        <div style={{ borderRight: '1px solid var(--line)', overflowY: 'auto', padding: '32px 28px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-d)', fontSize: '16px', fontWeight: 900, color: 'var(--ink)', marginBottom: '6px' }}>
              提案書を生成する
            </div>
            <div style={{ fontFamily: 'var(--font-c)', fontSize: '11px', color: 'var(--ink3)', lineHeight: 1.6 }}>
              パラメータを設定して生成ボタンを押してください。
              ページを離れても処理は継続します。
            </div>
          </div>

          {/* 提案書種別 */}
          <div>
            <div style={labelStyle}>提案書種別</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {PROPOSAL_TYPES.map(t => (
                <button key={t.value} onClick={() => setType(t.value)} disabled={isRunning}
                  style={chipStyle(type === t.value)} title={t.desc}>{t.label}</button>
              ))}
            </div>
          </div>

          {/* 枚数 */}
          <div>
            <div style={labelStyle}>枚数: <strong style={{ color: 'var(--ink)' }}>{slideCount}枚</strong></div>
            <input type="range" min={10} max={50} step={5} value={slideCount}
              onChange={e => setSlideCount(Number(e.target.value))} disabled={isRunning}
              style={{ width: '100%', accentColor: 'var(--red)', marginTop: '8px' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--ink3)', marginTop: '4px' }}>
              <span>10</span><span>50</span>
            </div>
          </div>

          {/* 重点章 */}
          <div>
            <div style={labelStyle}>重点章（最大2つ）</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {FOCUS_CHAPTERS.map(f => {
                const sel = focusChapters.includes(f.value)
                const dis = !sel && focusChapters.length >= 2
                return (
                  <button key={f.value} onClick={() => !dis && toggleFocus(f.value)}
                    disabled={isRunning || dis}
                    style={chipStyle(sel, dis)}>{sel && '✓ '}{f.label}</button>
                )
              })}
            </div>
          </div>

          {/* トーン */}
          <div>
            <div style={labelStyle}>デザイントーン</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {TONES.map(t => (
                <button key={t.value} onClick={() => setTone(t.value)} disabled={isRunning}
                  style={{ flex: 1, padding: '10px 6px', background: tone === t.value ? 'var(--ink)' : 'var(--bg2)', color: tone === t.value ? 'var(--bg)' : 'var(--ink)', border: `1px solid ${tone === t.value ? 'var(--ink)' : 'var(--line)'}`, borderRadius: '3px', cursor: 'pointer', textAlign: 'center' as const }}>
                  <div style={{ fontFamily: 'var(--font-d)', fontSize: '11px', fontWeight: 900 }}>{t.label}</div>
                  <div style={{ fontFamily: 'var(--font-c)', fontSize: '9px', marginTop: '3px', color: tone === t.value ? 'rgba(255,255,255,0.7)' : 'var(--ink3)' }}>{t.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 相手 */}
          <div>
            <div style={labelStyle}>プレゼン相手</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {AUDIENCES.map(a => (
                <button key={a.value} onClick={() => setAudience(a.value)} disabled={isRunning}
                  style={{ flex: 1, padding: '10px 6px', background: audience === a.value ? 'var(--ink)' : 'var(--bg2)', color: audience === a.value ? 'var(--bg)' : 'var(--ink)', border: `1px solid ${audience === a.value ? 'var(--ink)' : 'var(--line)'}`, borderRadius: '3px', cursor: 'pointer', textAlign: 'center' as const }}>
                  <div style={{ fontFamily: 'var(--font-d)', fontSize: '11px', fontWeight: 900 }}>{a.label}</div>
                  <div style={{ fontFamily: 'var(--font-c)', fontSize: '9px', marginTop: '3px', color: audience === a.value ? 'rgba(255,255,255,0.7)' : 'var(--ink3)' }}>{a.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* アクションボタン */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
            {isCompleted ? (
              <>
                <button onClick={handleDownload}
                  style={{ padding: '14px', background: 'var(--red)', color: '#fff', border: 'none', borderRadius: '3px', cursor: 'pointer', fontFamily: 'var(--font-d)', fontSize: '12px', fontWeight: 900, letterSpacing: '0.08em' }}>
                  pptxをダウンロード ↓
                </button>
                <button onClick={handleStart} disabled={isStarting}
                  style={{ padding: '10px', background: 'var(--bg2)', color: 'var(--ink)', border: '1px solid var(--line)', borderRadius: '3px', cursor: 'pointer', fontFamily: 'var(--font-d)', fontSize: '10px' }}>
                  再生成する
                </button>
              </>
            ) : isError ? (
              <>
                <button onClick={handleResume} disabled={isStarting}
                  style={{ padding: '14px', background: 'var(--ink)', color: 'var(--bg)', border: 'none', borderRadius: '3px', cursor: 'pointer', fontFamily: 'var(--font-d)', fontSize: '12px', fontWeight: 900 }}>
                  {isStarting ? '再開中...' : '↺ 失敗箇所から再開'}
                </button>
                <button onClick={handleStart} disabled={isStarting}
                  style={{ padding: '10px', background: 'var(--bg2)', color: 'var(--ink)', border: '1px solid var(--line)', borderRadius: '3px', cursor: 'pointer', fontFamily: 'var(--font-d)', fontSize: '10px' }}>
                  最初からやり直す
                </button>
              </>
            ) : (
              <button onClick={handleStart} disabled={isRunning || isStarting || !versionId}
                style={{ padding: '14px', background: isRunning ? 'var(--ink3)' : 'var(--ink)', color: '#fff', border: 'none', borderRadius: '3px', cursor: isRunning ? 'default' : 'pointer', fontFamily: 'var(--font-d)', fontSize: '12px', fontWeight: 900, letterSpacing: '0.08em' }}>
                {isRunning ? '生成中...' : isStarting ? '開始中...' : '提案書を生成する →'}
              </button>
            )}
          </div>
        </div>

        {/* 右: 進捗表示 */}
        <div style={{ overflowY: 'auto', padding: '32px 40px' }}>
          {!hasGeneration && !isRunning && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--ink3)', fontFamily: 'var(--font-c)', fontSize: '13px' }}>
              左のパラメータを設定して生成ボタンを押してください
            </div>
          )}

          {hasGeneration && (
            <div>
              {/* ステータスヘッダー */}
              <div style={{ marginBottom: '28px' }}>
                <div style={{ fontFamily: 'var(--font-d)', fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: isCompleted ? 'var(--dot-g)' : isError ? 'var(--red)' : 'var(--ink3)', marginBottom: '6px' }}>
                  {isCompleted ? '✓ 完了' : isError ? '✕ エラー' : '▶ 生成中'}
                </div>
                {isError && statusData?.errorMessage && (
                  <div style={{ padding: '10px 14px', background: 'rgba(230,48,34,0.08)', border: '1px solid rgba(230,48,34,0.3)', borderRadius: '3px', fontSize: '12px', color: 'var(--red)', fontFamily: 'var(--font-c)', marginTop: '8px' }}>
                    {statusData.errorMessage}
                  </div>
                )}
              </div>

              {/* ステップ進捗 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {SG_STEPS.map(step => {
                  const done = statusData?.hasOutput[step.id] ?? false
                  const current = statusData?.currentStep === step.id && isRunning
                  const error = isError && statusData?.currentStep === step.id

                  return (
                    <div key={step.id} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px', background: current ? 'var(--bg2)' : 'transparent', border: `1px solid ${current ? 'var(--line)' : 'transparent'}`, borderLeft: `2px solid ${done ? 'var(--ink)' : current ? 'var(--red)' : error ? 'var(--red)' : 'var(--line)'}`, borderRadius: '2px', transition: 'all 0.2s' }}>
                      <div style={{ width: '24px', height: '24px', background: done ? 'var(--ink)' : current ? 'var(--red)' : error ? 'var(--red)' : 'var(--bg2)', color: done || current || error ? '#fff' : 'var(--ink3)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '2px', flexShrink: 0, fontSize: '10px', fontFamily: 'var(--font-d)', fontWeight: 700 }}>
                        {done ? '✓' : error ? '✕' : current ? (
                          <span style={{ display: 'flex', gap: '2px' }}>
                            {[0, 0.2, 0.4].map((d, i) => (
                              <span key={i} style={{ width: '3px', height: '3px', borderRadius: '50%', background: '#fff', animation: `td 1.4s ease-in-out ${d}s infinite`, display: 'inline-block' }} />
                            ))}
                          </span>
                        ) : step.id.replace('SG-', '')}
                      </div>
                      <div>
                        <div style={{ fontFamily: 'var(--font-d)', fontSize: '10px', letterSpacing: '0.1em', color: 'var(--ink3)', marginBottom: '2px' }}>{step.id}</div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: done || current ? 'var(--ink)' : 'var(--ink3)' }}>{step.label}</div>
                      </div>
                      {current && (
                        <div style={{ marginLeft: 'auto', fontFamily: 'var(--font-d)', fontSize: '9px', color: 'var(--red)', letterSpacing: '0.1em' }}>実行中...</div>
                      )}
                      {done && (
                        <div style={{ marginLeft: 'auto', fontFamily: 'var(--font-d)', fontSize: '9px', color: 'var(--ink3)', letterSpacing: '0.1em' }}>完了</div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* 完了時のダウンロード */}
              {isCompleted && (
                <div style={{ marginTop: '32px', padding: '24px', background: 'var(--bg2)', border: '1px solid var(--line)', borderRadius: '3px', textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--font-d)', fontSize: '12px', fontWeight: 900, color: 'var(--ink)', marginBottom: '16px' }}>
                    提案書の生成が完了しました
                  </div>
                  <button onClick={handleDownload}
                    style={{ padding: '14px 32px', background: 'var(--red)', color: '#fff', border: 'none', borderRadius: '3px', cursor: 'pointer', fontFamily: 'var(--font-d)', fontSize: '12px', fontWeight: 900, letterSpacing: '0.08em' }}>
                    pptxをダウンロード ↓
                  </button>
                </div>
              )}

              {generationId && (
                <div style={{ marginTop: '16px', fontSize: '10px', color: 'var(--ink4)', fontFamily: 'var(--font-c)' }}>
                  生成ID: {generationId}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-d)',
  fontSize: '9px',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'var(--ink3)',
  marginBottom: '8px',
}

function chipStyle(selected: boolean, disabled = false): React.CSSProperties {
  return {
    padding: '7px 12px',
    background: selected ? 'var(--ink)' : 'var(--bg2)',
    color: selected ? 'var(--bg)' : disabled ? 'var(--ink4)' : 'var(--ink)',
    border: `1px solid ${selected ? 'var(--ink)' : 'var(--line)'}`,
    borderRadius: '3px',
    cursor: disabled ? 'default' : 'pointer',
    fontFamily: 'var(--font-d)',
    fontSize: '10px',
    fontWeight: 700,
  }
}
