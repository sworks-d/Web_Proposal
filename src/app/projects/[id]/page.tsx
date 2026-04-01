'use client'
import { useState, useEffect, use } from 'react'
import { AgentOutput, PipelineConfig, Section } from '@/agents/types'
import { buildCheckpointSummary, GotInfoItem, MissingInfoItem } from '@/lib/checkpoint-summary'
import Ticker from '@/components/layout/Ticker'
import NavBar from '@/components/layout/NavBar'
import TableOfContents from '@/components/proposal/TableOfContents'

interface Project {
  id: string
  title: string
  industryType: string
  client: { name: string }
}

interface VersionSummary {
  id: string
  versionNumber: number
  label: string | null
  status: string
}

type AppStatus = 'idle' | 'running' | 'checkpoint' | 'error' | 'completed'

type CheckpointState = {
  versionId: string
  phase: 1 | 2 | 3 | 4
  outputs: AgentOutput[]
  summary: { gotInfo: GotInfoItem[]; missingInfo: MissingInfoItem[] }
} | null

const AG_LIST = [
  { id: 'AG-01', name: 'インテーク担当' },
  { id: 'AG-02', name: '市場・業界分析' },
  { id: 'AG-03', name: '競合・ポジション分析' },
  { id: 'AG-04', name: '課題構造化' },
  { id: 'AG-05', name: 'ファクトチェック' },
  { id: 'AG-06', name: '設計草案' },
  { id: 'AG-07', name: '提案書草案' },
]

const PHASE_LABELS = ['インテーク', '市場分析', '競合分析', '統合・FC', '設計・草案']

const PRIMARY_OPTIONS = [
  { value: 'ag-02-recruit', label: '採用・リクルートサイト専門', desc: '採用・リクルート案件に特化' },
  { value: 'ag-02-brand',   label: 'ブランドサイト専門', desc: 'ブランディング・ビジョン訴求' },
  { value: 'ag-02-corp',    label: 'コーポレートサイト専門', desc: '企業情報・IR・採用統合' },
  { value: 'ag-02-ec',      label: 'EC・購買専門', desc: 'ECサイト・購買体験設計' },
  { value: 'ag-02-camp',    label: 'キャンペーン専門', desc: 'LP・プロモーション特化' },
  { value: 'ag-02-btob',    label: 'BtoB専門', desc: 'BtoB・リード獲得設計' },
  { value: 'ag-02-general', label: '汎用', desc: '業種非特化' },
]

const SUB_OPTIONS = [
  { value: 'ag-02-sub-beauty',   label: '美容・コスメ' },
  { value: 'ag-02-sub-food',     label: '食品・飲料' },
  { value: 'ag-02-sub-finance',  label: '金融・保険' },
  { value: 'ag-02-sub-health',   label: '医療・ヘルスケア' },
  { value: 'ag-02-sub-education',label: '教育' },
  { value: 'ag-02-sub-life',     label: 'くらし・エネルギー' },
  { value: 'ag-02-sub-fashion',  label: 'ファッション' },
  { value: 'ag-02-sub-auto',     label: '自動車' },
  { value: 'ag-02-sub-tech',     label: 'PC・家電・通信' },
  { value: 'ag-02-sub-culture',  label: 'エンタメ・文化' },
  { value: 'ag-02-sub-sport',    label: 'スポーツ' },
  { value: 'ag-02-sub-travel',   label: '旅行・観光' },
  { value: 'ag-02-sub-gov',      label: '官公庁・特殊会社' },
  { value: 'ag-02-sub-creative', label: 'クリエイティブ・デザイン' },
]

const CONFIDENCE_COLOR: Record<string, string> = {
  high: 'var(--dot-g)', medium: '#E8C44A', low: 'var(--ink4)',
}

