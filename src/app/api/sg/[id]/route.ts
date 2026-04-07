import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const sg = await prisma.sgGeneration.findUnique({
    where: { id },
  })

  if (!sg) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({
    id: sg.id,
    status: sg.status,
    currentStep: sg.currentStep,
    errorMessage: sg.errorMessage,
    proposalType: sg.proposalType,
    tone: sg.tone,
    orientation: sg.orientation,
    slideCount: sg.slideCount,
    audience: sg.audience,
    pdfPath: sg.pdfPath,
    startedAt: sg.startedAt,
    completedAt: sg.completedAt,
    createdAt: sg.createdAt,
    hasOutput: {
      'SG-01': !!sg.sg01Output,
      'SG-02': !!sg.sg02Output,
      'SG-04': !!sg.sg04Output,
      slides: !!sg.slidesJson,
      pdf: !!sg.pdfPath,
    },
  })
}
