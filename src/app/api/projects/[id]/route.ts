import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const project = await prisma.project.findUnique({
    where: { id },
    include: { client: true },
  })
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(project)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  // Cascade delete: AgentResult → Execution → ProposalVersion → Project
  const versions = await prisma.proposalVersion.findMany({ where: { projectId: id }, select: { id: true } })
  const versionIds = versions.map(v => v.id)

  const executions = await prisma.execution.findMany({ where: { versionId: { in: versionIds } }, select: { id: true } })
  const executionIds = executions.map(e => e.id)

  await prisma.agentResult.deleteMany({ where: { executionId: { in: executionIds } } })
  await prisma.execution.deleteMany({ where: { id: { in: executionIds } } })
  await prisma.proposalVersion.deleteMany({ where: { projectId: id } })
  await prisma.project.delete({ where: { id } })

  return new Response(null, { status: 204 })
}
