import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET() {
  const clients = await prisma.client.findMany({ orderBy: { updatedAt: 'desc' } })
  return NextResponse.json(clients)
}

export async function POST(req: NextRequest) {
  const { name, industry, size, notes } = await req.json()
  if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 })
  const client = await prisma.client.upsert({
    where: { name },
    update: { industry, size, notes },
    create: { name, industry, size, notes },
  })
  return NextResponse.json(client)
}
