import { BaseAgent } from './base-agent'
import { AgentId, AgentOutput, ProjectContext } from './types'
import { loadPrompt } from '@/lib/prompt-loader'

export class Ag07cStoryAgent extends BaseAgent {
  id: AgentId = 'AG-07C'
  name = 'ストーリーエディター（提案書草案執筆）'
  protected modelType = 'quality' as const

  getPrompt(_ctx: ProjectContext): string {
    return loadPrompt('ag-07c-story')
  }

  parseOutput(raw: string): AgentOutput {
    try {
      const p = this.parseJSON<Record<string, unknown>>(raw)
      const sections = []

      if (p.conceptWords && Array.isArray(p.conceptWords)) sections.push({
        id: 'concept-words', title: 'コンセプトワード（3案）',
        content: (p.conceptWords as Array<Record<string, unknown>>)
          .map((c, i) => `**案${i + 1}: ${c.copy}**\nサブコピー: ${c.subCopy ?? ''}\n根拠: ${c.rationale}`)
          .join('\n\n'),
        sectionType: 'text', isEditable: true, canRegenerate: true,
      })

      if (p.storyLine && Array.isArray(p.storyLine)) sections.push({
        id: 'story-line', title: 'ストーリーライン（章構成）',
        content: (p.storyLine as Array<Record<string, unknown>>)
          .map(ch => `**${ch.chapterTitle}**（推定${ch.estimatedSlides ?? '?'}枚）\nキーメッセージ: ${ch.keyMessage ?? ''}\n役割: ${ch.role}`)
          .join('\n\n'),
        sectionType: 'text', isEditable: true, canRegenerate: true,
      })

      if (p.slides && Array.isArray(p.slides)) {
        const slides = p.slides as Array<Record<string, unknown>>
        // Group slides by chapter
        const slidesByChapter: Record<string, typeof slides> = {}
        for (const slide of slides) {
          const chId = String(slide.slideId ?? '').split('-').slice(0, 2).join('-')
          if (!slidesByChapter[chId]) slidesByChapter[chId] = []
          slidesByChapter[chId].push(slide)
        }
        for (const [chId, chSlides] of Object.entries(slidesByChapter)) {
          sections.push({
            id: `slides-${chId}`, title: `スライド草案（${chId}）`,
            content: chSlides.map(s => {
              const catchOptions = (s.catchCopy_options as string[] ?? []).slice(0, 2).join(' / ')
              return `**[${s.slideId}] ${s.slideTitle}**\nキャッチ案: ${catchOptions}\n\n${s.body_draft ?? ''}\n\n箇条書き:\n${(s.bullets as string[] ?? []).map((b: string) => `▸ ${b}`).join('\n')}`
            }).join('\n\n---\n\n'),
            sectionType: 'text', isEditable: true, canRegenerate: true,
          })
        }
      }

      if (p.cdSummary) sections.push({
        id: 'cd-summary', title: 'CDサマリー（確認・判断事項）',
        content: JSON.stringify(p.cdSummary, null, 2),
        sectionType: 'text', isEditable: true, canRegenerate: true,
      })

      return {
        agentId: this.id,
        sections: sections.length > 0 ? sections : [{ id: 'raw', title: '提案書草案', content: raw, sectionType: 'text', isEditable: true, canRegenerate: true }],
        visualizations: [],
        metadata: {
          confidence: (p.confidence as 'high' | 'medium' | 'low') ?? 'medium',
          factBasis: (p.factBasis as string[]) ?? [],
          assumptions: (p.assumptions as string[]) ?? [],
          missingInfo: [],
        },
      }
    } catch {
      return {
        agentId: this.id,
        sections: [{ id: 'raw', title: '提案書草案（パース失敗）', content: raw, sectionType: 'text', isEditable: true, canRegenerate: true }],
        visualizations: [],
        metadata: { confidence: 'low', factBasis: [], assumptions: [], missingInfo: [] },
      }
    }
  }
}
