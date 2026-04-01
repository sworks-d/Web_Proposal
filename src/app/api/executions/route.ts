import { NextRequest } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { IntakeAgent } from '@/agents/ag-01-intake'
import { ProjectContext, SSEEvent } from '@/agents/types'
import { getOrCreateActiveVersion } from '@/lib/version-manager'

const prisma = new PrismaClient()

export async function POST(req: NextRequest) {
  const { projectId, agentId, userInstruction } = await req.json()
  if (!projectId || !agentId) {
    return new Response(JSON.stringify({ error: 'projectId and agentId are required' }), { status: 400 })
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { client: true },
  })
  if (!project) {
    return new Response(JSON.stringify({ error: 'Project not found' }), { status: 404 })
  }

  const version = await getOrCreateActiveVersion(projectId, {
    primaryAgent: 'ag-02-general',
    subAgents: [],
  })

  const execution = await prisma.execution.create({
    data: { versionId: version.id, mode: 'SPOT', agentId, status: 'RUNNING' },
  })

  const projectContext: ProjectContext = {
    clientName: project.client.name,
    clientIndustry: project.client.industry ?? undefined,
    briefText: project.briefText,
    industryType: project.industryType,
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: SSEEvent) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
      }

      try {
        send({ type: 'status', message: `${agentId} を実行中...` })

        let agent
        if (agentId === 'AG-01') {
          agent = new IntakeAgent()
        } else {
          throw new Error(`${agentId} は未実装です（パイプライン実行を使用してください）`)
        }

        const output = await agent.execute({
          projectContext,
          previousOutputs: [],
          userInstruction,
        })

        await prisma.agentResult.create({
          data: { executionId: execution.id, agentId, outputJson: JSON.stringify(output) },
        })
        await prisma.execution.update({
          where: { id: execution.id },
          data: { status: 'COMPLETED', completedAt: new Date() },
        })

        send({ type: 'complete', output, executionId: execution.id })
      } catch (err) {
        await prisma.execution.update({
          where: { id: execution.id },
          data: { status: 'ERROR' },
        })
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
