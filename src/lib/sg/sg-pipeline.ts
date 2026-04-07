import { PrismaClient } from '@prisma/client'
import { callClaude } from '@/lib/anthropic-client'
import { loadPrompt } from '@/lib/prompt-loader'
import { Sg01Output, Sg02Output, Sg04Output, Slide, ToneType } from './types'
import { renderSlides } from './slide-renderer'
import { generatePdf } from './pdf-generator'

const prisma = new PrismaClient()

export interface SgPipelineInput {
  versionId: string
  proposalType?: string
  tone: ToneType
  orientation: 'landscape' | 'portrait'
  slideCount: number
  audience: 'executive' | 'manager' | 'creative'
}

async function updateStep(sgId: string, step: string) {
  await prisma.sgGeneration.update({
    where: { id: sgId },
    data: { currentStep: step },
  })
}

function parseJson<T>(raw: string, agentId: string): T {
  let cleaned = raw
    .replace(/^```json\s*/im, '')
    .replace(/^```\s*/im, '')
    .replace(/\s*```\s*$/m, '')
    .trim()

  const jsonStart = cleaned.search(/[{[]/)
  if (jsonStart > 0) cleaned = cleaned.slice(jsonStart)

  const lastClose = Math.max(cleaned.lastIndexOf('}'), cleaned.lastIndexOf(']'))
  if (lastClose >= 0 && lastClose < cleaned.length - 1) {
    cleaned = cleaned.slice(0, lastClose + 1)
  }

  try {
    return JSON.parse(cleaned) as T
  } catch {
    const openBraces = (cleaned.match(/{/g) ?? []).length
    const closeBraces = (cleaned.match(/}/g) ?? []).length
    const openBrackets = (cleaned.match(/\[/g) ?? []).length
    const closeBrackets = (cleaned.match(/]/g) ?? []).length

    let fixed = cleaned.replace(/[,:\s]+$/, '')
    for (let i = 0; i < openBrackets - closeBrackets; i++) fixed += ']'
    for (let i = 0; i < openBraces - closeBraces; i++) fixed += '}'

    try {
      return JSON.parse(fixed) as T
    } catch {
      throw new Error(`${agentId} JSON parse failed. Raw: ${raw.slice(0, 500)}`)
    }
  }
}

async function getAgOutputs(versionId: string): Promise<Record<string, unknown>> {
  const executions = await prisma.execution.findMany({
    where: { versionId, status: 'COMPLETED' },
    include: { results: { where: { status: 'COMPLETED' } } },
  })

  const agOutputs: Record<string, unknown> = {}
  for (const exec of executions) {
    for (const result of exec.results) {
      if (result.outputJson) {
        try {
          const edited = result.editedJson ?? result.outputJson
          agOutputs[result.agentId] = JSON.parse(edited)
        } catch {
          // skip malformed
        }
      }
    }
  }
  return agOutputs
}

function formatAgOutputs(agOutputs: Record<string, unknown>, keys: string[]): string {
  return keys
    .filter(k => agOutputs[k])
    .map(k => `=== ${k} ===\n${JSON.stringify(agOutputs[k], null, 2).slice(0, 3000)}`)
    .join('\n\n')
}

async function runSg01(
  agOutputs: Record<string, unknown>,
  input: SgPipelineInput,
  clientName: string,
  briefText: string,
): Promise<Sg01Output> {
  const systemPrompt = await loadPrompt('sg-01-structure')
  const agContext = formatAgOutputs(agOutputs, [
    'AG-01-MERGE', 'AG-02-STP', 'AG-02-JOURNEY', 'AG-03-GAP', 'AG-03-COMPETITOR',
    'AG-04-MAIN', 'AG-04-INSIGHT', 'AG-06',
  ])

  const userMessage = `クライアント: ${clientName}
案件概要: ${briefText}

## パラメータ
- 想定スライド数: ${input.slideCount}枚
- 聴衆: ${input.audience}
- トーン: ${input.tone}
- 向き: ${input.orientation}
${input.proposalType && input.proposalType !== 'auto' ? `- 提案書の型（指定）: ${input.proposalType}` : '- 提案書の型: AGの内容から最適な型を自動選択してください'}

## AG分析データ
${agContext || '（分析データなし）'}

JSONのみを返してください。`

  const raw = await callClaude(systemPrompt, userMessage, { modelType: 'quality', maxTokens: 4096 })
  return parseJson<Sg01Output>(raw, 'SG-01')
}

async function runSg02(
  agOutputs: Record<string, unknown>,
  sg01Output: Sg01Output,
  clientName: string,
  briefText: string,
): Promise<Sg02Output> {
  const systemPrompt = await loadPrompt('sg-02-narrative')
  const agContext = formatAgOutputs(agOutputs, [
    'AG-01-MERGE', 'AG-02-STP', 'AG-02-JOURNEY', 'AG-03-GAP', 'AG-03-COMPETITOR',
    'AG-04-MAIN', 'AG-04-INSIGHT',
  ])

  const userMessage = `クライアント: ${clientName}
案件概要: ${briefText}

## 提案書の構成（SG-01出力）
${JSON.stringify(sg01Output, null, 2)}

## AG分析データ
${agContext || '（分析データなし）'}

JSONのみを返してください。`

  const raw = await callClaude(systemPrompt, userMessage, { modelType: 'premium', maxTokens: 8192 })
  return parseJson<Sg02Output>(raw, 'SG-02')
}

async function runSg04Chapter(
  agOutputs: Record<string, unknown>,
  sg01Output: Sg01Output,
  sg02Output: Sg02Output,
  chapter: Sg01Output['chapters'][number],
  startSlideNumber: number,
  input: SgPipelineInput,
): Promise<Slide[]> {
  const systemPrompt = await loadPrompt('sg-04-content')
  const chapterCopy = sg02Output.chapterCopies.find(c => c.chapterId === chapter.id)
  const agContext = formatAgOutputs(agOutputs, chapter.agSources)

  const userMessage = `## この章の情報
章ID: ${chapter.id}
章タイトル: ${chapter.title}
役割: ${chapter.role}
キーメッセージ: ${chapter.keyMessage}
読む前の心理: ${chapter.beforeState}
読んだ後の心理: ${chapter.afterState}
生成するスライド数: ${chapter.pageCount}枚
開始スライド番号: ${startSlideNumber}

## ナラティブ（SG-02）
${chapterCopy ? `見出し: ${chapterCopy.headline}
フックライン: ${chapterCopy.hookLine}
キーポイント: ${chapterCopy.keyPoint}
次章への橋渡し: ${chapterCopy.transition}` : '（ナラティブデータなし）'}

## コアインサイト
タイプ: ${sg02Output.coreInsight.type}
ステートメント: ${sg02Output.coreInsight.statement}
示唆: ${sg02Output.coreInsight.implication}

## パラメータ
- 聴衆: ${input.audience}
- トーン: ${input.tone}

## AGデータ（この章の参照ソース）
${agContext || '（AGデータなし）'}

JSONのみを返してください。`

  const raw = await callClaude(systemPrompt, userMessage, { modelType: 'quality', maxTokens: 4096 })
  const result = parseJson<Sg04Output>(raw, `SG-04:${chapter.id}`)

  // slideNumberをグローバル通番に変換
  return result.slides.map((s, i) => ({
    ...s,
    slideNumber: startSlideNumber + i,
    chapterId: chapter.id,
  }))
}

// SgGenerationレコードを作成してIDを返す（API routeからcall）
export async function createSgGeneration(input: SgPipelineInput): Promise<string> {
  const sg = await prisma.sgGeneration.create({
    data: {
      versionId: input.versionId,
      proposalType: input.proposalType || 'auto',
      tone: input.tone,
      orientation: input.orientation,
      slideCount: input.slideCount,
      audience: input.audience,
      status: 'RUNNING',
      startedAt: new Date(),
    },
  })
  return sg.id
}

// パイプライン実行（バックグラウンドで呼び出す）
export async function executeSgPipeline(sgId: string, input: SgPipelineInput): Promise<void> {
  // バージョン情報を取得
  const version = await prisma.proposalVersion.findUnique({
    where: { id: input.versionId },
    include: { project: { include: { client: true } } },
  })
  if (!version) throw new Error(`Version ${input.versionId} not found`)

  const clientName = version.project.client.name
  const briefText = version.project.briefText
  const sg = { id: sgId }

  try {
    // AG出力を取得
    const agOutputs = await getAgOutputs(input.versionId)

    // SG-01: 構成設計
    await updateStep(sg.id, 'SG-01')
    const sg01Output = await runSg01(agOutputs, input, clientName, briefText)
    await prisma.sgGeneration.update({
      where: { id: sg.id },
      data: { sg01Output: JSON.stringify(sg01Output) },
    })

    // SG-02: ナラティブ設計（Opus）
    await updateStep(sg.id, 'SG-02')
    const sg02Output = await runSg02(agOutputs, sg01Output, clientName, briefText)
    await prisma.sgGeneration.update({
      where: { id: sg.id },
      data: { sg02Output: JSON.stringify(sg02Output) },
    })

    // SG-04: 本文生成（チャプター分割）
    await updateStep(sg.id, 'SG-04')
    const allSlides: Slide[] = []
    let slideCounter = 1

    for (const chapter of sg01Output.chapters) {
      const chapterSlides = await runSg04Chapter(
        agOutputs, sg01Output, sg02Output, chapter, slideCounter, input
      )
      allSlides.push(...chapterSlides)
      slideCounter += chapterSlides.length
    }

    await prisma.sgGeneration.update({
      where: { id: sg.id },
      data: { sg04Output: JSON.stringify({ slides: allSlides }) },
    })

    // HTMLレンダリング
    await updateStep(sg.id, 'RENDERING')
    const slidesHtml = renderSlides(allSlides, input.tone, input.orientation)

    // PDF生成
    await updateStep(sg.id, 'PDF')
    const pdfPath = await generatePdf(slidesHtml, sg.id, input.orientation)

    // 完了
    await prisma.sgGeneration.update({
      where: { id: sg.id },
      data: {
        slidesJson: JSON.stringify(allSlides),
        pdfPath,
        status: 'COMPLETED',
        completedAt: new Date(),
        currentStep: null,
      },
    })
  } catch (error) {
    await prisma.sgGeneration.update({
      where: { id: sg.id },
      data: {
        status: 'ERROR',
        errorMessage: error instanceof Error ? error.message : String(error),
        completedAt: new Date(),
      },
    }).catch(() => {})
    throw error
  }
}
