/**
 * POST /api/executions/[versionId]/restart
 * 指定バージョンの全実行結果をクリアして最初からやり直す準備をする。
 * 実際のパイプライン再実行は /resume を呼ぶ。
 */
import { NextRequest } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: versionId } = await params

  const version = await prisma.proposalVersion.findUnique({ where: { id: versionId } })
  if (!version) return new Response('Not found', { status: 404 })

  // 全実行をERRORに更新し、エージェント結果を削除
  const executions = await prisma.execution.findMany({ where: { versionId } })
  for (const exec of executions) {
    await prisma.agentResult.deleteMany({ where: { executionId: exec.id } })
  }
  await prisma.execution.deleteMany({ where: { versionId } })

  // バージョンをDRAFTに戻す
  await prisma.proposalVersion.update({
    where: { id: versionId },
    data: { status: 'DRAFT', completedAt: null },
  })

  return new Response(JSON.stringify({ ok: true, message: 'リセット完了' }), {
    headers: { 'Content-Type': 'application/json' },
  })
}
