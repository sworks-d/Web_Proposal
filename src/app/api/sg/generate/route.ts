import { NextResponse } from 'next/server'
import { createSgGeneration, executeSgPipeline, SgPipelineInput } from '@/lib/sg/sg-pipeline'
import { ProposalVariant, NarrativeType, ToneType } from '@/lib/sg/types'

export const maxDuration = 600

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
    orientation: body.orientation || 'landscape',
    slideCount: body.slideCount || 25,
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

  // バックグラウンドで実行（レスポンスは即時返す）
  executeSgPipeline(sgId, input).catch(err =>
    console.error(`[SG] pipeline error for ${sgId}:`, err)
  )

  return NextResponse.json({ sgId })
}
