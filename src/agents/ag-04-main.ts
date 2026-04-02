import { BaseAgent } from './base-agent'
import { AgentId, AgentOutput, ProjectContext } from './types'
import { loadPrompt } from '@/lib/prompt-loader'

export class Ag04MainAgent extends BaseAgent {
  id: AgentId = 'AG-04-MAIN'
  name = '課題構造化（5Whys・イシューツリー・HMW）'
  protected modelType = 'quality' as const

  getPrompt(_ctx: ProjectContext): string {
    return loadPrompt('ag-04-main')
  }

  parseOutput(raw: string): AgentOutput {
    try {
      const p = this.parseJSON<Record<string, unknown>>(raw)
      const sections = []

      if (p.fiveWhys) {
        const fw = p.fiveWhys as Record<string, unknown>
        sections.push({
          id: 'five-whys', title: '5Whys分析',
          content: `表面的要求: ${fw.surfaceRequest}\n根本原因: ${fw.rootCause}\n\nWhyチェーン:\n${(fw.whyChain as string[] ?? []).map((w, i) => `${i + 1}. ${w}`).join('\n')}`,
          sectionType: 'text', isEditable: true, canRegenerate: true,
        })
      }

      if (p.issueTree) {
        const it = p.issueTree as Record<string, unknown>
        sections.push({
          id: 'issue-tree', title: 'イシューツリー（MECE構造）',
          content: `主要課題: ${it.primaryIssue}\n理由: ${it.primaryIssueReason}\n\n${JSON.stringify(it.branches, null, 2)}`,
          sectionType: 'text', isEditable: true, canRegenerate: true,
        })
      }

      if (p.hmwQuestions && Array.isArray(p.hmwQuestions)) sections.push({
        id: 'hmw', title: 'HMW（How Might We）',
        content: (p.hmwQuestions as Array<Record<string, unknown>>)
          .map(q => `**[${q.priority}] ${q.hmwId}** ${q.question}\n設計方向: ${q.designDirection}`)
          .join('\n\n'),
        sectionType: 'text', isEditable: true, canRegenerate: true,
      })

      if (p.coreProblemStatement) sections.push({
        id: 'core-problem', title: '課題定義（1文集約）',
        content: String(p.coreProblemStatement),
        sectionType: 'text', isEditable: true, canRegenerate: true,
      })

      return {
        agentId: this.id,
        sections: sections.length > 0 ? sections : [{ id: 'raw', title: '課題構造化', content: raw, sectionType: 'text', isEditable: true, canRegenerate: true }],
        visualizations: [],
        metadata: {
          confidence: (p.confidence as 'high' | 'medium' | 'low') ?? 'medium',
          factBasis: (p.factBasis as string[]) ?? [],
          assumptions: (p.assumptions as string[]) ?? [],
          missingInfo: [],
        },
      }
    } catch {
      return {
        agentId: this.id,
        sections: [{ id: 'raw', title: '課題構造化（パース失敗）', content: raw, sectionType: 'text', isEditable: true, canRegenerate: true }],
        visualizations: [],
        metadata: { confidence: 'low', factBasis: [], assumptions: [], missingInfo: [] },
      }
    }
  }
}
