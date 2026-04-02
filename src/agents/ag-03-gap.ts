import { BaseAgent } from './base-agent'
import { AgentId, AgentInput, AgentOutput, ProjectContext } from './types'
import { loadPrompt } from '@/lib/prompt-loader'

export class Ag03GapAgent extends BaseAgent {
  id: AgentId = 'AG-03-GAP'
  name = 'コンテンツギャップ・ベンチマーク分析'
  protected modelType = 'quality' as const

  getPrompt(_ctx: ProjectContext): string {
    return loadPrompt('ag-03-gap')
  }

  async execute(input: AgentInput): Promise<AgentOutput> {
    const [part1, part2] = await Promise.all([
      this.callSection(input,
        'contentInventory フィールドのみ出力（全カテゴリを含む）。',
        6000),
      this.callSection(input,
        'vacantAreas、topGapOpportunities、confidence、factBasis、assumptions フィールドのみ出力。contentInventory は含めない。',
        5000),
    ])
    const merged = { ...part1, ...part2 }
    this.lastRawText = JSON.stringify(merged)
    return this.parseOutput(this.lastRawText)
  }

  parseOutput(raw: string): AgentOutput {
    try {
      const p = this.parseJSON<Record<string, unknown>>(raw)
      const sections = []

      if (p.vacantAreas && Array.isArray(p.vacantAreas)) sections.push({
        id: 'vacant', title: '空白地帯（コンテンツギャップ）',
        content: (p.vacantAreas as Array<Record<string, unknown>>)
          .map(v => `**${v.area}** [優先度: ${v.priority}]\nなぜ空白: ${v.whyVacant}\n実現可能性: ${v.clientFeasibility}\n設計示唆: ${v.designImplication}`)
          .join('\n\n'),
        sectionType: 'text', isEditable: true, canRegenerate: true,
      })

      if (p.benchmarkMatrix) sections.push({
        id: 'benchmark', title: 'ベンチマークマトリクス',
        content: JSON.stringify(p.benchmarkMatrix, null, 2),
        sectionType: 'text', isEditable: true, canRegenerate: true,
      })

      if (p.topGapOpportunities && Array.isArray(p.topGapOpportunities)) sections.push({
        id: 'opportunities', title: 'トップギャップ機会',
        content: (p.topGapOpportunities as Array<Record<string, unknown>>)
          .map((o, i) => `**[${i + 1}]** ${o.opportunity}\nなぜ: ${o.why}\n設計応答: ${o.designResponse}`)
          .join('\n\n'),
        sectionType: 'text', isEditable: true, canRegenerate: true,
      })

      return {
        agentId: this.id,
        sections: sections.length > 0 ? sections : [{ id: 'raw', title: 'ギャップ分析', content: raw, sectionType: 'text', isEditable: true, canRegenerate: true }],
        visualizations: [],
        metadata: {
          confidence: (p.confidence as 'high' | 'medium' | 'low') ?? 'medium',
          factBasis: [],
          assumptions: (p.assumptions as string[]) ?? [],
          missingInfo: [],
        },
      }
    } catch {
      return {
        agentId: this.id,
        sections: [{ id: 'raw', title: 'ギャップ分析（パース失敗）', content: raw, sectionType: 'text', isEditable: true, canRegenerate: true }],
        visualizations: [],
        metadata: { confidence: 'low', factBasis: [], assumptions: [], missingInfo: [] },
      }
    }
  }
}
