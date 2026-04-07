import { SgBaseAgent } from './sg-base-agent'
import { SgInput, Sg04Output, Sg01Output, Sg02Output, Sg03Output, SgAgentId } from './sg-types'

export class Sg04Agent extends SgBaseAgent {
  id: SgAgentId = 'SG-04'
  name = '本文生成'
  protected modelType = 'quality' as const
  protected maxTokens = 8192

  getSystemPrompt(): string {
    return `あなたは提案書の本文ライターです。
各スライドの見出しと本文を、構成とコピーに沿って生成してください。

【ライティング原則】
- 本文は箇条書き3〜5項目が基本（1項目 = 20〜40字）
- 章のhookコピーをスライドの冒頭テキストに自然に反映する
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
      "notes": "プレゼンターへのメモ（何を強調するか等）"
    }
  ]
}`
  }

  buildUserMessage(input: SgInput): string {
    const { clientName, briefText, params } = input
    const sg01 = input.sgOutputs['SG-01'] as Sg01Output | undefined
    const sg02 = input.sgOutputs['SG-02'] as Sg02Output | undefined
    const sg03 = input.sgOutputs['SG-03'] as Sg03Output | undefined

    // Build ordered slot list
    const orderedIds = sg03?.orderedChapterIds ?? sg01?.chapters.map(c => c.id) ?? []
    const chapters = sg01?.chapters ?? []
    const chapterMap = Object.fromEntries(chapters.map(c => [c.id, c]))
    const pacedMap = Object.fromEntries((sg03?.pacedChapters ?? []).map(p => [p.id, p]))
    const copyMap = Object.fromEntries((sg02?.chapterCopies ?? []).map(c => [c.chapterId, c]))

    const slotList = orderedIds.flatMap(cid => {
      const ch = chapterMap[cid]
      if (!ch) return []
      const paced = pacedMap[cid]
      const copy = copyMap[cid]
      return ch.slots.map((slot, i) => ({
        slot,
        chapter: ch,
        isFirst: i === 0,
        hook: copy?.hook ?? '',
        heading: copy?.heading ?? ch.title,
        density: paced?.informationDensity ?? 'medium',
      }))
    })

    const slotDescriptions = slotList
      .map(({ slot, chapter, isFirst, hook, heading, density }) =>
        `[${slot.id}] 章: ${chapter.title} | 役割: ${slot.role} | 目的: ${slot.purpose}` +
        (isFirst ? ` | 章の見出しコピー: "${heading}" | フック: "${hook}"` : '') +
        ` | 情報密度: ${density}`
      )
      .join('\n')

    const agContext = this.formatAgOutputs(input.agOutputs, [
      'AG-04-INSIGHT', 'AG-04-MERGE', 'AG-03', 'AG-03-GAP', 'AG-06',
    ])

    const audienceNote = {
      executive: '経営層：数字・KPI・意思決定ポイントを前面に',
      manager: '担当者：実装ステップ・根拠・懸念点への対応も含める',
      creative: 'クリエイター：言葉のトーン・世界観・ビジュアルイメージを大切に',
    }[params.audience]

    return `クライアント: ${clientName}
案件概要: ${briefText}
プレゼン相手: ${audienceNote}

キーメッセージ: ${sg02?.keyMessage ?? '（未設定）'}
サブコピー: ${sg02?.subCopy ?? '（未設定）'}

## 生成すべきスライド一覧
${slotDescriptions}

## 分析データ（参考）
${agContext || '（分析データなし）'}

各スライドのtitleは見出し、bodyは箇条書きリストです。
スライド数が多い場合でも全スライドを生成してください。
必ずJSONのみを返してください。`
  }

  async run(input: SgInput): Promise<Sg04Output> {
    return super.run(input) as Promise<Sg04Output>
  }
}
