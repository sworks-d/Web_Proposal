'use client'
import { useState, useEffect, useCallback, use } from 'react'
import { useRouter } from 'next/navigation'
import { ProposalVariant, NarrativeType, ToneType, VARIANT_DEFAULT_NARRATIVE, SPOT_TARGET_OPTIONS } from '@/lib/sg/types'

const VARIANTS: { value: ProposalVariant; label: string; desc: string }[] = [
  { value: 'full',     label: 'フル提案',   desc: '課題〜KPIまで全章' },
  { value: 'strategy', label: '戦略提案',   desc: 'コンセプト・方向性に集中' },
  { value: 'analysis', label: '分析報告',   desc: '現状・競合・ユーザー分析' },
  { value: 'content',  label: 'コンテンツ', desc: 'コンテンツ戦略・設計' },
  { value: 'spot',     label: 'スポット',   desc: '特定ページ・機能の改善' },
]

const NARRATIVE_TYPES: { value: NarrativeType | 'auto'; label: string; desc: string }[] = [
  { value: 'auto',     label: '自動',       desc: '種別から推定' },
  { value: 'insight',  label: 'インサイト', desc: '本質を突く・課題が未言語化' },
  { value: 'data',     label: 'データ',     desc: '数字・ROI重視' },
  { value: 'vision',   label: 'ビジョン',   desc: 'フルリニューアル・ブランド' },
  { value: 'solution', label: '課題解決',   desc: '課題明確な改善案件' },
]

const TONES: { value: ToneType; label: string; desc: string }[] = [
  { value: 'simple', label: 'Simple', desc: '余白大・1メッセージ' },
  { value: 'rich',   label: 'Rich',   desc: '情報量多・高級感' },
  { value: 'pop',    label: 'Pop',    desc: '多色・明るい' },
]

const AUDIENCES = [
  { value: 'executive' as const, label: '経営層',       desc: '結論先行・数字重視' },
  { value: 'manager'   as const, label: '担当者',       desc: '詳細・根拠重視' },
  { value: 'creative'  as const, label: 'クリエイター', desc: 'ビジュアル重視' },
]

const SG_STEPS = [
  { id: 'SG-01',     label: '構成設計' },
  { id: 'SG-02',     label: 'ナラティブ設計（Opus）' },
  { id: 'SG-04',     label: '本文生成' },
  { id: 'SG-06',     label: 'ビジュアル生成' },
  { id: 'RENDERING', label: 'HTMLレンダリング' },
  { id: 'PDF',       label: 'PDF生成' },
]

const VARIANT_LABELS: Record<string, string> = {
  full: 'フル提案', strategy: '戦略', analysis: '分析', content: 'コンテンツ', spot: 'スポット',
}
const NARRATIVE_LABELS: Record<string, string> = {
  insight: 'インサイト', data: 'データ', vision: 'ビジョン', solution: '課題解決',
}
const TONE_LABELS: Record<string, string> = {
  simple: 'Simple', rich: 'Rich', pop: 'Pop',
}

interface SgItem {
  id: string
  name: string | null
  variant: string
  narrativeType: string
  targetScope: string | null
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'ERROR'
  currentStep: string | null
  errorMessage: string | null
  tone: string
  orientation: string
  slideCount: number
  audience: string
  pdfPath: string | null
  startedAt: string | null
  completedAt: string | null
  createdAt: string
}

interface StatusDetail {
  id: string
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'ERROR'
  currentStep: string | null
  errorMessage: string | null
  pdfPath: string | null
  hasOutput: Record<string, boolean>
}