export default function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [project, setProject] = useState<Project | null>(null)
  const [versions, setVersions] = useState<VersionSummary[]>([])
  const [currentVersionId, setCurrentVersionId] = useState<string | null>(null)
  const [appStatus, setAppStatus] = useState<AppStatus>('idle')
  const [currentAG, setCurrentAG] = useState<string | null>(null)
  const [completedAGs, setCompletedAGs] = useState<string[]>([])
  const [allOutputs, setAllOutputs] = useState<AgentOutput[]>([])
  const [checkpointState, setCheckpointState] = useState<CheckpointState>(null)
  const [statusMessages, setStatusMessages] = useState<string[]>([])
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [showCheckpointModal, setShowCheckpointModal] = useState(false)
  const [selectedPrimary, setSelectedPrimary] = useState('ag-02-recruit')
  const [selectedSub, setSelectedSub] = useState<string[]>([])
  const [currentPhase, setCurrentPhase] = useState(0)
  const [selectedAGId, setSelectedAGId] = useState<string | null>(null)
  const [cdNotes, setCdNotes] = useState<Record<string, string>>({})
  const [showVersionDropdown, setShowVersionDropdown] = useState(false)
  const [showSlides, setShowSlides] = useState(false)

  useEffect(() => {
    fetch(`/api/projects/${id}`).then(r => r.json()).then(setProject).catch(() => {})
    fetch(`/api/projects/${id}/versions`).then(r => r.json()).then((vs: VersionSummary[]) => {
      setVersions(vs)
      const active = vs.find(v => ['RUNNING', 'CHECKPOINT', 'DRAFT'].includes(v.status)) ?? vs[vs.length - 1]
      if (active) setCurrentVersionId(active.id)
    }).catch(() => {})
  }, [id])

  const addStatus = (msg: string) => setStatusMessages(prev => [...prev, msg])

  const consumeSSE = async (res: Response) => {
    const reader = res.body?.getReader()
    const decoder = new TextDecoder()
    if (!reader) return
    let buffer = ''
    const collected: AgentOutput[] = []

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        try {
          const event = JSON.parse(line.slice(6))
          if (event.type === 'status') {
            addStatus(event.message)
            const match = event.message.match(/AG-(\d+)/)
            if (match) setCurrentAG(`AG-0${match[1]}`)
          } else if (event.type === 'checkpoint') {
            const vId: string = event.versionId
            setCurrentVersionId(vId)
            const outputs: AgentOutput[] = event.outputs ?? (event.output ? [event.output] : [])
            collected.push(...outputs)
            setAllOutputs([...collected])
            setCompletedAGs(collected.map(o => o.agentId))
            setCurrentAG(null)
            setCurrentPhase(event.phase)

            const summary = buildCheckpointSummary(outputs)
            setCheckpointState({ versionId: vId, phase: event.phase, outputs, summary })

            if (event.phase === 1) {
              setSelectedPrimary('ag-02-recruit')
              setSelectedSub([])
            }

            setAppStatus('checkpoint')
            setShowCheckpointModal(true)
            // Refresh version list
            fetch(`/api/projects/${id}/versions`).then(r => r.json()).then(setVersions).catch(() => {})
          } else if (event.type === 'pipeline_complete') {
            setAppStatus('completed')
            setCurrentAG(null)
            setCurrentPhase(5)
            fetch(`/api/projects/${id}/versions`).then(r => r.json()).then(setVersions).catch(() => {})
          } else if (event.type === 'error') {
            setErrorMessage(event.message)
            setAppStatus('error')
            setCurrentAG(null)
          }
        } catch {}
      }
    }
  }

  const startPipeline = async () => {
    if (!project || appStatus === 'running') return
    setAppStatus('running')
    setStatusMessages(['パイプラインを開始しています...'])
    setErrorMessage(null)
    setCompletedAGs([])
    setAllOutputs([])
    setCurrentAG('AG-01')
    setCurrentPhase(1)

    const industryMap: Record<string, string> = {
      recruitment: 'ag-02-recruit', btob: 'ag-02-btob', ec: 'ag-02-ec',
      corporate: 'ag-02-corp', campaign: 'ag-02-camp', general: 'ag-02-general',
    }
    const primaryAgent = (industryMap[project.industryType] ?? 'ag-02-general') as PipelineConfig['primaryAgent']
    const config: PipelineConfig = { mode: 'full', primaryAgent, subAgents: [] }

    try {
      const res = await fetch('/api/executions/pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: id, config }),
      })
      if (!res.ok) {
        const text = await res.text()
        setErrorMessage(`${res.status}: ${text.slice(0, 200)}`)
        setAppStatus('error')
        return
      }
      await consumeSSE(res)
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : String(err))
      setAppStatus('error')
    }
  }

  const handleCheckpointConfirm = async () => {
    if (!checkpointState) return
    setShowCheckpointModal(false)
    setAppStatus('running')
    setCheckpointState(null)

    const vId = checkpointState.versionId
    const agentSelection = checkpointState.phase === 1
      ? { primary: selectedPrimary, sub: selectedSub }
      : undefined

    addStatus(`フェーズ ${checkpointState.phase + 1} を開始しています...`)

    // Save cdNotes if any
    if (Object.keys(cdNotes).length > 0) {
      await fetch(`/api/versions/${vId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cdNotes }),
      }).catch(() => {})
    }

    try {
      const res = await fetch(`/api/executions/${vId}/resume`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentSelection }),
      })
      if (!res.ok) {
        const text = await res.text()
        setErrorMessage(`${res.status}: ${text.slice(0, 200)}`)
        setAppStatus('error')
        return
      }
      await consumeSSE(res)
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : String(err))
      setAppStatus('error')
    }
  }

  const handleSectionEdit = (sectionId: string, newContent: string) => {
    setAllOutputs(prev => prev.map(o => ({
      ...o,
      sections: o.sections.map(s => s.id === sectionId ? { ...s, content: newContent } : s),
    })))
  }

  if (!project) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg)', fontFamily: 'var(--font-c)', color: 'var(--ink3)', fontSize: '13px' }}>
        読み込み中...
      </div>
    )
  }

  const currentVersion = versions.find(v => v.id === currentVersionId)
  const displayOutput = selectedAGId
    ? allOutputs.find(o => o.agentId === selectedAGId) ?? null
    : null

  const tickerItems = appStatus === 'running' && currentAG
    ? [{ text: 'WEB PROPOSAL AGENT' }, { text: `${currentAG} 実行中`, hot: true }, { text: project.title }, { text: `PHASE ${currentPhase} / 5`, hot: true }]
    : appStatus === 'checkpoint'
    ? [{ text: 'WEB PROPOSAL AGENT' }, { text: '✋ チェックポイント 待機中', hot: true }, { text: project.title }]
    : [{ text: 'WEB PROPOSAL AGENT' }, { text: project.title }, { text: project.client.name }]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <Ticker items={tickerItems} />
      <NavBar context={`${project.client.name} — ${project.title}`} />

      {/* Pipeline header */}
      <div style={{ padding: '14px 44px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '9px', fontFamily: 'var(--font-d)', fontSize: '9px', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
          <a href="/" style={{ color: 'var(--ink3)', textDecoration: 'none' }}>← 全案件</a>
          <span style={{ color: 'var(--ink4)' }}>/</span>
          <span style={{ color: 'var(--ink)' }}>{project.client.name}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {appStatus === 'running' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px', fontFamily: 'var(--font-d)', fontSize: '9px', fontWeight: 700, letterSpacing: '0.15em', color: 'var(--red)' }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--red)', animation: 'blink 1s ease-in-out infinite', display: 'inline-block' }} />
              LIVE
            </div>
          )}

          {/* Version dropdown */}
          {versions.length > 0 && (
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowVersionDropdown(p => !p)}
                style={{ display: 'flex', alignItems: 'center', gap: '7px', background: 'transparent', border: '1px solid var(--line2)', padding: '6px 12px', fontFamily: 'var(--font-d)', fontSize: '9px', fontWeight: 700, letterSpacing: '0.1em', color: 'var(--ink2)', cursor: 'pointer', borderRadius: '2px' }}
              >
                {currentVersion ? `v${currentVersion.versionNumber}${currentVersion.label ? ' ' + currentVersion.label : ''}` : 'バージョン'}
                <span style={{ fontSize: '8px' }}>▾</span>
              </button>
              {showVersionDropdown && (
                <div
                  style={{ position: 'absolute', right: 0, top: '100%', marginTop: '4px', minWidth: '220px', background: 'var(--bg)', border: '1px solid var(--line2)', boxShadow: '0 8px 24px rgba(28,28,23,0.1)', zIndex: 100 }}
                  onMouseLeave={() => setShowVersionDropdown(false)}
                >
                  {[...versions].reverse().map(v => (
                    <button
                      key={v.id}
                      onClick={() => { setCurrentVersionId(v.id); setShowVersionDropdown(false) }}
                      style={{
                        width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '12px 14px', background: v.id === currentVersionId ? 'var(--bg2)' : 'transparent',
                        border: 'none', borderBottom: '1px solid var(--line)', fontFamily: 'var(--font-c)', fontSize: '12px', color: 'var(--ink)', cursor: 'pointer',
                      }}
                    >
                      <span>v{v.versionNumber} {v.label ?? '初回提案'}</span>
                      <span style={{ fontSize: '9px', color: statusColor(v.status), fontFamily: 'var(--font-d)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{statusLabel(v.status)}</span>
                    </button>
                  ))}
                  <div style={{ padding: '10px 14px', borderTop: '1px solid var(--line)' }}>
                    <button
                      style={{ width: '100%', background: 'var(--ink)', color: 'var(--bg)', fontFamily: 'var(--font-d)', fontSize: '8px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', padding: '9px', border: 'none', cursor: 'pointer' }}
                      onClick={() => { setShowVersionDropdown(false) }}
                    >
                      + このバージョンを更新
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Pipeline body */}
      <div style={{ display: 'grid', gridTemplateColumns: '290px 1fr', flex: 1, minHeight: 0 }}>

        {/* Agent Rail */}
        <div style={{ borderRight: '1px solid var(--line)', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid var(--line)', fontFamily: 'var(--font-i)', fontSize: '11px', fontStyle: 'italic', color: 'var(--ink3)' }}>
            エージェント進行状況
          </div>
          {AG_LIST.map(ag => {
            const isDone = completedAGs.includes(ag.id)
            const isActive = currentAG === ag.id
            const isSelected = selectedAGId === ag.id
            const isPending = !isDone && !isActive

            return (
              <div
                key={ag.id}
                onClick={() => isDone && setSelectedAGId(prev => prev === ag.id ? null : ag.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '13px',
                  padding: '17px 22px', borderBottom: '1px solid var(--line)',
                  position: 'relative', opacity: isPending ? 0.35 : 1,
                  background: isSelected ? 'var(--red2)' : isActive ? 'var(--bg2)' : 'transparent',
                  cursor: isDone ? 'pointer' : 'default',
                }}
              >
                {(isActive || isSelected) && <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '2px', background: isSelected ? 'var(--red)' : 'var(--red)' }} />}
                <div style={{
                  width: '32px', height: '32px',
                  border: `1px solid ${isDone ? 'var(--ink)' : isActive ? 'var(--red)' : 'var(--line2)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--font-d)', fontSize: isDone ? '12px' : '9px', fontWeight: 700,
                  color: isDone ? 'var(--bg)' : isActive ? '#fff' : 'var(--ink3)',
                  flexShrink: 0, borderRadius: '2px',
                  background: isDone ? 'var(--ink)' : isActive ? 'var(--red)' : 'transparent',
                }}>
                  {isDone ? '✓' : ag.id.replace('AG-', '')}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--font-c)', fontSize: '9px', color: 'var(--ink3)', letterSpacing: '0.07em', marginBottom: '3px' }}>{ag.id}</div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ag.name}</div>
                  <div style={{ fontFamily: 'var(--font-c)', fontSize: '10px', color: isActive ? 'var(--red)' : 'var(--ink3)', marginTop: '2px' }}>
                    {isSelected ? '← 参照中' : isDone ? '完了 — クリックで参照' : isActive ? '実行中...' : '待機中'}
                  </div>
                </div>
              </div>
            )
          })}

          <div style={{ padding: '16px 22px', marginTop: 'auto' }}>
            <button
              onClick={startPipeline}
              disabled={appStatus === 'running'}
              style={{
                width: '100%',
                background: appStatus === 'running' ? 'var(--bg2)' : 'var(--ink)',
                color: appStatus === 'running' ? 'var(--ink4)' : 'var(--bg)',
                border: appStatus === 'running' ? '1px solid var(--line2)' : 'none',
                fontFamily: 'var(--font-d)', fontSize: '8px', fontWeight: 700,
                letterSpacing: '0.15em', textTransform: 'uppercase',
                padding: '11px', cursor: appStatus === 'running' ? 'not-allowed' : 'pointer',
                borderRadius: '2px',
              }}
            >
              {appStatus === 'running' ? '実行中...' : 'フルパイプライン実行 →'}
            </button>
            {statusMessages.length > 0 && (
              <div style={{ marginTop: '10px' }}>
                {statusMessages.slice(-5).map((m, i) => (
                  <p key={i} style={{ fontFamily: 'var(--font-c)', fontSize: '10px', color: 'var(--ink3)', marginBottom: '3px', lineHeight: 1.5 }}>{m}</p>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Output panel */}
        <div style={{ display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>

          {/* Output top bar */}
          <div style={{ padding: '26px 40px 20px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexShrink: 0 }}>
            <div>
              <div style={{ fontFamily: 'var(--font-d)', fontSize: '32px', fontWeight: 900, letterSpacing: '-0.025em', textTransform: 'uppercase', lineHeight: 1, color: 'var(--ink)' }}>
                {selectedAGId ?? (currentAG ?? (allOutputs.length > 0 ? allOutputs[allOutputs.length - 1].agentId : 'OUTPUT'))}
              </div>
              {project && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginTop: '8px', fontFamily: 'var(--font-c)', fontSize: '11.5px', color: 'var(--ink3)' }}>
                  {project.title}
                  <span style={{ background: 'var(--bg2)', border: '1px solid var(--line2)', borderRadius: '99px', padding: '2px 10px', fontSize: '10px', color: 'var(--ink2)' }}>
                    {project.industryType}
                  </span>
                </div>
              )}
            </div>
            {currentVersionId && appStatus === 'completed' && (
              <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                <button
                  onClick={() => setShowSlides(true)}
                  style={{ background: 'var(--ink)', color: 'var(--bg)', fontFamily: 'var(--font-d)', fontSize: '8px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', padding: '8px 14px', border: 'none', cursor: 'pointer', borderRadius: '2px' }}
                >
                  スライドプレビュー
                </button>
                <a
                  href={`/api/executions/${currentVersionId}/export`}
                  download
                  style={{ background: 'transparent', border: '1px solid var(--line2)', color: 'var(--ink2)', fontFamily: 'var(--font-d)', fontSize: '8px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', padding: '8px 14px', cursor: 'pointer', borderRadius: '2px', textDecoration: 'none', display: 'inline-block' }}
                >
                  MD
                </a>
              </div>
            )}
          </div>

          {/* Thinking state */}
          {appStatus === 'running' && currentAG && (
            <div style={{ padding: '26px 40px', borderBottom: '1px solid var(--line)', background: 'var(--bg2)', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '13px' }}>
                <span style={{ fontFamily: 'var(--font-i)', fontSize: '11px', fontStyle: 'italic', color: 'var(--red)', letterSpacing: '0.05em' }}>分析中</span>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {[0, 0.2, 0.4].map((delay, i) => (
                    <span key={i} style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--red)', opacity: 0.4, animation: `td 1.4s ease-in-out ${delay}s infinite`, display: 'inline-block' }} />
                  ))}
                </div>
              </div>
              <div style={{ fontFamily: 'var(--font-c)', fontSize: '13px', lineHeight: 1.85, color: 'var(--ink2)', fontStyle: 'italic', maxWidth: '580px' }}>
                {statusMessages[statusMessages.length - 1] ?? `${currentAG} を実行中...`}
                <span style={{ display: 'inline-block', width: '2px', height: '13px', background: 'var(--red)', verticalAlign: 'middle', marginLeft: '1px', animation: 'cur 1s step-end infinite' }} />
              </div>
            </div>
          )}

          {/* Checkpoint waiting banner */}
          {appStatus === 'checkpoint' && (
            <div style={{ padding: '14px 40px', background: '#FFF8D6', borderBottom: '1px solid #E8C44A', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <div>
                <div style={{ fontFamily: 'var(--font-d)', fontSize: '9px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#7A5F00', marginBottom: '3px' }}>✋ あなたの操作が必要です</div>
                <div style={{ fontFamily: 'var(--font-c)', fontSize: '11px', color: '#5A4700' }}>結果を確認して次のフェーズへ進んでください</div>
              </div>
              <button onClick={() => setShowCheckpointModal(true)} style={{ background: '#E8C44A', color: '#4A3800', fontFamily: 'var(--font-d)', fontSize: '9px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', padding: '10px 20px', border: 'none', cursor: 'pointer', borderRadius: '2px', whiteSpace: 'nowrap' }}>
                確認・次へ →
              </button>
            </div>
          )}

          {/* Selected AG output (rail click) */}
          {selectedAGId && displayOutput && (
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <div style={{ padding: '14px 40px', background: 'var(--red2)', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                <span style={{ fontFamily: 'var(--font-c)', fontSize: '11px', color: 'var(--ink2)' }}>{selectedAGId} — 参照モード</span>
                <button onClick={() => setSelectedAGId(null)} style={{ background: 'none', border: 'none', fontFamily: 'var(--font-c)', fontSize: '11px', color: 'var(--ink3)', cursor: 'pointer' }}>✕ 閉じる</button>
              </div>
              <OutputSection output={displayOutput} onEdit={handleSectionEdit} />
            </div>
          )}

          {/* Empty state */}
          {appStatus === 'idle' && allOutputs.length === 0 && !selectedAGId && (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg2)' }}>
              <div style={{ textAlign: 'center', maxWidth: '360px', padding: '40px' }}>
                <div style={{ fontFamily: 'var(--font-d)', fontSize: '32px', marginBottom: '20px', color: 'var(--ink4)' }}>▶</div>
                <h3 style={{ fontFamily: 'var(--font-d)', fontSize: '14px', fontWeight: 900, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '12px', color: 'var(--ink)' }}>
                  AG-01 インテークを実行してください
                </h3>
                <p style={{ fontFamily: 'var(--font-c)', fontSize: '13px', lineHeight: 1.75, color: 'var(--ink3)', marginBottom: '28px' }}>
                  案件情報の整理・AG推奨・仮説設定を行います<br />所要時間: 約10〜30秒
                </p>
                <button onClick={startPipeline} style={{ background: 'var(--ink)', color: 'var(--bg)', fontFamily: 'var(--font-d)', fontSize: '9px', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', padding: '14px 28px', border: 'none', cursor: 'pointer', borderRadius: '2px' }}>
                  フルパイプライン実行 →
                </button>
              </div>
            </div>
          )}

          {/* Error state */}
          {appStatus === 'error' && errorMessage && (
            <div style={{ margin: '24px 40px', padding: '16px 20px', background: 'rgba(230,48,34,0.07)', border: '1px solid var(--red)', borderRadius: '2px', flexShrink: 0 }}>
              <div style={{ fontFamily: 'var(--font-d)', fontSize: '9px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--red)', marginBottom: '6px' }}>エラー</div>
              <p style={{ fontFamily: 'var(--font-c)', fontSize: '13px', color: 'var(--ink2)', lineHeight: 1.6 }}>{errorMessage}</p>
              <button onClick={startPipeline} style={{ marginTop: '12px', background: 'var(--ink)', color: 'var(--bg)', fontFamily: 'var(--font-d)', fontSize: '8px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', padding: '9px 18px', border: 'none', cursor: 'pointer', borderRadius: '2px' }}>
                再試行
              </button>
            </div>
          )}

          {/* Completed outputs */}
          {!selectedAGId && allOutputs.length > 0 && (
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {allOutputs.map(output => (
                <OutputSection key={output.agentId} output={output} onEdit={handleSectionEdit} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Pipeline footer */}
      <div style={{ padding: '14px 40px', borderTop: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg)', flexShrink: 0 }}>
        <div style={{ display: 'flex' }}>
          {PHASE_LABELS.map((label, i) => {
            const phase = i + 1
            const isDone = currentPhase > phase
            const isCur = currentPhase === phase
            return (
              <div key={i} style={{ padding: '7px 14px', fontFamily: 'var(--font-d)', fontSize: '8px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: isDone ? 'var(--ink)' : isCur ? 'var(--bg)' : 'var(--ink3)', border: `1px solid ${isDone ? 'var(--ink4)' : isCur ? 'var(--ink)' : 'var(--line)'}`, background: isCur ? 'var(--ink)' : 'transparent', marginRight: '-1px', display: 'flex', alignItems: 'center', gap: '6px', zIndex: isCur ? 2 : isDone ? 1 : 0, position: 'relative' }}>
                <span style={{ fontSize: '10px' }}>{phase}</span>
                {label}
              </div>
            )
          })}
        </div>
        <button
          disabled={appStatus !== 'checkpoint'}
          onClick={() => setShowCheckpointModal(true)}
          style={{ background: appStatus === 'checkpoint' ? '#E8C44A' : 'var(--bg2)', color: appStatus === 'checkpoint' ? '#4A3800' : 'var(--ink4)', border: appStatus === 'checkpoint' ? 'none' : '1px solid var(--line2)', fontFamily: 'var(--font-d)', fontSize: '9px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', padding: '11px 22px', cursor: appStatus === 'checkpoint' ? 'pointer' : 'not-allowed', borderRadius: '2px' }}
        >
          {appStatus === 'checkpoint' ? '✋ 確認後に進む →' : '次のフェーズへ →'}
        </button>
      </div>

      {/* Slide Preview */}
      {showSlides && currentVersionId && (
        <TableOfContents versionId={currentVersionId} onClose={() => setShowSlides(false)} />
      )}

      {/* Checkpoint Modal */}
      {showCheckpointModal && checkpointState && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(252,251,239,0.86)', backdropFilter: 'blur(5px)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={e => { if (e.target === e.currentTarget) setShowCheckpointModal(false) }}
        >
          <div style={{ width: '700px', maxHeight: '90vh', background: 'var(--bg)', border: '1px solid var(--line2)', boxShadow: '0 28px 72px rgba(28,28,23,0.11)', overflowY: 'auto', position: 'relative' }}>
            <div style={{ position: 'absolute', top: '-8px', right: '40px', width: '14px', height: '14px', borderRadius: '50%', background: 'var(--dot-b)', opacity: 0.6 }} />
            <div style={{ position: 'absolute', bottom: '-6px', left: '56px', width: '9px', height: '9px', borderRadius: '50%', background: 'var(--dot-g)', opacity: 0.7 }} />

            {/* Modal header */}
            <div style={{ padding: '26px 30px 22px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontFamily: 'var(--font-i)', fontSize: '11px', fontStyle: 'italic', color: 'var(--red)', letterSpacing: '0.04em', marginBottom: '7px' }}>
                  ✋ チェックポイント {checkpointState.phase === 1 ? '①' : checkpointState.phase === 2 ? '②' : checkpointState.phase === 3 ? '③' : '④'}
                </div>
                <div style={{ fontFamily: 'var(--font-d)', fontSize: '22px', fontWeight: 900, letterSpacing: '-0.02em', textTransform: 'uppercase', lineHeight: 1 }}>
                  {checkpointState.phase === 1 ? 'AG選択・確認' : checkpointState.phase === 2 ? '市場/競合分析 確認' : checkpointState.phase === 3 ? '課題/ファクト 確認' : '設計/草案 完了'}
                </div>
              </div>
              <button onClick={() => setShowCheckpointModal(false)} style={{ background: 'none', border: 'none', fontSize: '17px', color: 'var(--ink3)', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ padding: '22px 30px' }}>

              {/* Phase 1: AG selector */}
              {checkpointState.phase === 1 && (
                <>
                  <p style={{ fontFamily: 'var(--font-c)', fontSize: '13px', color: 'var(--ink3)', lineHeight: 1.75, marginBottom: '22px' }}>
                    AG-01のインテーク結果をもとに使用するエージェントを確認・選択してください。
                  </p>
                  <div style={{ fontFamily: 'var(--font-d)', fontSize: '8.5px', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--ink3)', marginBottom: '11px' }}>
                    大分類AG <span style={{ fontWeight: 400, color: 'var(--red)' }}>必須 · 1つ</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '22px' }}>
                    {PRIMARY_OPTIONS.map(opt => (
                      <label key={opt.value} onClick={() => setSelectedPrimary(opt.value)} style={{ display: 'flex', alignItems: 'center', gap: '13px', padding: '13px 16px', border: `1px solid ${selectedPrimary === opt.value ? 'var(--red)' : 'var(--line)'}`, background: selectedPrimary === opt.value ? 'var(--red2)' : 'transparent', cursor: 'pointer', borderRadius: '2px' }}>
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
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '6px' }}>
                    {SUB_OPTIONS.map(opt => {
                      const isOn = selectedSub.includes(opt.value)
                      return (
                        <label key={opt.value} onClick={() => setSelectedSub(prev => isOn ? prev.filter(s => s !== opt.value) : [...prev, opt.value])} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', border: `1px solid ${isOn ? 'var(--red)' : 'var(--line)'}`, background: isOn ? 'var(--red2)' : 'transparent', cursor: 'pointer', borderRadius: '2px' }}>
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

              {/* Phase 2,3: Summary */}
              {checkpointState.phase >= 2 && (
                <>
                  {/* 取れた情報 */}
                  {checkpointState.summary.gotInfo.length > 0 && (
                    <div style={{ marginBottom: '22px' }}>
                      <div style={{ fontFamily: 'var(--font-d)', fontSize: '8.5px', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--ink3)', marginBottom: '11px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ color: 'var(--dot-g)' }}>✅</span> 取れた情報
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {checkpointState.summary.gotInfo.slice(0, 6).map((item, i) => (
                          <div key={i} style={{ display: 'flex', gap: '12px', padding: '11px 14px', background: 'var(--bg2)', borderLeft: `3px solid ${CONFIDENCE_COLOR[item.confidence] ?? 'var(--line2)'}` }}>
                            <span style={{ fontFamily: 'var(--font-d)', fontSize: '8px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: CONFIDENCE_COLOR[item.confidence], flexShrink: 0, marginTop: '2px' }}>{item.confidence}</span>
                            <div>
                              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ink)', marginBottom: '3px' }}>{item.title}</div>
                              {item.summary && <div style={{ fontFamily: 'var(--font-c)', fontSize: '11px', color: 'var(--ink3)', lineHeight: 1.6 }}>{item.summary}</div>}
                              <div style={{ fontFamily: 'var(--font-d)', fontSize: '8px', color: 'var(--ink4)', marginTop: '4px', letterSpacing: '0.06em' }}>{item.source}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ヒアリング項目 */}
                  {checkpointState.summary.missingInfo.length > 0 && (
                    <div style={{ marginBottom: '22px' }}>
                      <div style={{ fontFamily: 'var(--font-d)', fontSize: '8.5px', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--ink3)', marginBottom: '11px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>❓</span> 取れなかった情報 → ヒアリング項目
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {checkpointState.summary.missingInfo.slice(0, 5).map((item, i) => (
                          <div key={i} style={{ padding: '12px 14px', border: '1px solid var(--line2)', borderRadius: '2px' }}>
                            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ink)', marginBottom: '4px' }}>{item.item}</div>
                            {item.reason && <div style={{ fontFamily: 'var(--font-c)', fontSize: '11px', color: 'var(--ink3)', marginBottom: '8px', lineHeight: 1.5 }}>{item.reason}</div>}
                            <input
                              placeholder="確認した内容を入力..."
                              value={cdNotes[`missing-${i}`] ?? ''}
                              onChange={e => setCdNotes(prev => ({ ...prev, [`missing-${i}`]: e.target.value }))}
                              style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid var(--line2)', padding: '6px 0', fontSize: '12px', fontFamily: 'var(--font-c)', color: 'var(--ink)', outline: 'none' }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 判断 */}
                  <div style={{ padding: '16px', background: 'var(--bg2)', borderRadius: '2px', marginBottom: '6px' }}>
                    <div style={{ fontFamily: 'var(--font-d)', fontSize: '8.5px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--ink3)', marginBottom: '10px' }}>判断してください</div>
                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
                      <div style={{ width: '14px', height: '14px', borderRadius: '50%', border: '2px solid var(--ink)', background: 'var(--ink)', flexShrink: 0, marginTop: '2px' }} />
                      <span style={{ fontFamily: 'var(--font-c)', fontSize: '12px', color: 'var(--ink)', lineHeight: 1.5 }}>このまま次へ進む（ヒアリング項目は後で更新可）</span>
                    </label>
                  </div>
                </>
              )}
            </div>

            {/* Modal footer */}
            <div style={{ padding: '16px 30px 22px', borderTop: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
              <button
                onClick={handleCheckpointConfirm}
                style={{ background: 'var(--ink)', color: 'var(--bg)', fontFamily: 'var(--font-d)', fontSize: '9px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', padding: '13px 26px', border: 'none', cursor: 'pointer', borderRadius: '2px', whiteSpace: 'nowrap' }}
              >
                {checkpointState.phase === 1 ? 'この選択で実行する →' : checkpointState.phase < 4 ? '次のフェーズへ進む →' : '完了 — 提案書を確認する →'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function statusLabel(s: string) {
  if (s === 'RUNNING') return '実行中'
  if (s === 'CHECKPOINT') return '確認待ち'
  if (s === 'COMPLETED') return '完了'
  if (s === 'ERROR') return 'エラー'
  return 'Draft'
}

function statusColor(s: string) {
  if (s === 'RUNNING') return 'var(--red)'
  if (s === 'CHECKPOINT') return '#E8C44A'
  if (s === 'COMPLETED') return 'var(--dot-g)'
  if (s === 'ERROR') return 'var(--red)'
  return 'var(--ink3)'
}

function OutputSection({ output, onEdit }: { output: AgentOutput; onEdit: (id: string, content: string) => void }) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div style={{ borderBottom: '1px solid var(--line)' }}>
      <div onClick={() => setCollapsed(p => !p)} style={{ padding: '22px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '9px', fontFamily: 'var(--font-d)', fontSize: '9.5px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--ink)' }}>
          <span style={{ width: '17px', height: '17px', background: 'var(--ink)', color: 'var(--bg)', fontSize: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '2px', flexShrink: 0 }}>
            {output.agentId.replace('AG-', '')}
          </span>
          {output.agentId} — 完了
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontFamily: 'var(--font-d)', fontSize: '8px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '3px 9px', borderRadius: '99px', background: 'var(--bg2)', border: '1px solid var(--line2)', color: 'var(--ink3)' }}>
            Conf: {output.metadata?.confidence ?? '—'}
          </span>
          <span style={{ color: 'var(--ink3)', fontSize: '12px' }}>{collapsed ? '▸' : '▾'}</span>
        </div>
      </div>
      {!collapsed && output.sections?.map(section => (
        <SectionItem key={section.id} section={section} onEdit={onEdit} />
      ))}
    </div>
  )
}

function SectionItem({ section, onEdit }: { section: Section; onEdit: (id: string, content: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(section.content)

  return (
    <div style={{ padding: '14px 40px 16px 60px', borderTop: '1px solid var(--line)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '8px' }}>
        <div style={{ fontFamily: 'var(--font-c)', fontSize: '11px', fontWeight: 600, color: 'var(--ink2)' }}>{section.title}</div>
        <button onClick={() => setEditing(p => !p)} style={{ background: 'none', border: 'none', fontFamily: 'var(--font-d)', fontSize: '8px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink3)', cursor: 'pointer', flexShrink: 0 }}>
          {editing ? '×' : '編集'}
        </button>
      </div>
      {editing ? (
        <div>
          <textarea
            value={value}
            onChange={e => setValue(e.target.value)}
            style={{ width: '100%', minHeight: '100px', background: 'var(--bg2)', border: '1px solid var(--line2)', padding: '10px', fontFamily: 'var(--font-c)', fontSize: '12px', color: 'var(--ink)', lineHeight: 1.7, resize: 'vertical', outline: 'none' }}
          />
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            <button onClick={() => { onEdit(section.id, value); setEditing(false) }} style={{ background: 'var(--ink)', color: 'var(--bg)', fontFamily: 'var(--font-d)', fontSize: '8px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '7px 14px', border: 'none', cursor: 'pointer', borderRadius: '2px' }}>保存</button>
            <button onClick={() => { setValue(section.content); setEditing(false) }} style={{ background: 'transparent', border: '1px solid var(--line2)', color: 'var(--ink3)', fontFamily: 'var(--font-d)', fontSize: '8px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '7px 14px', cursor: 'pointer', borderRadius: '2px' }}>キャンセル</button>
          </div>
        </div>
      ) : (
        <p style={{ fontFamily: 'var(--font-c)', fontSize: '12.5px', color: 'var(--ink2)', lineHeight: 1.8 }}>{value}</p>
      )}
    </div>
  )
}
