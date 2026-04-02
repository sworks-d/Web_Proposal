import { NextRequest } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { runAgentStep, setVersionStatus, getVersionOutputs } from '@/lib/pipeline'
import { safeParseJson } from '@/lib/json-cleaner'
import { PipelineConfig, ProjectContext, AgentOutput, AgentId } from '@/agents/types'

export const maxDuration = 600 // 10分

const prisma = new PrismaClient()

// 新しいagentOrder（全AG含む）
const AGENT_ORDER: AgentId[] = [
  'AG-01',
  'AG-02', 'AG-02-STP', 'AG-02-JOURNEY', 'AG-02-VPC', 'AG-02-MERGE',
  'AG-03', 'AG-03-HEURISTIC', 'AG-03-HEURISTIC2', 'AG-03-GAP', 'AG-03-DATA', 'AG-03-MERGE',
  'AG-04', 'AG-04-MAIN', 'AG-04-MERGE',
  'AG-05',
  'AG-06',
  'AG-07A', 'AG-07B', 'AG-07C',
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

  // phase判定
  const phase = completedAgIds.includes('AG-05') ? 3
    : completedAgIds.includes('AG-03-MERGE') ? 2
    : 1

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

      try {
        const newOutputs: AgentOutput[] = []

        // ────────────────────────────────────────────
        // Phase 1: AG-02クラスター → AG-03クラスター → CHECKPOINT
        // ────────────────────────────────────────────
        if (phase === 1) {
          send({ type: 'status', message: 'AG-02 市場分析クラスター実行中（並列）...' })

          // AG-02クラスター並列実行
          const [ag02, ag02Stp, ag02Journey, ag02Vpc] = await Promise.all([
            run('AG-02',         `AG-02（${config.primaryAgent}）市場骨格分析`),
            run('AG-02-STP',     'AG-02-STP セグメンテーション'),
            run('AG-02-JOURNEY', 'AG-02-JOURNEY カスタマージャーニー'),
            run('AG-02-VPC',     'AG-02-VPC バリュープロポジション'),
          ])
          newOutputs.push(ag02, ag02Stp, ag02Journey, ag02Vpc)

          const ag02Merge = await run('AG-02-MERGE', 'AG-02-MERGE 市場分析統合')
          newOutputs.push(ag02Merge)

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

          await setVersionStatus(versionId, 'CHECKPOINT')
          send({ type: 'checkpoint', versionId, phase: 2, outputs: newOutputs })
          send({ type: 'waiting', versionId })

        // ────────────────────────────────────────────
        // Phase 2: AG-04クラスター → AG-05 → CHECKPOINT
        // ────────────────────────────────────────────
        } else if (phase === 2) {
          send({ type: 'status', message: 'AG-04 課題構造化クラスター実行中（並列）...' })

          // AG-04クラスター並列実行（AG-04-MAIN と AG-04 / AG-04-INSIGHT）
          const [ag04Main, ag04Insight] = await Promise.all([
            run('AG-04-MAIN',    'AG-04-MAIN 5Whys・イシューツリー・HMW'),
            run('AG-04',         'AG-04 インサイト・JTBD分析'),
          ])
          newOutputs.push(ag04Main, ag04Insight)

          const ag04Merge = await run('AG-04-MERGE', 'AG-04-MERGE 課題定義統合')
          newOutputs.push(ag04Merge)

          const ag05 = await run('AG-05', 'AG-05 ファクトチェック')
          newOutputs.push(ag05)

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

          const ag07c = await run('AG-07C', 'AG-07C ストーリーエディター（提案書草案）')
          newOutputs.push(ag07c)

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
