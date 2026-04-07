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
  const { params: sgParams, resumeFrom } = await req.json() as { params?: SgParams; resumeFrom?: string }

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

  // 既存のエラー/実行中 generation を再利用、なければ新規作成
  let generation = await prisma.sgGeneration.findFirst({
    where: { versionId, status: { not: 'COMPLETED' } },
    orderBy: { startedAt: 'desc' },
  })

  if (!generation || sgParams) {
    // 新規パラメータ指定 or 存在しない場合は新規作成
    generation = await prisma.sgGeneration.create({
      data: {
        versionId,
        status: 'RUNNING',
        startedAt: new Date(),
      },
    })
  } else {
    // 既存を再開状態にリセット
    generation = await prisma.sgGeneration.update({
      where: { id: generation.id },
      data: { status: 'RUNNING', errorMessage: null, currentStep: resumeFrom ?? null },
    })
  }

  // AG出力を収集
  const agOutputs: Record<string, unknown> = {}
  for (const exec of version.executions) {
    const result = exec.results[0]
    if (!result) continue
    const parsed = safeParseJson(result.editedJson ?? result.outputJson)
    if (parsed) agOutputs[exec.agentId] = parsed
  }

  const params_parsed: SgParams = (sgParams as SgParams) ?? {}

  // バックグラウンドで実行（レスポンスは即時返す）
  runSgPipeline(
    generation.id,
    version.project.client.name,
    version.project.briefText,
    agOutputs,
    params_parsed,
  ).catch(err => console.error('SG pipeline error:', err))

  return Response.json({ generationId: generation.id })
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
