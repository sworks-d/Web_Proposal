import { BaseAgent } from './base-agent'
import { AgentId, AgentInput, AgentOutput, ProjectContext } from './types'
import { loadPrompt } from '@/lib/prompt-loader'
import anthropic from '@/lib/anthropic-client'
import { fetchSiteData } from '@/lib/site-fetcher'
import { measurePageSpeed } from '@/lib/pagespeed-client'
import { getCostTracker } from '@/lib/cost-tracker'

export class Ag01ResearchAgent extends BaseAgent {
  id: AgentId = 'AG-01-RESEARCH'
  name = '会社情報リサーチ'
  protected modelType = 'fast' as const

  getPrompt(_ctx: ProjectContext): string {
    return loadPrompt('ag-01-research')
  }

  async execute(input: AgentInput): Promise<AgentOutput> {
    const caseType = input.projectContext.caseType ?? 'A'
    console.log(`[AG-01-RESEARCH] 案件種別: ${caseType}`)

    if (caseType === 'B' || caseType === 'C') {
      return this.executeRenewalFlow(input)
    } else {
      return this.executeNewFlow(input)
    }
  }

  // ─── A: 新規案件 — web_search 中心（最大20回）───────────────────────────

  private async executeNewFlow(input: AgentInput): Promise<AgentOutput> {
    const system = this.getPrompt(input.projectContext)
    const user = this.buildUserMessage(input)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    type Msg = { role: 'user' | 'assistant'; content: any }
    const messages: Msg[] = [{ role: 'user', content: user }]
    let fullText = ''

    console.log(`[AG-01-RESEARCH] 新規フロー開始 — web_search max_uses=5/回, 最大3ラウンド`)
    const t0 = Date.now()
    const tracker = getCostTracker()

    // 安全装置: 最大3ラウンド（元は4）、1ラウンドあたり5検索 = 最大15検索
    const MAX_ROUNDS = 3
    const MAX_TOTAL_SEARCH = 15
    let totalSearchCount = 0

    for (let i = 0; i < MAX_ROUNDS; i++) {
      // コスト事前チェック
      if (tracker) {
        const estInput = Math.ceil((system.length + JSON.stringify(messages).length) / 3)
        tracker.preCheck('AG-01-RESEARCH', 'claude-haiku-4-5-20251001', estInput)
      }

      console.log(`[AG-01-RESEARCH] API呼び出し #${i + 1} 開始`)
      const tCall = Date.now()

      // 初回のみweb_search有効（2回目以降は継続生成のみ）
      const useSearch = i === 0
      const remainingSearches = Math.max(0, MAX_TOTAL_SEARCH - totalSearchCount)

      const res = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 4096,
        system,
        messages,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...(useSearch && remainingSearches > 0
          ? { tools: [{ type: 'web_search_20260209' as any, name: 'web_search', max_uses: Math.min(5, remainingSearches), allowed_callers: ['direct'] }] }
          : {}),
      })

      const elapsed = ((Date.now() - tCall) / 1000).toFixed(1)
      const searchCount = res.content.filter(b => b.type === 'server_tool_use').length
      totalSearchCount += searchCount
      console.log(`[AG-01-RESEARCH] #${i + 1} 完了 — ${elapsed}s, stop_reason=${res.stop_reason}, 検索数=${searchCount}, 累計検索=${totalSearchCount}`)

      // コスト記録
      if (tracker) {
        tracker.record(
          `AG-01-RESEARCH:round${i + 1}`,
          'claude-haiku-4-5-20251001',
          res.usage?.input_tokens ?? 0,
          res.usage?.output_tokens ?? 0,
          searchCount
        )
      }

      const chunk = res.content
        .filter(b => b.type === 'text')
        .map(b => (b as { type: 'text'; text: string }).text)
        .join('')

      fullText += chunk
      if (res.stop_reason !== 'max_tokens') break

      // 検索上限到達チェック
      if (totalSearchCount >= MAX_TOTAL_SEARCH) {
        console.warn(`[AG-01-RESEARCH] 検索上限 ${MAX_TOTAL_SEARCH} 到達 — ループ終了`)
        break
      }

