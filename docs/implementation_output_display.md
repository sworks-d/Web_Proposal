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

---

## 5. 実行中の過去AG出力への横断アクセス（Priority 2と同時実装）

### 問題の現状

現在の実装では：
- チェックポイントが全面に表示されると背後のAGレールが隠れる
- 実行が進むにつれて「現在実行中のAG」の出力しか右パネルに表示されない
- AG-01が完了しても、AG-06実行中はAG-01の出力を参照する手段がない

### 設計方針

```
チェックポイントは「モーダルオーバーレイ」から
「右パネルの差し込みセクション」に変更する。

AGレールは常に全AG分が見えていて、
完了済みAGはクリックで出力を右パネルに表示できる。

チェックポイントが来たら、右パネルの上部に
チェックポイントセクションが展開されるが、
下の過去AG出力は引き続きスクロールでアクセス可能。
```

### 5.1 レイアウト変更：チェックポイントをインラインに

```typescript
// src/app/projects/[id]/page.tsx

// 変更前: チェックポイントをモーダルオーバーレイで表示
// → 背後が全て隠れる・過去出力にアクセス不可

// 変更後: 右パネル内に差し込むインラインセクションとして表示

// 右パネルの構造:
//
// ┌─────────────────────────────────────────────┐
// │ ✋ チェックポイント③（固定・折りたたみ可）   │  ← 黄色バナーで目立たせる
// │ AG選択・ヒアリング項目・判断                 │  ← 折りたたみ可
// ├─────────────────────────────────────────────┤
// │ AG-07 実行中... ●●●                        │  ← 現在実行中のAG
// ├─────────────────────────────────────────────┤
// │ ▸ AG-06 設計草案 — 完了           [参照]   │  ← 折りたたみ済み
// │ ▸ AG-05 ファクトチェック — 完了   [参照]   │
// │ ▸ AG-04 課題構造化 — 完了         [参照]   │
// │ ▸ AG-03 競合分析 — 完了           [参照]   │
// │ ▸ AG-02 市場分析 — 完了           [参照]   │
// │ ▸ AG-01 インテーク — 完了         [参照]   │
// └─────────────────────────────────────────────┘
//
// → 各AGの「▸」をクリックで展開・内容を確認できる

const [expandedAgents, setExpandedAgents] = useState<Set<string>>(new Set())

const toggleAgent = (agentId: string) => {
  setExpandedAgents(prev => {
    const next = new Set(prev)
    next.has(agentId) ? next.delete(agentId) : next.add(agentId)
    return next
  })
}
```

### 5.2 AGレール：完了済みAGをクリック可能にする

```typescript
// src/components/pipeline/AgentRail.tsx

// 変更前: 完了済みAGはクリックしても何も起きない（または右パネルが切り替わらない）
// 変更後: クリックで右パネルの該当AGセクションをスクロールして展開する

interface AgentRailProps {
  executions: Execution[]
  activeAgentId: string
  onSelectAgent: (agentId: string) => void  // ← この関数を実装
}

// クリック時の挙動:
// 1. expandedAgentsにそのAGを追加（展開状態にする）
// 2. 右パネルの該当セクションにスクロール
//    document.getElementById(`section-${agentId}`)?.scrollIntoView({ behavior: 'smooth' })
// 3. AGレールでそのAGをハイライト表示

// レール項目のスタイル:
// done（完了）: opacity:1 + cursor:pointer + ホバーで背景変化 + "クリックで参照"テキスト
// active（実行中）: 赤ライン + 点滅インジケーター
// pending（未実行）: opacity:0.35 + cursor:default（クリック不可）
```

### 5.3 右パネル：全AG出力を時系列逆順で表示

