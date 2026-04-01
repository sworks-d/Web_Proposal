# AG出力表示・パース修正 実装指示書

## 0. 問題の現状（実機確認済み・2026-04-01）

### 問題① パース失敗
AG-06・AG-07がJSONの前後に ```json コードフェンスを付けて返している。
`JSON.parse()` がコードフェンスを除去できておらず、パースエラーになる。

```
確認された実際のエラー表示：
  設計草案（パース失敗）
  {"proposalAxes": [{"id": "axis-a", "statement": "「大企業の安定」ではなく...

  提案書草案（パース失敗）
  '''json {"readerProfile": {"primaryReader": "中部電力グループの人事部門責任者...
```

### 問題② パース失敗時にJSON生テキストが画面に表示される
パースに失敗した時、outputJsonの生文字列がそのままチェックポイントUIに表示されている。
これはCDが読める情報ではない。

### 問題③ 各AGの出力がレイヤー別に整理されて表示されていない
チェックポイントで「取れた情報」として表示される内容が
AGのJSON構造と一致しておらず、CDが判断できる形になっていない。

---

## 1. パース修正（Priority 1・最優先）

### 1.1 JSON クリーニング関数を追加

```typescript
// src/lib/json-cleaner.ts（新規作成）

/**
 * Claude APIが返すテキストからJSONを安全に抽出する
 * - ```json ... ``` コードフェンスを除去
 * - 先頭・末尾の余分なテキストを除去
 * - パース失敗時は null を返す（例外を投げない）
 */
export function safeParseJson(text: string): any | null {
  if (!text) return null

  // パターン1: ```json ... ``` 形式
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fenceMatch) {
    try { return JSON.parse(fenceMatch[1].trim()) } catch {}
  }

  // パターン2: { または [ で始まる部分を抽出
  const jsonStart = text.search(/[\[{]/)
  if (jsonStart !== -1) {
    // 末尾の余分なテキストを除去しながら試行
    let candidate = text.slice(jsonStart)
    try { return JSON.parse(candidate) } catch {}

    // 最後の } または ] を起点に前から削りながら試行
    const jsonEnd = Math.max(text.lastIndexOf('}'), text.lastIndexOf(']'))
    if (jsonEnd > jsonStart) {
      candidate = text.slice(jsonStart, jsonEnd + 1)
      try { return JSON.parse(candidate) } catch {}
    }
  }

  // パターン3: そのままパース（前後に余分なものがない場合）
  try { return JSON.parse(text.trim()) } catch {}

  return null
}
```

### 1.2 全AGの実行処理でsafeParseJsonを使用

```typescript
// src/lib/pipeline.ts および各AG実行箇所で修正

// 変更前
const parsed = JSON.parse(result.outputJson)

// 変更後
import { safeParseJson } from '@/lib/json-cleaner'
const parsed = safeParseJson(result.outputJson)
if (!parsed) {
  // パース失敗時の処理（問題②の対処）
  throw new Error(`AG出力のJSONパースに失敗しました: ${result.agentId}`)
}
```

### 1.3 パース失敗時の保存処理

```typescript
// src/app/api/executions/[id]/resume/route.ts および pipeline.ts

// パース失敗してもoutputJsonは生テキストのままDBに保存する（データを失わない）
// ただしstatusをERRORにしてCDに通知する

await prisma.agentResult.update({
  where: { id: result.id },
  data: {
    outputJson: rawText,          // 生テキストをそのまま保存
    parseError: true,             // パースエラーフラグ（スキーマに追加）
    parseErrorMessage: error.message,
  }
})

// Execution.statusをERRORに更新
await prisma.execution.update({
  where: { id: execution.id },
  data: { status: 'ERROR' }
})
```

**AgentResultスキーマに追加（prisma/schema.prisma）:**
```prisma
model AgentResult {
  // 既存フィールド...
  parseError        Boolean   @default(false)
  parseErrorMessage String?
}
```

---

## 2. AG出力のレイヤー別表示（Priority 2）

### 2.1 各AGの出力を人間が読める形に変換するマッパー

```typescript
// src/lib/output-renderer.ts（新規作成）

/**
 * 各AGのJSON出力を「CDが読めるセクション配列」に変換する
 */

export interface OutputSection {
  label: string          // セクション名（例：「案件サマリー」）
  confidence?: 'high' | 'medium' | 'low'
  items: OutputItem[]
}

export interface OutputItem {
  type: 'text' | 'list' | 'badge-list' | 'warning' | 'principle'
  content: string | string[]
  note?: string
}

// AG-01 インテーク出力のレンダリング
export function renderAG01(json: any): OutputSection[] {
  return [
    {
      label: '案件サマリー',
      confidence: json.confidence,
      items: [{ type: 'text', content: json.projectSummary }]
    },
    {
      label: 'インプットパターン・推奨AG',
      items: [
        { type: 'badge-list', content: [
          `インプット: ${json.inputPattern}`,
          `推奨AG: ${json.primaryAGRecommendation}`,
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

// AG-02 市場分析出力のレンダリング
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

// AG-03 競合分析出力のレンダリング
export function renderAG03(json: any): OutputSection[] {
  return [
    {
      label: '競合マップ',
      confidence: json.confidence,
      items: (json.competitorMap?.directCompetitors ?? []).map((c: any) => ({
        type: 'text' as const,
        content: `${c.name}（${c.url}）`,
        note: `設計意図: ${c.designIntent}`
      }))
    },
    {
      label: '差別化機会（空白地帯）',
      items: [{ type: 'list', content: json.positioningMap?.gapOpportunities ?? [] }]
    },
    {
      label: '差別化戦略',
      items: [
        { type: 'text', content: json.differentiationStrategy?.coreMessage ?? '' },
        { type: 'list', content: json.differentiationStrategy?.supportingPoints ?? [] }
      ]
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

// AG-04 課題構造化出力のレンダリング
export function renderAG04(json: any): OutputSection[] {
  return [
    {
      label: '本質課題',
      confidence: json.confidence,
      items: [
        { type: 'text', content: `表面の依頼: ${json.problemStructure?.surfaceRequest ?? ''}`, note: 'secondary' },
        { type: 'text', content: `本質: ${json.problemStructure?.rootCause ?? ''}` }
      ]
    },
    {
      label: 'なぜなぜ連鎖',
      items: [{ type: 'list', content: json.problemStructure?.whyChain ?? [] }]
    },
    {
      label: 'ターゲット定義',
      items: [
        { type: 'text', content: json.targetDefinition?.primaryTarget ?? '' },
        { type: 'text', content: `インサイト: ${json.targetDefinition?.targetInsight ?? ''}`, note: 'secondary' },
        { type: 'text', content: `JTBD: ${json.targetDefinition?.jobToBeDone ?? ''}`, note: 'secondary' }
      ]
    },
    {
      label: 'CVの障壁',
      items: [{ type: 'list', content: json.targetDefinition?.barriersToCv ?? [] }]
    },
    {
      label: 'Webサイトの役割',
      items: [
        { type: 'text', content: json.websiteRole?.coreMission ?? '' },
        { type: 'list', content: json.websiteRole?.whatItShouldSolve ?? [] }
      ]
    }
  ]
}

// AG-05 ファクトチェック出力のレンダリング
export function renderAG05(json: any): OutputSection[] {
  const score = json.overallQuality?.score ?? 'unknown'
  return [
    {
      label: `品質評価: ${score === 'pass' ? '✅ PASS' : score === 'conditional_pass' ? '⚠️ 条件付きPASS' : '❌ FAIL'}`,
      confidence: json.confidence,
      items: [{ type: 'text', content: json.overallQuality?.summary ?? '' }]
    },
    ...(json.flaggedItems?.length ? [{
      label: '要確認事項',
      items: json.flaggedItems.map((f: any) => ({
        type: 'warning' as const,
        content: `[${f.severity}] ${f.statement}`,
        note: f.recommendation
      }))
    }] : []),
    ...(json.requiresClientConfirmation?.length ? [{
      label: 'ヒアリング項目',
      items: json.requiresClientConfirmation.map((r: any) => ({
        type: 'warning' as const,
        content: r.item,
        note: `質問: ${r.suggestedQuestion}`
      }))
    }] : [])
  ]
}

// AG-06 設計草案出力のレンダリング
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

// AG-07 ストーリー出力のレンダリング
export function renderAG07(json: any): OutputSection[] {
  return [
    {
      label: 'コンセプトワード（3案）',
      confidence: json.confidence,
      items: (json.conceptWords ?? []).map((c: any, i: number) => ({
        type: 'text' as const,
        content: `案${i + 1}: ${c.copy}　―　${c.subCopy}`,
        note: c.rationale
      }))
    },
    {
      label: `目次・章構成（全${json.totalSlides ?? '?'}枚）`,
      items: (json.storyLine ?? []).map((ch: any) => ({
        type: 'principle' as const,
        content: `${ch.chapterTitle}（${ch.estimatedSlides}枚）`,
        note: ch.keyMessage
      }))
    }
  ]
}

// パース失敗時のフォールバックレンダリング
export function renderParseError(agentId: string, rawText: string): OutputSection[] {
  // JSONっぽい部分を抽出して見せる
  const preview = rawText.slice(0, 200).replace(/[{}"]/g, ' ').replace(/\s+/g, ' ').trim()
  return [
    {
      label: `⚠️ ${agentId} — 出力の解析に失敗しました`,
      items: [
        { type: 'warning', content: 'AG出力のJSON形式が不正です。このAGを再実行してください。' },
        { type: 'text', content: preview, note: '出力の先頭200字' }
      ]
    }
  ]
}

// AGIDごとにレンダラーを振り分ける
export function renderAgentOutput(agentId: string, json: any | null, rawText?: string): OutputSection[] {
  if (!json) {
    return renderParseError(agentId, rawText ?? '')
  }
  switch (agentId) {
    case 'AG-01': return renderAG01(json)
    case 'AG-02': return renderAG02(json)
    case 'AG-03': return renderAG03(json)
    case 'AG-04': return renderAG04(json)
    case 'AG-05': return renderAG05(json)
    case 'AG-06': return renderAG06(json)
    case 'AG-07': return renderAG07(json)
    default:      return renderAG01(json) // fallback
  }
}
```

### 2.2 OutputSection を描画するコンポーネント

```typescript
// src/components/preview/OutputSectionRenderer.tsx（新規作成）

import { OutputSection, OutputItem } from '@/lib/output-renderer'

// デザイントークンに従う（FCFBEF背景・Unbounded・赤アクセント）

export function OutputSectionRenderer({ sections }: { sections: OutputSection[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
      {sections.map((sec, i) => (
        <div key={i} style={{
          borderBottom: '1px solid rgba(28,28,23,0.1)',
          padding: '22px 40px'
        }}>
          {/* セクションヘッダー */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '14px'
          }}>
            <span style={{
              fontFamily: 'Unbounded, sans-serif',
              fontSize: '9.5px',
              fontWeight: 700,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: 'var(--ink)'
            }}>
              {sec.label}
            </span>
            {sec.confidence && (
              <span style={{
                fontFamily: 'Sora, sans-serif',
                fontSize: '8px',
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                padding: '2px 9px',
                borderRadius: '99px',
                background: 'var(--bg2)',
                border: '1px solid rgba(28,28,23,0.16)',
                color: sec.confidence === 'high' ? '#1C1C17'
                     : sec.confidence === 'medium' ? '#8A8A78'
                     : '#C4C4AC'
              }}>
                {sec.confidence.toUpperCase()}
              </span>
            )}
          </div>

          {/* アイテム */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {sec.items.map((item, j) => <OutputItemRenderer key={j} item={item} />)}
          </div>
        </div>
      ))}
    </div>
  )
}

function OutputItemRenderer({ item }: { item: OutputItem }) {
  const baseStyle = {
    fontFamily: 'Sora, "Zen Kaku Gothic New", sans-serif',
    fontSize: '13px',
    lineHeight: '1.82',
    color: item.note === 'secondary' ? 'var(--ink3)' : 'var(--ink2)'
  }

  switch (item.type) {
    case 'text':
      return (
        <div>
          <p style={baseStyle}>{item.content as string}</p>
          {item.note && item.note !== 'secondary' && (
            <p style={{ ...baseStyle, fontSize: '11px', color: 'var(--ink3)', marginTop: '2px' }}>
              {item.note}
            </p>
          )}
        </div>
      )

    case 'list':
      return (
        <ul style={{ paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {(item.content as string[]).map((line, i) => (
            <li key={i} style={baseStyle}>{line}</li>
          ))}
        </ul>
      )

    case 'badge-list':
      return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {(item.content as string[]).map((badge, i) => (
            <span key={i} style={{
              background: 'var(--bg2)',
              border: '1px solid rgba(28,28,23,0.16)',
              borderRadius: '99px',
              padding: '3px 12px',
              fontFamily: 'Sora, sans-serif',
              fontSize: '11px',
              color: 'var(--ink2)'
            }}>
              {badge}
            </span>
          ))}
        </div>
      )

    case 'warning':
      return (
        <div style={{
          background: 'rgba(232,196,74,0.08)',
          border: '1px solid rgba(232,196,74,0.4)',
          padding: '10px 14px',
          borderRadius: '2px'
        }}>
          <p style={{ ...baseStyle, color: 'var(--ink)' }}>{item.content as string}</p>
          {item.note && (
            <p style={{ ...baseStyle, fontSize: '11px', color: 'var(--ink3)', marginTop: '3px' }}>
              {item.note}
            </p>
          )}
        </div>
      )

    case 'principle':
      return (
        <div style={{
          borderLeft: '2px solid var(--red)',
          paddingLeft: '12px'
        }}>
          <p style={{ ...baseStyle, color: 'var(--ink)', fontWeight: 500 }}>
            {item.content as string}
          </p>
          {item.note && (
            <p style={{ ...baseStyle, fontSize: '11px', color: 'var(--ink3)', marginTop: '2px' }}>
              {item.note}
            </p>
          )}
        </div>
      )

    default:
      return null
  }
}
```

### 2.3 既存の SectionCard / PreviewPanel を OutputSectionRenderer に置き換える

```typescript
// src/components/preview/PreviewPanel.tsx を修正

import { safeParseJson } from '@/lib/json-cleaner'
import { renderAgentOutput } from '@/lib/output-renderer'
import { OutputSectionRenderer } from './OutputSectionRenderer'

// 変更前: outputJsonをそのまま表示またはJSONを直接パース
// 変更後: safeParseJson → renderAgentOutput → OutputSectionRenderer

export function PreviewPanel({ result }: { result: AgentResult }) {
  const parsed = safeParseJson(result.outputJson)
  const sections = renderAgentOutput(result.agentId, parsed, result.outputJson)

  return <OutputSectionRenderer sections={sections} />
}
```

### 2.4 チェックポイントのcheckpoint-summary.tsも修正

```typescript
// src/lib/checkpoint-summary.ts を修正

import { safeParseJson } from '@/lib/json-cleaner'

export function buildCheckpointSummary(results: AgentResult[]) {
  const gotInfo = []
  const missingInfo = []

  for (const result of results) {
    // 変更前: JSON.parse(result.editedJson ?? result.outputJson)
    // 変更後: safeParseJson を使用
    const output = safeParseJson(result.editedJson ?? result.outputJson)

    if (!output) {
      // パース失敗した場合はmissingInfoとして扱う
      missingInfo.push({
        item: `${result.agentId}の出力解析に失敗しました`,
        reason: 'AG出力が不正なJSON形式でした',
        confirmMethod: 'このAGを再実行してください'
      })
      continue
    }

    // 以降は既存の処理
    if (output.factBasis) { /* ... */ }
    if (output.requiresClientConfirmation) { /* ... */ }
  }

  return { gotInfo, missingInfo }
}
```

---

## 3. 再実行ボタンをパース失敗時に表示する

```typescript
// src/app/projects/[id]/page.tsx のAGレールアイテム部分

// パース失敗したAGには「再実行」ボタンを表示する

{result.parseError && (
  <button
    onClick={() => rerunAgent(agentId)}
    style={{
      fontFamily: 'Unbounded, sans-serif',
      fontSize: '8px',
      fontWeight: 700,
      letterSpacing: '0.15em',
      textTransform: 'uppercase',
      background: 'transparent',
      border: '1px solid var(--red)',
      color: 'var(--red)',
      padding: '5px 12px',
      cursor: 'pointer',
      marginTop: '6px',
      display: 'block'
    }}
  >
    ↺ 再実行
  </button>
)}
```

---

## 4. 実装優先順位

```
Priority 1（パース修正・最優先）:
  - src/lib/json-cleaner.ts を作成
  - pipeline.ts・resume/route.ts・checkpoint-summary.ts の
    JSON.parse() を safeParseJson に全置き換え
  - AgentResult に parseError / parseErrorMessage フィールド追加
  - npx prisma db push

Priority 2（出力レンダリング）:
  - src/lib/output-renderer.ts を作成（AG-01〜07の全マッパー）
  - src/components/preview/OutputSectionRenderer.tsx を作成
  - PreviewPanel を OutputSectionRenderer に置き換え

Priority 3（チェックポイント表示の改善）:
  - checkpoint-summary.ts を safeParseJson 対応に修正
  - チェックポイントUIでOutputSectionRendererを使う

Priority 4（パース失敗時のUX改善）:
  - AGレールに「↺ 再実行」ボタンを追加
  - エラー状態のスタイルを赤枠で明示する
```
