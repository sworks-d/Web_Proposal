import { BaseAgent } from './base-agent'
import { AgentId, AgentOutput, ProjectContext } from './types'
import { loadPrompt } from '@/lib/prompt-loader'

export class Ag03CompetitorAgent extends BaseAgent {
  id: AgentId = 'AG-03'
  name = '競合・ポジション分析'
  protected modelType = 'quality' as const

  getPrompt(_ctx: ProjectContext): string {
    return loadPrompt('ag-03-competitor')
  }

  parseOutput(raw: string): AgentOutput {
    try {
      const p = this.parseJSON<Record<string, unknown>>(raw)
      const sections = []
      if (p.competitors) sections.push({ id: 'competitors', title: '競合個別評価', content: JSON.stringify(p.competitors, null, 2), sectionType: 'competitors', isEditable: true, canRegenerate: true })
      if (p.positioningMap) sections.push({ id: 'positioning-map', title: 'ポジショニングマップ', content: JSON.stringify(p.positioningMap, null, 2), sectionType: 'visualization', isEditable: true, canRegenerate: true })
      if (p.differentiationOpportunity) sections.push({ id: 'differentiation', title: '差別化機会・推奨ポジション', content: JSON.stringify(p.differentiationOpportunity, null, 2), sectionType: 'strategy', isEditable: true, canRegenerate: true })
      if (sections.length === 0) sections.push({ id: 'raw', title: '競合分析結果', content: raw, sectionType: 'text', isEditable: true, canRegenerate: true })
      return {
        agentId: this.id,
        sections,
        visualizations: p.positioningMap ? [{ id: 'positioning-map', title: 'ポジショニングマップ', vizType: 'positioning' as const, renderer: 'custom-svg' as const, data: p.positioningMap as Record<string, unknown>, exportFormats: ['svg', 'json'] as const }] : [],
        metadata: { confidence: (p.confidence as 'high' | 'medium' | 'low') ?? 'medium', factBasis: (p.factBasis as string[]) ?? [], assumptions: (p.assumptions as string[]) ?? [], missingInfo: [] },
      }
    } catch {
      return { agentId: this.id, sections: [{ id: 'raw', title: '競合分析（パース失敗）', content: raw, sectionType: 'text', isEditable: true, canRegenerate: true }], visualizations: [], metadata: { confidence: 'low', factBasis: [], assumptions: [], missingInfo: [] } }
    }
  }
}