```typescript
// src/components/pipeline/OutputPanel.tsx（新規作成または既存改修）

// 表示順: 現在実行中 → 完了済み（新しい順）

interface OutputPanelProps {
  version: ProposalVersion & { executions: (Execution & { results: AgentResult[] })[] }
  checkpointState: CheckpointState | null  // チェックポイント情報
  expandedAgents: Set<string>
  onToggleAgent: (agentId: string) => void
}

export function OutputPanel({
  version, checkpointState, expandedAgents, onToggleAgent
}: OutputPanelProps) {
  const sortedExecutions = [...version.executions]
    .sort((a, b) => AGENT_ORDER.indexOf(b.agentId) - AGENT_ORDER.indexOf(a.agentId))
    // 実行済みを新しい順（AG-07→AG-01）で並べる

  return (
    <div style={{ overflowY: 'auto', height: '100%' }}>

      {/* チェックポイントセクション（存在する場合のみ表示）*/}
      {checkpointState && (
        <CheckpointInlineSection
          state={checkpointState}
          onApprove={...}
        />
      )}

      {/* 現在実行中のAG */}
      {activeExecution && (
        <ActiveAgentSection execution={activeExecution} />
      )}

      {/* 完了済みAGの出力（折りたたみ式）*/}
      {sortedExecutions
        .filter(e => e.status === 'COMPLETED')
        .map(execution => (
          <CompletedAgentSection
            key={execution.agentId}
            id={`section-${execution.agentId}`}  // スクロール用ID
            execution={execution}
            isExpanded={expandedAgents.has(execution.agentId)}
            onToggle={() => onToggleAgent(execution.agentId)}
          />
        ))
      }
    </div>
  )
}
```

### 5.4 CompletedAgentSection コンポーネント

```typescript
// 折りたたみ式の完了AG出力セクション

function CompletedAgentSection({
  id, execution, isExpanded, onToggle
}: {
  id: string
  execution: Execution & { results: AgentResult[] }
  isExpanded: boolean
  onToggle: () => void
}) {
  const result = execution.results[0]
  const parsed = result ? safeParseJson(result.editedJson ?? result.outputJson) : null
  const sections = parsed
    ? renderAgentOutput(execution.agentId, parsed)
    : renderParseError(execution.agentId, result?.outputJson ?? '')

  return (
    <div id={id} style={{ borderBottom: '1px solid rgba(28,28,23,0.1)' }}>
      {/* ヘッダー（常に表示）*/}
      <div
        onClick={onToggle}
        style={{
          padding: '16px 40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          background: isExpanded ? 'var(--bg2)' : 'transparent',
          transition: 'background 0.15s',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* 完了アイコン */}
          <div style={{
            width: '20px', height: '20px',
            background: 'var(--ink)',
            color: 'var(--bg)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '10px', borderRadius: '2px'
          }}>✓</div>

          <span style={{
            fontFamily: 'Unbounded, sans-serif',
            fontSize: '10px', fontWeight: 700,
            letterSpacing: '0.15em', textTransform: 'uppercase',
            color: 'var(--ink)'
          }}>
            {execution.agentId} — {AG_LABELS[execution.agentId]}
          </span>

          {execution.isInherited && (
            <span style={{
              fontFamily: 'Sora, sans-serif', fontSize: '9px',
              color: 'var(--ink3)',
              background: 'var(--bg2)',
              border: '1px solid rgba(28,28,23,0.1)',
              padding: '2px 8px', borderRadius: '99px'
            }}>
              前バージョンから引き継ぎ
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{
            fontFamily: 'Sora, sans-serif', fontSize: '10px',
            color: 'var(--ink3)'
          }}>
            {isExpanded ? '折りたたむ ▴' : '参照する ▾'}
          </span>
        </div>
      </div>

      {/* 展開時のコンテンツ */}
      {isExpanded && (
        <div style={{ borderTop: '1px solid rgba(28,28,23,0.1)' }}>
          <OutputSectionRenderer sections={sections} />
        </div>
      )}
    </div>
  )
}
```

### 5.5 チェックポイントをインラインセクションに変更

```typescript
// src/components/checkpoint/CheckpointInlineSection.tsx（新規作成）
// 既存のCheckpointPanel.tsx（モーダル形式）を置き換える

function CheckpointInlineSection({ state, onApprove }) {
  const [isCollapsed, setIsCollapsed] = useState(false)

  return (
    <div style={{
      background: 'rgba(232,196,74,0.06)',
      borderBottom: '3px solid #E8C44A',  // 上部に黄色ライン
    }}>
      {/* ✋ チェックポイントバナー */}
      <div
        onClick={() => setIsCollapsed(!isCollapsed)}
        style={{
          padding: '16px 40px',
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          background: '#E8C44A',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '16px' }}>✋</span>
          <span style={{
            fontFamily: 'Unbounded, sans-serif',
            fontSize: '10px', fontWeight: 700,
            letterSpacing: '0.15em', textTransform: 'uppercase',
            color: '#4A3800'
          }}>
            {state.label} — あなたの判断が必要です
          </span>
        </div>
        <span style={{ color: '#4A3800', fontSize: '12px' }}>
          {isCollapsed ? '開く ▾' : '閉じる ▴'}
        </span>
      </div>

      {/* チェックポイントの内容（折りたたみ可）*/}
      {!isCollapsed && (
        <div style={{ padding: '24px 40px 28px' }}>
          {/* 取れた情報・取れなかった情報・ヒアリング項目・判断ボタン */}
          {/* 既存のCheckpointPanelの内容をここに移植する */}
          ...
          <button
            onClick={onApprove}
            style={{
              background: 'var(--ink)', color: 'var(--bg)',
              fontFamily: 'Unbounded, sans-serif',
              fontSize: '9px', fontWeight: 700,
              letterSpacing: '0.15em', textTransform: 'uppercase',
              padding: '13px 26px', border: 'none', cursor: 'pointer'
            }}
          >
            この内容で次のフェーズへ →
          </button>
        </div>
      )}
    </div>
  )
}
```

