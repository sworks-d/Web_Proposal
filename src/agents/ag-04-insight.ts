import { BaseAgent } from './base-agent'
import { AgentId, AgentOutput, ProjectContext } from './types'
import { loadPrompt } from '@/lib/prompt-loader'

export class Ag04InsightAgent extends BaseAgent {
  id: AgentId = 'AG-04'
  name = '課題構造化'
  protected modelType = 'quality' as const

  getPrompt(_ctx: ProjectContext): string {
    return loadPrompt('ag-04-insight')
  }

  parseOutput(raw: string): AgentOutput {
    try {
      const p = this.parseJSON<Record<string, unknown>>(raw)
      const sections = []
      if (p.surfaceIssues) sections.push({ id: 'surface-issues', title: '表層課題（クライアントが認識）', content: typeof p.surfaceIssues === 'string' ? p.surfaceIssues : JSON.stringify(p.surfaceIssues, null, 2), sectionType: 'issues', isEditable: true, canRegenerate: true })
      if (p.structuralIssues) sections.push({ id: 'structural-issues', title: '構造課題（本質原因）', content: typeof p.structuralIssues === 'string' ? p.structuralIssues : JSON.stringify(p.structuralIssues, null, 2), sectionType: 'issues', isEditable: true, canRegenerate: true })
      if (p.opportunities) sections.push({ id: 'opportunities', title: '機会（解決後の可能性）', content: typeof p.opportunities === 'string' ? p.opportunities : JSON.stringify(p.opportunities, null, 2), sectionType: 'opportunities', isEditable: true, canRegenerate: true })
      if (p.prioritizedIssues) sections.push({ id: 'priority', title: '優先順位付き課題リスト', content: typeof p.prioritizedIssues === 'string' ? p.prioritizedIssues : JSON.stringify(p.prioritizedIssues, null, 2), sectionType: 'checklist', isEditable: true, canRegenerate: true })
      if (sections.length === 0) sections.push({ id: 'raw', title: '課題分析結果', content: raw, sectionType: 'text', isEditable: true, canRegenerate: true })
      return {
        agentId: this.id, sections, visualizations: [],
        metadata: { confidence: (p.confidence as 'high' | 'medium' | 'low') ?? 'medium', factBasis: (p.factBasis as string[]) ?? [], assumptions: (p.assumptions as string[]) ?? [], missingInfo: [] },
      }
    } catch {
      return { agentId: this.id, sections: [{ id: 'raw', title: '課題構造化（パース失敗）', content: raw, sectionType: 'text', isEditable: true, canRegenerate: true }], visualizations: [], metadata: { confidence: 'low', factBasis: [], assumptions: [], missingInfo: [] } }
    }
  }
}
