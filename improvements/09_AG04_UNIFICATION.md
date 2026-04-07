# 09: 実行モード設計（Precision / Standard）

## 概要

コストと精度のバランスを選択できる「実行モード」を追加する。

| モード | web_search | AG-04構成 | 目標コスト | 用途 |
|---|---|---|---|---|
| **Precision** | 有効（制限付き） | 3エージェント | **$6.00** | コンペ・重要案件 |
| **Standard** | 無効 | 1エージェント統合 | **$4.00** | 通常案件・検証 |

---

## 背景

AG-04が3つのエージェントで構成されており、コストが高い。

**4/7実行結果**: $5.36/回

**原因**:
1. AG-04-MAIN、AG-04-INSIGHT、AG-04-MERGEの3回呼び出し
2. 各エージェントのmax_tokens: 16384
3. 継続ループで最大4ターン
4. プロンプトが「詳細に出力せよ」指示

**解決策**: 実行モードでコスト/精度を選択可能にする

---

## 解決策: AG-04を1エージェントに統合

### Before
```
AG-04-MAIN    → Sonnet × 16K tokens出力
AG-04-INSIGHT → Sonnet × 16K tokens出力
AG-04-MERGE   → Sonnet × 16K tokens出力
─────────────────────────────────────────
合計: 3回呼び出し、最大48K tokens出力
コスト: $0.72（出力のみ）+ 入力コスト
```

### After
```
AG-04-UNIFIED → Sonnet × 4K tokens出力
─────────────────────────────────────────
合計: 1回呼び出し、4K tokens出力
コスト: $0.06（出力のみ）+ 入力コスト
```

---

## 新しいAG-04-UNIFIEDの設計

### エージェントファイル

**ファイル**: `src/agents/ag-04-unified.ts`

```typescript
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

      // coreAnalysis
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

      // visitorInsight
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

      // designDirection
      const design = p.designDirection as Record<string, unknown> | undefined
      if (design) {
        const hmw = (design.hmwTop3 as string[] || []).map((h, i) => `${i + 1}. ${h}`).join('\n')
        const principles = (design.designPrinciples as string[] || []).map((p, i) => `${i + 1}. ${p}`).join('\n')
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
```

### base-agent.tsのmax_tokens変更

```typescript
const AG_MAX_TOKENS: Record<string, number> = {
  // ... 他のエージェント
  'AG-04': 4096,  // 統合版：4096に制限
  // AG-04-MAIN, AG-04-INSIGHT, AG-04-MERGE は削除
}
```

### パイプライン変更

```typescript
// pipeline.ts
// AG-04系を1つに統合
const AG_04 = new Ag04UnifiedAgent()

// 旧: AG-04-MAIN → AG-04-INSIGHT → AG-04-MERGE
// 新: AG-04 のみ
```

---

## 新しいプロンプト

**ファイル**: `prompts/ag-04-unified/default.md`

```markdown
# AG-04 課題定義・インサイト統合

## 目的
AG-02・AG-03の分析から「解くべき課題」と「訪問者インサイト」を抽出し、
設計方向性を1つの統合フォーマットで出力する。

## 入力
- AG-02-MERGE: ターゲット・ジャーニー・バリアー
- AG-03-MERGE: 競合分析・設計機会

## タスク

### 1. 課題の本質を特定（5Whys簡略版）
- 表面の依頼から根本原因まで掘り下げる
- Webサイト設計で解決できる範囲に絞る

### 2. 訪問者インサイトを抽出
- 最も重要なJTBD（訪問者が片付けたいこと）
- CV最大の阻害要因（バリアー）
- 主要な訪問意図

### 3. 設計方向性をまとめる
- 課題定義（1文）
- サイトの役割（1文）
- HMW問い（3つ）
- 設計原則（3つ）

---

## 出力制約（厳守）

- **全体で2500トークン以内**
- 各フィールドは記載の文字数を厳守
- 詳細な説明より結論を優先
- 理由・根拠は端的に

---

## 出力形式

JSONのみ。コードフェンス・説明文・前置き不要。

{
  "coreAnalysis": {
    "surfaceRequest": "表面の依頼（50文字以内）",
    "rootCause": "根本原因（100文字以内）",
    "whySummary": "Why1→Why2→Why3→Why4→Why5の流れ（200文字以内）",
    "primaryIssue": "最優先で解くべき課題（100文字以内）"
  },
  "visitorInsight": {
    "primaryJob": "最重要JTBD：訪問者が最も達成したいこと（100文字以内）",
    "criticalBarrier": "最重要バリアー：CVを最も阻害している要因（100文字以内）",
    "primaryIntent": "主要な訪問意図（informational/commercial/transactional）と理由（50文字以内）"
  },
  "designDirection": {
    "coreProblem": "課題定義1文：〔誰が〕〔何ができていない〕（100文字以内）",
    "websiteRole": "サイトの役割1文：このサイトは〔何を解決する〕（100文字以内）",
    "hmwTop3": [
      "HMW1: どうすれば〔誰が〕〔何〕できるか（50文字以内）",
      "HMW2: （50文字以内）",
      "HMW3: （50文字以内）"
    ],
    "designPrinciples": [
      "原則1: 〔何を〕〔どうする〕（50文字以内）",
      "原則2: （50文字以内）",
      "原則3: （50文字以内）"
    ]
  },
  "confidence": "high|medium|low",
  "factBasis": ["根拠1", "根拠2"],
  "assumptions": ["推定1"]
}
```

---

## Precisionモードで使用するファイル（削除しない）

以下はPrecisionモードで使用するため、削除しない:

- `src/agents/ag-04-main.ts`
- `src/agents/ag-04-insight.ts`
- `src/agents/ag-04-merge.ts`
- `prompts/ag-04-main/`
- `prompts/ag-04-insight/`
- `prompts/ag-04-merge/`

---

## モード別コスト試算

### Precisionモード（$6.00目標）
| 項目 | 構成 |
|---|---|
| web_search | 有効（max_uses: 10） |
| AG-04 | 3エージェント構成 |
| 想定コスト | $6.00 |

### Standardモード（$4.00目標）
| 項目 | Before | After |
|---|---|---|
| web_search | 無効 | 無効 |
| API呼び出し回数 | 3回 | 1回 |
| 出力トークン | 最大48K | 最大4K |
| **AG-04合計** | **$1.00** | **$0.16** |
| **全体想定** | $5.36 | **$4.00** |

---

## 注意事項

1. **精度への影響**
   - 詳細な分析から要点抽出に変わる
   - CDが補足・深掘りすることを前提

2. **既存データとの互換性**
   - 旧AG-04の出力フォーマットと異なる
   - 既存プロジェクトの再実行時は注意

3. **継続ループの無効化**
   - `anthropic-client.ts`の継続ループを1回に制限することを推奨
   - プロンプトで2500トークン以内に収めるため、本来は不要

---

## 実装手順

1. `src/agents/types.ts` に `ExecutionMode` 型を追加
2. `prompts/ag-04-unified/default.md` を作成
3. `src/agents/ag-04-unified.ts` を作成
4. `src/agents/base-agent.ts` の `AG_MAX_TOKENS` に 'AG-04': 4096 を追加
5. `src/lib/anthropic-client.ts` に `enableWebSearch` オプションを追加
6. `src/lib/pipeline.ts` をモード分岐に対応
7. UI に実行モード選択を追加
8. テスト実行（両モード）
