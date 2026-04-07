import { Ag02BaseAgent } from './ag-02-base'
import { AgentId, AgentInput, AgentOutput } from './types'

export class Ag02JourneyAgent extends Ag02BaseAgent {
  id: AgentId = 'AG-02-JOURNEY'
  primaryId = 'ag-02-journey' as const
  name = 'カスタマージャーニー分析'
  protected modelType = 'fast' as const

  async execute(input: AgentInput): Promise<AgentOutput> {
    const [part1, part2] = await Promise.all([
      this.callSection(input,
        'primaryTarget、journeyScope、phases フィールドのみ出力（phases は全フェーズ必須）。',
        7000),
      this.callSection(input,
        'criticalPhase、criticalBarrier、cvTrigger、keyInsights、confidence、factBasis、assumptions フィールドのみ出力。phases は含めない。',
        4000),
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
        id: 'primary-target', title: 'ジャーニーの主語',
        content: String(p.primaryTarget),
        sectionType: 'text', isEditable: true, canRegenerate: true,
      })

      if (p.phases && Array.isArray(p.phases)) sections.push({
        id: 'phases', title: 'フェーズ別分析（5フェーズ）',
        content: (p.phases as Array<Record<string, unknown>>)
          .map(ph => `**${ph.visitState}**\n接点: ${ph.touchpoints}\nバリア: ${ph.barriers}\nサイト役割: ${ph.siteRole}`)
          .join('\n\n'),
        sectionType: 'text', isEditable: true, canRegenerate: true,
      })

      if (p.criticalPhase) sections.push({
        id: 'critical', title: 'CVに最も影響するフェーズ・バリア',
        content: `最重要フェーズ: ${JSON.stringify(p.criticalPhase)}\n最重要バリア: ${JSON.stringify(p.criticalBarrier)}`,
        sectionType: 'text', isEditable: true, canRegenerate: true,
      })

      if (p.keyInsights && Array.isArray(p.keyInsights)) sections.push({
        id: 'insights', title: '設計優先順位（インサイト）',
        content: (p.keyInsights as string[]).map((ins, i) => `${i + 1}. ${ins}`).join('\n'),
        sectionType: 'text', isEditable: true, canRegenerate: true,
      })

      return {
        agentId: this.id,
        sections: sections.length > 0 ? sections : [{ id: 'raw', title: 'ジャーニー分析', content: raw, sectionType: 'text', isEditable: true, canRegenerate: true }],
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
