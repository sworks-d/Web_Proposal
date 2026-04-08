# 14: SG パイプライン品質改善 Phase 2

## 前提

Phase 1（commit `e4ba2f8`）で以下を実施済み:
- `formatAgOutputs` の切り捨て上限 3000→6000 + 圧縮
- SG-04 maxTokens 4096→8192
- SG-06 model fast→quality
- SG-04 フォールバック時の `[生成失敗]` マーク
- `cost-tracker.ts` によるAPIコスト安全装置（AG上限$8、SG上限$5）
- AG-01-RESEARCH の検索ループ安全強化

Phase 2 では **SG-04の入力品質** と **PPTX出力の堅牢性** を改善する。

---

## タスク一覧

### タスク1: SG-04 章別AGデータフィルタ（最重要）

**問題**: SG-04は全チャプターに対して同じAGキー（`AG-04-INSIGHT`, `AG-04-MERGE`, `AG-03`, `AG-03-GAP`, `AG-06`）を渡している。章の内容に無関係なデータがノイズになり、本文の具体性が低下している。

**修正箇所**: `src/agents/sg-04.ts` の `buildUserMessage` メソッド

**実装内容**:

`buildUserMessage` の先頭に、章IDに応じたAGキーマッピングを追加する。

```typescript
// 章IDごとに、本文生成に必要なAGデータを指定
const AG_CHAPTER_RELEVANCE: Record<string, string[]> = {
  // 課題・現状認識
  'problem':           ['AG-04-MAIN', 'AG-04-INSIGHT', 'AG-01-MERGE', 'AG-01-RESEARCH'],
  // 分析・競合
  'analysis':          ['AG-03', 'AG-03-HEURISTIC', 'AG-03-HEURISTIC2', 'AG-03-GAP', 'AG-03-MERGE'],
  'competitive':       ['AG-03', 'AG-03-HEURISTIC', 'AG-03-HEURISTIC2', 'AG-03-MERGE'],
  'current':           ['AG-03', 'AG-03-DATA', 'AG-01-RESEARCH'],
  // ターゲット・ジャーニー
  'target':            ['AG-02-STP', 'AG-02-JOURNEY', 'AG-02-VPC', 'AG-02-MERGE'],
  // インサイト・コンセプト
  'insight':           ['AG-04-INSIGHT', 'AG-04-MERGE', 'AG-02-VPC'],
  'concept':           ['AG-04-INSIGHT', 'AG-04-MERGE', 'AG-06'],
  // 設計・UX
  'design':            ['AG-06', 'AG-07A', 'AG-04-MERGE'],
  // IA・コンテンツ
  'ia':                ['AG-06', 'AG-07A', 'AG-07B'],
  'content':           ['AG-06', 'AG-07A', 'AG-03-GAP'],
  // KPI
  'kpi':               ['AG-06', 'AG-04-MERGE'],
  // ビジョン
  'vision':            ['AG-04-INSIGHT', 'AG-06'],
  // 改善系
  'user-behavior':     ['AG-02-JOURNEY', 'AG-03-DATA'],
  'issue-structure':   ['AG-04-MAIN', 'AG-04-MERGE'],
  'direction':         ['AG-04-MERGE', 'AG-06'],
  'content-problem':   ['AG-03-GAP', 'AG-06'],
  'target-content':    ['AG-02-STP', 'AG-02-JOURNEY', 'AG-03-GAP'],
  'strategy':          ['AG-04-MERGE', 'AG-06'],
  'sitemap':           ['AG-06', 'AG-07A'],
  'page-design':       ['AG-06', 'AG-07A', 'AG-07B'],
  'issues':            ['AG-04-MAIN', 'AG-04-INSIGHT'],
  'priorities':        ['AG-04-MERGE'],
  'measures':          ['AG-06', 'AG-04-MERGE'],
  'measure-detail':    ['AG-06', 'AG-07A'],
  'expected-outcome':  ['AG-06', 'AG-04-MERGE'],
}

// フォールバック: マッピングにない章IDはデフォルトのキーを使用
const DEFAULT_AG_KEYS = ['AG-04-INSIGHT', 'AG-04-MERGE', 'AG-06']
```

`buildUserMessage` 内の `this.formatAgOutputs` の呼び出しを以下に変更:

```typescript
// 変更前:
const agContext = this.formatAgOutputs(input.agOutputs, [
  'AG-04-INSIGHT', 'AG-04-MERGE', 'AG-03', 'AG-03-GAP', 'AG-06',
])

// 変更後:
const relevantKeys = AG_CHAPTER_RELEVANCE[chapter.id] ?? DEFAULT_AG_KEYS
const agContext = this.formatAgOutputs(input.agOutputs, relevantKeys)
```

**注意事項**:
- `AG_CHAPTER_RELEVANCE` はファイルスコープの定数として `Sg04Agent` クラスの外に定義する
- `chapter.id` は SG-01 が生成する ID（例: `problem`, `target`, `design` 等）に対応する
- SG-01 の `CHAPTER_MAP`（同ファイル `sg-01.ts` line 4-20）で定義されている全キーをカバーすること
- マッピングに存在しないキーは `DEFAULT_AG_KEYS` にフォールバックする

---

### タスク2: PPTX生成の空スライドガード

