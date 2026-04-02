import { Ag02BaseAgent } from './ag-02-base'
import { AgentId, AgentInput, AgentOutput } from './types'

export class Ag02StpAgent extends Ag02BaseAgent {
  id: AgentId = 'AG-02-STP'
  primaryId = 'ag-02-stp' as const
  name = 'STPセグメンテーション分析'
  protected modelType = 'quality' as const

  async execute(input: AgentInput): Promise<AgentOutput> {
    const [part1, part2] = await Promise.all([
      this.callSection(input,
        'segmentation フィールドのみ出力（配列、最大4件）。他のフィールドは含めない。',
        6000),
      this.callSection(input,
        'targeting、positioning、positioningMap、designImplication、confidence、factBasis、assumptions フィールドのみ出力。segmentation は含めない。',
        6000),
    ])
    const merged = { ...part1, ...part2 }
    this.lastRawText = JSON.stringify(merged)
    return this.parseOutput(this.lastRawText)
  }

  parseOutput(raw: string): AgentOutput {
    try {
      const p = this.parseJSON<Record<string, unknown>>(raw)
      const sections = []

      if (p.segmentation && Array.isArray(p.segmentation)) sections.push({
        id: 'segmentation', title: 'セグメンテーション',
        content: (p.segmentation as Array<Record<string, unknown>>)
          .map(s => `**${s.visitState}**\n流入経路: ${s.entryPath}\nCVポテンシャル: ${s.cvPotential}`)
          .join('\n\n'),
        sectionType: 'text', isEditable: true, canRegenerate: true,
      })

      if (p.targeting) sections.push({
        id: 'targeting', title: 'ターゲティング',
        content: JSON.stringify(p.targeting, null, 2),
        sectionType: 'text', isEditable: true, canRegenerate: true,
      })

      if (p.positioning) sections.push({
        id: 'positioning', title: 'ポジショニング',
        content: JSON.stringify(p.positioning, null, 2),
        sectionType: 'text', isEditable: true, canRegenerate: true,
      })

      if (p.designImplication) sections.push({
        id: 'design', title: '設計への示唆',
        content: JSON.stringify(p.designImplication, null, 2),
        sectionType: 'text', isEditable: true, canRegenerate: true,
      })

      return {
        agentId: this.id,
        sections: sections.length > 0 ? sections : [{ id: 'raw', title: 'STP分析', content: raw, sectionType: 'text', isEditable: true, canRegenerate: true }],
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
