import { BaseAgent } from './base-agent'
import { AgentId, AgentOutput, ProjectContext } from './types'
import { loadPrompt } from '@/lib/prompt-loader'

export class Ag07StoryAgent extends BaseAgent {
  id: AgentId = 'AG-07'
  name = '提案書草案・コピー'
  protected modelType = 'fast' as const

  getPrompt(_ctx: ProjectContext): string {
    return loadPrompt('ag-07-story')
  }

  parseOutput(raw: string): AgentOutput {
    try {
      const p = this.parseJSON<Record<string, unknown>>(raw)
      const sections = []
      if (p.conceptWord) {
        sections.push({
          id: 'concept-word',
          title: 'コンセプトワード',
          content: [
            `**「${p.conceptWord}」**`,
            p.conceptRationale ? `\n根拠：${p.conceptRationale}` : '',
          ].filter(Boolean).join('\n'),
          sectionType: 'concept',
          isEditable: true,
          canRegenerate: true,
        })
      }
      if (p.sections && Array.isArray(p.sections)) {
        for (const sec of p.sections as Array<Record<string, unknown>>) {
          sections.push({
            id: sec.sectionId as string ?? `sec-${sections.length}`,
            title: sec.sectionTitle as string ?? 'セクション',
            content: [
              `**キャッチ：** ${sec.catchCopy ?? ''}`,
              `**要するに：** ${sec.essentiallyLine ?? ''}`,
              `---`,
              sec.body ?? '',
              `---`,
              sec.editorNote ? `*${sec.editorNote}*` : '',
            ].filter(Boolean).join('\n\n'),
            sectionType: 'story-section',
            isEditable: true,
            canRegenerate: false,
          })
        }
      }
      if (sections.length === 0) sections.push({ id: 'raw', title: '提案書草案', content: raw, sectionType: 'text', isEditable: true, canRegenerate: true })
      return {
        agentId: this.id, sections, visualizations: [],
        metadata: { confidence: (p.confidence as 'high' | 'medium' | 'low') ?? 'medium', factBasis: (p.factBasis as string[]) ?? [], assumptions: (p.assumptions as string[]) ?? [], missingInfo: [] },
      }
    } catch {
      return { agentId: this.id, sections: [{ id: 'raw', title: '提案書草案（パース失敗）', content: raw, sectionType: 'text', isEditable: true, canRegenerate: true }], visualizations: [], metadata: { confidence: 'low', factBasis: [], assumptions: [], missingInfo: [] } }
    }
  }
}
