import { Ag02BaseAgent } from './ag-02-base'
import { AgentId, AgentOutput } from './types'

export class Ag02BtobAgent extends Ag02BaseAgent {
  id: AgentId = 'AG-02'
  primaryId = 'ag-02-btob' as const
  name = '市場・業界分析（BtoB）'
  protected modelType = 'quality' as const

  parseOutput(raw: string): AgentOutput {
    try {
      const p = this.parseJSON<Record<string, unknown>>(raw)
      const sections = this.parseMarketSections(p)
      return {
        agentId: this.id,
        sections: sections.length > 0 ? sections : [{
          id: 'raw-output', title: '市場分析結果', content: raw,
          sectionType: 'text', isEditable: true, canRegenerate: true,
        }],
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
