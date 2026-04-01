import { NextRequest } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { runAgentStep, setVersionStatus, getVersionOutputs } from '@/lib/pipeline'
import { PipelineConfig, ProjectContext, AgentOutput } from '@/agents/types'

const prisma = new PrismaClient()

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // id = versionId
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

  // Update version with confirmed AG selection
  if (agentSelection) {
    await prisma.proposalVersion.update({
      where: { id: versionId },
      data: {
        primaryAgent: config.primaryAgent,
        subAgents: JSON.stringify(config.subAgents),
      },
    })
  }

  const projectContext: ProjectContext = {
    clientName: version.project.client.name,
    clientIndustry: version.project.client.industry ?? undefined,
    briefText: version.project.briefText,
    industryType: version.project.industryType,
  }

  // Gather previous outputs from completed executions
  const prevOutputMap = await getVersionOutputs(versionId)
  const agentOrder = ['AG-01', 'AG-02', 'AG-03', 'AG-04', 'AG-05', 'AG-06', 'AG-07']
  const previousOutputs: AgentOutput[] = agentOrder
    .filter(id => prevOutputMap[id])
    .map(id => prevOutputMap[id])

  const completedAgIds = Object.keys(prevOutputMap)
  // Determine which phase to run next
  const phase = completedAgIds.includes('AG-05') ? 3
    : completedAgIds.includes('AG-03') ? 2
    : 1

  await setVersionStatus(versionId, 'RUNNING')

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: unknown) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))

      try {
        if (phase === 1) {
          send({ type: 'status', message: `AG-02（${config.primaryAgent}）実行中...` })
          const ag02 = await runAgentStep(versionId, 'AG-02', { projectContext, previousOutputs }, config)
          previousOutputs.push(ag02)

          send({ type: 'status', message: 'AG-03 競合分析実行中...' })
          const ag03 = await runAgentStep(versionId, 'AG-03', { projectContext, previousOutputs }, config)
          previousOutputs.push(ag03)

          await setVersionStatus(versionId, 'CHECKPOINT')
          send({ type: 'checkpoint', versionId, phase: 2, outputs: [ag02, ag03] })
          send({ type: 'waiting', versionId })

        } else if (phase === 2) {
          send({ type: 'status', message: 'AG-04 課題構造化実行中...' })
          const ag04 = await runAgentStep(versionId, 'AG-04', { projectContext, previousOutputs }, config)
          previousOutputs.push(ag04)

          send({ type: 'status', message: 'AG-05 ファクトチェック実行中...' })
          const ag05 = await runAgentStep(versionId, 'AG-05', { projectContext, previousOutputs }, config)
          previousOutputs.push(ag05)

          await setVersionStatus(versionId, 'CHECKPOINT')
          send({ type: 'checkpoint', versionId, phase: 3, outputs: [ag04, ag05] })
          send({ type: 'waiting', versionId })

        } else if (phase === 3) {
          send({ type: 'status', message: 'AG-06 設計草案作成中...' })
          const ag06 = await runAgentStep(versionId, 'AG-06', { projectContext, previousOutputs }, config)
          previousOutputs.push(ag06)

          send({ type: 'status', message: 'AG-07 提案書草案執筆中...' })
          const ag07 = await runAgentStep(versionId, 'AG-07', { projectContext, previousOutputs }, config)
          previousOutputs.push(ag07)

          await setVersionStatus(versionId, 'COMPLETED')
          send({ type: 'checkpoint', versionId, phase: 4, outputs: [ag06, ag07] })
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
