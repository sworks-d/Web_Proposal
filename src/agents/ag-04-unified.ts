import { BaseAgent } from './base-agent'
import { AgentId, AgentOutput, ProjectContext } from './types'
import { loadPrompt } from '@/lib/prompt-loader'

export class Ag04UnifiedAgent extends BaseAgent {
  id: AgentId = 'AG-04'
  name = '課題定義・インサイト統合'
  protected modelType = 'quality' as const

  getPrompt(_ctx: ProjectContext): string {
    return loadPrompt('ag-04-unified')
  }

  parseOutput(raw: string): AgentOutput {
    try {
      const p = this.parseJSON<Record<string, unknown>>(raw)
      const sections = []

      const core = p.coreAnalysis as Record<string, unknown> | undefined
      if (core) {
        sections.push({
          id: 'core-analysis',
          title: '課題の本質',
          content: `**表面の依頼**: ${core.surfaceRequest}\n\n**根本原因**: ${core.rootCause}\n\n**Why分析**: ${core.whySummary}\n\n**最優先課題**: ${core.primaryIssue}`,
          sectionType: 'text',
          isEditable: true,
          canRegenerate: true,
        })
      }

      const visitor = p.visitorInsight as Record<string, unknown> | undefined
      if (visitor) {
        sections.push({
          id: 'visitor-insight',
          title: '訪問者インサイト',
          content: `**最重要JTBD**: ${visitor.primaryJob}\n\n**最重要バリアー**: ${visitor.criticalBarrier}\n\n**主要意図**: ${visitor.primaryIntent}`,
          sectionType: 'text',
          isEditable: true,
          canRegenerate: true,
        })
      }

      const design = p.designDirection as Record<string, unknown> | undefined
      if (design) {
        const hmw = (design.hmwTop3 as string[] || []).map((h, i) => `${i + 1}. ${h}`).join('\n')
        const principles = (design.designPrinciples as string[] || []).map((pr, i) => `${i + 1}. ${pr}`).join('\n')
        sections.push({
          id: 'design-direction',
          title: '設計方向性',
          content: `**課題定義**: ${design.coreProblem}\n\n**サイトの役割**: ${design.websiteRole}\n\n**HMW（設計問い）**:\n${hmw}\n\n**設計原則**:\n${principles}`,
          sectionType: 'text',
          isEditable: true,
          canRegenerate: true,
        })
      }

      return {
        agentId: this.id,
        sections: sections.length > 0 ? sections : [{
          id: 'raw',
          title: '課題定義・インサイト',
          content: raw,
          sectionType: 'text',
          isEditable: true,
          canRegenerate: true,
        }],
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
        sections: [{
          id: 'raw',
          title: '課題定義・インサイト（パース失敗）',
          content: raw,
          sectionType: 'text',
          isEditable: true,
          canRegenerate: true,
        }],
        visualizations: [],
        metadata: { confidence: 'low', factBasis: [], assumptions: [], missingInfo: [] },
      }
    }
  }
}
