# AG-07改善 作業引き継ぎ書

作成日: 2026-04-02

---

## プロジェクト概要

Web提案書を自動生成するエージェントパイプラインシステム。
Next.js 16 App Router + TypeScript + Prisma 5 (SQLite) + Claude API。

AG-01〜07 の7エージェントが順番に実行され、最終的に提案書草案を生成する。

---

## CDからの指摘事項（2026-04-02）

実際に生成された提案書をCDがレビューした結果、以下の問題が指摘された。
これらはすべて今回の改善スコープに含まれる。

### ① 提案書が浅すぎて使えない
> 「浅すぎる。量がない。使えない。」

- 各セクションの body テキストが 100〜150字程度。提案書として最低でも 300〜500字必要
- 論点の見出しと要約しか書かれておらず、「なぜこのサイトを選ぶべきか」という説得の肉がない

### ② 情報ソースの整理になっており、提案になっていない
> 「情報ソースを整理しただけで提案になってる？」

- `supportingData` フィールドに `AG-02の市場概況・トレンド`、`AG-04のトリガー③` などの内部参照が本文に残っている
- これは製造工程のメモであり、提案書の根拠として使える形になっていない
- 実際のデータや言葉として変換・統合されていない

### ③ ページ数が少ない
> 「ページ数はもっと増えていい」

- 現状 12〜15 スライド相当
- 目標: 25〜30 スライド（1章あたり 4〜5 セクション）

### ④ 提案書が見づらい・重要度がわからない
> 「提案書が見づらい。段落分けされてないので、重要度がわかりづらい。」

- catchCopy / body / visualSuggestion / editorNote が同じスタイルで並んでいる
- 章タイトル・スライドタイトル・キャッチコピー・本文・注記の視覚的階層がない
- 段落分けがなく、テキストの塊が読みにくい

### ⑤ 人間が構成するための素材として使いたい
> 「最終的には人間が構成する材料にしたい。そのためのアウトプットの量が圧倒的に足りない。」

- AG-07 の役割は「CDがパズルを並べ替えて完成させるための素材」
- 現状の出力は素材の量・詳度ともに足りていない
- bullets（スライドに載せる箇条書き）/ visualSpec（ビジュアル仕様）/ caveats（確認事項）の分離が必要

### ⑥ Export が機能していない
> 「export.txtがダウンロードできない」

- `export/route.ts` が `JSON.parse` 直呼びでパース失敗している
- `safeParseJson` に修正が必要

### ⑦ PDF出力にしてほしい
> 「ここは出力されたものをPDFにしてほしい」

- 現状はテキストファイルのダウンロード
- PDF形式での出力が必要
- Phase 1: HTML出力 + ブラウザの印刷/PDF保存で対応
- Phase 2: サーバーサイドPDF生成（@react-pdf/renderer または puppeteer）

### ⑧ AGの細分化が必要
> 「最大値問題があるかもなので、AGを細分化するなどがいるんじゃない？」

- max_tokens の上限により、1エージェントで大量の出力を出せない
- AG-07 を 07A（構造）/ 07B（前半執筆）/ 07C（後半執筆）に分割することで解決する

---

## 現在の問題

### 問題1: AG-07への入力情報が圧倒的に不足している（根本原因）

`src/agents/base-agent.ts` の `buildUserMessage()` が全エージェント共通で使われており、
**前エージェントの出力を「各AG最大3セクション × 500字」にしか渡していない。**

```typescript
// base-agent.ts L49-56 — ここが問題
for (const prev of input.previousOutputs) {
  for (const s of prev.sections.slice(0, 3)) {         // 3セクションのみ
    lines.push(`**${s.title}**\n${s.content.slice(0, 500)}`) // 500字で切る
  }
}
```

AG-01〜06 の全出力は推定 50,000〜80,000字。AG-07が受け取るのはその10〜18%（≈9,000字）。
分析AGが次の分析AGに要点を渡す設計のまま、執筆AGに使っているのが原因。

**執筆に必要だが今渡っていない情報:**
- AG-04: triggers 全件（何が候補者の背中を押すか）、structuralChallenges 全文
- AG-06: 全ページの purpose、具体的な設計根拠、siteDesignPrinciples 全件
- AG-05: 個別 issue の description/suggestion 全文、requiresClientConfirmation 全件
- AG-02: siteDesignPrinciples 全件、EVP詳細

### 問題2: AG-07が1エージェントで構造設計+全文執筆を担っている

