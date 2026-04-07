import { BaseAgent } from './base-agent'
import { AgentId, AgentInput, AgentOutput, ProjectContext } from './types'
import { loadPrompt } from '@/lib/prompt-loader'

export class Ag07bReferenceAgent extends BaseAgent {
  id: AgentId = 'AG-07B'
  name = 'リファレンス戦略（業界標準・ベストプラクティス）'
  protected modelType = 'fast' as const

  getPrompt(_ctx: ProjectContext): string {
    return loadPrompt('ag-07b-reference')
  }

  async execute(input: AgentInput): Promise<AgentOutput> {
    const [part1, part2] = await Promise.all([
      this.callSection(input, 'category、subCategory、iaPatterns、cvDesign フィールドのみ出力', 6000),
      this.callSection(input, 'benchmarks、commonDesignMistakes、recommendation、confidence、assumptions フィールドのみ出力', 6000),
    ])
    const merged = { ...part1, ...part2 }
    this.lastRawText = JSON.stringify(merged)
    return this.parseOutput(this.lastRawText)
  }

  parseOutput(raw: string): AgentOutput {
    try {
      const p = this.parseJSON<Record<string, unknown>>(raw)
      const sections = []

      if (p.category) sections.push({
        id: 'category', title: 'サイトカテゴリ',
        content: `カテゴリ: ${p.category}\nサブカテゴリ: ${p.subCategory ?? ''}`,
        sectionType: 'text', isEditable: true, canRegenerate: true,
      })

      if (p.iaPatterns && Array.isArray(p.iaPatterns)) sections.push({
        id: 'ia-patterns', title: 'IA設計パターン',
        content: (p.iaPatterns as Array<Record<string, unknown>>)
          .map(pat => `**${pat.patternName}**\n${pat.description}\n適合条件: ${pat.suitableFor}\nトレードオフ: ${pat.tradeoff}`)
          .join('\n\n'),
        sectionType: 'text', isEditable: true, canRegenerate: true,
      })

      if (p.cvDesign) sections.push({
        id: 'cv-design', title: 'CV設計のベストプラクティス',
        content: JSON.stringify(p.cvDesign, null, 2),
        sectionType: 'text', isEditable: true, canRegenerate: true,
      })

      if (p.benchmarks && Array.isArray(p.benchmarks)) sections.push({
        id: 'benchmarks', title: 'ベンチマークサイト',
        content: (p.benchmarks as Array<Record<string, unknown>>)
          .map(b => `**${b.siteName}** [${b.category}]\n参照すべき点: ${b.whatToReference}\n設計学習: ${b.designLesson}`)
          .join('\n\n'),
        sectionType: 'text', isEditable: true, canRegenerate: true,
      })

      if (p.commonDesignMistakes && Array.isArray(p.commonDesignMistakes)) sections.push({
        id: 'mistakes', title: 'よくある設計ミス（避けるべきパターン）',
        content: (p.commonDesignMistakes as Array<Record<string, unknown>>)
          .map(m => `**${m.mistake}**\nメカニズム: ${m.mechanism}\n回避策: ${m.avoidance}`)
          .join('\n\n'),
        sectionType: 'text', isEditable: true, canRegenerate: true,
      })

      return {
        agentId: this.id,
        sections: sections.length > 0 ? sections : [{ id: 'raw', title: 'リファレンス戦略', content: raw, sectionType: 'text', isEditable: true, canRegenerate: true }],
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
        sections: [{ id: 'raw', title: 'リファレンス戦略（パース失敗）', content: raw, sectionType: 'text', isEditable: true, canRegenerate: true }],
        visualizations: [],
        metadata: { confidence: 'low', factBasis: [], assumptions: [], missingInfo: [] },
      }
    }
  }
}
