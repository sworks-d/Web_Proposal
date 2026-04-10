import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { createSgGeneration, runProposalGeneration, SgPipelineInput } from '@/lib/sg/sg-pipeline'
import { ProposalVariant, NarrativeType, ToneType, ConceptDirection } from '@/lib/sg/types'

const prisma = new PrismaClient()

export const maxDuration = 600

export async function POST(req: Request) {
  const body = await req.json()

  if (!body.versionId) {
    return NextResponse.json({ error: 'versionId is required' }, { status: 400 })
  }
  if (!body.variant) {
    return NextResponse.json({ error: 'variant is required' }, { status: 400 })
  }
  if (!body.selectedDirection) {
    return NextResponse.json({ error: 'selectedDirection is required' }, { status: 400 })
  }

  const selectedDirection = body.selectedDirection as ConceptDirection

  // sgIdが指定されている場合は既存レコードを再利用、なければ新規作成
  let sgId: string = body.sgId

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
    selectedDirection,
  }

  if (!sgId) {
    try {
      sgId = await createSgGeneration(input)
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : String(err) },
        { status: 500 }
      )
    }
  } else {
    // 既存レコードをRUNNING状態に戻す
    try {
      await prisma.sgGeneration.update({
        where: { id: sgId },
        data: {
          tone: input.tone,
          slideCount: input.slideCount,
          audience: input.audience,
          focusChapters: input.focusChapters ? JSON.stringify(input.focusChapters) : null,
          status: 'RUNNING',
          startedAt: new Date(),
          errorMessage: null,
          completedAt: null,
        },
      })
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : String(err) },
        { status: 500 }
      )
    }
  }

  // バックグラウンドで実行（レスポンスは即時返す）
  runProposalGeneration(sgId, input, selectedDirection).catch(err =>
    console.error(`[SG] generation error for ${sgId}:`, err)
  )

  return NextResponse.json({ sgId })
}
