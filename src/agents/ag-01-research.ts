import { BaseAgent } from './base-agent'
import { AgentId, AgentInput, AgentOutput, ProjectContext } from './types'
import { loadPrompt } from '@/lib/prompt-loader'
import anthropic from '@/lib/anthropic-client'

export class Ag01ResearchAgent extends BaseAgent {
  id: AgentId = 'AG-01-RESEARCH'
  name = '会社情報リサーチ'
  protected modelType = 'quality' as const

  getPrompt(_ctx: ProjectContext): string {
    return loadPrompt('ag-01-research')
  }

  async execute(input: AgentInput): Promise<AgentOutput> {
    const system = this.getPrompt(input.projectContext)
    const user = this.buildUserMessage(input)

    type Msg = { role: 'user' | 'assistant'; content: string }
    const messages: Msg[] = [{ role: 'user', content: user }]
    let fullText = ''

    for (let i = 0; i < 4; i++) {
      const res = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 8192,
        system,
        messages,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        tools: i === 0 ? [{ type: 'web_search_20260209' as any, name: 'web_search', max_uses: 30 }] : [],
      })

      const chunk = res.content
        .filter(b => b.type === 'text')
        .map(b => (b as { type: 'text'; text: string }).text)
        .join('')

      fullText += chunk

      if (res.stop_reason !== 'max_tokens') break

      messages.push({ role: 'assistant', content: chunk })
      messages.push({ role: 'user', content: '前回の続きをそのまま出力してください。前置き・説明・重複は不要です。' })
    }

    this.lastRawText = fullText
    return this.parseOutput(fullText)
  }

  parseOutput(raw: string): AgentOutput {
    try {
      const p = this.parseJSON<Record<string, unknown>>(raw)
      const sections = []

      if (p.companyBasics) sections.push({
        id: 'company-basics', title: '会社基本情報',
        content: JSON.stringify(p.companyBasics, null, 2),
        sectionType: 'text', isEditable: true, canRegenerate: true,
      })

      if (p.areaProfile) sections.push({
        id: 'area-profile', title: 'エリアプロフィール',
        content: JSON.stringify(p.areaProfile, null, 2),
        sectionType: 'text', isEditable: true, canRegenerate: true,
      })

      if (p.industryProfile) sections.push({
        id: 'industry-profile', title: '業界プロフィール',
        content: JSON.stringify(p.industryProfile, null, 2),
        sectionType: 'text', isEditable: true, canRegenerate: true,
      })

      if (p.reputationData) sections.push({
        id: 'reputation', title: '評判・口コミデータ',
        content: JSON.stringify(p.reputationData, null, 2),
        sectionType: 'text', isEditable: true, canRegenerate: true,
      })

      if (p.subjectiveVsObjective) {
        const svo = p.subjectiveVsObjective as Record<string, unknown>
        const gaps = Array.isArray(svo.gaps) ? (svo.gaps as string[]).join('\n') : ''
        sections.push({
          id: 'subjective-vs-objective', title: '主観 vs 客観（ズレの整理）',
          content: gaps || JSON.stringify(svo, null, 2),
          sectionType: 'text', isEditable: true, canRegenerate: true,
        })
      }

      if (p.chartData) sections.push({
        id: 'chart-data', title: 'チャートデータ（業界ランキング等）',
        content: JSON.stringify(p.chartData, null, 2),
        sectionType: 'text', isEditable: true, canRegenerate: true,
      })

      return {
        agentId: this.id,
        sections: sections.length > 0 ? sections : [{ id: 'raw', title: '会社情報リサーチ', content: raw, sectionType: 'text', isEditable: true, canRegenerate: true }],
        visualizations: [],
        metadata: {
          confidence: (p.confidence as 'high' | 'medium' | 'low') ?? 'medium',
          factBasis: (p.subjectiveVsObjective as Record<string, unknown>)?.verifiedFacts as string[] ?? [],
          assumptions: [],
          missingInfo: (p.dataLimitations as string[]) ?? [],
        },
      }
    } catch {
      return {
        agentId: this.id,
        sections: [{ id: 'raw', title: '会社情報リサーチ（パース失敗）', content: raw, sectionType: 'text', isEditable: true, canRegenerate: true }],
        visualizations: [],
        metadata: { confidence: 'low', factBasis: [], assumptions: [], missingInfo: [] },
      }
    }
  }
}