export default function ProposalsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params)
  const router = useRouter()

  // パラメータ
  const [variant, setVariant] = useState<ProposalVariant>('full')
  const [narrativeType, setNarrativeType] = useState<NarrativeType | 'auto'>('auto')
  const [tone, setTone] = useState<ToneType>('simple')
  const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('landscape')
  const [slideCount, setSlideCount] = useState(25)
  const [audience, setAudience] = useState<'executive' | 'manager' | 'creative'>('manager')
  const [targetScope, setTargetScope] = useState('')
  const [name, setName] = useState('')

  // 状態
  const [versionId, setVersionId] = useState<string | null>(null)
  const [generations, setGenerations] = useState<SgItem[]>([])
  const [activeSgId, setActiveSgId] = useState<string | null>(null)
  const [activeStatus, setActiveStatus] = useState<StatusDetail | null>(null)
  const [isStarting, setIsStarting] = useState(false)

  // バージョン取得
  useEffect(() => {
    fetch(`/api/projects/${projectId}/versions`)
      .then(r => r.ok ? r.json() : null)
      .then((versions: { id: string; status: string }[] | null) => {
        if (!versions || versions.length === 0) return
        const completed = versions.filter(v => v.status === 'COMPLETED')
        const target = completed[completed.length - 1] ?? versions[versions.length - 1]
        setVersionId(target.id)
      })
      .catch(() => {})
  }, [projectId])

  // 一覧取得
  const fetchList = useCallback(async () => {
    if (!versionId) return
    const res = await fetch(`/api/sg/list?versionId=${versionId}`)
    if (!res.ok) return
    const data: { proposals: SgItem[] } = await res.json()
    setGenerations(data.proposals ?? [])

    const running = (data.proposals ?? []).find(g => g.status === 'RUNNING' || g.status === 'PENDING')
    if (running && !activeSgId) setActiveSgId(running.id)
  }, [versionId, activeSgId])

  useEffect(() => {
    fetchList()
  }, [fetchList])

  // activeのステータスポーリング
  const pollActive = useCallback(async () => {
    if (!activeSgId) return
    const res = await fetch(`/api/sg/${activeSgId}`)
    if (!res.ok) return
    const data: StatusDetail = await res.json()
    setActiveStatus(data)

    if (data.status === 'COMPLETED' || data.status === 'ERROR') {
      await fetchList()
    }
  }, [activeSgId, fetchList])

  useEffect(() => {
    if (!activeSgId) return
    pollActive()
    const interval = setInterval(pollActive, 2000)
    return () => clearInterval(interval)
  }, [activeSgId, pollActive])

  async function handleStart() {
    if (!versionId) return
    setIsStarting(true)
    try {
      const res = await fetch('/api/sg/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          versionId,
          name: name || undefined,
          variant,
          narrativeType: narrativeType === 'auto' ? undefined : narrativeType,
          targetScope: variant === 'spot' && targetScope ? targetScope : undefined,
          tone,
          orientation,
          slideCount,
          audience,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as { error?: string }).error ?? `HTTP ${res.status}`)
      }
      const { sgId } = await res.json()
      setActiveSgId(sgId)
      setActiveStatus(null)
      await fetchList()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'エラーが発生しました')
    } finally {
      setIsStarting(false)
    }
  }

  const isRunning = activeStatus?.status === 'RUNNING' || activeStatus?.status === 'PENDING'
  const isCompleted = activeStatus?.status === 'COMPLETED'
  const isError = activeStatus?.status === 'ERROR'

  // 種別変更時にnarrativeTypeを自動設定
  function handleVariantChange(v: ProposalVariant) {
    setVariant(v)
    if (narrativeType === 'auto') return
    // 種別のデフォルト型に合わせてリセット
    setNarrativeType('auto')
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ padding: '14px 44px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '9px', fontFamily: 'var(--font-d)', fontSize: '9px', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
          <button onClick={() => router.back()} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink3)', fontFamily: 'var(--font-d)', fontSize: '9px', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
            ← 戻る
          </button>
          <span style={{ color: 'var(--ink4)' }}>/</span>
          <span style={{ color: 'var(--ink)' }}>提案書</span>
        </div>
        <div style={{ fontFamily: 'var(--font-d)', fontSize: '9px', color: 'var(--ink3)', letterSpacing: '0.1em' }}>
          PROPOSAL GENERATOR
        </div>
      </div>

      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '340px 1fr', minHeight: 0 }}>

        {/* 左: 設定パネル */}
        <div style={{ borderRight: '1px solid var(--line)', overflowY: 'auto', padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

          <div>
            <div style={{ fontFamily: 'var(--font-d)', fontSize: '14px', fontWeight: 900, color: 'var(--ink)', marginBottom: '4px' }}>
              新規生成
            </div>
            <div style={{ fontFamily: 'var(--font-c)', fontSize: '10px', color: 'var(--ink3)', lineHeight: 1.6 }}>
              ページを閉じても生成は継続します
            </div>
          </div>

          {/* 提案書名 */}
          <div>
            <div style={L}>提案書名（任意）</div>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              disabled={isRunning}
              placeholder="例: 経営層向け戦略提案"
              style={{ width: '100%', padding: '8px 10px', background: 'var(--bg2)', border: '1px solid var(--line)', borderRadius: '3px', color: 'var(--ink)', fontSize: '12px', fontFamily: 'var(--font-c)', boxSizing: 'border-box' }}
            />
          </div>

          {/* 種別 */}
          <div>
            <div style={L}>種別</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {VARIANTS.map(v => (
                <button key={v.value} onClick={() => handleVariantChange(v.value)} disabled={isRunning}
                  title={v.desc}
                  style={{ padding: '8px 12px', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '10px', ...btnBase, ...(variant === v.value ? btnActive : btnInactive) }}>
                  <span style={{ fontFamily: 'var(--font-d)', fontSize: '11px', fontWeight: 900, minWidth: '60px' }}>{v.label}</span>
                  <span style={{ fontSize: '10px', opacity: 0.7 }}>{v.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* スポット対象 */}
          {variant === 'spot' && (
            <div>
              <div style={L}>スポット対象</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '8px' }}>
                {SPOT_TARGET_OPTIONS.map(o => (
                  <button key={o.value} onClick={() => setTargetScope(o.label)} disabled={isRunning}
                    style={chip(targetScope === o.label)}>{o.label}</button>
                ))}
              </div>
              <input
                type="text"
                value={targetScope}
                onChange={e => setTargetScope(e.target.value)}
                disabled={isRunning}
                placeholder="対象ページ・機能を入力"
                style={{ width: '100%', padding: '7px 10px', background: 'var(--bg2)', border: '1px solid var(--line)', borderRadius: '3px', color: 'var(--ink)', fontSize: '11px', fontFamily: 'var(--font-c)', boxSizing: 'border-box' }}
              />
            </div>
          )}

          {/* 型 */}
          <div>
            <div style={L}>型（伝え方）</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
              {NARRATIVE_TYPES.map(t => (
                <button key={t.value} onClick={() => setNarrativeType(t.value)} disabled={isRunning}
                  title={t.desc} style={chip(narrativeType === t.value)}>{t.label}</button>
              ))}
            </div>
            {narrativeType === 'auto' && (
              <div style={{ fontSize: '10px', color: 'var(--ink3)', marginTop: '5px' }}>
                推定: {NARRATIVE_LABELS[VARIANT_DEFAULT_NARRATIVE[variant]]}型
              </div>
            )}
          </div>

          {/* 枚数 */}
          <div>
            <div style={L}>枚数: <strong style={{ color: 'var(--ink)', fontFamily: 'inherit' }}>{slideCount}</strong></div>
            <input type="range" min={10} max={50} step={5} value={slideCount}
              onChange={e => setSlideCount(Number(e.target.value))} disabled={isRunning}
              style={{ width: '100%', accentColor: 'var(--red)' }} />
          </div>

          {/* 向き */}
          <div>
            <div style={L}>向き</div>
            <div style={{ display: 'flex', gap: '6px' }}>
              {(['landscape', 'portrait'] as const).map(o => (
                <button key={o} onClick={() => setOrientation(o)} disabled={isRunning}
                  style={{ flex: 1, padding: '8px 4px', ...btnBase, ...(orientation === o ? btnActive : btnInactive) }}>
                  {o === 'landscape' ? '横（A4）' : '縦（A4）'}
                </button>
              ))}
            </div>
          </div>

          {/* トーン */}
          <div>
            <div style={L}>トーン</div>
            <div style={{ display: 'flex', gap: '6px' }}>
              {TONES.map(t => (
                <button key={t.value} onClick={() => setTone(t.value)} disabled={isRunning}
                  title={t.desc} style={{ flex: 1, padding: '8px 4px', ...btnBase, ...(tone === t.value ? btnActive : btnInactive) }}>
                  <div style={{ fontFamily: 'var(--font-d)', fontSize: '10px', fontWeight: 900 }}>{t.label}</div>
                  <div style={{ fontSize: '9px', marginTop: '2px', opacity: 0.7 }}>{t.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 聴衆 */}
          <div>
            <div style={L}>聴衆</div>
            <div style={{ display: 'flex', gap: '6px' }}>
              {AUDIENCES.map(a => (
                <button key={a.value} onClick={() => setAudience(a.value)} disabled={isRunning}
                  title={a.desc} style={{ flex: 1, padding: '8px 4px', ...btnBase, ...(audience === a.value ? btnActive : btnInactive) }}>
                  <div style={{ fontFamily: 'var(--font-d)', fontSize: '10px', fontWeight: 900 }}>{a.label}</div>
                  <div style={{ fontSize: '9px', marginTop: '2px', opacity: 0.7 }}>{a.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 生成ボタン */}
          <button onClick={handleStart} disabled={isRunning || isStarting || !versionId}
            style={{ padding: '13px', background: isRunning ? 'var(--ink3)' : 'var(--ink)', color: '#fff', border: 'none', borderRadius: '3px', cursor: isRunning || isStarting ? 'default' : 'pointer', fontFamily: 'var(--font-d)', fontSize: '11px', fontWeight: 900, letterSpacing: '0.08em', marginTop: '4px' }}>
            {isRunning ? '生成中...' : isStarting ? '開始中...' : '提案書を生成する →'}
          </button>
        </div>

        {/* 右: 進捗 + 履歴 */}
        <div style={{ overflowY: 'auto', padding: '28px 36px', display: 'flex', flexDirection: 'column', gap: '32px' }}>

          {/* 実行中の進捗 */}
          {activeSgId && (
            <div>
              <div style={{ fontFamily: 'var(--font-d)', fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink3)', marginBottom: '14px' }}>
                現在の生成
              </div>

              <div style={{ fontFamily: 'var(--font-d)', fontSize: '9px', color: isCompleted ? 'var(--dot-g)' : isError ? 'var(--red)' : 'var(--ink3)', marginBottom: '12px', letterSpacing: '0.1em' }}>
                {isCompleted ? '✓ 完了' : isError ? '✕ エラー' : '▶ 実行中'}
              </div>

              {isError && activeStatus?.errorMessage && (
                <div style={{ padding: '10px 14px', background: 'rgba(230,48,34,0.08)', border: '1px solid rgba(230,48,34,0.25)', borderRadius: '3px', fontSize: '11px', color: 'var(--red)', marginBottom: '12px' }}>
                  {activeStatus.errorMessage}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginBottom: '16px' }}>
                {SG_STEPS.map(step => {
                  const hasOutput = activeStatus?.hasOutput ?? {}
                  let done = false
                  if (step.id === 'SG-01') done = !!hasOutput['SG-01']
                  else if (step.id === 'SG-02') done = !!hasOutput['SG-02']
                  else if (step.id === 'SG-04') done = !!hasOutput['SG-04']
                  else if (step.id === 'SG-06') done = !!hasOutput['SG-06']
                  else if (step.id === 'RENDERING') done = !!hasOutput['slides']
                  else if (step.id === 'PDF') done = !!hasOutput['pdf']

                  const current = activeStatus?.currentStep === step.id && isRunning
                  const error = isError && activeStatus?.currentStep === step.id

                  return (
                    <div key={step.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '11px 14px', background: current ? 'var(--bg2)' : 'transparent', borderLeft: `2px solid ${done ? 'var(--ink)' : current ? 'var(--red)' : error ? 'var(--red)' : 'var(--line)'}`, borderRadius: '2px' }}>
                      <div style={{ width: '22px', height: '22px', background: done ? 'var(--ink)' : current ? 'var(--red)' : error ? 'var(--red)' : 'var(--bg2)', color: done || current || error ? '#fff' : 'var(--ink3)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '2px', flexShrink: 0, fontSize: '10px', fontFamily: 'var(--font-d)', fontWeight: 700 }}>
                        {done ? '✓' : error ? '✕' : current ? '·' : step.id.split('-').pop()}
                      </div>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: done || current ? 'var(--ink)' : 'var(--ink3)' }}>{step.label}</div>
                      {current && <div style={{ marginLeft: 'auto', fontSize: '9px', color: 'var(--red)', fontFamily: 'var(--font-d)' }}>実行中...</div>}
                    </div>
                  )
                })}
              </div>

              {isCompleted && activeStatus?.pdfPath && (
                <div style={{ padding: '20px', background: 'var(--bg2)', border: '1px solid var(--line)', borderRadius: '3px', textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--font-d)', fontSize: '11px', fontWeight: 900, marginBottom: '14px' }}>生成完了</div>
                  <a href={activeStatus.pdfPath} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'inline-block', padding: '12px 28px', background: 'var(--red)', color: '#fff', textDecoration: 'none', borderRadius: '3px', fontFamily: 'var(--font-d)', fontSize: '11px', fontWeight: 900 }}>
                    PDFをダウンロード ↓
                  </a>
                </div>
              )}
            </div>
          )}

          {/* 過去の生成履歴 */}
          {generations.length > 0 && (
            <div>
              <div style={{ fontFamily: 'var(--font-d)', fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink3)', marginBottom: '14px' }}>
                生成履歴
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {generations.map(g => {
                  const isActive = g.id === activeSgId
                  const label = g.name || `${VARIANT_LABELS[g.variant] ?? g.variant} / ${NARRATIVE_LABELS[g.narrativeType] ?? g.narrativeType}`
                  return (
                    <div key={g.id}
                      onClick={() => { setActiveSgId(g.id); setActiveStatus(null) }}
                      style={{ padding: '14px 16px', background: isActive ? 'var(--bg2)' : 'transparent', border: `1px solid ${isActive ? 'var(--ink3)' : 'var(--line)'}`, borderRadius: '3px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: g.status === 'COMPLETED' ? 'var(--dot-g)' : g.status === 'ERROR' ? 'var(--red)' : g.status === 'RUNNING' ? 'var(--red)' : 'var(--ink4)', flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'baseline' }}>
                          <span style={{ fontFamily: 'var(--font-d)', fontSize: '11px', fontWeight: 700, color: 'var(--ink)' }}>
                            {label}
                          </span>
                          <span style={{ fontFamily: 'var(--font-d)', fontSize: '9px', color: 'var(--ink3)' }}>
                            {TONE_LABELS[g.tone] ?? g.tone} / {g.orientation === 'landscape' ? '横' : '縦'} / {g.slideCount}枚
                          </span>
                        </div>
                        {g.targetScope && (
                          <div style={{ fontFamily: 'var(--font-c)', fontSize: '10px', color: 'var(--ink3)', marginTop: '1px' }}>
                            対象: {g.targetScope}
                          </div>
                        )}
                        <div style={{ fontFamily: 'var(--font-c)', fontSize: '10px', color: 'var(--ink3)', marginTop: '2px' }}>
                          {new Date(g.createdAt).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          {g.status === 'RUNNING' && ` · ${g.currentStep ?? '準備中'}...`}
                          {g.status === 'ERROR' && ' · エラー'}
                        </div>
                      </div>
                      {g.status === 'COMPLETED' && g.pdfPath && (
                        <a href={g.pdfPath} target="_blank" rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          style={{ fontFamily: 'var(--font-d)', fontSize: '9px', color: 'var(--red)', textDecoration: 'none', letterSpacing: '0.05em', flexShrink: 0 }}>
                          PDF↓
                        </a>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {!activeSgId && generations.length === 0 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', color: 'var(--ink3)', fontFamily: 'var(--font-c)', fontSize: '13px' }}>
              左のパラメータを設定して生成してください
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// スタイル定数
const L: React.CSSProperties = {
  fontFamily: 'var(--font-d)',
  fontSize: '9px',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'var(--ink3)',
  marginBottom: '7px',
}

const btnBase: React.CSSProperties = {
  border: '1px solid',
  borderRadius: '3px',
  cursor: 'pointer',
  textAlign: 'center',
}

const btnActive: React.CSSProperties = {
  background: 'var(--ink)',
  color: 'var(--bg)',
  borderColor: 'var(--ink)',
}

const btnInactive: React.CSSProperties = {
  background: 'var(--bg2)',
  color: 'var(--ink)',
  borderColor: 'var(--line)',
}

function chip(selected: boolean): React.CSSProperties {
  return {
    padding: '6px 10px',
    background: selected ? 'var(--ink)' : 'var(--bg2)',
    color: selected ? 'var(--bg)' : 'var(--ink)',
    border: `1px solid ${selected ? 'var(--ink)' : 'var(--line)'}`,
    borderRadius: '3px',
    cursor: 'pointer',
    fontFamily: 'var(--font-d)',
    fontSize: '10px',
    fontWeight: 700,
  }
}
