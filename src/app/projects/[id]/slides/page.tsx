'use client'
import { useState, useEffect, useCallback, use } from 'react'
import { useRouter } from 'next/navigation'
import { ProposalType, ToneType } from '@/lib/sg/types'

const PROPOSAL_TYPES: { value: ProposalType | 'auto'; label: string; desc: string }[] = [
  { value: 'auto',      label: '自動選択',           desc: 'AGの内容から最適な型を選ぶ' },
  { value: 'insight',   label: 'インサイト型',        desc: '課題が言語化されていない案件' },
  { value: 'data',      label: 'データ型',            desc: '経営層・ROI重視の案件' },
  { value: 'vision',    label: 'ビジョン型',          desc: 'フルリニューアル・ブランド再定義' },
  { value: 'solution',  label: '課題解決型',          desc: '課題が明確な改善案件' },
]

const TONES: { value: ToneType; label: string; desc: string }[] = [
  { value: 'simple', label: 'Simple', desc: 'Apple的。余白大・1メッセージ' },
  { value: 'rich',   label: 'Rich',   desc: 'FAS的。情報量多・高級感' },
  { value: 'pop',    label: 'Pop',    desc: '明るい多色・イラスト多用' },
]

const AUDIENCES: { value: 'executive' | 'manager' | 'creative'; label: string; desc: string }[] = [
  { value: 'executive', label: '経営層',       desc: '結論先行・数字重視' },
  { value: 'manager',   label: '担当者',       desc: '詳細説明・根拠重視' },
  { value: 'creative',  label: 'クリエイター', desc: 'ビジュアル重視・感性訴求' },
]

const SG_STEPS = [
  { id: 'SG-01',     label: '構成設計' },
  { id: 'SG-02',     label: 'ナラティブ設計（Opus）' },
  { id: 'SG-04',     label: '本文生成' },
  { id: 'RENDERING', label: 'HTMLレンダリング' },
  { id: 'PDF',       label: 'PDF生成' },
]

interface StatusData {
  id: string
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'ERROR'
  currentStep: string | null
  errorMessage: string | null
  pdfPath: string | null
  startedAt: string | null
  completedAt: string | null
  hasOutput: {
    'SG-01': boolean
    'SG-02': boolean
    'SG-04': boolean
    slides: boolean
    pdf: boolean
  }
}

