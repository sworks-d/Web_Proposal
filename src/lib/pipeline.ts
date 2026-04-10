import { PrismaClient } from '@prisma/client'
import { AgentInput, AgentOutput, AgentId, PipelineConfig } from '@/agents/types'
import { safeParseJson } from '@/lib/json-cleaner'
import { startCostTracking, endCostTracking } from '@/lib/cost-tracker'
import { IntakeAgent } from '@/agents/ag-01-intake'
import { Ag01ResearchAgent } from '@/agents/ag-01-research'
import { Ag01MergeAgent } from '@/agents/ag-01-merge'
import { Ag02BaseAgent } from '@/agents/ag-02-base'
import { Ag02PositionAgent } from '@/agents/ag-02-position'
import { Ag02RecruitAgent } from '@/agents/ag-02-recruit'
import { Ag02BrandAgent } from '@/agents/ag-02-brand'
import { Ag02EcAgent } from '@/agents/ag-02-ec'
import { Ag02CorpAgent } from '@/agents/ag-02-corp'
import { Ag02CampAgent } from '@/agents/ag-02-camp'
import { Ag02BtobAgent } from '@/agents/ag-02-btob'
import { Ag02GeneralAgent } from '@/agents/ag-02-general'
import { Ag02JourneyAgent } from '@/agents/ag-02-journey'
import { Ag02StpAgent } from '@/agents/ag-02-stp'
import { Ag02VpcAgent } from '@/agents/ag-02-vpc'
import { Ag02MergeAgent } from '@/agents/ag-02-merge'
import { Ag02ValidateAgent } from '@/agents/ag-02-validate'
import { Ag03CompetitorAgent } from '@/agents/ag-03-competitor'
import { Ag03DataAgent } from '@/agents/ag-03-data'
import { Ag03GapAgent } from '@/agents/ag-03-gap'
import { Ag03HeuristicAgent } from '@/agents/ag-03-heuristic'
import { Ag03Heuristic2Agent } from '@/agents/ag-03-heuristic2'
import { Ag03MergeAgent } from '@/agents/ag-03-merge'
import { Ag04UnifiedAgent } from '@/agents/ag-04-unified'
import { Ag04InsightAgent } from '@/agents/ag-04-insight'
import { Ag04MainAgent } from '@/agents/ag-04-main'
import { Ag04MergeAgent } from '@/agents/ag-04-merge'
import { Ag05FactcheckAgent } from '@/agents/ag-05-factcheck'
import { Ag06DraftAgent } from '@/agents/ag-06-draft'
import { Ag07StoryAgent } from '@/agents/ag-07-story'
import { Ag07aAnalysisAgent } from '@/agents/ag-07a-analysis'
import { Ag07bReferenceAgent } from '@/agents/ag-07b-reference'
import { Ag07cStoryAgent } from '@/agents/ag-07c-story'
import { Ag07c1Agent } from '@/agents/ag-07c-1'
import { Ag07c2Agent } from '@/agents/ag-07c-2'
import { Ag07c3Agent } from '@/agents/ag-07c-3'
import { Ag07c4Agent } from '@/agents/ag-07c-4'

const prisma = new PrismaClient()

function createAg02Agent(primaryId: string): Ag02BaseAgent {
  const map: Record<string, () => Ag02BaseAgent> = {
    'ag-02-recruit': () => new Ag02RecruitAgent(),
    'ag-02-brand':   () => new Ag02BrandAgent(),
    'ag-02-ec':      () => new Ag02EcAgent(),
    'ag-02-corp':    () => new Ag02CorpAgent(),
    'ag-02-camp':    () => new Ag02CampAgent(),
    'ag-02-btob':    () => new Ag02BtobAgent(),
    'ag-02-general': () => new Ag02GeneralAgent(),
    'ag-02-journey': () => new Ag02JourneyAgent(),
    'ag-02-stp':     () => new Ag02StpAgent(),
    'ag-02-vpc':     () => new Ag02VpcAgent(),
  }
  const factory = map[primaryId]
  return factory ? factory() : new Ag02GeneralAgent()
}

