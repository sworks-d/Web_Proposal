import { BaseAgent } from './base-agent'
import { AgentId, AgentInput, AgentOutput, ProjectContext } from './types'
import { loadPrompt } from '@/lib/prompt-loader'

function detectEvidenceDuplication(slides: Array<Record<string, unknown>>): string[] {
  const warnings: string[] = []
  const seenFacts = new Set<string>()
  for (const slide of slides) {
    for (const ev of (slide.evidence as Array<{ fact?: string }>) ?? []) {
      const key = ev.fact?.trim().slice(0, 40)
      if (!key) continue
      if (seenFacts.has(key)) warnings.push(`スライド ${slide.slideId ?? '?'}: evidence "${key}..." が他スライドと重複`)
      else seenFacts.add(key)
    }
  }
  return warnings
}

export class Ag07c1Agent extends BaseAgent {
  id: AgentId = 'AG-07C-1'
  name = '素材セット Ch.01〜02'
  protected modelType = 'fast' as const

  getPrompt(_ctx: ProjectContext): string {
    return loadPrompt('ag-07c-1')
  }

  async execute(input: AgentInput): Promise<AgentOutput> {
    const [ch01, ch02] = await Promise.all([
      this.callSection(input,
        'Ch.01（今、何が起きているか）のスライドのみ生成してください。出力フィールド: chapter="ch-01", slides（ch-01のスライドのみ）。他のフィールドは含めない。',
        7000),
      this.callSection(input,
        'Ch.02（なぜ今のサイトでは解けないか）のスライドのみ生成してください。出力フィールド: chapter="ch-02", slides（ch-02のスライドのみ）, confidence, factBasis。他のフィールドは含めない。',
        7000),
    ])

    const merged = {
      chapter: 'ch-01-02',
      slides: [...((ch01.slides as unknown[]) ?? []), ...((ch02.slides as unknown[]) ?? [])],
      confidence: ch02.confidence ?? ch01.confidence ?? 'medium',
      factBasis: [...((ch01.factBasis as string[]) ?? []), ...((ch02.factBasis as string[]) ?? [])],
    }
    this.lastRawText = JSON.stringify(merged)
    return this.parseOutput(this.lastRawText)
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
        sections: sections.length > 0 ? sections : [{ id: 'raw', title: '素材セット Ch.01-02', content: raw, sectionType: 'text', isEditable: true, canRegenerate: true }],
        visualizations: [],
        metadata: {
          confidence: (p.confidence as 'high' | 'medium' | 'low') ?? 'medium',
          factBasis: (p.factBasis as string[]) ?? [],
          assumptions: [],
          missingInfo: detectEvidenceDuplication((p.slides as Array<Record<string, unknown>>) ?? []),
        },
      }
    } catch {
      return {
        agentId: this.id,
        sections: [{ id: 'raw', title: '素材セット Ch.01-02（パース失敗）', content: raw, sectionType: 'text', isEditable: true, canRegenerate: true }],
        visualizations: [],
        metadata: { confidence: 'low', factBasis: [], assumptions: [], missingInfo: [] },
      }
    }
  }
}