export default function SlidesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params)
  const router = useRouter()

  // パラメータ設定
  const [proposalType, setProposalType] = useState<ProposalType | 'auto'>('auto')
  const [tone, setTone] = useState<ToneType>('simple')
  const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('landscape')
  const [slideCount, setSlideCount] = useState(25)
  const [audience, setAudience] = useState<'executive' | 'manager' | 'creative'>('manager')

  // 実行状態
  const [sgId, setSgId] = useState<string | null>(null)
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
      })
      .catch(() => {})
  }, [projectId])

  // ポーリングでステータス取得
  const pollStatus = useCallback(async () => {
    if (!sgId) return
    const res = await fetch(`/api/sg/${sgId}`)
    if (!res.ok) return
    const data: StatusData = await res.json()
    setStatusData(data)
  }, [sgId])

  useEffect(() => {
    if (!sgId) return
    pollStatus()
    const interval = setInterval(pollStatus, 2000)
    return () => clearInterval(interval)
  }, [sgId, pollStatus])

  // 完了/エラー時はポーリングを止める
  useEffect(() => {
    if (statusData?.status === 'COMPLETED' || statusData?.status === 'ERROR') {
      // intervalはuseEffectのcleanupで止まる（statusDataが変わるため）
    }
  }, [statusData?.status])

  async function handleStart() {
    if (!versionId) return
    setIsStarting(true)
    setSgId(null)
    setStatusData(null)
    try {
      const res = await fetch('/api/sg/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          versionId,
          proposalType: proposalType === 'auto' ? undefined : proposalType,
          tone,
          orientation,
          slideCount,
          audience,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? `HTTP ${res.status}`)
      }
      const { sgId: id } = await res.json()
      setSgId(id)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'エラーが発生しました')
    } finally {
      setIsStarting(false)
    }
  }

  function handleDownload() {
    if (!statusData?.pdfPath) return
    window.open(statusData.pdfPath, '_blank')
  }

  const isRunning = statusData?.status === 'RUNNING' || statusData?.status === 'PENDING'
  const isCompleted = statusData?.status === 'COMPLETED'
  const isError = statusData?.status === 'ERROR'
  const hasGeneration = !!sgId && !!statusData

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
          SLIDE GENERATOR v2
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

          {/* 提案書の型 */}
          <div>
            <div style={labelStyle}>提案書の型</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {PROPOSAL_TYPES.map(t => (
                <button key={t.value} onClick={() => setProposalType(t.value)} disabled={isRunning}
                  style={chipStyle(proposalType === t.value)} title={t.desc}>{t.label}</button>
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

          {/* 向き */}
          <div>
            <div style={labelStyle}>向き</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {(['landscape', 'portrait'] as const).map(o => (
                <button key={o} onClick={() => setOrientation(o)} disabled={isRunning}
                  style={{ flex: 1, padding: '10px 6px', background: orientation === o ? 'var(--ink)' : 'var(--bg2)', color: orientation === o ? 'var(--bg)' : 'var(--ink)', border: `1px solid ${orientation === o ? 'var(--ink)' : 'var(--line)'}`, borderRadius: '3px', cursor: 'pointer', fontFamily: 'var(--font-d)', fontSize: '11px', fontWeight: 900 }}>
                  {o === 'landscape' ? '横（16:9）' : '縦（9:16）'}
                </button>
              ))}
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
                <button onClick={handleDownload} disabled={!statusData?.pdfPath}
                  style={{ padding: '14px', background: 'var(--red)', color: '#fff', border: 'none', borderRadius: '3px', cursor: statusData?.pdfPath ? 'pointer' : 'default', fontFamily: 'var(--font-d)', fontSize: '12px', fontWeight: 900, letterSpacing: '0.08em' }}>
                  PDFをダウンロード ↓
                </button>
                <button onClick={handleStart} disabled={isStarting || !versionId}
                  style={{ padding: '10px', background: 'var(--bg2)', color: 'var(--ink)', border: '1px solid var(--line)', borderRadius: '3px', cursor: 'pointer', fontFamily: 'var(--font-d)', fontSize: '10px' }}>
                  再生成する
                </button>
              </>
            ) : isError ? (
              <>
                <button onClick={handleStart} disabled={isStarting || !versionId}
                  style={{ padding: '14px', background: 'var(--ink)', color: 'var(--bg)', border: 'none', borderRadius: '3px', cursor: 'pointer', fontFamily: 'var(--font-d)', fontSize: '12px', fontWeight: 900 }}>
                  {isStarting ? '開始中...' : '↺ 再生成する'}
                </button>
              </>
            ) : (
              <button onClick={handleStart} disabled={isRunning || isStarting || !versionId}
                style={{ padding: '14px', background: isRunning ? 'var(--ink3)' : 'var(--ink)', color: '#fff', border: 'none', borderRadius: '3px', cursor: isRunning || isStarting ? 'default' : 'pointer', fontFamily: 'var(--font-d)', fontSize: '12px', fontWeight: 900, letterSpacing: '0.08em' }}>
                {isRunning ? '生成中...' : isStarting ? '開始中...' : '提案書を生成する →'}
              </button>
            )}
          </div>
        </div>

        {/* 右: 進捗表示 */}
        <div style={{ overflowY: 'auto', padding: '32px 40px' }}>
          {!hasGeneration && (
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
                  let done = false
                  if (step.id === 'SG-01') done = statusData?.hasOutput['SG-01'] ?? false
                  else if (step.id === 'SG-02') done = statusData?.hasOutput['SG-02'] ?? false
                  else if (step.id === 'SG-04') done = statusData?.hasOutput['SG-04'] ?? false
                  else if (step.id === 'RENDERING') done = statusData?.hasOutput['slides'] ?? false
                  else if (step.id === 'PDF') done = statusData?.hasOutput['pdf'] ?? false

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
                        ) : step.id.split('-').pop()}
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
                  <button onClick={handleDownload} disabled={!statusData?.pdfPath}
                    style={{ padding: '14px 32px', background: 'var(--red)', color: '#fff', border: 'none', borderRadius: '3px', cursor: statusData?.pdfPath ? 'pointer' : 'default', fontFamily: 'var(--font-d)', fontSize: '12px', fontWeight: 900, letterSpacing: '0.08em' }}>
                    PDFをダウンロード ↓
                  </button>
                </div>
              )}

              {sgId && (
                <div style={{ marginTop: '16px', fontSize: '10px', color: 'var(--ink4)', fontFamily: 'var(--font-c)' }}>
                  生成ID: {sgId}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes td {
          0%, 100% { opacity: 0.2; } 50% { opacity: 1; }
        }
      `}</style>
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
