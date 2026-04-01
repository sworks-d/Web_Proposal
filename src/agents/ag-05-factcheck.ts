import { BaseAgent } from './base-agent'
import { AgentId, AgentOutput, ProjectContext } from './types'
import { loadPrompt } from '@/lib/prompt-loader'

export class Ag05FactcheckAgent extends BaseAgent {
  id: AgentId = 'AG-05'
  name = 'ファクトチェック'
  protected modelType = 'quality' as const

  getPrompt(_ctx: ProjectContext): string {
    return loadPrompt('ag-05-factcheck')
  }

  parseOutput(raw: string): AgentOutput {
    try {
      const p = this.parseJSON<Record<string, unknown>>(raw)
      const sections = []
      if (p.highConfidence) sections.push({ id: 'high-confidence', title: '高信頼度（実データ基づく）', content: typeof p.highConfidence === 'string' ? p.highConfidence : JSON.stringify(p.highConfidence, null, 2), sectionType: 'factcheck', isEditable: true, canRegenerate: false })
      if (p.mediumConfidence) sections.push({ id: 'medium-confidence', title: '中信頼度（業界通例に基づく推定）', content: typeof p.mediumConfidence === 'string' ? p.mediumConfidence : JSON.stringify(p.mediumConfidence, null, 2), sectionType: 'factcheck', isEditable: true, canRegenerate: false })
      if (p.lowConfidence) sections.push({ id: 'low-confidence', title: '低信頼度（仮説・推測・要確認）', content: typeof p.lowConfidence === 'string' ? p.lowConfidence : JSON.stringify(p.lowConfidence, null, 2), sectionType: 'factcheck', isEditable: true, canRegenerate: false })
      if (p.requireConfirmation) sections.push({ id: 'require-confirmation', title: '要確認事項リスト', content: typeof p.requireConfirmation === 'string' ? p.requireConfirmation : JSON.stringify(p.requireConfirmation, null, 2), sectionType: 'checklist', isEditable: true, canRegenerate: false })
      if (sections.length === 0) sections.push({ id: 'raw', title: 'ファクトチェック結果', content: raw, sectionType: 'text', isEditable: true, canRegenerate: true })
      return {
        agentId: this.id, sections, visualizations: [],
        metadata: { confidence: (p.overallConfidence as 'high' | 'medium' | 'low') ?? 'medium', factBasis: (p.factBasis as string[]) ?? [], assumptions: (p.assumptions as string[]) ?? [], missingInfo: (p.requireConfirmation as string[]) ?? [] },
      }
    } catch {
      return { agentId: this.id, sections: [{ id: 'raw', title: 'ファクトチェック（パース失敗）', content: raw, sectionType: 'text', isEditable: true, canRegenerate: true }], visualizations: [], metadata: { confidence: 'low', factBasis: [], assumptions: [], missingInfo: [] } }
    }
  }
}