// エージェント単位のタイムアウト（ms）
const AGENT_TIMEOUTS: Record<string, number> = {
  'AG-01':            120_000,
  'AG-01-RESEARCH':   300_000,  // web_search最大20回 → 余裕を持って5分
  'AG-01-MERGE':      120_000,
  // AG-02系: 150秒 → 180秒に延長
  'AG-02':            180_000,
  'AG-02-STP':        180_000,
  'AG-02-JOURNEY':    180_000,
  'AG-02-VPC':        150_000,
  'AG-02-POSITION':   150_000,
  'AG-02-MERGE':      150_000,
  'AG-02-VALIDATE':   120_000,
  'AG-03':            180_000,
  'AG-03-HEURISTIC':  180_000,
  'AG-03-HEURISTIC2': 180_000,
  'AG-03-GAP':        150_000,
  'AG-03-DATA':       120_000,
  'AG-03-MERGE':      120_000,
  'AG-04':             60_000,
  'AG-04-MAIN':       180_000,
  'AG-04-INSIGHT':    300_000,  // Opus使用のため5分に延長
  'AG-04-MERGE':      150_000,
  'AG-05':            180_000,
  'AG-06':            180_000,
  'AG-07':            150_000,
  'AG-07A':           150_000,
  'AG-07B':           150_000,
  'AG-07C':           150_000,
  'AG-07C-1':         120_000,
  'AG-07C-2':         120_000,
  'AG-07C-3':         120_000,
  'AG-07C-4':         120_000,
}

const FORBIDDEN_REUSE: Record<string, string[]> = {
  'AG-03-MERGE': ['siteDesignPrinciples'],
  'AG-07A':      ['siteDesignPrinciples'],
  'AG-07C-1': [], 'AG-07C-2': [], 'AG-07C-3': [], 'AG-07C-4': [],
}

function checkDuplication(
  agentId: string,
  currentOutput: Record<string, unknown>,
  prevFields: Record<string, unknown>
): string | null {
  const forbidden = FORBIDDEN_REUSE[agentId]
  if (!forbidden) return null

  const warnings: string[] = []

  for (const field of forbidden) {
    if (field in currentOutput && field in prevFields) {
      if (JSON.stringify(currentOutput[field]) === JSON.stringify(prevFields[field])) {
        warnings.push(`[DEDUP] ${agentId}: フィールド "${field}" が前段AGの出力と完全一致しています。再出力の可能性があります。`)
      }
    }
  }

  if (agentId.startsWith('AG-07C')) {
    const outputStr = JSON.stringify(currentOutput)
    const internalRefs = outputStr.match(/AG-\d{2}[A-Z0-9-]*の/g) ?? []
    if (internalRefs.length > 0) {
      warnings.push(`[DEDUP] ${agentId}: body_draft に内部参照が残っています: ${[...new Set(internalRefs)].join(', ')}`)
    }
  }

  return warnings.length > 0 ? warnings.join('\n') : null
}

