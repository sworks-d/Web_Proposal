import { BaseAgent } from './base-agent'
import { AgentId, AgentOutput, ProjectContext } from './types'
import { loadPrompt } from '@/lib/prompt-loader'

interface IntakeRaw {
  projectSummary: string
  missingInfo: string[]
  hearingItems: string[]
  recommendedAgents: string[]
  assumptions: string[]
}

export class IntakeAgent extends BaseAgent {
  id: AgentId = 'AG-01'
  name = 'インテーク担当'

  getPrompt(_ctx: ProjectContext): string {
    return loadPrompt('ag-01-intake')
  }

  parseOutput(raw: string): AgentOutput {
    try {
      const p = this.parseJSON<IntakeRaw>(raw)
      return {
        agentId: this.id,
        sections: [
          {
            id: 'project-summary',
            title: '案件サマリー',
            content: p.projectSummary,
            sectionType: 'summary',
            isEditable: true,
            canRegenerate: true,
          },
          {
            id: 'missing-info',
            title: '不足情報リスト',
            content: p.missingInfo.map(i => `- ${i}`).join('\n'),
            sectionType: 'checklist',
            isEditable: true,
            canRegenerate: false,
          },
          {
            id: 'hearing-items',
            title: '追加ヒアリング項目',
            content: p.hearingItems.map(i => `- ${i}`).join('\n'),
            sectionType: 'checklist',
            isEditable: true,
            canRegenerate: true,
          },
        ],
        visualizations: [],
        metadata: {
          confidence: 'medium',
          factBasis: ['クライアントからの依頼テキスト'],
          assumptions: p.assumptions,
          missingInfo: p.missingInfo,
        },
      }
    } catch {
      return {
        agentId: this.id,
        sections: [{
          id: 'raw-output',
          title: 'インテーク結果（パース失敗）',
          content: raw,
          sectionType: 'text',
          isEditable: true,
          canRegenerate: true,
        }],
        visualizations: [],
        metadata: {
          confidence: 'low',
          factBasis: [],
          assumptions: [],
          missingInfo: ['出力のパースに失敗しました。内容を確認してください。'],
        },
      }
    }
  }
}
