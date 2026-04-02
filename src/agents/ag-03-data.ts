import { BaseAgent } from './base-agent'
import { AgentId, AgentInput, AgentOutput, ProjectContext } from './types'
import { loadPrompt } from '@/lib/prompt-loader'

export class Ag03DataAgent extends BaseAgent {
  id: AgentId = 'AG-03-DATA'
  name = 'GA4・サーチコンソール分析'
  protected modelType = 'fast' as const

  getPrompt(_ctx: ProjectContext): string {
    return loadPrompt('ag-03-data')
  }

  async execute(input: AgentInput): Promise<AgentOutput> {
    const [part1, part2] = await Promise.all([
      this.callSection(input,
        'dataAvailability、funnelAnalysis、searchIntentAnalysis フィールドのみ出力。',
        6000),
      this.callSection(input,
        'keyFindings、designImplications、overallInsight、dataLimitations、confidence、factBasis、assumptions フィールドのみ出力。',
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

      if (p.dataAvailability) sections.push({
        id: 'data-availability', title: 'データ利用可能性',
        content: JSON.stringify(p.dataAvailability, null, 2),
        sectionType: 'text', isEditable: true, canRegenerate: true,
      })

      if (p.funnelAnalysis) sections.push({
        id: 'funnel', title: 'ファネル分析',
        content: JSON.stringify(p.funnelAnalysis, null, 2),
        sectionType: 'text', isEditable: true, canRegenerate: true,
      })

      if (p.searchIntentAnalysis) sections.push({
        id: 'search', title: '検索意図分析・コンテンツギャップ',
        content: JSON.stringify(p.searchIntentAnalysis, null, 2),
        sectionType: 'text', isEditable: true, canRegenerate: true,
      })

      if (p.keyFindings && Array.isArray(p.keyFindings)) sections.push({
        id: 'findings', title: 'キーファインディング',
        content: (p.keyFindings as Array<Record<string, unknown>>)
          .map((f, i) => `**[${i + 1}]** ${f.finding}\n→ 設計示唆: ${f.designImplication}`)
          .join('\n\n'),
        sectionType: 'text', isEditable: true, canRegenerate: true,
      })

      return {
        agentId: this.id,
        sections: sections.length > 0 ? sections : [{ id: 'raw', title: 'データ分析', content: raw, sectionType: 'text', isEditable: true, canRegenerate: true }],
        visualizations: [],
        metadata: {
          confidence: (p.confidence as 'high' | 'medium' | 'low') ?? 'medium',
          factBasis: [],
          assumptions: [],
          missingInfo: (p.dataLimitations as string[]) ?? [],
        },
      }
    } catch {
      return {
        agentId: this.id,
        sections: [{ id: 'raw', title: 'データ分析（パース失敗）', content: raw, sectionType: 'text', isEditable: true, canRegenerate: true }],
        visualizations: [],
        metadata: { confidence: 'low', factBasis: [], assumptions: [], missingInfo: [] },
      }
    }
  }
}