### 5.6 既存のモーダル形式のチェックポイントを無効化

```typescript
// src/app/projects/[id]/page.tsx

// 変更前: チェックポイント到達時にモーダルを表示
// if (needsCheckpoint) setShowCheckpointModal(true)

// 変更後: モーダルは表示せず、右パネルのインラインセクションで処理
// checkpointState を setState で管理し、OutputPanel に渡す

const [checkpointState, setCheckpointState] = useState<CheckpointState | null>(null)

// チェックポイント到達時:
// setCheckpointState({ phase: 2, label: 'フェーズ2確認', ... })
// → OutputPanelの上部にCheckpointInlineSectionが展開される
// → モーダルは出さない
```

### 5.7 実装上の注意点

```
■ モーダルオーバーレイ（position:fixed）は使わない
  → 既存の CheckpointPanel.tsx がモーダルならそのまま使わず
     CheckpointInlineSection に置き換える

■ AGレールの「クリックで参照」はスクロール制御が必要
  → document.getElementById(`section-${agentId}`)?.scrollIntoView()
  → 展開状態（expandedAgents）も同時に更新する

■ 実行中のAGはレールでアクティブ表示・右パネルで最上部に固定表示
  → 完了済みAGとのビジュアル区別を明確にする

■ チェックポイントが「閉じられた」後も過去出力はスクロールでアクセス可能
  → isCollapsed=true になっても OutputPanel 自体は残っている
```

---

## 6. 更新後の実装優先順位（全体）

```
Priority 1（パース修正・最優先）:
  - src/lib/json-cleaner.ts を作成
  - 全実行箇所の JSON.parse() を safeParseJson に置き換え
  - prisma: AgentResult に parseError フィールド追加・db push

Priority 2（出力レンダリング + 過去AG参照を同時実装）:
  - src/lib/output-renderer.ts を作成（AG-01〜07全マッパー）
  - src/components/preview/OutputSectionRenderer.tsx を作成
  - src/components/pipeline/OutputPanel.tsx を作成
    （全AG出力を時系列逆順・折りたたみ式で表示）
  - src/components/pipeline/AgentRail.tsx を修正
    （完了済みAGをクリック可能にする）
  - チェックポイントをモーダルから CheckpointInlineSection に変更

Priority 3（チェックポイント表示の改善）:
  - checkpoint-summary.ts を safeParseJson 対応に修正
  - CheckpointInlineSection で OutputSectionRenderer を使う

Priority 4（パース失敗時のUX改善）:
  - AGレールに「↺ 再実行」ボタンを追加
```

---

## 7. 要件（インプット）の編集機能

### 問題の現状

プロジェクト作成後、以下の情報を変更する手段が存在しない：
- クライアント名・案件タイトル
- 業界タイプ
- 依頼内容（briefText）
- 既存サイトURL

ヒアリングで情報が更新された場合・入力ミスがあった場合に対処できない。

### 設計方針

```
編集できる場所を2か所設ける：

[1] プロジェクト詳細ページのヘッダー部分
    → クライアント名・案件タイトルをインライン編集

[2] 「要件を編集」サイドパネル（新規）
    → briefText・業界タイプ・既存サイトURLの変更
    → 変更後に「どこから再実行するか」を選ばせる
```

### 7.1 API：プロジェクト情報の更新