      messages.push({ role: 'assistant', content: res.content })
      messages.push({ role: 'user', content: '前回の続きをそのまま出力してください。前置き・説明・重複は不要です。' })
    }

    console.log(`[AG-01-RESEARCH] 新規フロー完了 — 合計 ${((Date.now() - t0) / 1000).toFixed(1)}s, 総検索数=${totalSearchCount}`)
    this.lastRawText = fullText
    return this.parseOutput(fullText)
  }

  // ─── B/C: リニューアル・改善 — web_fetch + PageSpeed + web_search（最大10回）

  private async executeRenewalFlow(input: AgentInput): Promise<AgentOutput> {
    const siteUrl = input.projectContext.siteUrl
    if (!siteUrl) throw new Error('リニューアル案件にはサイトURLが必要です')

    const t0 = Date.now()
    console.log(`[AG-01-RESEARCH] リニューアルフロー開始 — ${siteUrl}`)

    // Step 1: サイトページを並列取得 + PageSpeed を並列実行
    console.log(`[AG-01-RESEARCH] Step1: サイト取得 & PageSpeed 計測（並列）`)
    const [siteData, pageSpeedResult] = await Promise.allSettled([
      fetchSiteData(siteUrl),
      process.env.GOOGLE_PAGESPEED_API_KEY
        ? measurePageSpeed(siteUrl, 'mobile')
        : Promise.reject(new Error('GOOGLE_PAGESPEED_API_KEY 未設定')),
    ])

    const siteText = siteData.status === 'fulfilled'
      ? siteData.value.combinedText
      : `サイト取得失敗: ${(siteData as PromiseRejectedResult).reason}`

    const pageSpeedSummary = pageSpeedResult.status === 'fulfilled'
      ? JSON.stringify({
          performance: pageSpeedResult.value.performanceScore,
          accessibility: pageSpeedResult.value.accessibilityScore,
          seo: pageSpeedResult.value.seoScore,
          lcp: pageSpeedResult.value.coreWebVitals.lcp,
          cls: pageSpeedResult.value.coreWebVitals.cls,
          inp: pageSpeedResult.value.coreWebVitals.inp,
        })
      : `PageSpeed未計測（${(pageSpeedResult as PromiseRejectedResult).reason?.message ?? ''}）`

    console.log(`[AG-01-RESEARCH] Step1完了 — サイト取得=${siteData.status}, PageSpeed=${pageSpeedResult.status}`)

    // Step 2: 取得したサイトデータ + web_search（最大10回）でリサーチ
    const system = this.getPrompt(input.projectContext)
    const baseUser = this.buildUserMessage(input)
    const user = `${baseUser}

---
## 事前取得データ（このデータは実データです。信頼度★★★として扱ってください）

### サイトから取得したコンテンツ
${siteText}

### PageSpeed Insights 計測結果
${pageSpeedSummary}

---
【重要】上記の事前取得データをベースに分析してください。
web_searchはサイトに載っていない「業界情報・競合情報・口コミ」の収集のみに使用し、10回以内に収めてください。`

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    type Msg = { role: 'user' | 'assistant'; content: any }
    const messages: Msg[] = [{ role: 'user', content: user }]
    let fullText = ''

    console.log(`[AG-01-RESEARCH] Step2: web_search（周辺情報のみ、最大5回）`)
    const tCall = Date.now()

    const res = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      system,
      messages,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tools: [{ type: 'web_search_20260209' as any, name: 'web_search', max_uses: 5, allowed_callers: ['direct'] }],
    })

    const elapsed = ((Date.now() - tCall) / 1000).toFixed(1)
    const searchCount = res.content.filter(b => b.type === 'server_tool_use').length
    console.log(`[AG-01-RESEARCH] Step2完了 — ${elapsed}s, 検索数=${searchCount}`)

    // コスト記録
    const tracker = getCostTracker()
    if (tracker) {
      tracker.record(
        'AG-01-RESEARCH:renewal',
        'claude-haiku-4-5-20251001',
        res.usage?.input_tokens ?? 0,
        res.usage?.output_tokens ?? 0,
        searchCount
      )
    }

    fullText = res.content
      .filter(b => b.type === 'text')
      .map(b => (b as { type: 'text'; text: string }).text)
      .join('')

    console.log(`[AG-01-RESEARCH] リニューアルフロー完了 — 合計 ${((Date.now() - t0) / 1000).toFixed(1)}s`)

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
