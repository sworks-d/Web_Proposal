import { NextRequest } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { runAgentStep, setVersionStatus } from '@/lib/pipeline'
import { getOrCreateActiveVersion } from '@/lib/version-manager'
import { ProjectContext, PipelineConfig, AgentOutput } from '@/agents/types'

const prisma = new PrismaClient()

export async function POST(req: NextRequest) {
  const { projectId, config } = await req.json() as { projectId: string; config: PipelineConfig }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { client: true },
  })
  if (!project) return new Response('Not found', { status: 404 })

  // Get or create the active ProposalVersion for this project
  const version = await getOrCreateActiveVersion(projectId, {
    primaryAgent: config.primaryAgent,
    subAgents: config.subAgents,
  })

  await setVersionStatus(version.id, 'RUNNING')

  const projectContext: ProjectContext = {
    clientName: project.client.name,
    clientIndustry: project.client.industry ?? undefined,
    briefText: project.briefText,
    industryType: project.industryType,
  }

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: unknown) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))

      try {
        send({ type: 'status', message: 'AG-01 インテーク実行中...' })
        const ag01Output: AgentOutput = await runAgentStep(
          version.id, 'AG-01', { projectContext, previousOutputs: [] }, config
        )

        await setVersionStatus(version.id, 'CHECKPOINT')

        send({
          type: 'checkpoint',
          versionId: version.id,
          phase: 1,
          output: ag01Output,
        })
        send({ type: 'waiting', versionId: version.id })
      } catch (err) {
        await setVersionStatus(version.id, 'ERROR')
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
