/**
 * 各AGのJSON出力を「CDが読めるセクション配列」に変換する
 */

export interface OutputSection {
  label: string
  confidence?: 'high' | 'medium' | 'low'
  items: OutputItem[]
}

export interface OutputItem {
  type: 'text' | 'list' | 'badge-list' | 'warning' | 'principle'
  content: string | string[]
  note?: string
}

export function renderAG01(json: any): OutputSection[] {
  return [
    {
      label: '案件サマリー',
      confidence: json.confidence,
      items: [{ type: 'text', content: json.projectSummary ?? '' }]
    },
    {
      label: 'インプットパターン・推奨AG',
      items: [
        { type: 'badge-list', content: [
          `インプット: ${json.inputPattern ?? ''}`,
          `推奨AG: ${json.primaryAGRecommendation ?? ''}`,
          ...(json.subAGRecommendations ?? []).map((s: string) => `SUB: ${s}`)
        ]}
      ]
    },
    {
      label: 'ターゲット仮説',
      items: [
        { type: 'text', content: json.targetHypothesis?.primary ?? '' },
        { type: 'text', content: `根拠: ${json.targetHypothesis?.basisFromBrief ?? ''}`, note: 'secondary' }
      ]
    },
    ...(json.keyConstraints?.length ? [{
      label: '制約・条件',
      items: [{ type: 'list' as const, content: json.keyConstraints }]
    }] : []),
    ...(json.requiresClientConfirmation?.length ? [{
      label: 'ヒアリング項目',
      items: json.requiresClientConfirmation.map((r: any) => ({
        type: 'warning' as const,
        content: r.item,
        note: r.reason
      }))
    }] : []),
    ...(json.missingInfo?.length ? [{
      label: '取れなかった情報',
      items: [{ type: 'list' as const, content: json.missingInfo }]
    }] : [])
  ]
}

export function renderAG02(json: any): OutputSection[] {
  return [
    {
      label: '市場概況',
      confidence: json.confidence,
      items: [{ type: 'text', content: json.marketStructure?.overview ?? '' }]
    },
    {
      label: '市場トレンド',
      items: [{ type: 'list', content: json.marketStructure?.keyTrends ?? [] }]
    },
    {
      label: 'ターゲット仮説（精緻化）',
      items: [
        { type: 'text', content: json.targetHypothesis?.primaryTarget ?? '' },
        { type: 'text', content: json.targetHypothesis?.contextualState ?? '', note: 'secondary' },
        { type: 'text', content: `根拠: ${json.targetHypothesis?.basisFromMarket ?? ''}`, note: 'secondary' }
      ]
    },
    {
      label: 'コアEVP',
      items: [{ type: 'text', content: json.evpAndContentStrategy?.coreEVP ?? '' }]
    },
    {
      label: 'サイト設計原則（AG-06への引き継ぎ）',
      items: (json.siteDesignPrinciples ?? []).map((p: any) => ({
        type: 'principle' as const,
        content: p.principle,
        note: `優先度: ${p.priority} — ${p.rationale}`
      }))
    }
  ]
}

export function renderAG03(json: any): OutputSection[] {
  return [
    {
      label: '競合個別評価',
      confidence: json.confidence,
      items: (json.competitors ?? []).map((c: any) => ({
        type: 'text' as const,
        content: `${c.name}（脅威度: ${c.threatLevel ?? '?'}）`,
        note: c.strategicIntent ?? ''
      }))
    },
    {
      label: '空白地帯（差別化機会）',
      items: (json.crossCompetitorAnalysis?.vacantAreas ?? []).map((v: any) => ({
        type: 'principle' as const,
        content: v.area ?? '',
        note: `実現可能性: ${v.feasibility ?? '?'} — ${v.clientFit ?? ''}`
      }))
    },
    {
      label: '最大脅威・注目競合',
      items: [
        { type: 'text', content: `最大脅威: ${json.crossCompetitorAnalysis?.biggestThreat?.competitor ?? ''}`, note: json.crossCompetitorAnalysis?.biggestThreat?.rationale ?? '' },
        { type: 'text', content: `コンテンツ投資リーダー: ${json.crossCompetitorAnalysis?.contentInvestmentLeader?.competitor ?? ''}`, note: json.crossCompetitorAnalysis?.contentInvestmentLeader?.rationale ?? '' },
      ]
    },
    {
      label: '推奨ポジション',
      items: [
        { type: 'text', content: json.differentiationOpportunity?.recommendedPosition ?? '' },
        { type: 'text', content: `サイト設計への含意: ${json.differentiationOpportunity?.siteDesignImplication ?? ''}`, note: 'secondary' }
      ]
    }
  ]
}

export function renderAG04(json: any): OutputSection[] {
  return [
    {
      label: 'ターゲット定義',
      confidence: json.confidence,
      items: [
        { type: 'text', content: json.targetDefinition?.whoConverts ?? '' },
        { type: 'text', content: `状態: ${json.targetDefinition?.contextualState ?? ''}`, note: 'secondary' },
        { type: 'text', content: `CV行動: ${json.targetDefinition?.cvAction ?? ''}`, note: 'secondary' }
      ]
    },
    {
      label: 'ターゲットインサイト',
      items: [
        { type: 'text', content: json.targetInsight?.emotionalTension ?? '' },
        { type: 'list', content: json.targetInsight?.realDrivers ?? [] },
        { type: 'text', content: `トリガー: ${json.targetInsight?.triggerMoment ?? ''}`, note: 'secondary' },
        { type: 'text', content: `訴求示唆: ${json.targetInsight?.communicationImplication ?? ''}`, note: 'secondary' }
      ]
    },
    {
      label: '構造的課題（なぜなぜ分析）',
      items: (json.structuralChallenges ?? []).slice(0, 3).map((c: any) => ({
        type: 'principle' as const,
        content: c.rootCause ?? '',
        note: `表面: ${c.surfaceChallenge ?? ''} — Webで解決可能: ${c.isWebSolvable ? 'Yes' : 'No'}`
      }))
    },
    {
      label: '解くべき問い（AG-06へのバトン）',
      items: (json.coreProblemStatements ?? []).slice(0, 3).map((s: any) => ({
        type: 'principle' as const,
        content: s.statement ?? '',
        note: `優先度: ${s.priority ?? '?'} — ${s.direction ?? ''}`
      }))
    }
  ]
}

