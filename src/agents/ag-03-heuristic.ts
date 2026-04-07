import { BaseAgent } from './base-agent'
import { AgentId, AgentInput, AgentOutput, ProjectContext } from './types'
import { loadPrompt } from '@/lib/prompt-loader'

export class Ag03HeuristicAgent extends BaseAgent {
  id: AgentId = 'AG-03-HEURISTIC'
  name = 'ヒューリスティック評価（競合上位2社）'
  protected modelType = 'fast' as const

  getPrompt(_ctx: ProjectContext): string {
    return loadPrompt('ag-03-heuristic')
  }

  async execute(input: AgentInput): Promise<AgentOutput> {
    const [part1, part2] = await Promise.all([
      this.callSection(input,
        'evaluations フィールドのみ出力（上位2社の完全な評価を含む）。',
        8000),
      this.callSection(input,
        'crossCompetitorInsights、strategicConclusion、recommendations、confidence、factBasis、assumptions フィールドのみ出力。evaluations は含めない。',
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

      if (p.evaluations && Array.isArray(p.evaluations)) sections.push({
        id: 'evaluations', title: 'ヒューリスティック評価（上位2社）',
        content: (p.evaluations as Array<Record<string, unknown>>)
          .map(e => `**${e.competitorName}** (UXスコア: ${e.overallUXScore})\n戦略意図: ${e.strategicIntent}\n主要課題: ${(e.heuristicIssues as Array<Record<string, unknown>>)?.slice(0, 3).map(i => i.issue).join(' / ') ?? ''}`)
          .join('\n\n'),
        sectionType: 'text', isEditable: true, canRegenerate: true,
      })

      if (p.crossCompetitorInsights && Array.isArray(p.crossCompetitorInsights)) sections.push({
        id: 'cross-insights', title: '2社比較インサイト',
        content: (p.crossCompetitorInsights as string[]).map((ins, i) => `${i + 1}. ${ins}`).join('\n'),
        sectionType: 'text', isEditable: true, canRegenerate: true,
      })

      return {
        agentId: this.id,
        sections: sections.length > 0 ? sections : [{ id: 'raw', title: 'ヒューリスティック評価', content: raw, sectionType: 'text', isEditable: true, canRegenerate: true }],
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
        sections: [{ id: 'raw', title: 'ヒューリスティック評価（パース失敗）', content: raw, sectionType: 'text', isEditable: true, canRegenerate: true }],
        visualizations: [],
        metadata: { confidence: 'low', factBasis: [], assumptions: [], missingInfo: [] },
      }
    }
  }
}