export async function runAgentStep(
  versionId: string,
  agentId: AgentId,
  input: AgentInput,
  config: PipelineConfig
): Promise<AgentOutput> {
  const execution = await prisma.execution.create({
    data: { versionId, agentId, mode: 'FULL', status: 'RUNNING' },
  })

  let agent
  switch (agentId) {
    case 'AG-01': agent = new IntakeAgent(); break
    case 'AG-01-RESEARCH': agent = new Ag01ResearchAgent(); break
    case 'AG-01-MERGE': agent = new Ag01MergeAgent(); break
    case 'AG-02': {
      const ag02 = createAg02Agent(config.primaryAgent)
      ag02.setSubAgents(config.subAgents)
      agent = ag02
      break
    }
    case 'AG-02-JOURNEY':   agent = new Ag02JourneyAgent(); break
    case 'AG-02-STP':       agent = new Ag02StpAgent(); break
    case 'AG-02-VPC':       agent = new Ag02VpcAgent(); break
    case 'AG-02-MERGE':     agent = new Ag02MergeAgent(); break
    case 'AG-02-POSITION':  agent = new Ag02PositionAgent(); break
    case 'AG-02-VALIDATE':  agent = new Ag02ValidateAgent(); break
    case 'AG-03': agent = new Ag03CompetitorAgent(); break
    case 'AG-03-DATA': agent = new Ag03DataAgent(); break
    case 'AG-03-GAP': agent = new Ag03GapAgent(); break
    case 'AG-03-HEURISTIC': agent = new Ag03HeuristicAgent(); break
    case 'AG-03-HEURISTIC2': agent = new Ag03Heuristic2Agent(); break
    case 'AG-03-MERGE': agent = new Ag03MergeAgent(); break
    case 'AG-04': agent = new Ag04UnifiedAgent(); break
    case 'AG-04-MAIN': agent = new Ag04MainAgent(); break
    case 'AG-04-INSIGHT': agent = new Ag04InsightAgent(); break
    case 'AG-04-MERGE': agent = new Ag04MergeAgent(); break
    case 'AG-05': agent = new Ag05FactcheckAgent(); break
    case 'AG-06': agent = new Ag06DraftAgent(); break
    case 'AG-07': agent = new Ag07StoryAgent(); break
    case 'AG-07A': agent = new Ag07aAnalysisAgent(); break
    case 'AG-07B':   agent = new Ag07bReferenceAgent(); break
    case 'AG-07C':   agent = new Ag07cStoryAgent(); break
    case 'AG-07C-1': agent = new Ag07c1Agent(); break
    case 'AG-07C-2': agent = new Ag07c2Agent(); break
    case 'AG-07C-3': agent = new Ag07c3Agent(); break
    case 'AG-07C-4': agent = new Ag07c4Agent(); break
    default: throw new Error(`Unknown agent: ${agentId}`)
  }

  let output: AgentOutput
  let parseError = false
  let parseErrorMessage: string | undefined
  let rawText = ''
  let cleanedText = ''
  let durationMs: number | undefined
  const startTime = Date.now()

  try {
    const timeoutMs = AGENT_TIMEOUTS[agentId] ?? 180_000
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`[TIMEOUT] ${agentId} が ${timeoutMs / 1000}秒 を超過しました`)), timeoutMs)
    )
    console.log(`[pipeline] ${agentId} 開始 (timeout=${timeoutMs / 1000}s)`)
    const t0 = Date.now()
    output = await Promise.race([agent.execute(input), timeoutPromise])
    durationMs = Date.now() - t0
    console.log(`[pipeline] ${agentId} 完了 (${(durationMs / 1000).toFixed(1)}s)`)
    rawText = agent.lastRawText
    // コードフェンス・前後の余分なテキストを除去してJSONだけ保存する
    const fenceMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (fenceMatch) {
      cleanedText = fenceMatch[1].trim()
    } else {
      const jsonStart = rawText.search(/[\[{]/)
      const jsonEnd   = Math.max(rawText.lastIndexOf('}'), rawText.lastIndexOf(']'))
      cleanedText = (jsonStart !== -1 && jsonEnd > jsonStart)
        ? rawText.slice(jsonStart, jsonEnd + 1)
        : rawText.trim()
    }
  } catch (err) {
    // AG実行自体が失敗（パースエラー含む）
    const message = err instanceof Error ? err.message : String(err)
    parseError = true
    parseErrorMessage = message

    const isTimeout = message.startsWith('[TIMEOUT]')
    await prisma.agentResult.create({
      data: {
        executionId: execution.id, agentId,
        status: 'FAILED',
        outputJson: '',
        parseError: !isTimeout,
        parseErrorMessage: message,
        errorMessage: message,
        completedAt: new Date(),
        durationMs: Date.now() - startTime,
      },
    })
    await prisma.execution.update({
      where: { id: execution.id },
      data: { status: 'ERROR', completedAt: new Date() },
    })
    console.error(`[pipeline] ${agentId} 失敗: ${message}`)
    throw err
  }

  // 保存前の重複チェック
  let dedupWarning: string | null = null
  try {
    if (rawText && FORBIDDEN_REUSE[agentId] !== undefined) {
      const currentParsed = JSON.parse(rawText)
      const prevExecs = await prisma.execution.findMany({
        where: { versionId, status: 'COMPLETED', agentId: { not: agentId } },
        include: { results: { take: 1, orderBy: { id: 'desc' } } },
      })
      const prevFields: Record<string, unknown> = {}
      for (const exec of prevExecs) {
        const result = exec.results[0]
        if (!result?.outputJson) continue
        try { Object.assign(prevFields, JSON.parse(result.outputJson)) } catch { /* ignore */ }
      }
      dedupWarning = checkDuplication(agentId, currentParsed, prevFields)
    }
  } catch { /* dedup失敗は無視 */ }

  // 保存・完了処理
  await prisma.agentResult.create({
    data: {
      executionId: execution.id,
      agentId,
      status: 'COMPLETED',
      outputJson: cleanedText || rawText,
      parseError,
      parseErrorMessage: dedupWarning
        ? `${parseErrorMessage ?? ''}\n${dedupWarning}`.trim()
        : parseErrorMessage,
      completedAt: new Date(),
      durationMs,
    },
  })
  await prisma.execution.update({
    where: { id: execution.id },
    data: { status: 'COMPLETED', completedAt: new Date() },
  })

  return output
}

