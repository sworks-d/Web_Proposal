import { SgBaseAgent } from './sg-base-agent'
import { SgInput, Sg01Output, SgAgentId } from './sg-types'
import { loadPrompt } from '@/lib/prompt-loader'

const CHAPTER_MAP: Record<string, Record<string, string[]>> = {
  full: {
    base: ['problem', 'analysis', 'target', 'insight', 'concept', 'design', 'ia', 'content', 'kpi'],
  },
  strategy: {
    base: ['problem', 'target', 'insight', 'concept', 'vision'],
  },
  analysis: {
    base: ['current', 'competitive', 'user-behavior', 'issue-structure', 'direction'],
  },
  content: {
    base: ['content-problem', 'target-content', 'strategy', 'sitemap', 'page-design'],
  },
  improvement: {
    base: ['issues', 'priorities', 'measures', 'measure-detail', 'expected-outcome'],
  },
}

const CHAPTER_TITLES: Record<string, string> = {
  problem: '課題・現状認識',
  analysis: '分析・競合',
  target: 'ターゲット・カスタマージャーニー',
  insight: 'インサイト・コンセプト',
  concept: 'コンセプト',
  design: '設計方針・UX',
  ia: 'IA・コンテンツ設計',
  content: 'コンテンツ戦略',
  kpi: 'KPI・効果測定',
  vision: '実現した未来のビジョン',
  current: '現状分析',
  'competitive': '競合分析',
  'user-behavior': 'ユーザー行動分析',
  'issue-structure': '課題構造',
  direction: '改善方向性',
  'content-problem': 'コンテンツ課題',
  'target-content': 'ターゲット×コンテンツ',
  strategy: '戦略',
  sitemap: 'サイトマップ',
  'page-design': 'ページ設計',
  issues: '問題点',
  priorities: '課題優先順位',
  measures: '施策一覧',
  'measure-detail': '施策詳細',
  'expected-outcome': '期待効果',
}

const FOCUS_CHAPTER_MAP: Record<string, string> = {
  issue: 'problem',
  analysis: 'analysis',
  target: 'target',
  insight: 'insight',
  design: 'design',
}

export class Sg01Agent extends SgBaseAgent {
  id: SgAgentId = 'SG-01'
  name = '構成設計'
  protected modelType = 'quality' as const

  getSystemPrompt(): string {
    return loadPrompt('sg-01-structure')
  }

  buildUserMessage(input: SgInput): string {
    const { params, clientName, briefText } = input
    const chapters = CHAPTER_MAP[params.type]?.base ?? CHAPTER_MAP.full.base

    // Base allocation per chapter
    const basePerChapter = Math.floor(params.slideCount / chapters.length)
    const focusIds = params.focusChapters.map(f => FOCUS_CHAPTER_MAP[f]).filter(Boolean)

    const allocationHints = chapters.map(c => {
      const isFocus = focusIds.includes(c)
      const count = isFocus
        ? Math.round(basePerChapter * 1.6)
        : Math.max(2, basePerChapter)
      return `- ${CHAPTER_TITLES[c] ?? c}（${count}枚程度）${isFocus ? ' ← 重点章' : ''}`
    }).join('\n')

    const agContext = this.formatAgOutputs(input.agOutputs, [
      'AG-01-MERGE', 'AG-04-MAIN', 'AG-04-INSIGHT', 'AG-06',
    ])

    return `クライアント: ${clientName}
案件概要: ${briefText}

提案書種別: ${params.type}
総スライド数: ${params.slideCount}枚
対象章と枚数配分の目安:
${allocationHints}

重点章: ${params.focusChapters.length > 0 ? params.focusChapters.map(f => FOCUS_CHAPTER_MAP[f] ?? f).join('、') : 'なし'}
想定する各章のスライド数は上記目安に従い、合計が${params.slideCount}に近くなるよう設計してください。

## 分析データ（参考）
${agContext || '（分析データなし）'}

各スライドのslot idは "chapter-id_1", "chapter-id_2" のように命名してください。
必ずJSONのみを返してください。`
  }

  async run(input: SgInput): Promise<Sg01Output> {
    return super.run(input) as Promise<Sg01Output>
  }
}
