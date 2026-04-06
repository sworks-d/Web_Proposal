# 出力重複チェックの実装指示

Claude Code はこのファイルを読んで実装してください。
`docs/implementation_next_steps.md` の Task 1〜4 とは独立した修正です。

---

## 背景と問題

現在 MERGE 系 AG（AG-02-MERGE / AG-03-MERGE / AG-04-MERGE）と
AG-07A / AG-07C が「前段 AG の出力フィールドをそのまま再出力する」問題がある。

具体的な症状：
- `siteDesignPrinciples` が AG-02-MERGE → AG-03-MERGE → AG-04-MERGE → AG-07A で計4回生成される
- AG-07C の body_draft に「AG-04のtargetInsightによると〜」という内部参照が残る
- AG-07C の evidence が複数スライドで同じ内容を繰り返す

プロンプト側には `prompts/ag-02-merge/default.md` 等に禁止ルールを記載済み。
しかし AG が生成した JSON を「保存する前に重複チェック」する仕組みが
コード側にない。以下の 2 段階で対処する。

---

## Task DEDUP-1: pipeline.ts に重複フィールド検出ロジックを追加

### 対象ファイル
`src/lib/pipeline.ts`

### 追加する関数

`runAgentStep` の保存処理（`prisma.agentResult.create` の直前）に
以下の重複チェック関数を追加する。

```typescript
/**
 * MERGE系・AG-07C系のAGが前段AGのフィールドをそのまま再出力していないかチェックする。
 * 問題が検出された場合は parseErrorMessage に警告を記録する（実行は止めない）。
 */
function checkDuplication(
  agentId: string,
  currentOutput: Record<string, unknown>,
  previousOutputs: Record<string, unknown>
): string | null {
  // チェック対象のAGと、そのAGが「再出力してはいけないフィールド」の定義
  const FORBIDDEN_REUSE: Record<string, string[]> = {
    'AG-03-MERGE': ['siteDesignPrinciples'],
    'AG-04-MERGE': ['siteDesignPrinciples', 'coreProblemStatement'],
    'AG-07A':      ['siteDesignPrinciples'],
    'AG-07C-1':    [],   // body_draftの内部参照チェックは文字列検索で行う
    'AG-07C-2':    [],
    'AG-07C-3':    [],
    'AG-07C-4':    [],
  }

  const forbidden = FORBIDDEN_REUSE[agentId]
  if (!forbidden) return null

  const warnings: string[] = []

  // フィールド再出力チェック
  for (const field of forbidden) {
    if (field in currentOutput && field in previousOutputs) {
      const cur = JSON.stringify(currentOutput[field])
      const prev = JSON.stringify(previousOutputs[field])
      // 80%以上一致していたら再出力とみなす（完全一致はほぼ確実にコピー）
      if (cur === prev) {
        warnings.push(`[DEDUP] ${agentId}: フィールド "${field}" が前段AGの出力と完全一致しています。再出力の可能性があります。`)
      }
    }
  }

  // AG-07C系: body_draft に「AG-」という内部参照が残っていないかチェック
  if (agentId.startsWith('AG-07C')) {
    const outputStr = JSON.stringify(currentOutput)
    const internalRefs = outputStr.match(/AG-\d{2}[A-Z-]*の/g) ?? []
    if (internalRefs.length > 0) {
      warnings.push(`[DEDUP] ${agentId}: body_draft に内部参照が残っています: ${[...new Set(internalRefs)].join(', ')}`)
    }
  }

  return warnings.length > 0 ? warnings.join('\n') : null
}
```

### 呼び出し箇所

`runAgentStep` 内の `prisma.agentResult.create` の直前に追加する：

