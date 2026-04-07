import { BaseAgent } from './base-agent'
import { AgentId, AgentInput, AgentOutput, ProjectContext } from './types'
import { loadPrompt } from '@/lib/prompt-loader'

export class Ag07aAnalysisAgent extends BaseAgent {
  id: AgentId = 'AG-07A'
  name = 'サイト設計根拠ライター（分析統合）'
  protected modelType = 'fast' as const

  getPrompt(_ctx: ProjectContext): string {
    return loadPrompt('ag-07a-analysis')
  }

  async execute(input: AgentInput): Promise<AgentOutput> {
    const [part1, part2] = await Promise.all([
      this.callSection(input, 'siteMission、siteCoreConcept、primaryCV、analysisMatrix フィールドのみ出力', 8000),
      this.callSection(input, 'contentArchitecture、designPriorities、risks、confidence、factBasis、assumptions フィールドのみ出力', 8000),
    ])
    const merged = { ...part1, ...part2 }
    this.lastRawText = JSON.stringify(merged)
    return this.parseOutput(this.lastRawText)
  }

  parseOutput(raw: string): AgentOutput {
    try {
      const p = this.parseJSON<Record<string, unknown>>(raw)
      const sections = []

      if (p.siteMission) sections.push({
        id: 'mission', title: 'サイトミッション（解くべき問い）',
        content: String(p.siteMission),
        sectionType: 'text', isEditable: true, canRegenerate: true,
      })

      if (p.siteCoreConcept) sections.push({
        id: 'concept', title: 'サイトコアコンセプト',
        content: `コンセプト: ${p.siteCoreConcept}\n主要CV: ${p.primaryCV ?? ''}`,
        sectionType: 'text', isEditable: true, canRegenerate: true,
      })

      if (p.analysisMatrix) sections.push({
        id: 'matrix', title: '分析マトリクス（3層×3フェーズ）',
        content: JSON.stringify(p.analysisMatrix, null, 2),
        sectionType: 'text', isEditable: true, canRegenerate: true,
      })

      if (p.contentArchitecture && Array.isArray(p.contentArchitecture)) sections.push({
        id: 'ia', title: 'コンテンツアーキテクチャ（ページ構成）',
        content: (p.contentArchitecture as Array<Record<string, unknown>>)
          .map(pg => `**${pg.pageTitle}**\nミッション: ${pg.designMission}\nフェーズ: ${pg.targetPhase}\nCV: ${pg.cv}`)
          .join('\n\n'),
        sectionType: 'text', isEditable: true, canRegenerate: true,
      })

      if (p.designPriorities && Array.isArray(p.designPriorities)) sections.push({
        id: 'priorities', title: '設計優先順位',
        content: (p.designPriorities as Array<Record<string, unknown>>)
          .map((d, i) => `**[${i + 1}]** 課題: ${d.challenge}\nなぜ: ${d.why}\n解決策: ${d.solution}`)
          .join('\n\n'),
        sectionType: 'text', isEditable: true, canRegenerate: true,
      })

      if (p.risks && Array.isArray(p.risks)) sections.push({
        id: 'risks', title: 'リスク',
        content: (p.risks as Array<Record<string, unknown>>)
          .map(r => `**[${r.severity}]** ${r.risk}\n緩和策: ${r.mitigation}`)
          .join('\n\n'),
        sectionType: 'text', isEditable: true, canRegenerate: true,
      })

      return {
        agentId: this.id,
        sections: sections.length > 0 ? sections : [{ id: 'raw', title: 'サイト設計根拠', content: raw, sectionType: 'text', isEditable: true, canRegenerate: true }],
        visualizations: [],
        metadata: {
          confidence: (p.confidence as 'high' | 'medium' | 'low') ?? 'medium',
          factBasis: (p.factBasis as string[]) ?? [],
          assumptions: (p.assumptions as string[]) ?? [],
          missingInfo: (p.caveats as string[]) ?? [],
        },
      }
    } catch {
      return {
        agentId: this.id,
        sections: [{ id: 'raw', title: 'サイト設計根拠（パース失敗）', content: raw, sectionType: 'text', isEditable: true, canRegenerate: true }],
        visualizations: [],
        metadata: { confidence: 'low', factBasis: [], assumptions: [], missingInfo: [] },
      }
    }
  }
}
