/**
 * POST /api/executions/[versionId]/restart
 * body: { fromAgentId?: string }
 *
 * fromAgentId が指定された場合: そのAG以降の実行結果のみ削除して再開準備
 * 未指定の場合: 全結果を削除して最初からやり直し
 */
import { NextRequest } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// パイプライン実行順序（resume/route.ts と同じ定義を維持）
const AGENT_ORDER = [
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
  const body = await req.json().catch(() => ({}))
  const fromAgentId: string | undefined = body.fromAgentId

  const version = await prisma.proposalVersion.findUnique({ where: { id: versionId } })
  if (!version) return new Response('Not found', { status: 404 })

  // 削除対象のエージェントを決定
  const fromIndex = fromAgentId ? AGENT_ORDER.indexOf(fromAgentId) : 0
  const agentsToReset = fromIndex >= 0
    ? AGENT_ORDER.slice(fromIndex)
    : AGENT_ORDER // fromAgentId が見つからない場合は全件

  // 対象エージェントの実行結果を削除
  const executions = await prisma.execution.findMany({
    where: { versionId, agentId: { in: agentsToReset } },
  })
  for (const exec of executions) {
    await prisma.agentResult.deleteMany({ where: { executionId: exec.id } })
  }
  await prisma.execution.deleteMany({
    where: { versionId, agentId: { in: agentsToReset } },
  })

  // バージョンステータスを DRAFT に戻す（resume が拾えるように）
  await prisma.proposalVersion.update({
    where: { id: versionId },
    data: { status: 'DRAFT', completedAt: null },
  })

  return new Response(JSON.stringify({
    ok: true,
    fromAgentId: fromAgentId ?? 'AG-01',
    resetCount: agentsToReset.length,
  }), { headers: { 'Content-Type': 'application/json' } })
}
