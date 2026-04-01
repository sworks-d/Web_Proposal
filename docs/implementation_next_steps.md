# 次の実装指示（優先順位順）

Claude Code はこのファイルを読んで、上から順番に実装してください。
各タスクには「対象ファイル」「変更内容」「確認方法」を明記しています。

---

## Task 1: max_tokens のAG別設定【最優先・1ファイルの修正のみ】

### 現状の問題
`src/lib/anthropic-client.ts` の `callClaude` 関数に `max_tokens: 4096` がハードコードされている。
AG-02・03・06・07 は出力量が多く4096では足りず、途中で切れている。

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
const AG_MAX_TOKENS: Record<string, number> = {
  'AG-01': 4096,
  'AG-02': 8192,
  'AG-03': 8192,
  'AG-04': 6144,
  'AG-05': 4096,
  'AG-06': 8192,
  'AG-07': 8192,
}

export async function callClaude(
  system: string,
  user: string,
  modelType: ModelType = 'fast',
  agentId?: string           // ← 引数追加
): Promise<string> {
  const res = await anthropic.messages.create({
    model: getModel(modelType),
    max_tokens: AG_MAX_TOKENS[agentId ?? ''] ?? 4096,  // ← AG別に設定
    system,
    messages: [{ role: 'user', content: user }],
  })
  ...
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
# AG-02・03の出力が途中で切れずに完結することを確認
# ログに「JSON出力がmax_tokensで途中で切れた」が出ないこと
```

---

## Task 2: sectionsラッパーの除去【AG出力が空表示になる根本原因】

### 現状の問題
全AGが出力を `{ agentId, sections: [{ content: rawText }] }` の形で保存している。
`output-renderer.ts` のマッパーが参照するフィールド（`marketStructure` 等）が存在しないため、枠だけ出て中身が空になる。

### 確認：どのファイルで sectionsラッパーを作っているか
`src/agents/base-agent.ts` の `parseOutput` または `execute` を確認する。
以下のようなコードがあるはず：

```typescript
// 削除すべきラッパー処理（例）
return {
  agentId: this.id,
  sections: [
    { id: 'raw-output', title: '...', content: rawText }
  ]
}
```

### 変更内容
`parseOutput` の中でsectionsラッパーを作っている箇所を除去する。
生のrawTextをそのまま返す形に変更する。

各AGの `ag-01-intake.ts` 〜 `ag-07-story.ts` でも同様の処理があれば除去する。

APIへの保存処理（pipeline.ts または executions/route.ts）も確認し、
`outputJson` に生テキストをそのまま保存するよう修正する：

```typescript
// 変更後のイメージ
await prisma.agentResult.create({
  data: {
    executionId: execution.id,
    agentId: agentId,
    outputJson: rawText,   // sectionsラッパーなし・生テキストをそのまま
  }
})
```

### 修正後の確認
```bash
npx prisma db push --force-reset   # DBリセット
npm run dev
# 新規案件を作成してフルパイプライン実行
# DevToolsで /api/versions/{id} のレスポンスを確認：
#   executions[].results[].outputJson が { "marketStructure": ... } の形になっていること
#   （ sectionsラッパーが消えていること ）
```

---

## Task 3: サイドバーのAGをクリックして完了データにアクセス

### 現状の問題
左サイドバーの全AGが「待機中」表示のまま。
完了済みAGをクリックしても右パネルに何も表示されない。

### 変更内容の概要
詳細は `docs/implementation_output_display.md` の **Section 10** を参照。

要点のみ：

**AgentRail（左サイドバー）:**
```typescript
// 完了済みAGのスタイル
// done → opacity:1, cursor:'pointer', サブテキスト「クリックで参照 ▾」
// active → 赤ライン + 点滅
// pending → opacity:0.35, cursor:'default'（変更なし）
```

**右パネル:**
```typescript
// 完了済みAGを AG-07→AG-01 の順で折りたたみ表示
// クリックで展開 → OutputSectionRenderer で表示
// id="ag-section-{agentId}" でスクロールターゲットを設定
```

**連動:**
```typescript
// selectedAgentId を useState で管理
// サイドバークリック → 右パネルの該当セクションへスクロール + 展開
useEffect(() => {
  if (!selectedAgentId) return
  document.getElementById(`ag-section-${selectedAgentId}`)
    ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}, [selectedAgentId])
```

### 確認方法
```
1. フルパイプライン実行後
2. 左サイドバーの「AG-01 インテーク」をクリック
3. 右パネルにAG-01の出力が展開されて表示されること
4. 「AG-02 市場分析」をクリックすると右パネルがスクロールして展開されること
```

---

## 実装順序のまとめ

```
Task 1 → Task 2 → Task 3 の順で進める。

Task 1 は1ファイル・数行の修正なので最初に完了させる。
Task 2 は Task 1 完了後に npx prisma db push --force-reset を実行してから進める。
Task 3 は Task 2 の出力表示が正しくなってから実装する（表示の確認が必要なため）。
```
