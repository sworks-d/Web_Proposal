import { BaseAgent } from './base-agent'
import { AgentId, AgentOutput, ProjectContext } from './types'
import { loadPrompt } from '@/lib/prompt-loader'

export class Ag07c4Agent extends BaseAgent {
  id: AgentId = 'AG-07C-4'
  name = '提案書サマリー（conceptWords + storyLine）'
  protected modelType = 'fast' as const

  getPrompt(_ctx: ProjectContext): string {
    return loadPrompt('ag-07c-4')
  }

  parseOutput(raw: string): AgentOutput {
    try {
      const p = this.parseJSON<Record<string, unknown>>(raw)
      const sections = []

      if (p.conceptWords && Array.isArray(p.conceptWords)) sections.push({
        id: 'concept-words', title: 'コンセプトワード（3案）',
        content: (p.conceptWords as Array<Record<string, unknown>>)
          .map(c => `**案${c.id}（${c.axis}）**\n${c.copy}\n${c.subCopy}\n${c.rationale}`)
          .join('\n\n'),
        sectionType: 'text', isEditable: true, canRegenerate: true,
      })

      if (p.storyLine && Array.isArray(p.storyLine)) sections.push({
        id: 'story-line', title: '提案書ストーリーライン',
        content: (p.storyLine as Array<Record<string, unknown>>)
          .map(ch => `**${ch.chapterId}：${ch.chapterTitle}**\n役割: ${ch.role}\nキーメッセージ: ${ch.keyMessage}\n次章への橋渡し: ${ch.bridgeToNext}`)
          .join('\n\n'),
        sectionType: 'text', isEditable: true, canRegenerate: true,
      })

      if (p.cdSummary) {
        const cd = p.cdSummary as Record<string, unknown>
        const lines = []
        if (cd.readyToUse && Array.isArray(cd.readyToUse)) {
          lines.push(`**使えるコンテンツ**\n${(cd.readyToUse as string[]).join('\n')}`)
        }
        if (cd.priorityReview && Array.isArray(cd.priorityReview)) {
          lines.push(`**要確認スライド**\n${(cd.priorityReview as Array<Record<string, unknown>>).map(r => `${r.slideId}: ${r.reason}`).join('\n')}`)
        }
        sections.push({
          id: 'cd-summary', title: 'CDへの整理メモ',
          content: lines.join('\n\n'),
          sectionType: 'text', isEditable: true, canRegenerate: true,
        })
      }

      return {
        agentId: this.id,
        sections: sections.length > 0 ? sections : [{ id: 'raw', title: '提案書サマリー', content: raw, sectionType: 'text', isEditable: true, canRegenerate: true }],
        visualizations: [],
        metadata: {
          confidence: (p.confidence as 'high' | 'medium' | 'low') ?? 'medium',
          factBasis: [],
          assumptions: [],
          missingInfo: [],
        },
      }
    } catch {
      return {
        agentId: this.id,
        sections: [{ id: 'raw', title: '提案書サマリー（パース失敗）', content: raw, sectionType: 'text', isEditable: true, canRegenerate: true }],
        visualizations: [],
        metadata: { confidence: 'low', factBasis: [], assumptions: [], missingInfo: [] },
      }
    }
  }
}
