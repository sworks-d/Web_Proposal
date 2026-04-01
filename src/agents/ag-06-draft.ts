import { BaseAgent } from './base-agent'
import { AgentId, AgentOutput, ProjectContext } from './types'
import { loadPrompt } from '@/lib/prompt-loader'

export class Ag06DraftAgent extends BaseAgent {
  id: AgentId = 'AG-06'
  name = '設計草案'
  protected modelType = 'quality' as const

  getPrompt(_ctx: ProjectContext): string {
    return loadPrompt('ag-06-draft')
  }

  parseOutput(raw: string): AgentOutput {
    try {
      const p = this.parseJSON<Record<string, unknown>>(raw)
      const sections = []
      if (p.proposalAxes) sections.push({ id: 'proposal-axes', title: '提案軸候補', content: typeof p.proposalAxes === 'string' ? p.proposalAxes : JSON.stringify(p.proposalAxes, null, 2), sectionType: 'strategy', isEditable: true, canRegenerate: true })
      if (p.recommendedAxis) sections.push({ id: 'recommended-axis', title: '推奨軸と理由', content: typeof p.recommendedAxis === 'string' ? p.recommendedAxis : JSON.stringify(p.recommendedAxis, null, 2), sectionType: 'strategy', isEditable: true, canRegenerate: true })
      if (p.siteStructure) sections.push({ id: 'site-structure', title: 'ページ構成骨子', content: typeof p.siteStructure === 'string' ? p.siteStructure : JSON.stringify(p.siteStructure, null, 2), sectionType: 'structure', isEditable: true, canRegenerate: true })
      if (p.siteMap && typeof p.siteMap === 'string') {
        sections.push({ id: 'site-map', title: 'サイトマップ（Mermaid）', content: p.siteMap as string, sectionType: 'mermaid', isEditable: true, canRegenerate: true })
      }
      if (p.userFlow && typeof p.userFlow === 'string') {
        sections.push({ id: 'user-flow', title: 'ユーザー導線図（Mermaid）', content: p.userFlow as string, sectionType: 'mermaid', isEditable: true, canRegenerate: true })
      }
      if (sections.length === 0) sections.push({ id: 'raw', title: '設計草案結果', content: raw, sectionType: 'text', isEditable: true, canRegenerate: true })
      return {
        agentId: this.id, sections, visualizations: [],
        metadata: { confidence: (p.confidence as 'high' | 'medium' | 'low') ?? 'medium', factBasis: (p.factBasis as string[]) ?? [], assumptions: (p.assumptions as string[]) ?? [], missingInfo: [] },
      }
    } catch {
      return { agentId: this.id, sections: [{ id: 'raw', title: '設計草案（パース失敗）', content: raw, sectionType: 'text', isEditable: true, canRegenerate: true }], visualizations: [], metadata: { confidence: 'low', factBasis: [], assumptions: [], missingInfo: [] } }
    }
  }
}
