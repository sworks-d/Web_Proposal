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

  if (sg.status !== 'COMPLETED') {
    return NextResponse.json(
      { error: 'Not completed', status: sg.status, currentStep: sg.currentStep },
      { status: 202 }
    )
  }

  if (!sg.htmlOutput) {
    return NextResponse.json({ error: 'HTML output not found' }, { status: 404 })
  }

  return new Response(sg.htmlOutput, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}
