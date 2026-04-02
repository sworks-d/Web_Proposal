import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { versionId, overallScore, weakestAgent, competitorScore,
          targetScore, storyUsability, bestChapter, freeComment } = body

  const autoFlagAgents: string[] = []
  if (weakestAgent !== 'none') autoFlagAgents.push(weakestAgent)
  if (competitorScore <= 2 && !autoFlagAgents.includes('ag-03-competitor'))
    autoFlagAgents.push('ag-03-competitor')
  if (targetScore <= 2 && !autoFlagAgents.includes('ag-04-insight'))
    autoFlagAgents.push('ag-04-insight')
  if (storyUsability === 'rebuild' && !autoFlagAgents.includes('ag-07-story'))
    autoFlagAgents.push('ag-07-story')

  const flagList = [...new Set(autoFlagAgents)]

  const feedback = await prisma.proposalFeedback.create({
    data: {
      versionId,
      overallScore,
      weakestAgent,
      competitorScore,
      targetScore,
      storyUsability,
      bestChapter,
      freeComment: freeComment || null,
      autoFlagAgents: JSON.stringify(flagList),
    },
  })

  // freeCommentがある場合、改善候補として pending PromptVersion を記録
  if (freeComment && flagList.length > 0) {
    await prisma.promptVersion.create({
      data: {
        agentId: flagList[0],
        version: -1,
        content: '',
        changeNote: 'フィードバック由来の改善候補',
        cdFeedback: freeComment,
      },
    })
  }

  return NextResponse.json({ id: feedback.id, autoFlagAgents: flagList })
}

export async function GET() {
  const feedbacks = await prisma.proposalFeedback.findMany({
    orderBy: { submittedAt: 'desc' },
    take: 50,
  })

  const avg = (arr: number[]) =>
    arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0

  const countBy = (arr: { [key: string]: string }[], key: string) =>
    arr.reduce((acc: Record<string, number>, item) => {
      const val = item[key] as string
      acc[val] = (acc[val] || 0) + 1
      return acc
    }, {})

  return NextResponse.json({
    totalFeedbacks: feedbacks.length,
    avgOverallScore: avg(feedbacks.map(f => f.overallScore)).toFixed(1),
    avgCompetitorScore: avg(feedbacks.map(f => f.competitorScore)).toFixed(1),
    avgTargetScore: avg(feedbacks.map(f => f.targetScore)).toFixed(1),
    weakestAgentDistribution: countBy(feedbacks as any[], 'weakestAgent'),
    storyUsabilityDistribution: countBy(feedbacks as any[], 'storyUsability'),
    recentFreeComments: feedbacks
      .filter(f => f.freeComment)
      .slice(0, 10)
      .map(f => ({
        comment: f.freeComment,
        agentFlags: JSON.parse(f.autoFlagAgents),
        date: f.submittedAt,
      })),
  })
}
