# 次の実装指示（優先順位順）

Claude Code はこのファイルを読んで、上から順番に実装してください。
各タスクには「対象ファイル」「変更内容」「確認方法」を明記しています。

---

## Task 1: max_tokens のAG別設定【最優先・1ファイルの修正のみ】

### 現状の問題
`src/lib/anthropic-client.ts` の `callClaude` 関数に `max_tokens: 4096` がハードコードされている。
AG-02〜07の各サブAGは出力量が多く4096では足りず、途中で切れている。

### 対象ファイル
`src/lib/anthropic-client.ts`

### 変更内容

```typescript
// 変更前（現在）
export async function callClaude(
  system: string,
  user: string,
  modelType: ModelType = 'fast'
): Promise<string> {
  const res = await anthropic.messages.create({
    model: getModel(modelType),
    max_tokens: 4096,   // ← ここが問題
    system,
    messages: [{ role: 'user', content: user }],
  })
  ...
}

// 変更後
export const AG_MAX_TOKENS: Record<string, number> = {
  // AG-02系
  'AG-02':          4096,
  'AG-02-STP':      4096,
  'AG-02-JOURNEY':  4096,
  'AG-02-VPC':      4096,
  'AG-02-MERGE':    4096,
  // AG-03系
  'AG-03':          4096,
  'AG-03-HEURISTIC':  8192,
  'AG-03-HEURISTIC2': 4096,
  'AG-03-GAP':        4096,
  'AG-03-DATA':       4096,
  'AG-03-MERGE':      4096,
  // AG-04系
  'AG-04':          6144,
  'AG-04-MAIN':     8192,
  'AG-04-INSIGHT':  6144,
  'AG-04-MERGE':    4096,
  // AG-05〜07
  'AG-05':          4096,
  'AG-06':          8192,
  'AG-07':          8192,
  'AG-07A':         8192,
  'AG-07B':         4096,
  'AG-07C':         16384,
}

export async function callClaude(
  system: string,
  user: string,
  modelType: ModelType = 'fast',
  agentId?: string
): Promise<string> {
  const maxTokens = agentId ? (AG_MAX_TOKENS[agentId] ?? 4096) : 4096
  const res = await anthropic.messages.create({
    model: getModel(modelType),
    max_tokens: maxTokens,
    system,
    messages: [{ role: 'user', content: user }],
  })
  const block = res.content[0]
  if (block.type !== 'text') throw new Error('Unexpected response type')
  return block.text
}
```

### base-agent.ts の修正（callClaudeを呼んでいる箇所）

```typescript
// src/agents/base-agent.ts の execute() 内
// 変更前
const raw = await callClaude(system, user, this.modelType)

// 変更後
const raw = await callClaude(system, user, this.modelType, this.id)
```

### 確認方法
```bash
npm run dev
# 新規案件でフルパイプライン実行
# AG-02-STP・AG-04-MAIN・AG-07C の出力が途中で切れないことを確認
```

---

## Task 2: sectionsラッパーの除去【AG出力が空表示になる根本原因】

### 現状の問題
全AGが `{ agentId, sections: [{ content: rawText }] }` の形で保存している。
`output-renderer.ts` のマッパーが参照するフィールドが存在しないため空表示になる。
新しく作成したAG-02-STP等も同じパターンを踏襲しているため同じ問題が発生する。

### 対象ファイル
`src/agents/base-agent.ts`（共通処理を変更する）
`src/agents/ag-02-stp.ts` 以下の全新AGファイル（parseOutputを修正）

### 変更内容

base-agent.ts の saveOutput または execute の保存処理：

```typescript
// 変更前
await prisma.agentResult.create({
  data: {
    executionId: execution.id,
    agentId: this.id,
    outputJson: JSON.stringify({
      agentId: this.id,
      sections: [{ id: 'raw', content: raw, ... }]
    }),
  }
})

// 変更後：生テキストをそのまま保存
await prisma.agentResult.create({
  data: {
    executionId: execution.id,
    agentId: this.id,
    outputJson: raw,  // sectionsラッパーなし・生テキストをそのまま
  }
})
```

各AGの parseOutput は削除またはシンプル化する：
```typescript
// parseOutput は保存には使わず、表示用の変換は output-renderer.ts が担当する
parseOutput(raw: string): AgentOutput {
  // 何もしない or 最低限の実装
  return { agentId: this.id, sections: [], visualizations: [], metadata: { confidence: 'medium', factBasis: [], assumptions: [], missingInfo: [] } }
}
```

### 修正後の確認
```bash
npx prisma db push --force-reset
npm run dev
# 新規案件を作成してフルパイプライン実行
# DevToolsで /api/versions/{id} のレスポンスを確認：
#   executions[].results[].outputJson が { "segmentation": ... } の形になっていること
#   （sectionsラッパーが消えていること）
```

---

## Task 3: 新AG（AG-02-STP/JOURNEY/VPC/MERGE等）をパイプラインに組み込む

### 現状の問題
エージェントクラスは作成されたが、
パイプラインの実行順序・並列実行・MERGEの待機処理が実装されていない。

### 実行順序の設計

