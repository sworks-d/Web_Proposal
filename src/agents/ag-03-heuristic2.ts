import { BaseAgent } from './base-agent'
import { AgentId, AgentInput, AgentOutput, ProjectContext } from './types'
import { loadPrompt } from '@/lib/prompt-loader'

export class Ag03Heuristic2Agent extends BaseAgent {
  id: AgentId = 'AG-03-HEURISTIC2'
  name = 'ヒューリスティック評価（残競合）＋パフォーマンス監査'
  protected modelType = 'fast' as const

  getPrompt(_ctx: ProjectContext): string {
    return loadPrompt('ag-03-heuristic2')
  }

  async execute(input: AgentInput): Promise<AgentOutput> {
    const [part1, part2] = await Promise.all([
      this.callSection(input,
        'heuristicEvaluations フィールドのみ出力（全競合の評価を含む）。',
        7000),
      this.callSection(input,
        'performanceAudit、performanceSummary、confidence、factBasis、assumptions フィールドのみ出力。heuristicEvaluations は含めない。',
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

      if (p.heuristicEvaluations && Array.isArray(p.heuristicEvaluations)) sections.push({
        id: 'evaluations', title: 'ヒューリスティック評価（残競合）',
        content: (p.heuristicEvaluations as Array<Record<string, unknown>>)
          .map(e => `**${e.competitorName}**\n戦略意図: ${e.strategicIntent}\n強み: ${(e.strengths as string[])?.slice(0, 2).join(' / ') ?? ''}`)
          .join('\n\n'),
        sectionType: 'text', isEditable: true, canRegenerate: true,
      })

      if (p.performanceAudit && Array.isArray(p.performanceAudit)) sections.push({
        id: 'performance', title: 'パフォーマンス監査（Lighthouse）',
        content: (p.performanceAudit as Array<Record<string, unknown>>)
          .map(a => `**${a.competitorName}** [${a.device}]: パフォーマンス ${(a.scores as Record<string, unknown>)?.performance ?? '?'} | LCP ${(a.scores as Record<string, unknown>)?.lcp ?? '?'}`)
          .join('\n'),
        sectionType: 'text', isEditable: true, canRegenerate: true,
      })

      if (p.performanceSummary) sections.push({
        id: 'perf-summary', title: 'パフォーマンスサマリー',
        content: JSON.stringify(p.performanceSummary, null, 2),
        sectionType: 'text', isEditable: true, canRegenerate: true,
      })

      if (p.crossCompetitorPatterns && Array.isArray(p.crossCompetitorPatterns)) sections.push({
        id: 'patterns', title: '競合共通の弱点パターン',
        content: (p.crossCompetitorPatterns as string[]).map((pat, i) => `${i + 1}. ${pat}`).join('\n'),
        sectionType: 'text', isEditable: true, canRegenerate: true,
      })

      return {
        agentId: this.id,
        sections: sections.length > 0 ? sections : [{ id: 'raw', title: 'ヒューリスティック評価2', content: raw, sectionType: 'text', isEditable: true, canRegenerate: true }],
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
        sections: [{ id: 'raw', title: 'ヒューリスティック評価2（パース失敗）', content: raw, sectionType: 'text', isEditable: true, canRegenerate: true }],
        visualizations: [],
        metadata: { confidence: 'low', factBasis: [], assumptions: [], missingInfo: [] },
      }
    }
  }
}
