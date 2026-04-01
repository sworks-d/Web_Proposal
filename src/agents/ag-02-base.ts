import { BaseAgent } from './base-agent'
import { AgentId, AgentOutput, ProjectContext, PrimaryAgentId, SubAgentId } from './types'
import { loadPrompt, loadSubPrompt } from '@/lib/prompt-loader'

export abstract class Ag02BaseAgent extends BaseAgent {
  abstract primaryId: PrimaryAgentId
  protected subIds: SubAgentId[] = []

  setSubAgents(subIds: SubAgentId[]) {
    this.subIds = subIds
  }

  getPrompt(_context: ProjectContext): string {
    const primary = loadPrompt(this.primaryId)
    if (this.subIds.length === 0) return primary
    const subContexts = this.subIds
      .map(id => loadSubPrompt(id))
      .filter(Boolean)
      .join('\n\n---\n\n')
    if (!subContexts) return primary
    return `${primary}\n\n---\n\n# 業種コンテキスト（SUB）\n\n以下の業種コンテキストをこの分析に統合してください。\n\n${subContexts}`
  }

  protected fallbackOutput(raw: string): AgentOutput {
    return {
      agentId: this.id,
      sections: [{
        id: 'raw-output',
        title: '市場分析結果（パース失敗）',
        content: raw,
        sectionType: 'text',
        isEditable: true,
        canRegenerate: true,
      }],
      visualizations: [],
      metadata: { confidence: 'low', factBasis: [], assumptions: [], missingInfo: [] },
    }
  }

  protected parseMarketSections(p: Record<string, unknown>) {
    const sections = []
    const fields: Array<{ key: string; title: string; type: string }> = [
      { key: 'marketStructure', title: '市場構造', type: 'market' },
      { key: 'targetCandidateProfile', title: 'ターゲット候補者の深層理解', type: 'target' },
      { key: 'targetHypothesis', title: 'ターゲット仮説', type: 'target-hypothesis' },
      { key: 'webTrends', title: 'Webトレンド', type: 'trends' },
      { key: 'playerTendencies', title: '主要プレイヤーの傾向', type: 'players' },
      { key: 'userBehavior', title: 'ユーザー行動特性', type: 'behavior' },
    ]
    for (const { key, title, type } of fields) {
      if (p[key]) {
        sections.push({
          id: key.replace(/([A-Z])/g, '-$1').toLowerCase(),
          title,
          content: typeof p[key] === 'string' ? p[key] as string : JSON.stringify(p[key], null, 2),
          sectionType: type,
          isEditable: true,
          canRegenerate: true,
        })
      }
    }
    if (p.siteDesignPrinciples && Array.isArray(p.siteDesignPrinciples)) {
      sections.push({
        id: 'site-principles',
        title: 'サイト設計原則（AG-06へのバトン）',
        content: (p.siteDesignPrinciples as Array<{principle: string; rationale: string; priority: string}>)
          .map(s => `**[${(s.priority ?? '').toUpperCase()}]** ${s.principle}\n→ ${s.rationale}`)
          .join('\n\n'),
        sectionType: 'principles',
        isEditable: true,
        canRegenerate: true,
      })
    }
    return sections
  }
}
