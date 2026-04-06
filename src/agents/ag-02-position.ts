import { BaseAgent } from './base-agent'
import { AgentId, AgentInput, AgentOutput, ProjectContext } from './types'
import { loadPrompt } from '@/lib/prompt-loader'

export class Ag02PositionAgent extends BaseAgent {
  id: AgentId = 'AG-02-POSITION'
  name = '4軸ポジショニング分析'
  protected modelType = 'quality' as const

  getPrompt(_ctx: ProjectContext): string {
    return loadPrompt('ag-02-position')
  }

  async execute(input: AgentInput): Promise<AgentOutput> {
    const [part1, part2] = await Promise.all([
      this.callSection(input,
        'axis1_area_scale、axis2_industry_scale フィールドのみ出力。他のフィールドは含めない。',
        6000),
      this.callSection(input,
        'axis3_area_industry、axis4_industry_digital、integratedPosition、confidence、assumptions フィールドのみ出力。',
        6000),
    ])
    const merged = { ...part1, ...part2 }
    this.lastRawText = JSON.stringify(merged)
    return this.parseOutput(this.lastRawText)
  }

  parseOutput(raw: string): AgentOutput {
    try {
      const p = this.parseJSON<Record<string, unknown>>(raw)
      const sections = []

      const axisLabels: Record<string, string> = {
        axis1_area_scale: '軸1：エリア × 規模',
        axis2_industry_scale: '軸2：業界規模 × Web存在感',
        axis3_area_industry: '軸3：エリア特化 × 業界専門性',
        axis4_industry_digital: '軸4：業界デジタル成熟度',
      }

      for (const [key, label] of Object.entries(axisLabels)) {
        if (p[key]) {
          const axis = p[key] as Record<string, unknown>
          const lines = []
          if (axis.qualitativeAssessment) lines.push(`**定性評価**: ${axis.qualitativeAssessment}`)
          if (axis.designImplication) lines.push(`**設計示唆**: ${axis.designImplication}`)
          sections.push({
            id: key, title: label,
            content: lines.length > 0 ? lines.join('\n') : JSON.stringify(axis, null, 2),
            sectionType: 'text', isEditable: true, canRegenerate: true,
          })
        }
      }

      if (p.integratedPosition) {
        const ip = p.integratedPosition as Record<string, unknown>
        sections.push({
          id: 'integrated-position', title: '統合ポジションマップ',
          content: [
            ip.summary ? `**現在地**: ${ip.summary}` : '',
            ip.targetPosition ? `**目標地点**: ${ip.targetPosition}` : '',
            ip.gap ? `**GAP**: ${ip.gap}` : '',
            ip.uniqueOpportunity ? `**差別化機会**: ${ip.uniqueOpportunity}` : '',
          ].filter(Boolean).join('\n'),
          sectionType: 'text', isEditable: true, canRegenerate: true,
        })
      }

      return {
        agentId: this.id,
        sections: sections.length > 0 ? sections : [{ id: 'raw', title: '4軸ポジショニング', content: raw, sectionType: 'text', isEditable: true, canRegenerate: true }],
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
        sections: [{ id: 'raw', title: '4軸ポジショニング（パース失敗）', content: raw, sectionType: 'text', isEditable: true, canRegenerate: true }],
        visualizations: [],
        metadata: { confidence: 'low', factBasis: [], assumptions: [], missingInfo: [] },
      }
    }
  }
}
