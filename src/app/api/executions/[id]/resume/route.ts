import { NextRequest } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { runAgentStep, setVersionStatus, getVersionOutputs } from '@/lib/pipeline'
import { safeParseJson } from '@/lib/json-cleaner'
import { detectFeedbackTarget, extractAG05Targets } from '@/lib/auto-feedback'
import { PipelineConfig, ProjectContext, AgentOutput, AgentId } from '@/agents/types'

export const maxDuration = 600 // 10分

const prisma = new PrismaClient()

// 新しいagentOrder（全AG含む）
const AGENT_ORDER: AgentId[] = [
  'AG-01', 'AG-01-RESEARCH', 'AG-01-MERGE',
  'AG-02', 'AG-02-STP', 'AG-02-JOURNEY', 'AG-02-VPC', 'AG-02-POSITION', 'AG-02-MERGE', 'AG-02-VALIDATE',
  'AG-03', 'AG-03-HEURISTIC', 'AG-03-HEURISTIC2', 'AG-03-GAP', 'AG-03-DATA', 'AG-03-MERGE',
  'AG-04', 'AG-04-MAIN', 'AG-04-INSIGHT', 'AG-04-MERGE',
  'AG-05',
  'AG-06',
  'AG-07A', 'AG-07B', 'AG-07C-1', 'AG-07C-2', 'AG-07C-3', 'AG-07C-4',
]

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: versionId } = await params
  const { agentSelection } = await req.json()

  const version = await prisma.proposalVersion.findUnique({
    where: { id: versionId },
    include: {
      project: { include: { client: true } },
      executions: {
        where: { status: 'COMPLETED' },
        include: { results: true },
        orderBy: { startedAt: 'asc' },
      },
    },
  })
  if (!version) return new Response('Not found', { status: 404 })

  const config: PipelineConfig = {
    mode: 'full',
    primaryAgent: agentSelection?.primary ?? version.primaryAgent,
    subAgents: agentSelection?.sub ?? JSON.parse(version.subAgents),
    secondaryAgent: agentSelection?.secondary,
  }

  if (agentSelection) {
    await prisma.proposalVersion.update({
      where: { id: versionId },
      data: {
        primaryAgent: config.primaryAgent,
        subAgents: JSON.stringify(config.subAgents),
      },
    })
  }

  const cdNotes = version.cdNotes
    ? (() => { try { return JSON.parse(version.cdNotes) } catch { return undefined } })()
    : undefined

  const projectContext: ProjectContext = {
    clientName: version.project.client.name,
    clientIndustry: version.project.client.industry ?? undefined,
    briefText: version.project.briefText,
    industryType: version.project.industryType,
    cdNotes,
    caseType: (version.project.caseType as 'A' | 'B' | 'C') ?? 'A',
    siteUrl: version.project.siteUrl ?? undefined,
  }

  const prevOutputMap = await getVersionOutputs(versionId)
  const completedAgIds = Object.keys(prevOutputMap)

  // AG-01の生出力からinputPatternを取得（AG-03-DATA実行判定に使用）
  const ag01Raw = version.executions
    .find(e => e.agentId === 'AG-01')?.results[0]?.outputJson ?? ''
  const ag01Json = safeParseJson(ag01Raw)
  const runDataAgent = ag01Json?.inputPattern === 'C'

  // 累積previousOutputs（実行順に追加していく）
  const previousOutputs: AgentOutput[] = AGENT_ORDER
    .filter(id => prevOutputMap[id])
    .map(id => prevOutputMap[id])

  // phase判定（0=AG-01系, 1=AG-02/03系, 2=AG-04系, 3=AG-06/07系）
  const phase = completedAgIds.includes('AG-05') ? 3
    : completedAgIds.includes('AG-03-MERGE') ? 2
    : completedAgIds.includes('AG-01-MERGE') ? 1
    : 0

  await setVersionStatus(versionId, 'RUNNING')

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: unknown) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))

      // 完了済みならスキップ、未完了なら実行して previousOutputs に追加
      const run = async (agentId: AgentId, label: string): Promise<AgentOutput> => {
        if (completedAgIds.includes(agentId)) {
          return prevOutputMap[agentId]
        }
        send({ type: 'status', message: `${label} 実行中...` })
        const output = await runAgentStep(versionId, agentId, { projectContext, previousOutputs }, config)
        previousOutputs.push(output)
        return output
      }

      /**
       * 自動フィードバック再実行ヘルパー
       * - agentId の最新完了結果を検査し、問題があれば userInstruction 付きで再実行
       * - forceInstruction が指定された場合は問題検出に関わらず再実行
       * - 返り値: 再実行した場合 true
       */
      const feedbackCheck = async (
        agentId: AgentId,
        label: string,
        forceInstruction?: string
      ): Promise<boolean> => {
        const exec = await prisma.execution.findFirst({
          where: { versionId, agentId, status: 'COMPLETED' },
          include: { results: true },
          orderBy: { startedAt: 'desc' },
        })
        const json = safeParseJson(exec?.results[0]?.outputJson ?? '')
        if (!json) return false

        const detected = detectFeedbackTarget(agentId, json)
        const combined = [detected?.instruction, forceInstruction].filter(Boolean).join('\n\n')
        if (!combined) return false

        send({ type: 'status', message: `🔄 ${label} 自動改善中...` })
        const output = await runAgentStep(
          versionId, agentId,
          { projectContext, previousOutputs, userInstruction: combined },
          config
        )
        const idx = previousOutputs.findIndex(o => o.agentId === agentId)
        if (idx >= 0) previousOutputs[idx] = output
        else previousOutputs.push(output)
        send({ type: 'status', message: `✓ ${label} 改善完了` })
        return true
      }

      const MERGE_RERUN_NOTE = '前段エージェントの出力が改善されました。最新の出力を踏まえて再統合してください。'

      try {
        const newOutputs: AgentOutput[] = []

        // ────────────────────────────────────────────
        // Phase 0: AG-01 → AG-01-RESEARCH → AG-01-MERGE → CHECKPOINT
        // ────────────────────────────────────────────
        if (phase === 0) {
          send({ type: 'status', message: 'AG-01 インテーク実行中...' })
          const ag01 = await run('AG-01', 'AG-01 インテーク')
          newOutputs.push(ag01)

          send({ type: 'status', message: 'AG-01-RESEARCH 会社情報リサーチ中（web_search）...' })
          const ag01Research = await run('AG-01-RESEARCH', 'AG-01-RESEARCH 会社情報リサーチ')
          newOutputs.push(ag01Research)

          const ag01Merge = await run('AG-01-MERGE', 'AG-01-MERGE インテーク統合')
          newOutputs.push(ag01Merge)

          await setVersionStatus(versionId, 'CHECKPOINT')
          send({ type: 'checkpoint', versionId, phase: 1, outputs: newOutputs })
          send({ type: 'waiting', versionId })

        // ────────────────────────────────────────────
        // Phase 1: AG-02クラスター → AG-03クラスター → CHECKPOINT
        // ────────────────────────────────────────────
        } else if (phase === 1) {
          send({ type: 'status', message: 'AG-02 市場分析クラスター実行中（並列）...' })

          // AG-02クラスター並列実行（AG-02-POSITIONも同時）
          const [ag02, ag02Stp, ag02Journey, ag02Vpc, ag02Position] = await Promise.all([
            run('AG-02',          `AG-02（${config.primaryAgent}）市場骨格分析`),
            run('AG-02-STP',      'AG-02-STP セグメンテーション'),
            run('AG-02-JOURNEY',  'AG-02-JOURNEY カスタマージャーニー'),
            run('AG-02-VPC',      'AG-02-VPC バリュープロポジション'),
            run('AG-02-POSITION', 'AG-02-POSITION 4軸ポジショニング'),
          ])
          newOutputs.push(ag02, ag02Stp, ag02Journey, ag02Vpc, ag02Position)

          const ag02Merge = await run('AG-02-MERGE', 'AG-02-MERGE 市場分析統合')
          newOutputs.push(ag02Merge)

          // AG-02-VALIDATE: MVP段階はスキップ（スポット実行で使用可）
          // const ag02Validate = await run('AG-02-VALIDATE', 'AG-02-VALIDATE ターゲット設計検証')
          // newOutputs.push(ag02Validate)

          send({ type: 'status', message: 'AG-03 競合分析クラスター実行中（並列）...' })

          // AG-03クラスター並列実行
          const ag03Promises: Promise<AgentOutput | null>[] = [
            run('AG-03',              'AG-03 競合特定・ポジション'),
            run('AG-03-HEURISTIC',    'AG-03-HEURISTIC ヒューリスティック評価（上位2社）'),
            run('AG-03-HEURISTIC2',   'AG-03-HEURISTIC2 ヒューリスティック評価（残競合）'),
            run('AG-03-GAP',          'AG-03-GAP コンテンツギャップ'),
          ]
          if (runDataAgent) {
            ag03Promises.push(run('AG-03-DATA', 'AG-03-DATA GA4・サーチコンソール分析'))
          }

          const ag03Results = await Promise.all(ag03Promises)
          const validAg03Results = ag03Results.filter((o): o is AgentOutput => o !== null)
          newOutputs.push(...validAg03Results)

          const ag03Merge = await run('AG-03-MERGE', 'AG-03-MERGE 競合分析統合')
          newOutputs.push(ag03Merge)

          // ── Phase 1 自動フィードバック ──
          send({ type: 'status', message: '品質チェック・自動改善中...' })

          const [fb02, fb02Stp, fb02Journey, fb02Vpc, fb02Pos] = await Promise.all([
            feedbackCheck('AG-02',          'AG-02 市場骨格分析'),
            feedbackCheck('AG-02-STP',      'AG-02-STP'),
            feedbackCheck('AG-02-JOURNEY',  'AG-02-JOURNEY'),
            feedbackCheck('AG-02-VPC',      'AG-02-VPC'),
            feedbackCheck('AG-02-POSITION', 'AG-02-POSITION'),
          ])
          if (fb02 || fb02Stp || fb02Journey || fb02Vpc || fb02Pos) {
            await feedbackCheck('AG-02-MERGE', 'AG-02-MERGE 市場分析統合', MERGE_RERUN_NOTE)
          }
          // await feedbackCheck('AG-02-VALIDATE', 'AG-02-VALIDATE ターゲット設計検証') // MVP段階スキップ

          const [fb03, fb03H, fb03H2, fb03Gap] = await Promise.all([
            feedbackCheck('AG-03',            'AG-03 競合分析'),
            feedbackCheck('AG-03-HEURISTIC',  'AG-03-HEURISTIC'),
            feedbackCheck('AG-03-HEURISTIC2', 'AG-03-HEURISTIC2'),
            feedbackCheck('AG-03-GAP',        'AG-03-GAP'),
          ])
          if (fb03 || fb03H || fb03H2 || fb03Gap) {
            await feedbackCheck('AG-03-MERGE', 'AG-03-MERGE 競合分析統合', MERGE_RERUN_NOTE)
          }

          await setVersionStatus(versionId, 'CHECKPOINT')
          send({ type: 'checkpoint', versionId, phase: 2, outputs: newOutputs })
          send({ type: 'waiting', versionId })

        // ────────────────────────────────────────────
        // Phase 2: AG-04クラスター → AG-05 → CHECKPOINT
        // ────────────────────────────────────────────
        } else if (phase === 2) {
          send({ type: 'status', message: 'AG-04 課題構造化クラスター実行中（並列）...' })

          // AG-04クラスター並列実行
          const [ag04Main, ag04Insight] = await Promise.all([
            run('AG-04-MAIN',    'AG-04-MAIN 5Whys・イシューツリー・HMW'),
            run('AG-04-INSIGHT', 'AG-04-INSIGHT インサイト・JTBD分析'),
          ])
          newOutputs.push(ag04Main, ag04Insight)

          const ag04Merge = await run('AG-04-MERGE', 'AG-04-MERGE 課題定義統合')
          newOutputs.push(ag04Merge)

          const ag05 = await run('AG-05', 'AG-05 ファクトチェック')
          newOutputs.push(ag05)

          // ── Phase 2 自動フィードバック（AG-05の指摘 + 信頼度チェック）──
          send({ type: 'status', message: '品質チェック・自動改善中...' })

          const ag05Exec = await prisma.execution.findFirst({
            where: { versionId, agentId: 'AG-05', status: 'COMPLETED' },
            include: { results: true },
            orderBy: { startedAt: 'desc' },
          })
          const ag05Json = safeParseJson(ag05Exec?.results[0]?.outputJson ?? '')
          const ag05Targets = ag05Json ? extractAG05Targets(ag05Json) : new Map<string, string>()

          // AG-04クラスターへのフィードバック
          const [fb04Main, fb04Insight] = await Promise.all([
            feedbackCheck('AG-04-MAIN',    'AG-04-MAIN 5Whys', ag05Targets.get('AG-04-MAIN')),
            feedbackCheck('AG-04-INSIGHT', 'AG-04-INSIGHT インサイト・JTBD', ag05Targets.get('AG-04-INSIGHT')),
          ])
          const fb04MergeNote = [
            (fb04Main || fb04Insight) ? MERGE_RERUN_NOTE : '',
            ag05Targets.get('AG-04-MERGE') ?? '',
          ].filter(Boolean).join('\n\n')
          if (fb04MergeNote) await feedbackCheck('AG-04-MERGE', 'AG-04-MERGE 課題定義統合', fb04MergeNote)

          // AG-05に指摘されたPhase 1エージェントへのフィードバック
          const phase1Ids: AgentId[] = [
            'AG-02', 'AG-02-STP', 'AG-02-JOURNEY', 'AG-02-VPC',
            'AG-03', 'AG-03-HEURISTIC', 'AG-03-HEURISTIC2', 'AG-03-GAP', 'AG-03-DATA',
          ]
          let p1Ag02Rerun = false, p1Ag03Rerun = false
          for (const agId of phase1Ids) {
            const inst = ag05Targets.get(agId)
            if (!inst) continue
            const rerun = await feedbackCheck(agId, agId, inst)
            if (rerun) {
              if (['AG-02', 'AG-02-STP', 'AG-02-JOURNEY', 'AG-02-VPC'].includes(agId)) p1Ag02Rerun = true
              else p1Ag03Rerun = true
            }
          }
          if (p1Ag02Rerun) await feedbackCheck('AG-02-MERGE', 'AG-02-MERGE 再統合', MERGE_RERUN_NOTE)
          if (p1Ag03Rerun) await feedbackCheck('AG-03-MERGE', 'AG-03-MERGE 再統合', MERGE_RERUN_NOTE)

          await setVersionStatus(versionId, 'CHECKPOINT')
          send({ type: 'checkpoint', versionId, phase: 3, outputs: newOutputs })
          send({ type: 'waiting', versionId })

        // ────────────────────────────────────────────
        // Phase 3: AG-06 → AG-07A/B並列 → AG-07C → COMPLETED
        // ────────────────────────────────────────────
        } else if (phase === 3) {
          const ag06 = await run('AG-06', 'AG-06 設計草案')
          newOutputs.push(ag06)

          send({ type: 'status', message: 'AG-07A/B 並列実行中...' })
          const [ag07a, ag07b] = await Promise.all([
            run('AG-07A', 'AG-07A サイト設計根拠ライター'),
            run('AG-07B', 'AG-07B リファレンス戦略'),
          ])
          newOutputs.push(ag07a, ag07b)

          // AG-07C-1/2/3 並列実行
          send({ type: 'status', message: 'AG-07C-1/2/3 素材セット生成中（並列）...' })
          const [ag07c1, ag07c2, ag07c3] = await Promise.all([
            run('AG-07C-1', 'AG-07C-1 素材セット Ch.01〜02'),
            run('AG-07C-2', 'AG-07C-2 素材セット Ch.03〜04'),
            run('AG-07C-3', 'AG-07C-3 素材セット Ch.05〜06'),
          ])
          newOutputs.push(ag07c1, ag07c2, ag07c3)

          const ag07c4 = await run('AG-07C-4', 'AG-07C-4 サマリー・conceptWords')
          newOutputs.push(ag07c4)

          // ── Phase 3 自動フィードバック ──
          send({ type: 'status', message: '品質チェック・自動改善中...' })

          const [fb06, fb07a, fb07b] = await Promise.all([
            feedbackCheck('AG-06',  'AG-06 設計草案'),
            feedbackCheck('AG-07A', 'AG-07A 設計根拠ライター'),
            feedbackCheck('AG-07B', 'AG-07B リファレンス戦略'),
          ])
          const fb07cNote = fb06 ? '前段AG-06の設計草案が改善されました。最新の設計草案を踏まえて再出力してください。' : undefined
          await feedbackCheck('AG-07C-4', 'AG-07C-4 サマリー', fb07cNote)

          await setVersionStatus(versionId, 'COMPLETED')
          send({ type: 'checkpoint', versionId, phase: 4, outputs: newOutputs })
          send({ type: 'pipeline_complete', versionId })
        }

      } catch (err) {
        await setVersionStatus(versionId, 'ERROR')
        send({ type: 'error', message: err instanceof Error ? err.message : 'Unknown error' })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