export function renderAG05(json: any): OutputSection[] {
  const ready = json.overallAssessment?.readyForCreative
  const readyLabel = ready === true ? '✅ クリエイティブ進行OK' : ready === false ? '❌ 要対処あり' : '⚠️ 確認中'
  return [
    {
      label: `品質評価: ${readyLabel}`,
      confidence: json.confidence,
      items: [
        { type: 'text', content: json.overallAssessment?.summary ?? '' },
        ...(json.overallAssessment?.criticalIssues?.length ? [{ type: 'list' as const, content: json.overallAssessment.criticalIssues }] : [])
      ]
    },
    ...(json.issues?.length ? [{
      label: `指摘事項（${json.issues.length}件）`,
      items: json.issues.slice(0, 5).map((f: any) => ({
        type: 'warning' as const,
        content: `[${f.severity ?? '?'}] ${f.agentId ?? ''}: ${f.description ?? ''}`,
        note: f.suggestion ?? ''
      }))
    }] : []),
    ...(json.requiresClientConfirmation?.length ? [{
      label: 'ヒアリング項目',
      items: json.requiresClientConfirmation.map((r: any) => ({
        type: 'warning' as const,
        content: r.item ?? '',
        note: `理由: ${r.reason ?? ''}`
      }))
    }] : [])
  ]
}

export function renderAG06(json: any): OutputSection[] {
  return [
    {
      label: 'サイトコアコンセプト',
      confidence: json.confidence,
      items: [
        { type: 'text', content: json.siteDesignSummary?.coreConcept ?? '' },
        { type: 'text', content: `主要CV: ${json.siteDesignSummary?.primaryCV ?? ''}`, note: 'secondary' }
      ]
    },
    {
      label: '情報設計（IA）',
      items: [
        { type: 'text', content: `構造: ${json.ia?.structure ?? ''}` },
        { type: 'badge-list', content: json.ia?.globalNav ?? [] }
      ]
    },
    {
      label: `ページ構成（${json.ia?.pages?.length ?? 0}ページ）`,
      items: (json.ia?.pages ?? []).map((p: any) => ({
        type: 'text' as const,
        content: p.title,
        note: p.purpose
      }))
    },
    {
      label: '運用・技術設計',
      items: [
        { type: 'text', content: `推奨CMS: ${json.operationalDesign?.cmsRecommendation ?? ''}` },
        { type: 'text', content: `運用者スキル想定: ${json.operationalDesign?.operatorSkillLevel ?? ''}`, note: 'secondary' },
        ...(json.operationalDesign?.highRiskItems ?? []).map((r: any) => ({
          type: 'warning' as const,
          content: r.item,
          note: r.mitigation
        }))
      ]
    },
    {
      label: '提案書章構成（スライド概算）',
      items: (json.slideOutline ?? []).map((ch: any) => ({
        type: 'principle' as const,
        content: `${ch.chapterTitle}（推定${ch.estimatedSlides}枚）`,
        note: ch.role
      }))
    }
  ]
}

export function renderAG07(json: any): OutputSection[] {
  return [
    {
      label: 'コンセプトワード（3案）',
      confidence: json.confidence,
      items: (json.conceptWords ?? []).map((c: any, i: number) => ({
        type: 'text' as const,
        content: `案${i + 1}: ${c.copy}　―　${c.subCopy ?? ''}`,
        note: c.rationale
      }))
    },
    {
      label: `目次・章構成（全${json.totalSlides ?? '?'}枚）`,
      items: (json.storyLine ?? []).map((ch: any) => ({
        type: 'principle' as const,
        content: `${ch.chapterTitle}（${ch.estimatedSlides ?? '?'}枚）`,
        note: ch.keyMessage
      }))
    }
  ]
}

export function renderParseError(agentId: string, rawText: string): OutputSection[] {
  const preview = rawText.slice(0, 400).trim()
  const isTruncated = rawText.length > 0 && !rawText.trimEnd().endsWith('}') && !rawText.trimEnd().endsWith(']')
  return [
    {
      label: `⚠️ ${agentId} — 出力の解析に失敗しました`,
      items: [
        {
          type: 'warning',
          content: isTruncated
            ? 'JSON出力がmax_tokensで途中で切れた可能性があります。再実行してください。'
            : 'AG出力のJSON形式が不正です。このAGを再実行してください。',
        },
        ...(preview ? [{ type: 'text' as const, content: preview, note: `出力の先頭${Math.min(rawText.length, 400)}字` }] : [])
      ]
    }
  ]
}

export function renderAgentOutput(agentId: string, json: any | null, rawText?: string): OutputSection[] {
  if (!json) return renderParseError(agentId, rawText ?? '')
  switch (agentId) {
    case 'AG-01': return renderAG01(json)
    case 'AG-02': return renderAG02(json)
    case 'AG-03': return renderAG03(json)
    case 'AG-04': return renderAG04(json)
    case 'AG-05': return renderAG05(json)
    case 'AG-06': return renderAG06(json)
    case 'AG-07': return renderAG07(json)
    default:      return renderAG01(json)
  }
}
