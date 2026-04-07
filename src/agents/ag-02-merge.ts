import { BaseAgent } from './base-agent'
import { AgentId, AgentInput, AgentOutput, ProjectContext } from './types'
import { loadPrompt } from '@/lib/prompt-loader'

export class Ag02MergeAgent extends BaseAgent {
  id: AgentId = 'AG-02-MERGE'
  name = '市場分析統合（MERGE）'
  protected modelType = 'fast' as const

  getPrompt(_ctx: ProjectContext): string {
    return loadPrompt('ag-02-merge')
  }

  async execute(input: AgentInput): Promise<AgentOutput> {
    const [part1, part2] = await Promise.all([
      this.callSection(input,
        'primaryTarget、targetContextualState、consolidatedJourney、topPainRelievers フィールドのみ出力。',
        6000),
      this.callSection(input,
        'siteDesignDirectives、siteDesignPrinciples、contradictions、confidence、factBasis、assumptions フィールドのみ出力。',
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

      if (p.primaryTarget) sections.push({
        id: 'target', title: '統合ターゲット定義',
        content: `${p.primaryTarget}\n状態: ${p.targetContextualState ?? ''}`,
        sectionType: 'text', isEditable: true, canRegenerate: true,
      })

      if (p.consolidatedJourney) sections.push({
        id: 'journey', title: '統合ジャーニー（重要フェーズ・バリア・CVトリガー）',
        content: JSON.stringify(p.consolidatedJourney, null, 2),
        sectionType: 'text', isEditable: true, canRegenerate: true,
      })

      if (p.topPainRelievers && Array.isArray(p.topPainRelievers)) sections.push({
        id: 'pain-relievers', title: '優先Pain Relievers',
        content: (p.topPainRelievers as Array<Record<string, unknown>>)
          .map((pr, i) => `**[${i + 1}]** Pain: ${pr.pain}\n設計: ${pr.design}\n優先度: ${pr.priority}`)
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

      if (p.contradictions && Array.isArray(p.contradictions)) sections.push({
        id: 'contradictions', title: '矛盾点と解決',
        content: (p.contradictions as Array<Record<string, unknown>>)
          .map(c => `矛盾: ${c.issue}\n解決: ${c.resolution}`)
          .join('\n\n'),
        sectionType: 'text', isEditable: true, canRegenerate: true,
      })

      return {
        agentId: this.id,
        sections: sections.length > 0 ? sections : [{ id: 'raw', title: '市場分析統合', content: raw, sectionType: 'text', isEditable: true, canRegenerate: true }],
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
        sections: [{ id: 'raw', title: '市場分析統合（パース失敗）', content: raw, sectionType: 'text', isEditable: true, canRegenerate: true }],
        visualizations: [],
        metadata: { confidence: 'low', factBasis: [], assumptions: [], missingInfo: [] },
      }
    }
  }
}
