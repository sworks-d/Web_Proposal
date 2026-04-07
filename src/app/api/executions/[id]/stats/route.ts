import { NextRequest } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const remaining = seconds % 60
  return minutes > 0 ? `${minutes}分${remaining}秒` : `${seconds}秒`
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: versionId } = await params

  const executions = await prisma.execution.findMany({
    where: { versionId },
    include: {
      results: {
        select: { agentId: true, durationMs: true, status: true, createdAt: true, completedAt: true },
      },
    },
    orderBy: { startedAt: 'asc' },
  })

  const agentStats = executions.flatMap(e =>
    e.results.map(r => ({
      agentId: r.agentId,
      durationMs: r.durationMs ?? (r.completedAt && r.createdAt
        ? new Date(r.completedAt).getTime() - new Date(r.createdAt).getTime()
        : null),
      status: r.status,
    }))
  )

  const totalDurationMs = agentStats
    .filter(s => s.durationMs !== null)
    .reduce((sum, s) => sum + (s.durationMs ?? 0), 0)

  return Response.json({
    totalDurationMs,
    totalDurationFormatted: formatDuration(totalDurationMs),
    agentStats: agentStats.map(s => ({
      ...s,
      durationFormatted: s.durationMs ? formatDuration(s.durationMs) : '-',
    })),
  })
}
