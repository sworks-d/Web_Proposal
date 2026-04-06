import { BaseAgent } from './base-agent'
import { AgentId, AgentOutput, ProjectContext } from './types'
import { loadPrompt } from '@/lib/prompt-loader'

export class Ag02ValidateAgent extends BaseAgent {
  id: AgentId = 'AG-02-VALIDATE'
  name = 'ターゲット設計検証'
  protected modelType = 'quality' as const

  getPrompt(_ctx: ProjectContext): string {
    return loadPrompt('ag-02-validate')
  }

  parseOutput(raw: string): AgentOutput {
    try {
      const p = this.parseJSON<Record<string, unknown>>(raw)
      const sections = []

      if (p.decisionCriteriaValidation && Array.isArray(p.decisionCriteriaValidation)) {
        const criteria = p.decisionCriteriaValidation as Array<Record<string, unknown>>
        sections.push({
          id: 'decision-criteria', title: '比較軸の検証結果',
          content: criteria.map(c =>
            `[${c.newConfidence}] ${c.criterion}\n証拠: ${c.searchEvidence ?? '─'}`
          ).join('\n\n'),
          sectionType: 'text', isEditable: true, canRegenerate: true,
        })
      }

      if (p.painPointValidation && Array.isArray(p.painPointValidation)) {
        const points = p.painPointValidation as Array<Record<string, unknown>>
        sections.push({
          id: 'pain-points', title: '悩み・ニーズの検証結果',
          content: points.map(p =>
            `[${p.newConfidence}] ${p.painPoint}\n証拠: ${p.searchEvidence ?? '─'}`
          ).join('\n\n'),
          sectionType: 'text', isEditable: true, canRegenerate: true,
        })
      }

      if (p.barrierValidation && Array.isArray(p.barrierValidation)) {
        const barriers = p.barrierValidation as Array<Record<string, unknown>>
        sections.push({
          id: 'barriers', title: 'バリアーの検証結果',
          content: barriers.map(b =>
            `[${b.newConfidence}] ${b.barrier}（${b.phase}）\n証拠: ${b.searchEvidence ?? '─'}`
          ).join('\n\n'),
          sectionType: 'text', isEditable: true, canRegenerate: true,
        })
      }

      if (p.targetLanguageMapping && Array.isArray(p.targetLanguageMapping)) {
        const mapping = p.targetLanguageMapping as Array<Record<string, unknown>>
        sections.push({
          id: 'language-mapping', title: 'ターゲット言語マッピング',
          content: mapping.map(m =>
            `「${m.companyTerm}」→「${m.targetTerm}」（用途: ${m.usage}）`
          ).join('\n'),
          sectionType: 'text', isEditable: true, canRegenerate: true,
        })
      }

      if (p.discoveredInsights && Array.isArray(p.discoveredInsights)) {
        const insights = p.discoveredInsights as Array<Record<string, unknown>>
        if (insights.length > 0) {
          sections.push({
            id: 'discovered', title: '検索で新発見したインサイト',
            content: insights.map(i =>
              `[${i.type}] ${i.content}\n→ ${i.recommendation}`
            ).join('\n\n'),
            sectionType: 'text', isEditable: true, canRegenerate: true,
          })
        }
      }

      if (p.recommendations && Array.isArray(p.recommendations)) {
        sections.push({
          id: 'recommendations', title: 'AG-03以降への推奨事項',
          content: (p.recommendations as string[]).map((r, i) => `${i + 1}. ${r}`).join('\n'),
          sectionType: 'text', isEditable: true, canRegenerate: true,
        })
      }

      if (p.validationSummary) {
        const vs = p.validationSummary as Record<string, unknown>
        sections.unshift({
          id: 'summary', title: '検証サマリー',
          content: `確認済み: ${vs.confirmed ?? 0} / 部分確認: ${vs.partial ?? 0} / 未確認: ${vs.unconfirmed ?? 0} / 矛盾: ${vs.contradicted ?? 0}（検索${vs.searchCount ?? p.searchCount ?? 0}回）`,
          sectionType: 'text', isEditable: false, canRegenerate: false,
        })
      }

      return {
        agentId: this.id,
        sections: sections.length > 0 ? sections : [{ id: 'raw', title: 'ターゲット設計検証', content: raw, sectionType: 'text', isEditable: true, canRegenerate: true }],
        visualizations: [],
        metadata: {
          confidence: (p.confidence as 'high' | 'medium' | 'low') ?? 'medium',
          factBasis: [],
          assumptions: [],
          missingInfo: [],
        },
      }
    } catch {
      return {
        agentId: this.id,
        sections: [{ id: 'raw', title: 'ターゲット設計検証（パース失敗）', content: raw, sectionType: 'text', isEditable: true, canRegenerate: true }],
        visualizations: [],
        metadata: { confidence: 'low', factBasis: [], assumptions: [], missingInfo: [] },
      }
    }
  }
}
