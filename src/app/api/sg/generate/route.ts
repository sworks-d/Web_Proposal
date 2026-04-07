import { NextResponse } from 'next/server'
import { createSgGeneration, executeSgPipeline, SgPipelineInput } from '@/lib/sg/sg-pipeline'

export const maxDuration = 600

export async function POST(req: Request) {
  const body = await req.json()

  if (!body.versionId) {
    return NextResponse.json({ error: 'versionId is required' }, { status: 400 })
  }

  const input: SgPipelineInput = {
    versionId: body.versionId,
    proposalType: body.proposalType,
    tone: body.tone || 'simple',
    orientation: body.orientation || 'landscape',
    slideCount: body.slideCount || 25,
    audience: body.audience || 'manager',
  }

  let sgId: string
  try {
    // SgGenerationレコードを先に作成（IDを即返すため）
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
