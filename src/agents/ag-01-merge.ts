import { BaseAgent } from './base-agent'
import { AgentId, AgentOutput, ProjectContext } from './types'
import { loadPrompt } from '@/lib/prompt-loader'

export class Ag01MergeAgent extends BaseAgent {
  id: AgentId = 'AG-01-MERGE'
  name = 'インテーク情報統合'
  protected modelType = 'fast' as const

  getPrompt(_ctx: ProjectContext): string {
    return loadPrompt('ag-01-merge')
  }

  parseOutput(raw: string): AgentOutput {
    try {
      const p = this.parseJSON<Record<string, unknown>>(raw)
      const sections = []

      if (p.confirmedBasics) sections.push({
        id: 'confirmed-basics', title: '確定済み基礎情報',
        content: JSON.stringify(p.confirmedBasics, null, 2),
        sectionType: 'text', isEditable: true, canRegenerate: true,
      })

      if (p.contradictions && Array.isArray(p.contradictions) && (p.contradictions as unknown[]).length > 0) {
        sections.push({
          id: 'contradictions', title: '主観 vs 客観のズレ',
          content: (p.contradictions as Array<Record<string, unknown>>)
            .map(c => `**${c.item}**\nクライアント申告: ${c.clientClaim}\nリサーチ確認: ${c.researchFinding}\n解決: ${c.resolution}`)
            .join('\n\n'),
          sectionType: 'text', isEditable: true, canRegenerate: true,
        })
      }

      if (p.keyInsights && Array.isArray(p.keyInsights)) sections.push({
        id: 'key-insights', title: 'AG-02以降への重要発見',
        content: (p.keyInsights as string[]).join('\n'),
        sectionType: 'text', isEditable: true, canRegenerate: true,
      })

      if (p.caveats && Array.isArray(p.caveats) && (p.caveats as unknown[]).length > 0) sections.push({
        id: 'caveats', title: '要クライアント確認事項',
        content: (p.caveats as string[]).join('\n'),
        sectionType: 'text', isEditable: true, canRegenerate: true,
      })

      return {
        agentId: this.id,
        sections: sections.length > 0 ? sections : [{ id: 'raw', title: 'インテーク統合', content: raw, sectionType: 'text', isEditable: true, canRegenerate: true }],
        visualizations: [],
        metadata: {
          confidence: (p.confidence as 'high' | 'medium' | 'low') ?? 'medium',
          factBasis: [],
          assumptions: [],
          missingInfo: (p.caveats as string[]) ?? [],
        },
      }
    } catch {
      return {
        agentId: this.id,
        sections: [{ id: 'raw', title: 'インテーク統合（パース失敗）', content: raw, sectionType: 'text', isEditable: true, canRegenerate: true }],
        visualizations: [],
        metadata: { confidence: 'low', factBasis: [], assumptions: [], missingInfo: [] },
      }
    }
  }
}