export async function setVersionStatus(versionId: string, status: string) {
  await prisma.proposalVersion.update({
    where: { id: versionId },
    data: {
      status,
      completedAt: status === 'COMPLETED' ? new Date() : undefined,
    },
  })
}

export async function getVersionOutputs(versionId: string): Promise<Record<string, AgentOutput>> {
  const executions = await prisma.execution.findMany({
    where: { versionId, status: 'COMPLETED' },
    include: { results: true },
    orderBy: { startedAt: 'asc' },
  })

  const outputs: Record<string, AgentOutput> = {}
  for (const exec of executions) {
    const result = exec.results[0]
    if (result) {
      const parsed = safeParseJson(result.editedJson ?? result.outputJson)
      if (!parsed) continue
      // New format: raw Claude JSON (no .sections). Extract key fields for buildUserMessage context.
      if (!parsed.sections) {
        const sections = extractContextSections(exec.agentId, parsed)
        outputs[exec.agentId] = {
          agentId: exec.agentId as AgentId,
          sections,
          visualizations: [],
          metadata: parsed.metadata ?? { confidence: 'medium', factBasis: [], assumptions: [], missingInfo: [] },
        }
      } else {
        // Old format: already has .sections
        outputs[exec.agentId] = parsed
      }
    }
  }
  return outputs
}

