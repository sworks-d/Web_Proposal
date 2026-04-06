import { BaseAgent } from './base-agent'
import { AgentId, AgentOutput, ProjectContext } from './types'
import { loadPrompt } from '@/lib/prompt-loader'

export class Ag07c2Agent extends BaseAgent {
  id: AgentId = 'AG-07C-2'
  name = '素材セット Ch.03〜04'
  protected modelType = 'quality' as const

  getPrompt(_ctx: ProjectContext): string {
    return loadPrompt('ag-07c-2')
  }

  parseOutput(raw: string): AgentOutput {
    try {
      const p = this.parseJSON<Record<string, unknown>>(raw)
      const sections = []

      if (p.slides && Array.isArray(p.slides)) {
        for (const slide of p.slides as Array<Record<string, unknown>>) {
          sections.push({
            id: slide.slideId as string ?? 'slide',
            title: `${slide.chapterTitle ?? ''} / ${slide.slideTitle ?? ''}`,
            content: [
              slide.body_draft ? `**本文草稿**\n${slide.body_draft}` : '',
              slide.catchCopy_options && Array.isArray(slide.catchCopy_options)
                ? `**キャッチコピー候補**\n${(slide.catchCopy_options as Array<Record<string, unknown>>).map(c => `${c.id}: ${c.copy}（${c.angle}）`).join('\n')}`
                : '',
              slide.bullets && Array.isArray(slide.bullets)
                ? `**箇条書き**\n${(slide.bullets as string[]).join('\n')}`
                : '',
            ].filter(Boolean).join('\n\n'),
            sectionType: 'text', isEditable: true, canRegenerate: true,
          })
        }
      }

      return {
        agentId: this.id,
        sections: sections.length > 0 ? sections : [{ id: 'raw', title: '素材セット Ch.03-04', content: raw, sectionType: 'text', isEditable: true, canRegenerate: true }],
        visualizations: [],
        metadata: {
          confidence: (p.confidence as 'high' | 'medium' | 'low') ?? 'medium',
          factBasis: (p.factBasis as string[]) ?? [],
          assumptions: [],
          missingInfo: [],
        },
      }
    } catch {
      return {
        agentId: this.id,
        sections: [{ id: 'raw', title: '素材セット Ch.03-04（パース失敗）', content: raw, sectionType: 'text', isEditable: true, canRegenerate: true }],
        visualizations: [],
        metadata: { confidence: 'low', factBasis: [], assumptions: [], missingInfo: [] },
      }
    }
  }
}
