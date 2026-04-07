import { SgBaseAgent } from './sg-base-agent'
import { SgInput, Sg04Output, SgSlideContent, Sg01Output, Sg02Output, Sg03Output, SgAgentId, SgChapterDef } from './sg-types'

export class Sg04Agent extends SgBaseAgent {
  id: SgAgentId = 'SG-04'
  name = '本文生成'
  protected modelType = 'quality' as const
  protected maxTokens = 4096  // 1チャプター分に絞る

  getSystemPrompt(): string {
    return `あなたは提案書の本文ライターです。
指定されたチャプターのスライド本文を生成してください。

【ライティング原則】
- 本文は箇条書き3〜5項目が基本（1項目 = 20〜40字）
- データ・数字があれば積極的に使う（「約○割」「○社中○社」等）
- 抽象語で終わらず、具体的な言葉で締める

出力はJSON形式のみ：
{
  "slides": [
    {
      "slotId": "slot-id",
      "chapterId": "chapter-id",
      "title": "スライドの見出し（20字以内）",
      "body": ["箇条書き1", "箇条書き2", "箇条書き3"],
      "notes": "プレゼンターへのメモ"
    }
  ]
}`
  }

  buildUserMessage(input: SgInput & { _chapter?: SgChapterDef }): string {
    const { clientName, briefText, params } = input
    const sg02 = input.sgOutputs['SG-02'] as Sg02Output | undefined
    const sg03 = input.sgOutputs['SG-03'] as Sg03Output | undefined
    const chapter = input._chapter!

    const pacedMap = Object.fromEntries((sg03?.pacedChapters ?? []).map(p => [p.id, p]))
    const copyMap = Object.fromEntries((sg02?.chapterCopies ?? []).map(c => [c.chapterId, c]))

    const paced = pacedMap[chapter.id]
    const copy = copyMap[chapter.id]

    const slotDescriptions = chapter.slots.map((slot, i) =>
      `[${slot.id}] 役割: ${slot.role} | 目的: ${slot.purpose}` +
      (i === 0 && copy ? ` | 見出しコピー: "${copy.heading}" | フック: "${copy.hook}"` : '') +
      (paced ? ` | 情報密度: ${paced.informationDensity}` : '')
    ).join('\n')

    const agContext = this.formatAgOutputs(input.agOutputs, [
      'AG-04-INSIGHT', 'AG-04-MERGE', 'AG-03', 'AG-03-GAP', 'AG-06',
    ])

    const audienceNote = {
      executive: '経営層：数字・KPI・意思決定ポイントを前面に',
      manager: '担当者：実装ステップ・根拠・懸念点への対応も含める',
      creative: 'クリエイター：言葉のトーン・世界観を大切に',
    }[params.audience]

    return `クライアント: ${clientName}
案件概要: ${briefText}
プレゼン相手: ${audienceNote}

キーメッセージ: ${sg02?.keyMessage ?? '（未設定）'}

## 対象チャプター: ${chapter.title}（${chapter.chapterRole}）
${slotDescriptions}

## 分析データ（参考）
${agContext || '（分析データなし）'}

このチャプターの全スライドを生成してください。
必ずJSONのみを返してください。`
  }

  // チャプターごとに分割実行してマージ
  async run(input: SgInput): Promise<Sg04Output> {
    const sg01 = input.sgOutputs['SG-01'] as Sg01Output | undefined
    const chapters = sg01?.chapters ?? []

    if (chapters.length === 0) {
      return super.run(input) as Promise<Sg04Output>
    }

    const allSlides: SgSlideContent[] = []

    for (const chapter of chapters) {
      const chapterInput = { ...input, _chapter: chapter }
      try {
        const result = await this.runSingleChapter(chapterInput)
        allSlides.push(...result.slides)
      } catch (err) {
        console.error(`SG-04 chapter ${chapter.id} failed:`, err)
        // チャプター失敗時はスロットのデフォルトで埋める
        for (const slot of chapter.slots) {
          allSlides.push({
            slotId: slot.id,
            chapterId: chapter.id,
            title: slot.role,
            body: [slot.purpose],
            notes: '',
          })
        }
      }
    }

    return { slides: allSlides }
  }

  private async runSingleChapter(input: SgInput & { _chapter?: SgChapterDef }): Promise<Sg04Output> {
    const system = this.getSystemPrompt()
    const user = this.buildUserMessage(input)
    const { callClaude } = await import('@/lib/anthropic-client')
    const raw = await callClaude(system, user, { modelType: this.modelType, maxTokens: this.maxTokens })
    return this.parseResponse(raw) as Sg04Output
  }
}
