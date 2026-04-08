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

  const proposals = await prisma.sgGeneration.findMany({
    where: { versionId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      variant: true,
      narrativeType: true,
      targetScope: true,
      focusChapters: true,
      status: true,
      currentStep: true,
      errorMessage: true,
      tone: true,
      orientation: true,
      slideCount: true,
      audience: true,
      pdfPath: true,
      startedAt: true,
      completedAt: true,
      createdAt: true,
    },
  })

  return NextResponse.json({ proposals })
}
