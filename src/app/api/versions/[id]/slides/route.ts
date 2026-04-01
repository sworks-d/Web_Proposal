import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { generateSlides } from '@/lib/slide-generator'

const prisma = new PrismaClient()

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const slides = await prisma.proposalSlide.findMany({
    where: { versionId: id },
    orderBy: { slideNumber: 'asc' },
  })
  return NextResponse.json(slides)
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const slides = await generateSlides(id)
    return NextResponse.json(slides)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to generate slides' },
      { status: 500 }
    )
  }
}