現状の AG-07 出力スキーマ:
- `readerProfile`（読者プロファイル）
- `conceptWords`（コンセプトコピー3案）
- `storyLine`（章構成）
- `sections`（各スライドの本文 × 12〜15件）

全部で 16384 max_tokens を使い切るため、各セクションの body が 100〜150字程度になる。
提案書として使えるレベルには 300〜500字/セクション が必要。

### 問題3: 提案書の表示に視覚的階層がない

catchCopy / body / visualSuggestion / editorNote が同じスタイルで並んでいる。
重要度・役割が見た目でわからない。

### 問題4: Export が壊れている

`src/app/api/executions/[id]/export/route.ts` で `JSON.parse(result.outputJson)` を直呼びしているが、
outputJson は raw テキスト（Claude の生レスポンス）なのでパース失敗する。
`safeParseJson` を使うべき。

---

## 実装すべきこと（優先順）

### Step 1: AG-07専用の入力ビルダーを作る

`src/lib/proposal-context-builder.ts` を新規作成。

AG-07a/b/c 用に、各エージェントのフル出力から必要フィールドを構造的に抽出する関数。

```typescript
// 作るべき関数のイメージ
export async function buildProposalContext(versionId: string): Promise<string> {
  // DBから各AGの rawOutput（outputJson）を取得
  // safeParseJson でパース
  // 各AGから必要フィールドを抽出（以下参照）
  // 合計15,000〜20,000字程度のコンテキスト文字列を返す
}
```

**各AGから抽出すべきフィールド:**

```
AG-01:
  - projectSummary（案件サマリー全文）
  - targetHypothesis.primary + basisFromBrief
  - keyConstraints 全件
  - requiresClientConfirmation 全件（item + reason）

AG-02:
  - marketStructure.overview + keyTrends 全件
  - targetHypothesis.primaryTarget + contextualState + basisFromMarket
  - evpAndContentStrategy.coreEVP
  - siteDesignPrinciples 全件（priority + principle + rationale）

AG-03:
  - competitors 全件の name + strategicIntent + threatLevel
  - crossCompetitorAnalysis.vacantAreas 全件（area + whyVacant + clientFit）
  - differentiationOpportunity.recommendedPosition
  - differentiationOpportunity.siteDesignImplication

AG-04:
  - targetDefinition.whoConverts + contextualState + cvAction
  - targetInsight.emotionalTension + realDrivers 全件 + triggerMoment + communicationImplication
  - triggers 全件（triggerType + description + designImplication）
  - coreProblemStatements 全件（priority + statement + direction）

AG-05:
  - overallAssessment.summary + readyForCreative
  - issues の critical/major のみ（agentId + description + suggestion）
  - requiresClientConfirmation 全件（item + reason + impactIfUnconfirmed）

AG-06:
  - siteDesignSummary.coreConcept + primaryCV
  - ia.structure + ia.pages 全件（title + purpose + keyContent）
  - slideOutline 全件（chapterTitle + estimatedSlides + role）
  - siteDesignPrinciples 全件（すでにAG-02から来るがAG-06での具体化も含める）
```

### Step 2: AG-07 を3エージェントに分割

**AG-07A（Story Architect）**
- 役割: 構造設計のみ。コンセプトコピー3案 + 6章の章立て + 各章のキーメッセージ
- max_tokens: 8192
- 入力: `buildProposalContext()` の出力
- 出力スキーマ:
  ```json
  {
    "readerProfile": { "primaryReader": "", "webLiteracy": "medium", "primaryConcerns": [], "toneAndManner": "" },
    "conceptWords": [{ "copy": "", "subCopy": "", "rationale": "" }],
    "storyLine": [
      {
        "chapterId": "ch-01",
        "chapterTitle": "",
        "role": "",
        "bridgeFromPrev": null,
        "estimatedSections": 3,
        "keyMessages": ["このチャプターで伝えるべきこと（箇条書き・AGの内部参照名は書かない）"],
        "keyData": ["使うべきデータ・事実・数字（実際の内容として書く）"]
      }
    ]
  }
  ```

