import { PrismaClient } from '@prisma/client'
import { AgentInput, AgentOutput, AgentId, PipelineConfig } from '@/agents/types'
import { safeParseJson } from '@/lib/json-cleaner'
import { IntakeAgent } from '@/agents/ag-01-intake'
import { Ag02BaseAgent } from '@/agents/ag-02-base'
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
import { Ag03CompetitorAgent } from '@/agents/ag-03-competitor'
import { Ag03DataAgent } from '@/agents/ag-03-data'
import { Ag03GapAgent } from '@/agents/ag-03-gap'
import { Ag03HeuristicAgent } from '@/agents/ag-03-heuristic'
import { Ag03Heuristic2Agent } from '@/agents/ag-03-heuristic2'
import { Ag03MergeAgent } from '@/agents/ag-03-merge'
import { Ag04InsightAgent } from '@/agents/ag-04-insight'
import { Ag04MainAgent } from '@/agents/ag-04-main'
import { Ag04MergeAgent } from '@/agents/ag-04-merge'
import { Ag05FactcheckAgent } from '@/agents/ag-05-factcheck'
import { Ag06DraftAgent } from '@/agents/ag-06-draft'
import { Ag07StoryAgent } from '@/agents/ag-07-story'
import { Ag07aAnalysisAgent } from '@/agents/ag-07a-analysis'
import { Ag07bReferenceAgent } from '@/agents/ag-07b-reference'
import { Ag07cStoryAgent } from '@/agents/ag-07c-story'

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
    case 'AG-02': {
      const ag02 = createAg02Agent(config.primaryAgent)
      ag02.setSubAgents(config.subAgents)
      agent = ag02
      break
    }
    case 'AG-02-JOURNEY': agent = new Ag02JourneyAgent(); break
    case 'AG-02-STP':     agent = new Ag02StpAgent(); break
    case 'AG-02-VPC':     agent = new Ag02VpcAgent(); break
    case 'AG-02-MERGE':   agent = new Ag02MergeAgent(); break
    case 'AG-03': agent = new Ag03CompetitorAgent(); break
    case 'AG-03-DATA': agent = new Ag03DataAgent(); break
    case 'AG-03-GAP': agent = new Ag03GapAgent(); break
    case 'AG-03-HEURISTIC': agent = new Ag03HeuristicAgent(); break
    case 'AG-03-HEURISTIC2': agent = new Ag03Heuristic2Agent(); break
    case 'AG-03-MERGE': agent = new Ag03MergeAgent(); break
    case 'AG-04': agent = new Ag04InsightAgent(); break
    case 'AG-04-MAIN': agent = new Ag04MainAgent(); break
    case 'AG-04-MERGE': agent = new Ag04MergeAgent(); break
    case 'AG-05': agent = new Ag05FactcheckAgent(); break
    case 'AG-06': agent = new Ag06DraftAgent(); break
    case 'AG-07': agent = new Ag07StoryAgent(); break
    case 'AG-07A': agent = new Ag07aAnalysisAgent(); break
    case 'AG-07B': agent = new Ag07bReferenceAgent(); break
    case 'AG-07C': agent = new Ag07cStoryAgent(); break
    default: throw new Error(`Unknown agent: ${agentId}`)
  }

  let output: AgentOutput
  let parseError = false
  let parseErrorMessage: string | undefined
  let rawText = ''
  let cleanedText = ''

  try {
    output = await agent.execute(input)
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

    await prisma.agentResult.create({
      data: { executionId: execution.id, agentId, outputJson: cleanedText || '', parseError: true, parseErrorMessage: message },
    })
    await prisma.execution.update({
      where: { id: execution.id },
      data: { status: 'ERROR', completedAt: new Date() },
    })
    throw err
  }

  // 保存・完了処理
  await prisma.agentResult.create({
    data: { executionId: execution.id, agentId, outputJson: cleanedText || rawText, parseError, parseErrorMessage },
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
      s('target',      'ターゲット定義',          `${p.targetDefinition?.whoConverts ?? ''}\n状態: ${p.targetDefinition?.contextualState ?? ''}`),
      s('insight',     'インサイト',              `葛藤: ${p.targetInsight?.emotionalTension ?? ''}\nトリガー: ${p.targetInsight?.triggerMoment ?? ''}\n示唆: ${p.targetInsight?.communicationImplication ?? ''}`),
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
    default: return [s('raw', '出力', JSON.stringify(p).slice(0, 800))]
  }
}
