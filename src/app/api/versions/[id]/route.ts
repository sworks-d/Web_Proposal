import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const version = await prisma.proposalVersion.findUnique({
    where: { id },
    include: {
      executions: {
        include: { results: true },
        orderBy: { startedAt: 'asc' },
      },
      slides: { orderBy: { slideNumber: 'asc' } },
      project: { include: { client: true } },
    },
  })
  if (!version) return new Response('Not found', { status: 404 })
  return NextResponse.json(version)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { cdNotes, label } = await req.json()
  const updated = await prisma.proposalVersion.update({
    where: { id },
    data: {
      cdNotes: cdNotes !== undefined ? JSON.stringify(cdNotes) : undefined,
      label: label ?? undefined,
    },
  })
  return NextResponse.json(updated)
}
