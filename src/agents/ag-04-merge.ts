import { BaseAgent } from './base-agent'
import { AgentId, AgentOutput, ProjectContext } from './types'
import { loadPrompt } from '@/lib/prompt-loader'

export class Ag04MergeAgent extends BaseAgent {
  id: AgentId = 'AG-04-MERGE'
  name = '課題定義統合（MERGE）'
  protected modelType = 'quality' as const

  getPrompt(_ctx: ProjectContext): string {
    return loadPrompt('ag-04-merge')
  }

  parseOutput(raw: string): AgentOutput {
    try {
      const p = this.parseJSON<Record<string, unknown>>(raw)
      const sections = []

      if (p.coreProblemStatement) sections.push({
        id: 'core-problem', title: '統合課題定義（最終版）',
        content: String(p.coreProblemStatement),
        sectionType: 'text', isEditable: true, canRegenerate: true,
      })

      if (p.targetDefinition) sections.push({
        id: 'target', title: 'ターゲット定義（統合）',
        content: JSON.stringify(p.targetDefinition, null, 2),
        sectionType: 'text', isEditable: true, canRegenerate: true,
      })

      if (p.websiteRole) sections.push({
        id: 'website-role', title: 'Webサイトの役割定義',
        content: JSON.stringify(p.websiteRole, null, 2),
        sectionType: 'text', isEditable: true, canRegenerate: true,
      })

      if (p.designPriorities && Array.isArray(p.designPriorities)) sections.push({
        id: 'priorities', title: '設計優先順位（HMW × バリア）',
        content: (p.designPriorities as Array<Record<string, unknown>>)
          .map((d, i) => `**[${i + 1}位]** ${d.hmwQuestion}\nバリア: ${d.barrier}\n設計アクション: ${d.designAction}\n根拠: ${d.rationale}`)
          .join('\n\n'),
        sectionType: 'text', isEditable: true, canRegenerate: true,
      })

      if (p.siteDesignPrinciples && Array.isArray(p.siteDesignPrinciples)) sections.push({
        id: 'principles', title: 'サイト設計原則（統合版）',
        content: (p.siteDesignPrinciples as Array<Record<string, unknown>>)
          .map(s => `**[${s.priority}]** ${s.principle}\n→ ${s.rationale}`)
          .join('\n\n'),
        sectionType: 'principles', isEditable: true, canRegenerate: true,
      })

      return {
        agentId: this.id,
        sections: sections.length > 0 ? sections : [{ id: 'raw', title: '課題定義統合', content: raw, sectionType: 'text', isEditable: true, canRegenerate: true }],
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
        sections: [{ id: 'raw', title: '課題定義統合（パース失敗）', content: raw, sectionType: 'text', isEditable: true, canRegenerate: true }],
        visualizations: [],
        metadata: { confidence: 'low', factBasis: [], assumptions: [], missingInfo: [] },
      }
    }
  }
}