```typescript
// src/app/api/projects/[id]/route.ts に PATCH を追加

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json()
  const { title, briefText, industryType, clientName, existingSiteUrl } = body

  // プロジェクト本体を更新
  const updated = await prisma.project.update({
    where: { id: params.id },
    data: {
      title:        title        ?? undefined,
      briefText:    briefText    ?? undefined,
      industryType: industryType ?? undefined,
      updatedAt:    new Date(),
    },
  })

  // クライアント名の変更はClientモデルを更新
  if (clientName) {
    await prisma.client.update({
      where: { id: updated.clientId },
      data: { name: clientName },
    })
  }

  return NextResponse.json(updated)
}
```

### 7.2 ヘッダーのインライン編集（クライアント名・案件タイトル）

```typescript
// src/app/projects/[id]/page.tsx のヘッダー部分

// 現在: テキスト表示のみ（「中部電力 ー キャリアサイトリニューアル」）
// 変更後: クリックでインライン編集可能にする

function ProjectHeader({ project, onUpdate }) {
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleValue, setTitleValue] = useState(project.title)

  const handleTitleSave = async () => {
    await fetch(`/api/projects/${project.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: titleValue }),
    })
    setEditingTitle(false)
    onUpdate()
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <span style={{ color: 'var(--ink3)', fontSize: '9px' }}>
        {project.client.name}
      </span>
      <span style={{ color: 'var(--ink4)' }}>—</span>

      {editingTitle ? (
        // インライン編集フォーム
        <input
          value={titleValue}
          onChange={e => setTitleValue(e.target.value)}
          onBlur={handleTitleSave}
          onKeyDown={e => e.key === 'Enter' && handleTitleSave()}
          autoFocus
          style={{
            fontFamily: 'Sora, sans-serif',
            fontSize: '11px',
            color: 'var(--ink)',
            background: 'transparent',
            border: 'none',
            borderBottom: '1px solid var(--red)',
            outline: 'none',
            padding: '2px 0',
            minWidth: '200px',
          }}
        />
      ) : (
        // 通常表示（クリックで編集）
        <span
          onClick={() => setEditingTitle(true)}
          title="クリックして編集"
          style={{
            fontFamily: 'Sora, sans-serif',
            fontSize: '11px',
            color: 'var(--ink3)',
            cursor: 'text',
            borderBottom: '1px dashed transparent',
            transition: 'border-color 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.borderBottomColor = 'var(--ink4)')}
          onMouseLeave={e => (e.currentTarget.style.borderBottomColor = 'transparent')}
        >
          {project.title}
        </span>
      )}

      {/* 要件編集ボタン */}
      <button
        onClick={onOpenEditPanel}
        style={{
          background: 'transparent',
          border: '1px solid var(--line2)',
          color: 'var(--ink3)',
          fontFamily: 'Unbounded, sans-serif',
          fontSize: '8px',
          fontWeight: 700,
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          padding: '5px 12px',
          cursor: 'pointer',
          transition: 'all 0.15s',
          marginLeft: '8px',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.borderColor = 'var(--ink)'
          e.currentTarget.style.color = 'var(--ink)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderColor = 'var(--line2)'
          e.currentTarget.style.color = 'var(--ink3)'
        }}
      >
        ✎ 要件を編集
      </button>
    </div>
  )
}
```

### 7.3 要件編集パネル（briefText・業界タイプ・既存サイトURL）

```typescript
// src/components/project/EditBriefPanel.tsx（新規作成）
// 右サイドから slide-in するパネル形式

interface EditBriefPanelProps {
  project: Project & { client: Client }
  isOpen: boolean
  onClose: () => void
  onSaved: (rerunFrom?: string) => void  // 保存後に再実行するAGを渡す
}