**問題**: SG-04やSG-06の出力で `body` が空配列 or `title` が `[生成失敗]` で始まるスライドがそのままPPTXに出力される。

**修正箇所**: `src/lib/pptx-generator.ts` の `generatePptxBuffer` 関数

**実装内容**:

`output.slides.forEach` の前に、失敗スライドを除外 or 警告表示するロジックを追加:

```typescript
// 失敗スライドを警告表示に変換
const validSlides = output.slides.map(slide => {
  if (slide.title.startsWith('[生成失敗]') || slide.body.length === 0) {
    return {
      ...slide,
      title: slide.title.replace('[生成失敗] ', '※ '),
      body: slide.body.length === 0
        ? ['（このスライドの本文は自動生成に失敗しました）']
        : slide.body,
      layoutHint: 'center-message',
    }
  }
  return slide
})
```

そして `output.slides.forEach` を `validSlides.forEach` に変更する。

**注意**: スライドを完全に除外するのではなく、失敗した旨を表示するスライドとして残す。枚数がパラメータと一致しないとクライアントが混乱するため。

---

### タスク3: SGプロンプトの外部ファイル化

**問題**: SG-01〜06のプロンプトは全てTypeScript内にインラインで書かれている。AG側は `prompts/` ディレクトリに外部化されているのに、SGだけインライン。プロンプト改善のイテレーション速度が遅い。

**現状**: `prompts/sg-01-structure/default.md` 等のファイルは存在するが、SG agentは使っていない。

**修正箇所**: 全SGエージェント（`sg-01.ts`, `sg-02.ts`, `sg-03.ts`, `sg-04.ts`, `sg-05.ts`, `sg-06.ts`）

**実装内容**:

1. 各SGエージェントの `getSystemPrompt()` の中身を対応する `prompts/sg-*/default.md` に移動する
2. `getSystemPrompt()` を `loadPrompt()` 呼び出しに変更する

```typescript
// 変更前（sg-01.ts の例）:
getSystemPrompt(): string {
  return `あなたは提案書の構成設計の専門家です。...`
}

// 変更後:
getSystemPrompt(): string {
  return loadPrompt('sg-01-structure')
}
```

3. import を追加:
```typescript
import { loadPrompt } from '@/lib/prompt-loader'
```

**各ファイルとプロンプトディレクトリの対応**:
| ファイル | プロンプトディレクトリ |
|---|---|
| `sg-01.ts` | `prompts/sg-01-structure/default.md` |
| `sg-02.ts` | `prompts/sg-02-narrative/default.md` |
| `sg-03.ts` | `prompts/sg-03-pacing/default.md` （新規作成） |
| `sg-04.ts` | `prompts/sg-04-content/default.md` |
| `sg-05.ts` | `prompts/sg-05-visual/default.md` （新規作成） |
| `sg-06.ts` | `prompts/sg-06-visual/default.md` を `sg-06-assembly/default.md` にリネーム |

**注意事項**:
- `prompts/sg-03-pacing/` と `prompts/sg-05-visual/` ディレクトリは新規作成が必要
- `prompts/sg-06-visual/` は名前が不適切（SG-06はビジュアルではなくアセンブラー）なので `sg-06-assembly/` にリネーム
- プロンプト内容はインラインの内容をそのまま移動する。この段階では改善しない（プロンプト改善は別タスク）
- `loadPrompt` が `prompts/{id}/default.md` を読むことを確認してから作業すること

```typescript
// loadPrompt の確認（src/lib/prompt-loader.ts にあるはず）
// loadPrompt('sg-01-structure') → prompts/sg-01-structure/default.md を読む
```

---

### タスク4: SG-06 の assemblyData 切り捨て上限引き上げ

**問題**: `sg-06.ts` の `buildUserMessage` で `assemblyData` を `slice(0, 12000)` で切っている。25枚のスライドだと切れる可能性がある。

**修正箇所**: `src/agents/sg-06.ts` line 102

```typescript
// 変更前:
const assemblyData = JSON.stringify({...}, null, 2).slice(0, 12000)

// 変更後:
const assemblyData = JSON.stringify({...}, null, 2).slice(0, 24000)
```

**注意**: Sonnet 4.6 は 1M context なので 24000文字（約12,000トークン）は問題ない。

---

### タスク5: .env に安全装置の設定を追加

**修正箇所**: プロジェクトルートの `.env.example`（なければ作成）

**追加内容**:
```
# APIコスト安全装置（USD）
AG_BUDGET_LIMIT=8.00
SG_BUDGET_LIMIT=5.00
SINGLE_CALL_LIMIT=1.50
```

既存の `.env` ファイルがあれば、そこにもコメント付きで追加する。

---

## 実装順序

1. **タスク1**（SG-04 章別AGフィルタ） — 最もインパクトが大きい
2. **タスク2**（PPTX空スライドガード） — 防御的改善
3. **タスク4**（SG-06 slice上限） — 1行変更
4. **タスク3**（プロンプト外部化） — リファクタリング
5. **タスク5**（.env） — ドキュメント

## コスト影響

全タスクともAPIコスト増加なし（コード変更のみ）。

## やらないこと（Phase 3以降）

- SGプロンプトの内容改善（外部化後に別途実施）
- PDF出力対応（現在はPPTXのみ）
- SG-04の章ごと並列実行（現在は直列ループ）
- SG用のテスト/評価フレームワーク構築
