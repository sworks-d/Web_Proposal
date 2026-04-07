import { NextRequest } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const gen = await prisma.sgGeneration.findUnique({ where: { id } })
  if (!gen) return new Response('Not found', { status: 404 })

  return Response.json({
    id: gen.id,
    status: gen.status,
    currentStep: gen.currentStep,
    errorMessage: gen.errorMessage,
    startedAt: gen.startedAt,
    completedAt: gen.completedAt,
    hasOutput: {
      'SG-01': !!gen.sg01Output,
      'SG-02': !!gen.sg02Output,
      'SG-03': !!gen.sg03Output,
      'SG-04': !!gen.sg04Output,
      'SG-05': !!gen.sg05Output,
      'SG-06': !!gen.sg06Output,
    },
  })
}
