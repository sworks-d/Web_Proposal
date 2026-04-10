import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { createSgGeneration, runDirectionProposal, SgPipelineInput } from '@/lib/sg/sg-pipeline'
import { ProposalVariant, NarrativeType, ToneType } from '@/lib/sg/types'

const prisma = new PrismaClient()

export const maxDuration = 300

export async function POST(req: Request) {
  const body = await req.json()

  if (!body.versionId) {
    return NextResponse.json({ error: 'versionId is required' }, { status: 400 })
  }
  if (!body.variant) {
    return NextResponse.json({ error: 'variant is required' }, { status: 400 })
  }

  const input: SgPipelineInput = {
    versionId: body.versionId,
    name: body.name,
    variant: body.variant as ProposalVariant,
    narrativeType: body.narrativeType as NarrativeType | undefined,
    targetScope: body.targetScope,
    tone: (body.tone as ToneType) || 'simple',
    orientation: 'landscape',
    slideCount: body.slideCount || 20,
    audience: body.audience || 'manager',
    focusChapters: Array.isArray(body.focusChapters) ? body.focusChapters : undefined,
  }

  let sgId: string
  try {
    sgId = await createSgGeneration(input)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }

  // SG-00を実行して方向性を取得（同期: フロントが待つ）
  try {
    const directionOutput = await runDirectionProposal(sgId, input)
    return NextResponse.json({ sgId, directionOutput })
  } catch (err) {
    await prisma.sgGeneration.update({
      where: { id: sgId },
      data: {
        status: 'ERROR',
        errorMessage: err instanceof Error ? err.message : String(err),
        completedAt: new Date(),
      },
    }).catch(() => {})
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}