**AG-07B（Proposal Writer 前半）**
- 役割: ch-01〜ch-03 の各セクション完全執筆
- max_tokens: 16384
- 入力: `buildProposalContext()` + AG-07Aの storyLine
- 出力スキーマ:
  ```json
  {
    "chapters": [
      {
        "chapterId": "ch-01",
        "chapterTitle": "",
        "sections": [
          {
            "sectionId": "sec-01-01",
            "sectionTitle": "",
            "catchCopy": "（20字以内）",
            "body": "（300〜500字の完全な本文。AG参照は書かない。事実として統合して書く）",
            "bullets": ["スライドに載せる要点 3〜5点（体言止め可）"],
            "visualSpec": "（デザイナーに渡せる具体的な仕様：何を・何列で・キャプションは何か）",
            "caveats": ["不確実な情報・要クライアント確認事項（本文とは完全分離）"],
            "slideType": "title|chart|copy|flow|comparison|cta"
          }
        ]
      }
    ]
  }
  ```

**AG-07C（Proposal Writer 後半）**
- 役割: ch-04〜ch-06 の各セクション完全執筆 + 全体サマリー
- max_tokens: 16384
- 入力: AG-07Bと同じ（独立して動く。07Bの出力は受け取らない）
- 出力スキーマ: AG-07Bと同じ構造（chaptersの中身がch-04〜ch-06）

### Step 3: パイプライン変更

**`src/agents/types.ts`:**
```typescript
export type AgentId =
  | 'AG-01' | 'AG-02' | 'AG-03'
  | 'AG-04' | 'AG-05' | 'AG-06'
  | 'AG-07'            // 後方互換のため残す
  | 'AG-07A' | 'AG-07B' | 'AG-07C'  // 追加
```

**`src/lib/pipeline.ts`:**
- `runAgentStep` の switch に AG-07A/B/C を追加
- `extractContextSections` に AG-07A のケース追加（storyLine を渡す）

**`src/app/api/executions/[id]/resume/route.ts`:**
- Phase 3: `AG-06 → AG-07A → CHECKPOINT（phase 4）`
- Phase 4 (新規追加): `AG-07B + AG-07C → COMPLETED`
- `agentOrder` を `['AG-01', ..., 'AG-06', 'AG-07A', 'AG-07B', 'AG-07C']` に変更
- phase 判定ロジックを更新:
  ```typescript
  const phase = completedAgIds.includes('AG-07A') ? 4    // 新Phase
    : completedAgIds.includes('AG-05') ? 3
    : completedAgIds.includes('AG-03') ? 2
    : 1
  ```

**`src/app/api/executions/pipeline/route.ts`:**
- agentOrder 更新（AG-07 → AG-07A/B/C）

**サイドバーのAGリスト（`src/app/projects/[id]/page.tsx`）:**
```typescript
const AG_LIST = [
  { id: 'AG-01', label: 'インテーク' },
  { id: 'AG-02', label: '市場・業界分析' },
  { id: 'AG-03', label: '競合・ポジション分析' },
  { id: 'AG-04', label: '課題構造化' },
  { id: 'AG-05', label: 'ファクトチェック' },
  { id: 'AG-06', label: '設計草案' },
  { id: 'AG-07A', label: 'ストーリー設計' },
  { id: 'AG-07B', label: '提案書（前半）' },
  { id: 'AG-07C', label: '提案書（後半）' },
]
```

### Step 4: 提案書表示の改善

`src/lib/output-renderer.ts` に `renderAG07B` / `renderAG07C` を追加。

表示の階層:
```
章タイトル（H2・薄グレーで章番号）
  └─ セクションタイトル（H3）
       ├─ catchCopy（大テキスト・アクセントカラー）
       ├─ body（通常テキスト・段落分け済み）
       ├─ bullets（▸ リスト）
       ├─ visualSpec（折りたたみ・薄背景）
       └─ caveats（⚠️ バッジ・黄色）
```

### Step 5: Export バグ修正

`src/app/api/executions/[id]/export/route.ts`:
```typescript
// 現状（バグ）
const result = JSON.parse(result.outputJson)

// 修正後
import { safeParseJson } from '@/lib/json-cleaner'
const result = safeParseJson(rawResult.editedJson ?? rawResult.outputJson)
```

---

## コードの重要な前提知識

### データフロー

```
Claude API → agent.lastRawText（raw テキスト）
         → pipeline.ts が outputJson に保存（raw テキストのまま）
         → UI読み込み時に safeParseJson() でパース
         → renderAgentOutput() で表示用セクションに変換
```

### safeParseJson の場所
`src/lib/json-cleaner.ts` — コードフェンス除去 + JSON抽出 + パース

### callClaude の場所
`src/lib/anthropic-client.ts` — Anthropic SDK wrapper

### promptロード
`src/lib/prompt-loader.ts` — `loadPrompt('ag-07a-structure')` → `prompts/ag-07a-structure/default.md` を読む