```typescript
// 保存前の重複チェック
let dedupWarning: string | null = null
try {
  const parsed = JSON.parse(rawText)
  const prevOutputs = await getVersionOutputs(execution.versionId)
  // 全前段AGの出力をマージして比較用オブジェクトを作成
  const allPrevFields = Object.values(prevOutputs).reduce(
    (acc, o) => ({ ...acc, ...o }), {} as Record<string, unknown>
  )
  dedupWarning = checkDuplication(agentId, parsed, allPrevFields)
} catch {
  // パース失敗は無視（parseError フラグで別途処理される）
}

await prisma.agentResult.create({
  data: {
    executionId: execution.id,
    agentId,
    outputJson: rawText,
    parseError,
    parseErrorMessage: dedupWarning
      ? `${parseErrorMessage ?? ''}\n${dedupWarning}`.trim()
      : parseErrorMessage,
  },
})
```

### 注意
- 重複が検出されても実行は止めない（警告をログに残すだけ）
- `parseErrorMessage` に追記する形で保存する
- UI 側で `parseErrorMessage` が表示される箇所がある場合、
  `[DEDUP]` プレフィックスで識別できる

---

## Task DEDUP-2: AG-07C の evidence 重複チェック

AG-07C-1〜4 は並列実行されるため、同じ evidence を複数スライドで
使い回す問題が発生しやすい。

### AG-07C 系の parseOutput での対処

`src/agents/ag-07c-story.ts`（および ag-07c-1.ts〜ag-07c-4.ts が作成されたら各ファイル）
の `parseOutput` 内で以下の重複排除を行う：

```typescript
/**
 * スライド間で evidence の fact が重複している場合に警告を付与する
 */
function detectEvidenceDuplication(slides: Array<Record<string, unknown>>): string[] {
  const warnings: string[] = []
  const seenFacts = new Set<string>()

  for (const slide of slides) {
    const evidence = (slide.evidence as Array<{ fact: string }>) ?? []
    for (const ev of evidence) {
      const key = ev.fact?.trim().slice(0, 40) // 先頭40字で重複判定
      if (key && seenFacts.has(key)) {
        warnings.push(`スライド ${slide.slideId}: evidence "${key}..." が他スライドと重複`)
      } else if (key) {
        seenFacts.add(key)
      }
    }
  }
  return warnings
}
```

`parseOutput` 内で呼び出して、`metadata.missingInfo` に警告を追加する：

```typescript
const dupWarnings = detectEvidenceDuplication(slides)
if (dupWarnings.length > 0) {
  metadata.missingInfo = [
    ...(metadata.missingInfo ?? []),
    ...dupWarnings.map(w => ({ item: w, reason: 'evidence重複', confirmMethod: '各スライドで異なる根拠を使うよう修正' }))
  ]
}
```

---

## Task DEDUP-3: UI に重複警告バッジを表示

AG の実行結果に `parseErrorMessage` が含まれ、かつ `[DEDUP]` で始まる行がある場合、
サイドバーの該当 AG アイテムに警告アイコンを表示する。

### 対象ファイル
`src/app/projects/[id]/page.tsx` または `src/components/pipeline/AgentRail.tsx`

### 表示ロジック

```typescript
// AgentResult の parseErrorMessage に [DEDUP] が含まれるかチェック
function hasDedupWarning(result: AgentResult | undefined): boolean {
  if (!result?.parseErrorMessage) return false
  return result.parseErrorMessage.includes('[DEDUP]')
}
```

サイドバーの AG アイテムで、`hasDedupWarning` が true の場合に
既存のチェックマークの横に小さい警告マーク（`⚠`）を表示する：

```tsx
{hasDedupWarning(latestResult) && (
  <span style={{ fontSize: '9px', color: '#E8A020', marginLeft: '4px' }} title="重複出力の可能性">⚠</span>
)}
```

---

## 確認方法

1. フルパイプラインを実行する
2. 実行完了後、DB の `AgentResult` テーブルを確認する：
   ```sql
   SELECT agentId, parseErrorMessage FROM AgentResult WHERE parseErrorMessage LIKE '%DEDUP%';
   ```
3. [DEDUP] の警告が記録されていれば機能している
4. AG-07C 系のスライドで evidence の重複がある場合、サイドバーに ⚠ が表示される