export function EditBriefPanel({ project, isOpen, onClose, onSaved }: EditBriefPanelProps) {
  const [values, setValues] = useState({
    clientName:    project.client.name,
    title:         project.title,
    briefText:     project.briefText,
    industryType:  project.industryType,
    existingSiteUrl: project.existingSiteUrl ?? '',
  })
  const [saving, setSaving] = useState(false)

  // 変更を検出してどのAGから再実行が必要か判定
  const getRerunRecommendation = () => {
    const briefChanged = values.briefText !== project.briefText
    const industryChanged = values.industryType !== project.industryType
    const metaChanged = values.title !== project.title
                     || values.clientName !== project.client.name
                     || values.existingSiteUrl !== (project.existingSiteUrl ?? '')

    if (briefChanged) return 'AG-01'      // 最上流から全部再実行
    if (industryChanged) return 'AG-02'   // 市場分析から再実行
    if (metaChanged) return null           // DB更新のみ・再実行不要
    return null
  }

  const rerunFrom = getRerunRecommendation()

  const handleSave = async () => {
    setSaving(true)
    await fetch(`/api/projects/${project.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    })
    setSaving(false)
    onSaved(rerunFrom ?? undefined)
    onClose()
  }

  if (!isOpen) return null

  return (
    // オーバーレイ（背景薄暗く）
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(252,251,239,0.7)',
      backdropFilter: 'blur(4px)',
      zIndex: 200,
      display: 'flex',
      justifyContent: 'flex-end',
    }}>
      {/* パネル本体（右から slide-in） */}
      <div style={{
        width: '480px',
        height: '100%',
        background: 'var(--bg)',
        borderLeft: '1px solid var(--line2)',
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
      }}>

        {/* パネルヘッダー */}
        <div style={{
          padding: '24px 28px',
          borderBottom: '1px solid var(--line)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div>
            <div style={{
              fontFamily: 'Raleway, sans-serif',
              fontStyle: 'italic',
              fontSize: '11px',
              color: 'var(--ink3)',
              marginBottom: '5px',
            }}>
              要件を編集
            </div>
            <div style={{
              fontFamily: 'Unbounded, sans-serif',
              fontSize: '18px',
              fontWeight: 900,
              letterSpacing: '-0.02em',
              textTransform: 'uppercase',
              color: 'var(--ink)',
            }}>
              {project.client.name}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none',
              fontSize: '18px', color: 'var(--ink3)',
              cursor: 'pointer',
            }}
          >✕</button>
        </div>

        {/* フォーム */}
        <div style={{ padding: '28px', flex: 1, display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {/* クライアント名 */}
          <FieldGroup label="クライアント名">
            <input
              value={values.clientName}
              onChange={e => setValues(v => ({ ...v, clientName: e.target.value }))}
              style={inputStyle}
            />
          </FieldGroup>

          {/* 案件タイトル */}
          <FieldGroup label="案件タイトル">
            <input
              value={values.title}
              onChange={e => setValues(v => ({ ...v, title: e.target.value }))}
              style={inputStyle}
            />
          </FieldGroup>

          {/* 業界タイプ */}
          <FieldGroup label="業界タイプ" note="変更するとAG-02以降の再実行が必要です">
            <select
              value={values.industryType}
              onChange={e => setValues(v => ({ ...v, industryType: e.target.value }))}
              style={{ ...inputStyle, appearance: 'none' }}
            >
              <option value="ag-02-recruit">採用・リクルート</option>
              <option value="ag-02-brand">ブランド体験</option>
              <option value="ag-02-corp">コーポレート</option>
              <option value="ag-02-ec">EC・購買</option>
              <option value="ag-02-camp">キャンペーン</option>
              <option value="ag-02-btob">BtoB・法人向け</option>
              <option value="ag-02-general">その他（汎用）</option>
            </select>
          </FieldGroup>

          {/* 既存サイトURL */}
          <FieldGroup label="既存サイトURL" note="リニューアル案件の場合に入力してください">
            <input
              value={values.existingSiteUrl}
              onChange={e => setValues(v => ({ ...v, existingSiteUrl: e.target.value }))}
              placeholder="https://..."
              style={inputStyle}
            />
          </FieldGroup>

          {/* 依頼内容（briefText）*/}
          <FieldGroup
            label="依頼内容・オリエン情報"
            note="変更するとAG-01から全フェーズの再実行が必要です"
          >
            <textarea
              value={values.briefText}
              onChange={e => setValues(v => ({ ...v, briefText: e.target.value }))}
              rows={10}
              style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
            />
          </FieldGroup>
        </div>

        {/* フッター：再実行の警告 + 保存ボタン */}
        <div style={{
          padding: '20px 28px',
          borderTop: '1px solid var(--line)',
        }}>
          {/* 再実行が必要な場合の警告 */}
          {rerunFrom && (
            <div style={{
              background: 'rgba(232,196,74,0.1)',
              border: '1px solid rgba(232,196,74,0.5)',
              padding: '12px 16px',
              marginBottom: '16px',
              borderRadius: '2px',
            }}>
              <p style={{
                fontFamily: 'Sora, sans-serif',
                fontSize: '12px',
                color: 'var(--ink2)',
                lineHeight: 1.6,
              }}>
                ⚠️ この変更を反映するには
                <strong> {rerunFrom} から再実行</strong>が必要です。
                保存後にバージョンを更新してください。
              </p>
            </div>
          )}

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={onClose}
              style={{
                flex: 1,
                background: 'transparent',
                border: '1px solid var(--line2)',
                color: 'var(--ink2)',
                fontFamily: 'Unbounded, sans-serif',
                fontSize: '9px',
                fontWeight: 700,
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                padding: '12px',
                cursor: 'pointer',
              }}
            >
              キャンセル
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                flex: 2,
                background: 'var(--ink)',
                color: 'var(--bg)',
                border: 'none',
                fontFamily: 'Unbounded, sans-serif',
                fontSize: '9px',
                fontWeight: 700,
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                padding: '12px',
                cursor: 'pointer',
              }}
            >
              {saving ? '保存中...' : '保存する →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// 共通フィールドグループ
function FieldGroup({ label, note, children }) {
  return (
    <div>
      <div style={{
        fontFamily: 'Unbounded, sans-serif',
        fontSize: '9px',
        fontWeight: 700,
        letterSpacing: '0.2em',
        textTransform: 'uppercase',
        color: 'var(--ink3)',
        marginBottom: '8px',
      }}>
        {label}
        {note && (
          <span style={{
            fontFamily: 'Sora, sans-serif',
            fontWeight: 400,
            fontSize: '9px',
            color: '#E8C44A',
            marginLeft: '8px',
            letterSpacing: '0.05em',
            textTransform: 'none',
          }}>
            ⚠️ {note}
          </span>
        )}
      </div>
      {children}
    </div>
  )
}

const inputStyle = {
  width: '100%',
  background: 'var(--bg2)',
  border: '1px solid var(--line2)',
  padding: '11px 14px',
  fontFamily: 'Sora, "Zen Kaku Gothic New", sans-serif',
  fontSize: '13px',
  color: 'var(--ink)',
  outline: 'none',
  transition: 'border-color 0.15s',
}
```

### 7.4 保存後のバージョン更新フロー

```typescript
// src/app/projects/[id]/page.tsx

const handleBriefSaved = (rerunFrom?: string) => {
  if (!rerunFrom) {
    // DB更新のみ・再実行不要
    // プロジェクト情報を再フェッチして表示を更新
    mutate()
    return
  }

  // 再実行が必要な場合：CreateUpdateModalを開く
  setCreateUpdateConfig({
    changeReason: `要件変更（${rerunFrom}から再実行）`,
    agentsToRerun: AGENT_ORDER.slice(AGENT_ORDER.indexOf(rerunFrom)),
    // AG-01なら全AG、AG-02なら02〜07
  })
  setShowCreateUpdateModal(true)
}
```

### 7.5 実装優先順位（Section 7）

```
Priority A（すぐ実装・DBのみ）:
  - PATCH /api/projects/[id] を追加
  - ヘッダーのタイトルインライン編集

Priority B（UIコンポーネント）:
  - EditBriefPanel コンポーネントを作成
  - 「✎ 要件を編集」ボタンをプロジェクト詳細ヘッダーに配置

Priority C（再実行との連携）:
  - 保存後に rerunFrom を検出して CreateUpdateModal に渡す
  - バージョン更新フローと接続する
```

---

## 8. 案件削除機能

### 設計方針

```
削除対象：Project（案件）
連鎖削除：Project → ProposalVersion → Execution
          → AgentResult → ProposalSlide → ProposalFeedback
誤削除防止：案件名入力による確認ダイアログ必須
ゴミ箱なし：完全削除のみ
```

### 8.1 API：案件削除

```typescript
// src/app/api/projects/[id]/route.ts に DELETE を追加

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // 連鎖削除（Prismaのcascadeが設定されていない場合は手動で順番に削除）
  // schema.prisma で onDelete: Cascade が設定済みなら1行で済む

  // 手動で連鎖削除する場合（安全側）
  const versions = await prisma.proposalVersion.findMany({
    where: { projectId: params.id },
    include: { executions: true }
  })

  for (const version of versions) {
    for (const execution of version.executions) {
      await prisma.agentResult.deleteMany({ where: { executionId: execution.id } })
      await prisma.execution.delete({ where: { id: execution.id } })
    }
    await prisma.proposalSlide.deleteMany({ where: { versionId: version.id } })
    await prisma.proposalFeedback.deleteMany({ where: { versionId: version.id } })
    await prisma.proposalVersion.delete({ where: { id: version.id } })
  }

  await prisma.project.delete({ where: { id: params.id } })

  return NextResponse.json({ success: true })
}
```

**schema.prismaのリレーションにcascadeを追加しておくと上記が1行になる：**

```prisma
// 既存のリレーション定義に onDelete: Cascade を追加
model ProposalVersion {
  projectId String
  project   Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  // ...
}
model Execution {
  versionId String
  version   ProposalVersion @relation(fields: [versionId], references: [id], onDelete: Cascade)
  // ...
}
model AgentResult {
  executionId String
  execution   Execution @relation(fields: [executionId], references: [id], onDelete: Cascade)
  // ...
}
model ProposalSlide {
  versionId String
  version   ProposalVersion @relation(fields: [versionId], references: [id], onDelete: Cascade)
  // ...
}
model ProposalFeedback {
  versionId String
  version   ProposalVersion @relation(fields: [versionId], references: [id], onDelete: Cascade)
  // ...
}
// cascadeを設定後: npx prisma db push
```

### 8.2 削除確認ダイアログ

```typescript
// src/components/project/DeleteProjectDialog.tsx（新規作成）

interface DeleteProjectDialogProps {
  project: Project & { client: Client }
  isOpen: boolean
  onClose: () => void
  onDeleted: () => void  // 削除完了後にダッシュボードへリダイレクト
}

export function DeleteProjectDialog({
  project, isOpen, onClose, onDeleted
}: DeleteProjectDialogProps) {
  const [inputValue, setInputValue] = useState('')
  const [deleting, setDeleting] = useState(false)
  const confirmText = project.client.name  // 案件名の入力で確認

  const canDelete = inputValue === confirmText

  const handleDelete = async () => {
    if (!canDelete) return
    setDeleting(true)
    await fetch(`/api/projects/${project.id}`, { method: 'DELETE' })
    setDeleting(false)
    onDeleted()
  }

  if (!isOpen) return null

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(252,251,239,0.88)',
      backdropFilter: 'blur(6px)',
      zIndex: 300,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        width: '480px',
        background: 'var(--bg)',
        border: '1px solid var(--line2)',
        boxShadow: '0 24px 64px rgba(28,28,23,0.12)',
      }}>

        {/* ヘッダー */}
        <div style={{
          padding: '24px 28px 20px',
          borderBottom: '1px solid var(--line)',
        }}>
          <div style={{
            fontFamily: 'Raleway, sans-serif',
            fontStyle: 'italic',
            fontSize: '11px',
            color: 'var(--red)',
            marginBottom: '7px',
            display: 'flex', alignItems: 'center', gap: '6px',
          }}>
            ⚠ 削除の確認
          </div>
          <div style={{
            fontFamily: 'Unbounded, sans-serif',
            fontSize: '20px', fontWeight: 900,
            letterSpacing: '-0.02em', textTransform: 'uppercase',
            color: 'var(--ink)',
          }}>
            案件を削除する
          </div>
        </div>

        {/* ボディ */}
        <div style={{ padding: '24px 28px' }}>
          <p style={{
            fontFamily: 'Sora, sans-serif',
            fontSize: '13px', lineHeight: 1.75,
            color: 'var(--ink2)',
            marginBottom: '20px',
          }}>
            <strong style={{ color: 'var(--ink)' }}>
              {project.client.name} — {project.title}
            </strong>
            を完全に削除します。
            全バージョン・AG出力・スライドデータが失われます。
            この操作は取り消せません。
          </p>

          {/* 確認入力 */}
          <div style={{ marginBottom: '6px' }}>
            <label style={{
              fontFamily: 'Unbounded, sans-serif',
              fontSize: '9px', fontWeight: 700,
              letterSpacing: '0.2em', textTransform: 'uppercase',
              color: 'var(--ink3)',
              display: 'block', marginBottom: '8px',
            }}>
              確認のため「{confirmText}」と入力してください
            </label>
            <input
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              placeholder={confirmText}
              autoFocus
              style={{
                width: '100%',
                background: 'var(--bg2)',
                border: `1px solid ${canDelete ? 'var(--red)' : 'var(--line2)'}`,
                padding: '11px 14px',
                fontFamily: 'Sora, sans-serif',
                fontSize: '13px', color: 'var(--ink)',
                outline: 'none',
                transition: 'border-color 0.15s',
              }}
            />
          </div>
        </div>

        {/* フッター */}
        <div style={{
          padding: '16px 28px 24px',
          borderTop: '1px solid var(--line)',
          display: 'flex', gap: '8px',
        }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              background: 'transparent',
              border: '1px solid var(--line2)',
              color: 'var(--ink2)',
              fontFamily: 'Unbounded, sans-serif',
              fontSize: '9px', fontWeight: 700,
              letterSpacing: '0.15em', textTransform: 'uppercase',
              padding: '12px', cursor: 'pointer',
            }}
          >
            キャンセル
          </button>
          <button
            onClick={handleDelete}
            disabled={!canDelete || deleting}
            style={{
              flex: 2,
              background: canDelete ? 'var(--red)' : 'var(--line)',
              color: canDelete ? '#fff' : 'var(--ink4)',
              border: 'none',
              fontFamily: 'Unbounded, sans-serif',
              fontSize: '9px', fontWeight: 700,
              letterSpacing: '0.15em', textTransform: 'uppercase',
              padding: '12px', cursor: canDelete ? 'pointer' : 'not-allowed',
              transition: 'background 0.15s',
            }}
          >
            {deleting ? '削除中...' : '削除する'}
          </button>
        </div>
      </div>
    </div>
  )
}
```

### 8.3 削除ボタンの配置

**場所1：ダッシュボードのプロジェクトカード**

```typescript
// src/app/page.tsx のプロジェクトカード

// カードにホバー時に「...」メニューを表示
// メニュー内に「削除」を配置

<div
  className="project-card"
  onMouseEnter={() => setHoveredCard(project.id)}
  onMouseLeave={() => setHoveredCard(null)}
>
  {/* 既存のカードコンテンツ */}

  {hoveredCard === project.id && (
    <button
      onClick={(e) => {
        e.stopPropagation()  // カードのクリックを止める
        setDeleteTarget(project)
      }}
      style={{
        position: 'absolute', top: '12px', right: '12px',
        background: 'transparent',
        border: '1px solid var(--line2)',
        color: 'var(--ink3)',
        fontFamily: 'Unbounded, sans-serif',
        fontSize: '8px', fontWeight: 700,
        letterSpacing: '0.1em', textTransform: 'uppercase',
        padding: '4px 10px', cursor: 'pointer',
        transition: 'all 0.15s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = 'var(--red)'
        e.currentTarget.style.color = 'var(--red)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'var(--line2)'
        e.currentTarget.style.color = 'var(--ink3)'
      }}
    >
      削除
    </button>
  )}
</div>

{deleteTarget && (
  <DeleteProjectDialog
    project={deleteTarget}
    isOpen={true}
    onClose={() => setDeleteTarget(null)}
    onDeleted={() => {
      setDeleteTarget(null)
      router.refresh()  // 一覧を更新
    }}
  />
)}
```

**場所2：プロジェクト詳細ページの「✎ 要件を編集」パネル内**

```typescript
// src/components/project/EditBriefPanel.tsx のフッター下部に追加

<div style={{ padding: '0 28px 24px' }}>
  <button
    onClick={() => {
      onClose()
      onOpenDeleteDialog()
    }}
    style={{
      width: '100%',
      background: 'transparent',
      border: '1px solid rgba(230,48,34,0.3)',
      color: 'var(--red)',
      fontFamily: 'Unbounded, sans-serif',
      fontSize: '8px', fontWeight: 700,
      letterSpacing: '0.15em', textTransform: 'uppercase',
      padding: '10px', cursor: 'pointer',
      transition: 'all 0.15s',
    }}
    onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--red)'}
    onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(230,48,34,0.3)'}
  >
    ⚠ この案件を削除する
  </button>
</div>
```

### 8.4 実装優先順位

```
Priority A（API・最優先）:
  - schema.prisma に onDelete: Cascade を追加
  - npx prisma db push
  - DELETE /api/projects/[id] を実装

Priority B（ダイアログUI）:
  - DeleteProjectDialog コンポーネントを作成
  - ダッシュボードのカードにホバーで削除ボタンを追加

Priority C（詳細ページ）:
  - EditBriefPanel の下部に「この案件を削除する」を追加
```
