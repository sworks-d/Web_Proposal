import { BaseAgent } from './base-agent'
import { AgentId, AgentInput, AgentOutput, ProjectContext } from './types'
import { loadPrompt } from '@/lib/prompt-loader'

export class Ag03MergeAgent extends BaseAgent {
  id: AgentId = 'AG-03-MERGE'
  name = '競合分析統合（MERGE）'
  protected modelType = 'quality' as const

  getPrompt(_ctx: ProjectContext): string {
    return loadPrompt('ag-03-merge')
  }

  async execute(input: AgentInput): Promise<AgentOutput> {
    const [part1, part2] = await Promise.all([
      this.callSection(input,
        'positioningMap、topDesignOpportunities フィールドのみ出力。',
        6000),
      this.callSection(input,
        'differentiationStrategy、siteDesignPrinciples、ag04Handoff、confidence、factBasis、assumptions フィールドのみ出力。positioningMap・topDesignOpportunities は含めない。',
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

      if (p.positioningMap) sections.push({
        id: 'positioning', title: 'ポジショニングマップ（統合）',
        content: JSON.stringify(p.positioningMap, null, 2),
        sectionType: 'visualization', isEditable: true, canRegenerate: true,
      })

      if (p.topDesignOpportunities && Array.isArray(p.topDesignOpportunities)) sections.push({
        id: 'opportunities', title: 'トップ差別化機会',
        content: (p.topDesignOpportunities as Array<Record<string, unknown>>)
          .map((o, i) => `**[${i + 1}]** ${o.opportunity}\n根拠: ${o.evidence}\nCV影響: ${o.cvImpact}\n設計アクション: ${o.designAction}`)
          .join('\n\n'),
        sectionType: 'text', isEditable: true, canRegenerate: true,
      })

      if (p.differentiationStrategy) sections.push({
        id: 'strategy', title: '差別化戦略',
        content: JSON.stringify(p.differentiationStrategy, null, 2),
        sectionType: 'strategy', isEditable: true, canRegenerate: true,
      })

      if (p.siteDesignPrinciples && Array.isArray(p.siteDesignPrinciples)) sections.push({
        id: 'principles', title: 'サイト設計原則（競合分析より）',
        content: (p.siteDesignPrinciples as Array<Record<string, unknown>>)
          .map(s => `**[${s.priority}]** ${s.principle}\n→ ${s.rationale}`)
          .join('\n\n'),
        sectionType: 'principles', isEditable: true, canRegenerate: true,
      })

      return {
        agentId: this.id,
        sections: sections.length > 0 ? sections : [{ id: 'raw', title: '競合分析統合', content: raw, sectionType: 'text', isEditable: true, canRegenerate: true }],
        visualizations: p.positioningMap ? [{
          id: 'positioning-map', title: 'ポジショニングマップ',
          vizType: 'positioning' as const, renderer: 'custom-svg' as const,
          data: p.positioningMap as Record<string, unknown>, exportFormats: ['svg', 'json'] as const,
        }] : [],
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
        sections: [{ id: 'raw', title: '競合分析統合（パース失敗）', content: raw, sectionType: 'text', isEditable: true, canRegenerate: true }],
        visualizations: [],
        metadata: { confidence: 'low', factBasis: [], assumptions: [], missingInfo: [] },
      }
    }
  }
}
