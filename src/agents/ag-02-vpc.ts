import { Ag02BaseAgent } from './ag-02-base'
import { AgentId, AgentOutput } from './types'

export class Ag02VpcAgent extends Ag02BaseAgent {
  id: AgentId = 'AG-02-VPC'
  primaryId = 'ag-02-vpc' as const
  name = 'バリュープロポジションキャンバス'
  protected modelType = 'quality' as const

  parseOutput(raw: string): AgentOutput {
    try {
      const p = this.parseJSON<Record<string, unknown>>(raw)
      const sections = []

      if (p.primaryTarget) sections.push({
        id: 'target', title: 'VPC分析の主語',
        content: String(p.primaryTarget),
        sectionType: 'text', isEditable: true, canRegenerate: true,
      })

      if (p.customerProfile) sections.push({
        id: 'customer', title: 'カスタマープロファイル（Jobs / Pains / Gains）',
        content: JSON.stringify(p.customerProfile, null, 2),
        sectionType: 'text', isEditable: true, canRegenerate: true,
      })

      if (p.valueProposition) sections.push({
        id: 'value', title: 'バリュープロポジション（Pain Relievers / Gain Creators）',
        content: JSON.stringify(p.valueProposition, null, 2),
        sectionType: 'text', isEditable: true, canRegenerate: true,
      })

      if (p.fit) sections.push({
        id: 'fit', title: 'フィット評価',
        content: `フィットスコア: ${(p.fit as Record<string, unknown>).fitScore}\n${(p.fit as Record<string, unknown>).fitReason}`,
        sectionType: 'text', isEditable: true, canRegenerate: true,
      })

      return {
        agentId: this.id,
        sections: sections.length > 0 ? sections : [{ id: 'raw', title: 'VPC分析', content: raw, sectionType: 'text', isEditable: true, canRegenerate: true }],
        visualizations: [],
        metadata: {
          confidence: (p.confidence as 'high' | 'medium' | 'low') ?? 'medium',
          factBasis: (p.factBasis as string[]) ?? [],
          assumptions: (p.assumptions as string[]) ?? [],
          missingInfo: [],
        },
      }
    } catch { return this.fallbackOutput(raw) }
  }
}
