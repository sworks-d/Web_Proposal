import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET() {
  const pending = await prisma.promptVersion.findMany({
    where: { version: -1 },
    orderBy: { appliedAt: 'desc' },
    take: 20,
  })
  return NextResponse.json(pending)
}