/** raw Claude JSON から後続AGへのコンテキスト用セクションを抽出する */
function extractContextSections(agentId: string, p: any): AgentOutput['sections'] {
  const s = (id: string, title: string, content: string) => ({
    id, title, content, sectionType: 'text' as const, isEditable: false, canRegenerate: false,
  })
  const arr = (items: unknown[]) => items.filter(Boolean).join('\n')

  switch (agentId) {
    case 'AG-01': return [
      s('summary',     '案件サマリー',           p.projectSummary ?? ''),
      s('target',      'ターゲット仮説',          `${p.targetHypothesis?.primary ?? ''}\n根拠: ${p.targetHypothesis?.basisFromBrief ?? ''}`),
      s('constraints', '制約・ヒアリング項目',    arr([...(p.keyConstraints ?? []), ...(p.requiresClientConfirmation ?? []).map((r: any) => r.item)])),
    ]
    case 'AG-02': return [
      s('market',      '市場概況',               `${p.marketStructure?.overview ?? ''}\nトレンド: ${arr(p.marketStructure?.keyTrends ?? [])}`),
      s('target',      'ターゲット仮説（精緻化）', `${p.targetHypothesis?.primaryTarget ?? ''}\n${p.targetHypothesis?.contextualState ?? ''}\n根拠: ${p.targetHypothesis?.basisFromMarket ?? ''}`),
      s('evp',         'EVP・設計原則',           `EVP: ${p.evpAndContentStrategy?.coreEVP ?? ''}\n${(p.siteDesignPrinciples ?? []).slice(0, 3).map((x: any) => `[${x.priority}] ${x.principle}`).join('\n')}`),
    ]
    case 'AG-03': return [
      s('competitors',   '競合概況',             (p.competitors ?? []).slice(0, 4).map((c: any) => `${c.name}（脅威:${c.threatLevel ?? '?'}）: ${c.strategicIntent ?? ''}`).join('\n')),
      s('vacant',        '空白地帯',             (p.crossCompetitorAnalysis?.vacantAreas ?? []).slice(0, 3).map((v: any) => `${v.area}: ${v.clientFit ?? ''}`).join('\n')),
      s('position',      '推奨ポジション',       `${p.differentiationOpportunity?.recommendedPosition ?? ''}\n${p.differentiationOpportunity?.siteDesignImplication ?? ''}`),
    ]
    case 'AG-04': return [
      s('core-analysis',  '課題の本質',   `${(p.coreAnalysis as any)?.rootCause ?? ''}\n最優先: ${(p.coreAnalysis as any)?.primaryIssue ?? ''}`),
      s('hmw',            'HMW設計設問',  ((p.designDirection as any)?.hmwTop3 ?? []).slice(0, 3).join('\n')),
      s('core',           '課題定義',     (p.designDirection as any)?.coreProblem ?? ''),
    ]
    case 'AG-04-MAIN': return [
      s('five-whys',   '5Whys・根本原因',        `根本原因: ${(p.fiveWhys as any)?.rootCause ?? ''}`),
      s('hmw',         'HMW設計設問',            (p.hmwQuestions ?? []).slice(0, 3).map((q: any) => `[${q.priority}] ${q.question}`).join('\n')),
      s('core',        '課題定義（1文）',         String(p.coreProblemStatement ?? '')),
    ]
    case 'AG-04-MERGE': return [
      s('core',        '統合課題定義',           String(p.coreProblemStatement ?? '')),
      s('target',      'ターゲット定義（統合）',  JSON.stringify(p.targetDefinition ?? '').slice(0, 400)),
      s('priorities',  '設計優先順位',           (p.designPriorities ?? []).slice(0, 3).map((d: any) => `[${d.priority}位] ${d.hmwQuestion}: ${d.designAction}`).join('\n')),
    ]
    case 'AG-04-INSIGHT': return [
      s('target',      'ターゲット定義',          `${(p.targetDefinition as any)?.whoConverts ?? ''}\n状態: ${(p.targetDefinition as any)?.contextualState ?? ''}`),
      s('insight',     'インサイト',              `葛藤: ${(p.targetInsight as any)?.emotionalTension ?? ''}\nトリガー: ${(p.targetInsight as any)?.triggerMoment ?? ''}`),
      s('problems',    '解くべき問い',            (p.coreProblemStatements ?? []).slice(0, 3).map((x: any) => `[${x.priority}] ${x.statement}`).join('\n')),
    ]
    case 'AG-05': return [
      s('quality',     'ファクトチェック結果',    `クリエイティブ進行: ${p.overallAssessment?.readyForCreative ? 'OK' : '要対処'}\n${p.overallAssessment?.summary ?? ''}`),
      s('issues',      '主要指摘事項',           (p.issues ?? []).slice(0, 4).map((f: any) => `[${f.severity}] ${f.agentId}: ${f.description ?? ''}`).join('\n')),
    ]
    case 'AG-06': return [
      s('concept',     'サイトコアコンセプト',    `${p.siteDesignSummary?.coreConcept ?? ''}\n主要CV: ${p.siteDesignSummary?.primaryCV ?? ''}`),
      s('ia',          'ページ構成',             (p.ia?.pages ?? []).slice(0, 6).map((pg: any) => `${pg.title}: ${pg.purpose ?? ''}`).join('\n')),
      s('outline',     'スライド章構成',          (p.slideOutline ?? []).slice(0, 4).map((ch: any) => `${ch.chapterTitle}（${ch.estimatedSlides}枚）: ${ch.role ?? ''}`).join('\n')),
    ]
    case 'AG-07': return [
      s('concept',     'コンセプトワード',        (p.conceptWords ?? []).slice(0, 2).map((c: any, i: number) => `案${i + 1}: ${c.copy} — ${c.subCopy ?? ''}`).join('\n')),
      s('storyline',   '目次・章構成',            (p.storyLine ?? []).map((ch: any) => `${ch.chapterTitle}: ${ch.keyMessage ?? ''}`).join('\n')),
    ]
    case 'AG-02-JOURNEY': return [
      s('target',      'ジャーニー主語',          String(p.primaryTarget ?? '')),
      s('critical',    '最重要フェーズ・バリア',  `フェーズ: ${JSON.stringify(p.criticalPhase ?? '')}\nバリア: ${JSON.stringify(p.criticalBarrier ?? '')}`),
      s('insights',    '設計優先インサイト',       arr(p.keyInsights ?? [])),
    ]
    case 'AG-02-STP': return [
      s('targeting',   'ターゲティング',          JSON.stringify(p.targeting ?? '').slice(0, 400)),
      s('positioning', 'ポジショニング',          JSON.stringify(p.positioning ?? '').slice(0, 400)),
      s('design',      '設計への示唆',            JSON.stringify(p.designImplication ?? '').slice(0, 300)),
    ]
    case 'AG-02-VPC': return [
      s('customer',    'カスタマープロファイル',  JSON.stringify(p.customerProfile ?? '').slice(0, 400)),
      s('value',       'バリュープロポジション',  JSON.stringify(p.valueProposition ?? '').slice(0, 400)),
      s('fit',         'フィット評価',            `スコア: ${(p.fit as any)?.fitScore ?? ''}\n${(p.fit as any)?.fitReason ?? ''}`),
    ]
    case 'AG-02-MERGE': return [
      s('target',      '統合ターゲット',          `${p.primaryTarget ?? ''}\n状態: ${p.targetContextualState ?? ''}`),
      s('journey',     '統合ジャーニー',          JSON.stringify(p.consolidatedJourney ?? '').slice(0, 400)),
      s('principles',  '設計原則（統合）',        (p.siteDesignPrinciples ?? []).slice(0, 3).map((x: any) => `[${x.priority}] ${x.principle}`).join('\n')),
    ]
    case 'AG-02-VALIDATE': return [
      s('confirmed',   '検証済み比較軸',          (p.decisionCriteriaValidation as any[] ?? []).filter((c: any) => c.newConfidence === 'confirmed').map((c: any) => c.criterion).join(', ')),
      s('language',    'ターゲット言語マッピング', (p.targetLanguageMapping as any[] ?? []).slice(0, 4).map((m: any) => `「${m.companyTerm}」→「${m.targetTerm}」`).join('\n')),
      s('insights',    '新発見インサイト',        (p.discoveredInsights as any[] ?? []).slice(0, 3).map((i: any) => `[${i.type}] ${i.content}`).join('\n')),
    ]
    case 'AG-03-DATA': return [
      s('funnel',      'ファネル分析',            JSON.stringify(p.funnelAnalysis ?? '').slice(0, 400)),
      s('search',      '検索意図・ギャップ',      JSON.stringify((p.searchIntentAnalysis as any)?.topContentGaps ?? []).slice(0, 400)),
      s('findings',    'キーファインディング',    arr((p.keyFindings ?? []).slice(0, 3).map((f: any) => `${f.finding} → ${f.designImplication}`))),
    ]
    case 'AG-03-GAP': return [
      s('vacant',      '空白地帯',               (p.vacantAreas ?? []).slice(0, 3).map((v: any) => `${v.area}（優先度:${v.priority}）: ${v.designImplication}`).join('\n')),
      s('opportunities','ギャップ機会',           (p.topGapOpportunities ?? []).slice(0, 3).map((o: any) => `${o.opportunity}: ${o.designResponse}`).join('\n')),
    ]
    case 'AG-03-HEURISTIC': return [
      s('evaluations', 'ヒューリスティック評価（上位2社）', (p.evaluations ?? []).slice(0, 2).map((e: any) => `${e.competitorName}（UX:${e.overallUXScore}）: ${e.strategicIntent}`).join('\n')),
      s('insights',    '2社比較インサイト',       arr((p.crossCompetitorInsights ?? []).slice(0, 3))),
    ]
    case 'AG-03-HEURISTIC2': return [
      s('evaluations', 'ヒューリスティック評価（残競合）', (p.heuristicEvaluations ?? []).slice(0, 3).map((e: any) => `${e.competitorName}: ${e.strategicIntent}`).join('\n')),
      s('performance', 'パフォーマンス監査',      (p.performanceAudit ?? []).slice(0, 3).map((a: any) => `${a.competitorName}: LCP ${(a.scores as any)?.lcp ?? '?'}`).join('\n')),
    ]
    case 'AG-03-MERGE': return [
      s('opportunities','差別化機会（統合）',     (p.topDesignOpportunities ?? []).slice(0, 3).map((o: any) => `${o.opportunity}: ${o.designAction}`).join('\n')),
      s('strategy',    '差別化戦略',             `${(p.differentiationStrategy as any)?.coreMessage ?? ''}`),
      s('principles',  '設計原則（競合より）',   (p.siteDesignPrinciples ?? []).slice(0, 3).map((x: any) => `[${x.priority}] ${x.principle}`).join('\n')),
    ]
    case 'AG-07A': return [
      s('mission',     'サイトミッション',        String(p.siteMission ?? '')),
      s('concept',     'コアコンセプト・主要CV',  `コンセプト: ${p.siteCoreConcept ?? ''}\n主要CV: ${p.primaryCV ?? ''}`),
      s('ia',          'コンテンツアーキテクチャ', (p.contentArchitecture ?? []).slice(0, 5).map((pg: any) => `${pg.pageTitle}: ${pg.designMission}`).join('\n')),
    ]
    case 'AG-07B': return [
      s('patterns',    'IA設計パターン',         (p.iaPatterns ?? []).slice(0, 2).map((pat: any) => `${pat.patternName}: ${pat.description}`).join('\n')),
      s('benchmarks',  'ベンチマーク',            (p.benchmarks ?? []).slice(0, 3).map((b: any) => `${b.siteName}: ${b.designLesson}`).join('\n')),
    ]
    case 'AG-07C': return [
      s('concept',     'コンセプトワード',        (p.conceptWords ?? []).slice(0, 2).map((c: any, i: number) => `案${i + 1}: ${c.copy} — ${c.subCopy ?? ''}`).join('\n')),
      s('storyline',   '目次・章構成',            (p.storyLine ?? []).map((ch: any) => `${ch.chapterTitle}: ${ch.keyMessage ?? ''}`).join('\n')),
    ]
    case 'AG-01-RESEARCH': return [
      s('company',     '会社基本情報',            `売上: ${(p.companyBasics as any)?.revenue?.value ?? '不明'} ${(p.companyBasics as any)?.revenue?.unit ?? ''}\n従業員: ${(p.companyBasics as any)?.employees?.value ?? '不明'}人`),
      s('industry',    '業界ポジション',          `推定順位: ${(p.industryProfile as any)?.clientEstimatedRank ?? '不明'}\nシェア: ${(p.industryProfile as any)?.clientMarketShare?.value ?? '不明'}%`),
      s('gaps',        '主観 vs 客観のズレ',      arr(((p.subjectiveVsObjective as any)?.gaps ?? []).slice(0, 3))),
    ]
    case 'AG-01-MERGE': return [
      s('basics',      '確定済み基礎情報',        `業界: ${(p.confirmedBasics as any)?.industry ?? ''}\nエリア: ${(p.confirmedBasics as any)?.areaScope ?? ''}\n業界内順位: ${(p.confirmedBasics as any)?.industryRank ?? ''}`),
      s('insights',    'AG-02以降への発見',       arr((p.keyInsights ?? []).slice(0, 3))),
      s('forAG02Pos',  'AG-02-POSITION向け',      String(p.forAG02Position ?? '')),
    ]
    case 'AG-02-POSITION': return [
      s('axis1',       '軸1（エリア×規模）',      `${(p.axis1_area_scale as any)?.qualitativeAssessment ?? ''}\n示唆: ${(p.axis1_area_scale as any)?.designImplication ?? ''}`),
      s('axis4',       '軸4（デジタル成熟度）',    `${(p.axis4_industry_digital as any)?.qualitativeAssessment ?? ''}\n示唆: ${(p.axis4_industry_digital as any)?.designImplication ?? ''}`),
      s('integrated',  '統合ポジション',          `現在地: ${(p.integratedPosition as any)?.summary ?? ''}\n差別化機会: ${(p.integratedPosition as any)?.uniqueOpportunity ?? ''}`),
    ]
    case 'AG-07C-1':
    case 'AG-07C-2':
    case 'AG-07C-3': return [
      s('slides', `スライド素材（${(p.slides as any[] ?? []).length}枚）`,
        (p.slides as any[] ?? []).slice(0, 4).map((sl: any) =>
          `[${sl.slideId}] ${sl.slideTitle ?? ''}\n${String(sl.body_draft ?? '').slice(0, 200)}`
        ).join('\n---\n')
      ),
    ]
    case 'AG-07C-4': return [
      s('concept',    'コンセプトワード',  (p.conceptWords as any[] ?? []).slice(0, 3).map((c: any, i: number) => `案${i+1}: ${c.copy} — ${c.subCopy ?? ''}`).join('\n')),
      s('storyline',  'ストーリーライン',  (p.storyLine as any[] ?? []).map((ch: any) => `${ch.chapterTitle}（${ch.estimatedSlides ?? '?'}枚）: ${ch.keyMessage ?? ''}`).join('\n')),
    ]
    default: return [s('raw', '出力', JSON.stringify(p).slice(0, 800))]
  }
}
