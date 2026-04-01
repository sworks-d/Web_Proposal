import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET() {
  const projects = await prisma.project.findMany({
    include: {
      client: true,
      versions: {
        orderBy: { versionNumber: 'desc' },
        take: 1,
        select: {
          id: true,
          versionNumber: true,
          label: true,
          status: true,
          createdAt: true,
          executions: {
            select: { agentId: true, status: true, isInherited: true },
          },
        },
      },
    },
    orderBy: { updatedAt: 'desc' },
  })
  return NextResponse.json(projects)
}

export async function POST(req: NextRequest) {
  const { clientName, title, briefText, industryType } = await req.json()
  if (!clientName || !title || !briefText) {
    return NextResponse.json({ error: 'clientName, title, briefText are required' }, { status: 400 })
  }
  const client = await prisma.client.upsert({
    where: { name: clientName },
    update: {},
    create: { name: clientName },
  })
  const project = await prisma.project.create({
    data: { clientId: client.id, title, briefText, industryType: industryType ?? 'general' },
    include: { client: true },
  })
  return NextResponse.json(project)
}