### 各エージェントのパターン

```typescript
// src/agents/ag-07a-structure.ts のひな形
export class Ag07aStructureAgent extends BaseAgent {
  id: AgentId = 'AG-07A'
  name = 'ストーリー設計'
  protected modelType = 'quality' as const

  getPrompt(_ctx: ProjectContext): string {
    return loadPrompt('ag-07a-structure')
  }

  parseOutput(raw: string): AgentOutput {
    // safeParseJsonでパース → sectionsに変換
  }
}
```

### buildProposalContext の使い方（設計案）

`base-agent.ts` の `buildUserMessage` を AG-07A/B/C に対してオーバーライドする、
または `execute()` をオーバーライドして別の context builder を使う。

---

## ファイル構成

```
src/
  agents/
    base-agent.ts           ← buildUserMessage の 3section×500字制限がここ
    ag-07-story.ts          ← 旧AG-07（後方互換で残す）
    ag-07a-structure.ts     ← 新規作成
    ag-07b-writer.ts        ← 新規作成
    ag-07c-writer.ts        ← 新規作成
    types.ts                ← AgentId に AG-07A/B/C 追加
  lib/
    pipeline.ts             ← runAgentStep, extractContextSections, getVersionOutputs
    proposal-context-builder.ts  ← 新規作成（AG-07専用の入力ビルダー）
    output-renderer.ts      ← renderAG07B / renderAG07C 追加
    anthropic-client.ts     ← callClaude
    json-cleaner.ts         ← safeParseJson
  app/
    api/
      executions/
        pipeline/route.ts   ← AG-07A/B/C 追加
        [id]/
          resume/route.ts   ← Phase 3→4 分割
          export/route.ts   ← safeParseJson バグ修正

prompts/
  ag-07-story/default.md    ← 旧プロンプト（残す）
  ag-07a-structure/default.md  ← 新規作成
  ag-07b-writer/default.md  ← 新規作成
  ag-07c-writer/default.md  ← 新規作成
```

---

## claude.ai への指示文（コピペ用）

```
Web提案書生成システム（Next.js + TypeScript + Prisma + Claude API）の改善作業を引き継いでください。

GitHubリポジトリ: https://github.com/sworks-d/Web_Proposal
詳細な実装計画: docs/handoff_ag07_redesign.md
追加の設計文書: docs/implementation_ag07_split.md

## 今日やること

AG-07（提案書執筆エージェント）の入力品質と出力深度を改善します。

### 背景
- AG-07が受け取る前エージェントの情報が少なすぎる（全出力の10〜18%しか渡っていない）
- 1エージェントで構造設計+全文執筆を担っているため、各セクションが浅い

### 実装順序（docs/handoff_ag07_redesign.md に詳細あり）

1. `src/lib/proposal-context-builder.ts` の新規作成（AG-07専用の入力ビルダー）
2. `src/agents/ag-07a-structure.ts` の新規作成 + プロンプト作成
3. `src/agents/ag-07b-writer.ts` + `ag-07c-writer.ts` の新規作成 + プロンプト作成
4. `src/agents/types.ts` に AG-07A/B/C を追加
5. `src/lib/pipeline.ts` の更新
6. `src/app/api/executions/[id]/resume/route.ts` の Phase 3→4 分割
7. `src/app/api/executions/pipeline/route.ts` の更新
8. `src/app/projects/[id]/page.tsx` の AG_LIST 更新
9. `src/lib/output-renderer.ts` に renderAG07B/C 追加
10. `src/app/api/executions/[id]/export/route.ts` のバグ修正（safeParseJson 使用）

作業前にリポジトリをクローンして全ファイルを確認してから実装してください。
```

---

## 現在の既知バグ

1. **export が機能しない**: `export/route.ts` で `JSON.parse` 直呼び → `safeParseJson` に修正必要
2. **AG-05 表示**: 出力は正常（JSON valid）だが `safeParseJson` の変換で失敗する場合がある（要調査）
3. **RUNNING stuck**: サーバー再起動でセッションが切れた場合、version が RUNNING のまま残る → ページロード時に ERROR に変換する処理が必要

---

## 未解決の設計判断

- Phase 3（AG-06 + AG-07A）完了後にチェックポイントを設けるか？
  → 推奨: AG-07Aでコンセプトコピーと章立てを確認してから AG-07B/C に進む
- 1章あたりのセクション数目標: 現状2〜3 → 4〜5に増やしたい
- 総スライド数目標: 現状12〜15 → 25〜30を目標にする
