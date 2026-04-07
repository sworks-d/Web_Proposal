'use client'
import { useState, useEffect, use } from 'react'
import { AgentOutput, PipelineConfig, Section } from '@/agents/types'
import { buildCheckpointSummary, GotInfoItem, MissingInfoItem } from '@/lib/checkpoint-summary'
import Ticker from '@/components/layout/Ticker'
import NavBar from '@/components/layout/NavBar'
import TableOfContents from '@/components/proposal/TableOfContents'
import { FeedbackModal } from '@/components/feedback/FeedbackModal'
import { OutputPanel, VersionExecution } from '@/components/pipeline/OutputPanel'
import { ExecutionStats } from '@/components/pipeline/ExecutionStats'
import { SlideGeneratorPanel } from '@/components/slides/SlideGeneratorPanel'

interface FullVersion {
  id: string
  status: string
  executions: VersionExecution[]
}

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
  changeReason: string | null
  createdAt: string
  completedAt: string | null
}

type AppStatus = 'idle' | 'running' | 'checkpoint' | 'error' | 'completed'

type CheckpointState = {
  versionId: string
  phase: 1 | 2 | 3 | 4
  gotInfo: GotInfoItem[]
  missingInfo: MissingInfoItem[]
} | null

const AG_LIST = [
  { id: 'AG-01',            name: 'インテーク担当',               badge: '01' },
  { id: 'AG-01-RESEARCH',   name: '会社情報リサーチ',             badge: 'RES' },
  { id: 'AG-01-MERGE',      name: 'インテーク統合',               badge: '1M' },
  { id: 'AG-02',            name: '市場骨格分析',                 badge: '02' },
  { id: 'AG-02-STP',        name: 'STPセグメンテーション',        badge: 'STP' },
  { id: 'AG-02-JOURNEY',    name: 'カスタマージャーニー',         badge: 'JNY' },
  { id: 'AG-02-VPC',        name: 'バリュープロポジション',       badge: 'VPC' },
  { id: 'AG-02-POSITION',   name: '4軸ポジショニング',            badge: 'POS' },
  { id: 'AG-02-MERGE',      name: '市場分析統合',                 badge: 'M02' },
  { id: 'AG-03',            name: '競合特定・ポジション',         badge: '03' },
  { id: 'AG-03-HEURISTIC',  name: 'ヒューリスティック（上位2社）', badge: 'H1' },
  { id: 'AG-03-HEURISTIC2', name: 'ヒューリスティック（残競合）', badge: 'H2' },
  { id: 'AG-03-GAP',        name: 'コンテンツギャップ',           badge: 'GAP' },
  { id: 'AG-03-DATA',       name: 'GA4・SC分析',                  badge: 'DAT' },
  { id: 'AG-03-MERGE',      name: '競合分析統合',                 badge: 'M03' },
  { id: 'AG-04-MAIN',       name: '5Whys・HMW',                   badge: '4M' },
  { id: 'AG-04-INSIGHT',    name: 'インサイト・JTBD',             badge: '04' },
  { id: 'AG-04-MERGE',      name: '課題定義統合',                 badge: 'M04' },
  { id: 'AG-05',            name: 'ファクトチェック',             badge: '05' },
  { id: 'AG-06',            name: '設計草案',                     badge: '06' },
  { id: 'AG-07A',           name: '設計根拠ライター',             badge: '7A' },
  { id: 'AG-07B',           name: 'リファレンス戦略',             badge: '7B' },
  { id: 'AG-07C-1',         name: '素材セット Ch.01-02',          badge: 'C1' },
  { id: 'AG-07C-2',         name: '素材セット Ch.03-04',          badge: 'C2' },
  { id: 'AG-07C-3',         name: '素材セット Ch.05-06',          badge: 'C3' },
  { id: 'AG-07C-4',         name: '素材サマリー',                 badge: 'C4' },
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
  const [version, setVersion] = useState<FullVersion | null>(null)
  const [appStatus, setAppStatus] = useState<AppStatus>('idle')
  const [currentAG, setCurrentAG] = useState<string | null>(null)
  const [completedAGs, setCompletedAGs] = useState<string[]>([])
  const [allOutputs, setAllOutputs] = useState<AgentOutput[]>([])
  const [checkpointState, setCheckpointState] = useState<CheckpointState>(null)
  const [statusMessages, setStatusMessages] = useState<string[]>([])
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [selectedPrimary, setSelectedPrimary] = useState('ag-02-recruit')
  const [selectedSub, setSelectedSub] = useState<string[]>([])
  const [currentPhase, setCurrentPhase] = useState(0)
  const [selectedAGId, setSelectedAGId] = useState<string | null>(null)
  const [cdNotes, setCdNotes] = useState<Record<string, string>>({})
  const [showVersionDropdown, setShowVersionDropdown] = useState(false)
  const [showSlides, setShowSlides] = useState(false)
  const [showFeedback, setShowFeedback] = useState(false)
  const [showSgPanel, setShowSgPanel] = useState(false)
  const [feedbackDone, setFeedbackDone] = useState(false)
  const [agentStatuses, setAgentStatuses] = useState<Record<string, 'running' | 'completed' | 'failed' | 'skipped'>>({})
  const [restarting, setRestarting] = useState(false)
  const [stopping, setStopping] = useState(false)
  const [executionMode, setExecutionMode] = useState<'precision' | 'standard'>('standard')

  useEffect(() => {
    fetch(`/api/projects/${id}`).then(r => r.json()).then(setProject).catch(() => {})
    fetch(`/api/projects/${id}/versions`).then(r => r.json()).then((vs: VersionSummary[]) => {
      setVersions(vs)
      const active = vs.find(v => ['RUNNING', 'CHECKPOINT', 'DRAFT'].includes(v.status)) ?? vs[vs.length - 1]
      if (active) {
        setCurrentVersionId(active.id)
        if (active.status === 'CHECKPOINT') setAppStatus('checkpoint')
        else if (active.status === 'ERROR') { setAppStatus('error'); setErrorMessage('前回の実行でエラーが発生しました。') }
        else if (active.status === 'RUNNING') { setAppStatus('error'); setErrorMessage('前回の実行が中断されました（タイムアウトまたはサーバー再起動）。停止したところから再開できます。') }
        else if (active.status === 'COMPLETED') setAppStatus('completed')
      }
    }).catch(() => {})
  }, [id])

  // Load version data (executions + results) when currentVersionId changes
  useEffect(() => {
    if (!currentVersionId) return
    fetch(`/api/versions/${currentVersionId}`)
      .then(r => r.ok ? r.json() : null)
      .then((v: FullVersion | null) => { if (v) setVersion(v) })
      .catch(() => {})
  }, [currentVersionId])

  const refreshVersion = () => {
    if (!currentVersionId) return
    fetch(`/api/versions/${currentVersionId}`)
      .then(r => r.ok ? r.json() : null)
      .then((v: FullVersion | null) => { if (v) setVersion(v) })
      .catch(() => {})
  }

  // Auto-scroll right panel when selectedAGId changes
  useEffect(() => {
    if (!selectedAGId) return
    setTimeout(() => {
      document.getElementById(`ag-section-${selectedAGId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 50)
  }, [selectedAGId])

  const addStatus = (msg: string) => setStatusMessages(prev => [...prev, msg])

  const startDownload = () => {
    if (!currentVersionId) return
    const a = document.createElement('a')
    a.href = `/api/executions/${currentVersionId}/export`
    a.download = ''
    a.click()
  }

  const handleDownloadClick = () => {
    if (!feedbackDone) {
      setShowFeedback(true)
    } else {
      startDownload()
    }
  }

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
          if (event.type === 'agent_start') {
            setCurrentAG(event.agentId)
            setAgentStatuses(prev => ({ ...prev, [event.agentId]: 'running' }))
          } else if (event.type === 'agent_complete') {
            setAgentStatuses(prev => ({ ...prev, [event.agentId]: event.status }))
            if (event.status !== 'skipped') setCurrentAG(null)
          } else if (event.type === 'status') {
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
            setCheckpointState({ versionId: vId, phase: event.phase, gotInfo: summary.gotInfo, missingInfo: summary.missingInfo })

            if (event.phase === 1) {
              setSelectedPrimary('ag-02-recruit')
              setSelectedSub([])
            }

            setAppStatus('checkpoint')
            // Refresh version list + version data (to show completed AG outputs)
            fetch(`/api/projects/${id}/versions`).then(r => r.json()).then(setVersions).catch(() => {})
            refreshVersion()
          } else if (event.type === 'pipeline_complete') {
            setAppStatus('completed')
            setCurrentAG(null)
            setCurrentPhase(5)
            fetch(`/api/projects/${id}/versions`).then(r => r.json()).then(setVersions).catch(() => {})
            refreshVersion()
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
    setAgentStatuses({})

    const industryMap: Record<string, string> = {
      recruitment: 'ag-02-recruit', btob: 'ag-02-btob', ec: 'ag-02-ec',
      corporate: 'ag-02-corp', campaign: 'ag-02-camp', general: 'ag-02-general',
    }
    const primaryAgent = (industryMap[project.industryType] ?? 'ag-02-general') as PipelineConfig['primaryAgent']
    const config: PipelineConfig = { mode: 'full', primaryAgent, subAgents: [], executionMode }

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
    if (!checkpointState && !currentVersionId) return
    const vIdForResume = checkpointState?.versionId ?? currentVersionId!
    if (!checkpointState) {
      // エラーからの再開：checkpointStateなしで直接resume
      setAppStatus('running')
      setErrorMessage(null)
      addStatus('中断箇所から再開しています...')
      try {
        const res = await fetch(`/api/executions/${vIdForResume}/resume`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ executionMode }),
        })
        if (!res.ok) { setErrorMessage(`${res.status}: ${(await res.text()).slice(0, 200)}`); setAppStatus('error'); return }
        await consumeSSE(res)
      } catch (err) { setErrorMessage(err instanceof Error ? err.message : String(err)); setAppStatus('error') }
      return
    }
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
        body: JSON.stringify({ agentSelection, executionMode }),
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

  const handleStop = async () => {
    if (!currentVersionId || stopping) return
    setStopping(true)
    try {
      await fetch(`/api/executions/${currentVersionId}/stop`, { method: 'POST' })
    } catch {}
    setStopping(false)
  }

  const handleRestart = async (fromAgentId?: string) => {
    if (!currentVersionId) return
    const msg = fromAgentId
      ? `${fromAgentId} 以降の結果を削除してここから再実行しますか？`
      : '全ての実行結果を削除して最初からやり直しますか？'
    if (!confirm(msg)) return
    setRestarting(true)
    try {
      await fetch(`/api/executions/${currentVersionId}/restart`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fromAgentId ? { fromAgentId } : {}),
      })
      setAppStatus('idle')
      setAgentStatuses({})
      setCompletedAGs([])
      setAllOutputs([])
      setErrorMessage(null)
      setStatusMessages([])
    } catch {}
    setRestarting(false)
  }

  const handleSectionEdit = (sectionId: string, newContent: string) => {
    setAllOutputs(prev => prev.map(o => ({
      ...o,
      sections: o.sections.map(s => s.id === sectionId ? { ...s, content: newContent } : s),
    })))
  }

  const handleRerunSection = async (agentId: string, sectionId: string | undefined, instruction: string) => {
    if (!currentVersionId) return
    addStatus(`${agentId} を再実行中...`)
    const res = await fetch(`/api/executions/${currentVersionId}/rerun-section`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId, sectionId, instruction }),
    })
    if (!res.ok) {
      addStatus(`再実行エラー: ${await res.text()}`)
      return
    }
    const { result } = await res.json()
    addStatus(`${agentId} 再実行完了`)
    setAllOutputs(prev => prev.map(o => o.agentId === agentId ? result : o))
    refreshVersion()
  }

  if (!project) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg)', fontFamily: 'var(--font-c)', color: 'var(--ink3)', fontSize: '13px' }}>
        読み込み中...
      </div>
    )
  }

  const currentVersion = versions.find(v => v.id === currentVersionId)

  // Merge completedAGs from SSE state + loaded version executions
  const versionCompletedAGs = (version?.executions ?? [])
    .filter(e => e.status === 'COMPLETED')
    .map(e => e.agentId)
  const effectiveCompletedAGs = Array.from(new Set([...completedAGs, ...versionCompletedAGs]))

  // Version executions for OutputPanel
  const versionExecutions: VersionExecution[] = version?.executions ?? []

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
                  style={{ position: 'absolute', right: 0, top: '100%', marginTop: '4px', minWidth: '320px', background: 'var(--bg)', border: '1px solid var(--line2)', boxShadow: '0 8px 24px rgba(28,28,23,0.1)', zIndex: 100 }}
                  onMouseLeave={() => setShowVersionDropdown(false)}
                >
                  {[...versions].reverse().map(v => (
                    <button
                      key={v.id}
                      onClick={() => { setCurrentVersionId(v.id); setShowVersionDropdown(false) }}
                      style={{
                        width: '100%', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '4px',
                        padding: '12px 14px', background: v.id === currentVersionId ? 'var(--bg2)' : 'transparent',
                        border: 'none', borderBottom: '1px solid var(--line)', fontFamily: 'var(--font-c)', color: 'var(--ink)', cursor: 'pointer',
                      }}
                    >
                      {/* 1行目：バージョン番号 + ラベル + ステータス */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, fontFamily: 'var(--font-d)', letterSpacing: '0.04em' }}>
                          v{v.versionNumber}
                          {v.label && <span style={{ marginLeft: '6px', fontWeight: 400, fontSize: '12px' }}>{v.label}</span>}
                        </span>
                        <span style={{ fontSize: '9px', color: statusColor(v.status), fontFamily: 'var(--font-d)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{statusLabel(v.status)}</span>
                      </div>
                      {/* 2行目：更新概要（changeReason） */}
                      {v.changeReason && (
                        <div style={{ fontSize: '11px', color: 'var(--ink2)', lineHeight: 1.4, maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {v.changeReason}
                        </div>
                      )}
                      {/* 3行目：日時 */}
                      <div style={{ display: 'flex', gap: '10px', fontSize: '10px', color: 'var(--ink3, var(--ink2))' }}>
                        <span>作成 {formatDate(v.createdAt)}</span>
                        {v.completedAt && <span>完了 {formatDate(v.completedAt)}</span>}
                      </div>
                    </button>
                  ))}
                  <div style={{ padding: '10px 14px', borderTop: '1px solid var(--line)' }}>
                    <div style={{ marginBottom: '6px' }}>
                      <input
                        id="change-reason-input"
                        type="text"
                        placeholder="更新内容の概要（例：競合分析を追加）"
                        style={{
                          width: '100%', padding: '7px 8px', fontSize: '11px', border: '1px solid var(--line2)',
                          fontFamily: 'var(--font-c)', color: 'var(--ink)', background: 'var(--bg)',
                          boxSizing: 'border-box'
                        }}
                        onKeyDown={e => e.stopPropagation()}
                        onClick={e => e.stopPropagation()}
                      />
                    </div>
                    <button
                      style={{ width: '100%', background: 'var(--ink)', color: 'var(--bg)', fontFamily: 'var(--font-d)', fontSize: '8px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', padding: '9px', border: 'none', cursor: 'pointer' }}
                      onClick={async (e) => {
                        e.stopPropagation()
                        const input = document.getElementById('change-reason-input') as HTMLInputElement
                        const reason = input?.value?.trim()
                        if (!currentVersionId) return
                        setShowVersionDropdown(false)
                        // 新バージョンを作成
                        const res = await fetch(`/api/projects/${id}/versions`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            type: 'update',
                            parentVersionId: currentVersionId,
                            changeReason: reason || '手動更新',
                            label: reason ? reason.slice(0, 20) : undefined,
                            agentsToRerun: [],
                          }),
                        })
                        if (res.ok) {
                          const newVer = await res.json()
                          setVersions(prev => [...prev, { id: newVer.id, versionNumber: newVer.versionNumber, label: newVer.label, status: newVer.status, changeReason: newVer.changeReason, createdAt: newVer.createdAt, completedAt: newVer.completedAt }])
                          setCurrentVersionId(newVer.id)
                        }
                      }}
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
            const isDone = effectiveCompletedAGs.includes(ag.id)
            const isActive = currentAG === ag.id && !isDone
            const isSelected = selectedAGId === ag.id
            const isPending = !isDone && !isActive
            const hasDedup = isDone && hasDedupWarning(versionExecutions, ag.id)

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
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <div style={{
                    width: '32px', height: '32px',
                    border: `1px solid ${isDone ? 'var(--ink)' : isActive ? 'var(--red)' : 'var(--line2)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'var(--font-d)', fontSize: isDone ? '12px' : '9px', fontWeight: 700,
                    color: isDone ? 'var(--bg)' : isActive ? '#fff' : 'var(--ink3)',
                    borderRadius: '2px',
                    background: isDone ? 'var(--ink)' : isActive ? 'var(--red)' : 'transparent',
                  }}>
                    {isDone ? '✓' : ag.badge}
                  </div>
                  {hasDedup && (
                    <span title="重複出力の可能性" style={{ position: 'absolute', top: '-4px', right: '-4px', fontSize: '9px', color: '#E8A020', lineHeight: 1 }}>⚠</span>
                  )}
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
            {/* 実行モード選択 */}
            {appStatus !== 'running' && (
              <div style={{ marginBottom: '12px', border: '1px solid var(--line2)', borderRadius: '2px', overflow: 'hidden' }}>
                {(['standard', 'precision'] as const).map(m => (
                  <label
                    key={m}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: '8px',
                      padding: '10px 12px', cursor: 'pointer',
                      background: executionMode === m ? 'var(--bg2)' : 'transparent',
                      borderBottom: m === 'standard' ? '1px solid var(--line2)' : 'none',
                    }}
                  >
                    <input
                      type="radio"
                      name="executionMode"
                      value={m}
                      checked={executionMode === m}
                      onChange={() => setExecutionMode(m)}
                      style={{ marginTop: '2px', flexShrink: 0 }}
                    />
                    <div>
                      <div style={{ fontFamily: 'var(--font-d)', fontSize: '8px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink)' }}>
                        {m === 'standard' ? 'Standard（標準）' : 'Precision（高精度）'}
                      </div>
                      <div style={{ fontFamily: 'var(--font-s)', fontSize: '10px', color: 'var(--ink3)', marginTop: '2px' }}>
                        {m === 'standard' ? 'Web検索なし・高速・約$4' : 'Web検索あり・詳細分析・約$6'}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}
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
            {appStatus === 'running' && (
              <button
                onClick={handleStop}
                disabled={stopping}
                style={{
                  width: '100%', marginTop: '6px',
                  background: 'transparent',
                  color: 'var(--red)',
                  border: '1px solid var(--red)',
                  fontFamily: 'var(--font-d)', fontSize: '8px', fontWeight: 700,
                  letterSpacing: '0.15em', textTransform: 'uppercase',
                  padding: '9px', cursor: stopping ? 'not-allowed' : 'pointer',
                  borderRadius: '2px', opacity: stopping ? 0.5 : 1,
                }}
              >
                {stopping ? '停止中...' : '■ 停止'}
              </button>
            )}
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
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          {/* Output top bar */}
          <div style={{ padding: '16px 40px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ fontFamily: 'var(--font-d)', fontSize: '22px', fontWeight: 900, letterSpacing: '-0.025em', textTransform: 'uppercase', lineHeight: 1, color: 'var(--ink)' }}>
                {currentAG ?? (allOutputs.length > 0 ? 'OUTPUT' : 'OUTPUT')}
              </div>
              {project && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px', fontFamily: 'var(--font-c)', fontSize: '11px', color: 'var(--ink3)' }}>
                  <span style={{ color: 'var(--ink4)' }}>—</span>
                  {project.title}
                </div>
              )}
            </div>
            {currentVersionId && appStatus === 'completed' && (
              <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                <button
                  onClick={() => setShowSgPanel(true)}
                  style={{ background: 'var(--red)', color: '#fff', fontFamily: 'var(--font-d)', fontSize: '8px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', padding: '8px 16px', border: 'none', cursor: 'pointer', borderRadius: '2px' }}
                >
                  提案書を作成する →
                </button>
                <button
                  onClick={() => setShowSlides(true)}
                  style={{ background: 'var(--ink)', color: 'var(--bg)', fontFamily: 'var(--font-d)', fontSize: '8px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', padding: '8px 14px', border: 'none', cursor: 'pointer', borderRadius: '2px' }}
                >
                  スライドプレビュー
                </button>
                <button
                  onClick={() => currentVersionId && window.open(`/api/versions/${currentVersionId}/pdf`, '_blank')}
                  style={{ background: 'transparent', color: 'var(--ink2)', fontFamily: 'var(--font-d)', fontSize: '8px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', padding: '8px 14px', border: '1px solid var(--line2)', cursor: 'pointer', borderRadius: '2px' }}
                >
                  ↓ PDF
                </button>
                <button
                  onClick={handleDownloadClick}
                  style={{ background: 'transparent', border: '1px solid var(--line2)', color: 'var(--ink2)', fontFamily: 'var(--font-d)', fontSize: '8px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', padding: '8px 14px', cursor: 'pointer', borderRadius: '2px' }}
                >
                  ↓ MD
                </button>
              </div>
            )}
          </div>

          {/* Error state */}
          {appStatus === 'error' && errorMessage && (
            <div style={{ margin: '24px 40px', padding: '16px 20px', background: 'rgba(230,48,34,0.07)', border: '1px solid var(--red)', borderRadius: '2px', flexShrink: 0 }}>
              <div style={{ fontFamily: 'var(--font-d)', fontSize: '9px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--red)', marginBottom: '6px' }}>エラー</div>
              <p style={{ fontFamily: 'var(--font-c)', fontSize: '13px', color: 'var(--ink2)', lineHeight: 1.6 }}>{errorMessage}</p>
              <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                {currentVersionId && (
                  <button
                    onClick={handleCheckpointConfirm}
                    style={{ background: 'var(--ink)', color: 'var(--bg)', fontFamily: 'var(--font-d)', fontSize: '8px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', padding: '9px 18px', border: 'none', cursor: 'pointer', borderRadius: '2px' }}
                  >
                    ↺ 停止箇所から再開
                  </button>
                )}
                <button
                  onClick={() => handleRestart()}
                  disabled={restarting}
                  style={{ background: 'transparent', color: 'var(--ink3)', fontFamily: 'var(--font-d)', fontSize: '8px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', padding: '9px 18px', border: '1px solid var(--line2)', cursor: restarting ? 'not-allowed' : 'pointer', borderRadius: '2px' }}
                >
                  {restarting ? '...' : '最初からやり直す'}
                </button>
              </div>
            </div>
          )}

          {/* Agent progress（実行中・エラー時に表示） */}
          {(appStatus === 'running' || appStatus === 'error') && Object.keys(agentStatuses).length > 0 && (
            <div style={{ margin: '8px 40px 0', padding: '10px 14px', background: 'var(--bg2)', border: '1px solid var(--line)', borderRadius: '2px', flexShrink: 0 }}>
              {appStatus === 'error' && (
                <div style={{ fontFamily: 'var(--font-d)', fontSize: '8px', color: 'var(--ink3)', letterSpacing: '0.1em', marginBottom: '8px' }}>
                  各AGをクリックして、そこから再実行できます
                </div>
              )}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {Object.entries(agentStatuses).map(([agId, st]) => {
                  const isClickable = appStatus === 'error' && !restarting
                  return (
                    <span
                      key={agId}
                      title={isClickable ? `${agId} から再実行` : undefined}
                      onClick={isClickable ? () => handleRestart(agId) : undefined}
                      style={{
                        fontFamily: 'var(--font-d)', fontSize: '8px', fontWeight: 700, letterSpacing: '0.1em',
                        padding: '3px 8px', borderRadius: '2px',
                        background: st === 'completed' ? 'var(--dot-g)' : st === 'failed' ? 'var(--red)' : st === 'running' ? 'var(--ink)' : 'var(--line)',
                        color: st === 'skipped' ? 'var(--ink3)' : '#fff',
                        opacity: st === 'skipped' ? 0.5 : 1,
                        cursor: isClickable ? 'pointer' : 'default',
                        outline: isClickable && st === 'failed' ? '2px solid var(--red)' : 'none',
                        outlineOffset: '2px',
                      }}
                    >
                      {agId}
                    </span>
                  )
                })}
              </div>
            </div>
          )}

          {/* CHECKPOINT再開カード（リロード後：checkpointStateなし） */}
          {appStatus === 'checkpoint' && !checkpointState && currentVersionId && (
            <div style={{ margin: '24px 40px', padding: '18px 22px', background: 'rgba(232,196,74,0.08)', border: '1px solid #E8C44A', borderRadius: '2px', flexShrink: 0 }}>
              <div style={{ fontFamily: 'var(--font-d)', fontSize: '9px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#8A6800', marginBottom: '6px' }}>チェックポイント — 再開待ち</div>
              <p style={{ fontFamily: 'var(--font-c)', fontSize: '13px', color: 'var(--ink2)', lineHeight: 1.6, margin: 0 }}>
                前回の実行がチェックポイントで停止しています。下のボタンで次のフェーズに進めます。
              </p>
              <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                <button
                  onClick={handleCheckpointConfirm}
                  style={{ background: '#E8C44A', color: '#4A3800', fontFamily: 'var(--font-d)', fontSize: '8px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', padding: '9px 18px', border: 'none', cursor: 'pointer', borderRadius: '2px' }}
                >
                  次のフェーズへ →
                </button>
              </div>
            </div>
          )}

          <div style={{ flex: 1, minHeight: 0 }}>
            <OutputPanel
              versionExecutions={versionExecutions}
              currentAG={currentAG}
              appStatus={appStatus}
              statusMessages={statusMessages}
              selectedAgentId={selectedAGId}
              onAgSelect={agId => setSelectedAGId(prev => prev === agId ? null : agId)}
              checkpointState={checkpointState}
              primaryOptions={PRIMARY_OPTIONS}
              subOptions={SUB_OPTIONS}
              selectedPrimary={selectedPrimary}
              selectedSub={selectedSub}
              onPrimaryChange={setSelectedPrimary}
              onSubChange={setSelectedSub}
              cdNotes={cdNotes}
              onCdNoteChange={(key, val) => setCdNotes(prev => ({ ...prev, [key]: val }))}
              onCheckpointConfirm={handleCheckpointConfirm}
              onRerunSection={handleRerunSection}
            />
          </div>
          {/* 実行時間統計（完了時） */}
          {appStatus === 'completed' && currentVersionId && (
            <ExecutionStats versionId={currentVersionId} />
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
          onClick={handleCheckpointConfirm}
          style={{ background: appStatus === 'checkpoint' ? '#E8C44A' : 'var(--bg2)', color: appStatus === 'checkpoint' ? '#4A3800' : 'var(--ink4)', border: appStatus === 'checkpoint' ? 'none' : '1px solid var(--line2)', fontFamily: 'var(--font-d)', fontSize: '9px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', padding: '11px 22px', cursor: appStatus === 'checkpoint' ? 'pointer' : 'not-allowed', borderRadius: '2px' }}
        >
          {appStatus === 'checkpoint' ? '✋ 次のフェーズへ →' : '次のフェーズへ →'}
        </button>
      </div>

      {/* Slide Preview */}
      {showSlides && currentVersionId && (
        <TableOfContents versionId={currentVersionId} onClose={() => setShowSlides(false)} />
      )}

      {/* Feedback Modal */}
      {showFeedback && currentVersionId && (
        <FeedbackModal
          versionId={currentVersionId}
          chapters={[]}
          onComplete={() => { setShowFeedback(false); setFeedbackDone(true); startDownload() }}
          onSkip={() => { setShowFeedback(false); setFeedbackDone(true); startDownload() }}
        />
      )}

      {/* Slide Generator Panel */}
      {showSgPanel && currentVersionId && (
        <SlideGeneratorPanel
          versionId={currentVersionId}
          onClose={() => setShowSgPanel(false)}
        />
      )}
    </div>
  )
}

function hasDedupWarning(executions: VersionExecution[], agentId: string): boolean {
  const exec = executions.filter(e => e.agentId === agentId && e.status === 'COMPLETED').at(-1)
  const msg = exec?.results[0]?.parseErrorMessage
  return typeof msg === 'string' && msg.includes('[DEDUP]')
}

function statusLabel(s: string) {
  if (s === 'RUNNING') return '実行中'
  if (s === 'CHECKPOINT') return '確認待ち'
  if (s === 'COMPLETED') return '完了'
  if (s === 'ERROR') return 'エラー'
  return 'Draft'
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const y = d.getFullYear()
  const mo = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  return `${y}/${mo}/${day} ${h}:${m}`
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
