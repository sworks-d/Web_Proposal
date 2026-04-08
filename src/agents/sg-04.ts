import { SgBaseAgent } from './sg-base-agent'
import { SgInput, Sg04Output, SgSlideContent, Sg01Output, Sg02Output, Sg03Output, SgAgentId, SgChapterDef } from './sg-types'
import { loadPrompt } from '@/lib/prompt-loader'

// 章IDごとに参照すべきAGデータキーを定義
const AG_CHAPTER_RELEVANCE: Record<string, string[]> = {
  // 課題・現状認識
  'problem':          ['AG-04-MAIN', 'AG-04-INSIGHT', 'AG-01-MERGE', 'AG-01-RESEARCH'],
  // 分析・競合
  'analysis':         ['AG-03', 'AG-03-HEURISTIC', 'AG-03-HEURISTIC2', 'AG-03-GAP', 'AG-03-MERGE'],
  'competitive':      ['AG-03', 'AG-03-HEURISTIC', 'AG-03-HEURISTIC2', 'AG-03-MERGE'],
  'current':          ['AG-03', 'AG-03-DATA', 'AG-01-RESEARCH'],
  // ターゲット・ジャーニー
  'target':           ['AG-02-STP', 'AG-02-JOURNEY', 'AG-02-VPC', 'AG-02-MERGE'],
  // インサイト・コンセプト
  'insight':          ['AG-04-INSIGHT', 'AG-04-MERGE', 'AG-02-VPC'],
  'concept':          ['AG-04-INSIGHT', 'AG-04-MERGE', 'AG-06'],
  // 設計・UX
  'design':           ['AG-06', 'AG-07A', 'AG-04-MERGE'],
  // IA・コンテンツ
  'ia':               ['AG-06', 'AG-07A', 'AG-07B'],
  'content':          ['AG-06', 'AG-07A', 'AG-03-GAP'],
  // KPI
  'kpi':              ['AG-06', 'AG-04-MERGE'],
  // ビジョン
  'vision':           ['AG-04-INSIGHT', 'AG-06'],
  // 改善系
  'user-behavior':    ['AG-02-JOURNEY', 'AG-03-DATA'],
  'issue-structure':  ['AG-04-MAIN', 'AG-04-MERGE'],
  'direction':        ['AG-04-MERGE', 'AG-06'],
  'content-problem':  ['AG-03-GAP', 'AG-06'],
  'target-content':   ['AG-02-STP', 'AG-02-JOURNEY', 'AG-03-GAP'],
  'strategy':         ['AG-04-MERGE', 'AG-06'],
  'sitemap':          ['AG-06', 'AG-07A'],
  'page-design':      ['AG-06', 'AG-07A', 'AG-07B'],
  'issues':           ['AG-04-MAIN', 'AG-04-INSIGHT'],
  'priorities':       ['AG-04-MERGE'],
  'measures':         ['AG-06', 'AG-04-MERGE'],
  'measure-detail':   ['AG-06', 'AG-07A'],
  'expected-outcome': ['AG-06', 'AG-04-MERGE'],
}

const DEFAULT_AG_KEYS = ['AG-04-INSIGHT', 'AG-04-MERGE', 'AG-06']

export class Sg04Agent extends SgBaseAgent {
  id: SgAgentId = 'SG-04'
  name = '本文生成'
  protected modelType = 'quality' as const
  protected maxTokens = 8192  // チャプター分割実行でも十分な出力量を確保

  getSystemPrompt(): string {
    return loadPrompt('sg-04-content')
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

    const relevantKeys = AG_CHAPTER_RELEVANCE[chapter.id] ?? DEFAULT_AG_KEYS
    const agContext = this.formatAgOutputs(input.agOutputs, relevantKeys)

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
        // チャプター失敗時は明示的に失敗マークを付ける
        for (const slot of chapter.slots) {
          allSlides.push({
            slotId: slot.id,
            chapterId: chapter.id,
            title: `[生成失敗] ${slot.role}`,
            body: [`※ このスライドはAIによる本文生成に失敗しました。手動での記入が必要です。`, `目的: ${slot.purpose}`],
            notes: `生成エラー: ${err instanceof Error ? err.message : String(err)}`,
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
    const chapterId = input._chapter?.id ?? '?'
    const raw = await callClaude(system, user, { modelType: this.modelType, maxTokens: this.maxTokens, agentId: `SG-04:${chapterId}` })
    return this.parseResponse(raw) as Sg04Output
  }
}
