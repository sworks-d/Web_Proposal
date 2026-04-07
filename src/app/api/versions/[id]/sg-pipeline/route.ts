import { NextRequest } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { SgParams } from '@/agents/sg-types'
import { runSgPipeline } from '@/lib/sg-pipeline'
import { safeParseJson } from '@/lib/json-cleaner'

export const maxDuration = 600

const prisma = new PrismaClient()

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: versionId } = await params
  const { params: sgParams } = await req.json() as { params: SgParams }

  const version = await prisma.proposalVersion.findUnique({
    where: { id: versionId },
    include: {
      project: { include: { client: true } },
      executions: {
        where: { status: 'COMPLETED' },
        include: { results: { orderBy: { createdAt: 'desc' }, take: 1 } },
        orderBy: { startedAt: 'asc' },
      },
    },
  })

  if (!version) return new Response('Version not found', { status: 404 })

  // Collect AG outputs
  const agOutputs: Record<string, unknown> = {}
  for (const exec of version.executions) {
    const result = exec.results[0]
    if (!result) continue
    const parsed = safeParseJson(result.editedJson ?? result.outputJson)
    if (parsed) agOutputs[exec.agentId] = parsed
  }

  // Create SG generation record
  const sg = await prisma.sgGeneration.create({
    data: {
      versionId,
      status: 'RUNNING',
      params: JSON.stringify(sgParams),
    },
  })

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: unknown) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))

      try {
        send({ type: 'status', message: 'SGパイプライン開始...' })

        const result = await runSgPipeline(
          version.project.client.name,
          version.project.briefText,
          agOutputs,
          sgParams,
          (stepId, name) => {
            send({ type: 'step', agentId: stepId, name, message: `${stepId} ${name} 実行中...` })
          },
        )

        // Save to DB
        await prisma.sgGeneration.update({
          where: { id: sg.id },
          data: {
            status: 'COMPLETED',
            outputJson: JSON.stringify(result.finalOutput),
            completedAt: new Date(),
          },
        })

        send({ type: 'complete', sgId: sg.id, output: result.finalOutput })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        await prisma.sgGeneration.update({
          where: { id: sg.id },
          data: { status: 'ERROR', errorMessage: message, completedAt: new Date() },
        }).catch(() => {})
        send({ type: 'error', message })
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

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: versionId } = await params
  const latest = await prisma.sgGeneration.findFirst({
    where: { versionId },
    orderBy: { startedAt: 'desc' },
  })
  if (!latest) return new Response('Not found', { status: 404 })
  return Response.json(latest)
}
