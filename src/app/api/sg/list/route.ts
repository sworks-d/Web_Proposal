import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET /api/sg/list?versionId=xxx
export async function GET(req: Request) {
  const url = new URL(req.url)
  const versionId = url.searchParams.get('versionId')

  if (!versionId) {
    return NextResponse.json({ error: 'versionId is required' }, { status: 400 })
  }

  const generations = await prisma.sgGeneration.findMany({
    where: { versionId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      status: true,
      currentStep: true,
      errorMessage: true,
      proposalType: true,
      tone: true,
      orientation: true,
      slideCount: true,
      audience: true,
      pdfPath: true,
      startedAt: true,
      completedAt: true,
      createdAt: true,
      sg01Output: false,
      sg02Output: false,
      sg04Output: false,
      sg06Output: false,
      slidesJson: false,
    },
  })

  return NextResponse.json(generations)
}