```
AG-01（インテーク）
  ↓
AG-02-MAIN（市場骨格）
AG-02-STP    ←── 並列実行（AG-02-MAIN完了後）
AG-02-JOURNEY ←── 並列実行
AG-02-VPC    ←── 並列実行
  ↓（全て完了後）
AG-02-MERGE

AG-03-MAIN（競合特定）
AG-03-HEURISTIC  ←── 並列実行（AG-03-MAIN完了後）
AG-03-HEURISTIC2 ←── 並列実行
AG-03-GAP        ←── 並列実行
AG-03-DATA       ←── 並列実行（inputPattern=Cの時のみ）
  ↓（全て完了後）
AG-03-MERGE

AG-04-MAIN    ←── 並列実行（AG-02-MERGE + AG-03-MERGE完了後）
AG-04-INSIGHT ←── 並列実行
  ↓（全て完了後）
AG-04-MERGE

AG-05（ファクトチェック）
  ↓
AG-06（設計草案）
  ↓
AG-07A（設計分析）
AG-07B（汎用知見） ←── 並列実行（AG-06完了後）
  ↓（全て完了後）
AG-07C（素材セット）
```

### 対象ファイル
`src/app/api/executions/[id]/resume/route.ts`
`src/app/api/executions/pipeline/route.ts`
`src/agents/types.ts`

### AgentId の追加（types.ts）

```typescript
export type AgentId =
  | 'AG-01'
  | 'AG-02' | 'AG-02-STP' | 'AG-02-JOURNEY' | 'AG-02-VPC' | 'AG-02-MERGE'
  | 'AG-03' | 'AG-03-HEURISTIC' | 'AG-03-HEURISTIC2' | 'AG-03-GAP' | 'AG-03-DATA' | 'AG-03-MERGE'
  | 'AG-04' | 'AG-04-MAIN' | 'AG-04-INSIGHT' | 'AG-04-MERGE'
  | 'AG-05'
  | 'AG-06'
  | 'AG-07' | 'AG-07A' | 'AG-07B' | 'AG-07C'
```

### resume/route.ts の並列実行パターン

```typescript
// Phase 2: AG-02系（並列）
const [ag02Main, ag02Stp, ag02Journey, ag02Vpc] = await Promise.all([
  runOrSkip(versionId, 'AG-02', ...),
  runOrSkip(versionId, 'AG-02-STP', ...),
  runOrSkip(versionId, 'AG-02-JOURNEY', ...),
  runOrSkip(versionId, 'AG-02-VPC', ...),
])
const ag02Merge = await runOrSkip(versionId, 'AG-02-MERGE', ...)

// AG-03-DATAはinputPattern=Cの時のみ
const ag01Output = safeParseJson(ag01Result.outputJson)
const runData = ag01Output?.inputPattern === 'C'

const [ag03Main, ag03Heuristic, ag03Heuristic2, ag03Gap, ag03Data] = await Promise.all([
  runOrSkip(versionId, 'AG-03', ...),
  runOrSkip(versionId, 'AG-03-HEURISTIC', ...),
  runOrSkip(versionId, 'AG-03-HEURISTIC2', ...),
  runOrSkip(versionId, 'AG-03-GAP', ...),
  runData ? runOrSkip(versionId, 'AG-03-DATA', ...) : Promise.resolve(null),
])
const ag03Merge = await runOrSkip(versionId, 'AG-03-MERGE', ...)

// Phase 3: AG-04系（並列）
const [ag04Main, ag04Insight] = await Promise.all([
  runOrSkip(versionId, 'AG-04-MAIN', ...),
  runOrSkip(versionId, 'AG-04-INSIGHT', ...),
])
const ag04Merge = await runOrSkip(versionId, 'AG-04-MERGE', ...)

// Phase 4: AG-05 → AG-06
const ag05 = await runOrSkip(versionId, 'AG-05', ...)
const ag06 = await runOrSkip(versionId, 'AG-06', ...)

// Phase 5: AG-07A/B並列 → AG-07C
const [ag07a, ag07b] = await Promise.all([
  runOrSkip(versionId, 'AG-07A', ...),
  runOrSkip(versionId, 'AG-07B', ...),
])
const ag07c = await runOrSkip(versionId, 'AG-07C', ...)
```

### 確認方法
```bash
npm run dev
# 新規案件を作成してフルパイプライン実行
# サイドバーに AG-02-STP / AG-02-JOURNEY 等が表示されることを確認
# 並列実行されていることをログで確認
```

---

## Task 4: サイドバーAGから完了データへのアクセス

詳細は `docs/implementation_output_display.md` の Section 10 を参照。

## Task 5: AG実行中のプロセス可視化（SSEストリーミング）

詳細は `docs/implementation_output_display.md` の Section 12 を参照。

---

## 実装順序のまとめ

```
Task 1 → Task 2 → Task 3 → Task 4 → Task 5 の順で進める。

Task 1 は1ファイル・数行の修正なので最初に完了させる。
Task 2 は Task 1 完了後に npx prisma db push --force-reset を実行してから進める。
Task 3 は Task 2 の出力形式が正しくなってから実装する。
Task 4・5 は Task 3 の並列実行が動いてから実装する。
```
