# 次の実装指示（優先順位順）

Claude Code はこのファイルを読んで、上から順番に実装してください。

---

## Task 1: ag-04-insight.ts の IDバグ修正【最優先・1行の修正のみ】

### 現状の問題
`src/agents/ag-04-insight.ts` の `id: AgentId = 'AG-04'` になっている。
AG-04-INSIGHTとして動作すべきだが AG-04 のIDで動いている。

### 変更内容
```typescript
// src/agents/ag-04-insight.ts
// 変更前
id: AgentId = 'AG-04'

// 変更後
id: AgentId = 'AG-04-INSIGHT'
```

### types.ts への追加
```typescript
// src/agents/types.ts に追加
| 'AG-04-INSIGHT'
```

---

## Task 2: 新AGのクラスファイルを作成する

### 新規作成が必要なAGクラス

以下のプロンプトファイルに対応するエージェントクラスを作成する：

```
prompts/ag-01-research/default.md  → src/agents/ag-01-research.ts
prompts/ag-01-merge/default.md     → src/agents/ag-01-merge.ts
prompts/ag-02-position/default.md  → src/agents/ag-02-position.ts
prompts/ag-07c-1/default.md        → src/agents/ag-07c-1.ts
prompts/ag-07c-2/default.md        → src/agents/ag-07c-2.ts
prompts/ag-07c-3/default.md        → src/agents/ag-07c-3.ts
prompts/ag-07c-4/default.md        → src/agents/ag-07c-4.ts
```

### max_tokens設定（base-agent.tsのAG_MAX_TOKENSに追加）

```typescript
'AG-01-RESEARCH': 8192,
'AG-01-MERGE':    4096,
'AG-02-POSITION': 8192,
'AG-07C-1': 8192,
'AG-07C-2': 8192,  // 最重要章・最大トークン
'AG-07C-3': 6144,
'AG-07C-4': 4096,
```

### AG-01-RESEARCHのweb_search対応（重要）

AG-01-RESEARCHはweb_searchツールを使用するため、
callClaudeではなく直接anthropic.messages.createを呼ぶ特殊なexecute()が必要。

```typescript
// src/agents/ag-01-research.ts
import anthropic from '@/lib/anthropic-client'

export class Ag01ResearchAgent extends BaseAgent {
  id: AgentId = 'AG-01-RESEARCH'
  name = '会社情報リサーチ'
  protected modelType = 'quality' as const

  async execute(input: AgentInput): Promise<AgentOutput> {
    const system = this.getPrompt(input.projectContext)
    const user = this.buildUserMessage(input)

    const res = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 8192,
      system,
      messages: [{ role: 'user', content: user }],
      tools: [
        {
          type: 'web_search_20260209',
          name: 'web_search',
          max_uses: 15,
        }
      ],
    })

    // tool_useとtextブロックを統合して生テキストを取得
    const rawText = res.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('\n')

    this.lastRawText = rawText
    return this.parseOutput(rawText)
  }
}
```

---

## Task 3: パイプラインを更新する

### 実行順序の設計

```
Phase 0（新規）: AG-01 → AG-01-RESEARCH → AG-01-MERGE → CHECKPOINT
Phase 1: AG-02クラスター + AG-02-POSITION（並列）→ AG-02-MERGE → AG-03クラスター → AG-03-MERGE → CHECKPOINT
Phase 2: AG-04クラスター → AG-04-MERGE → AG-05 → CHECKPOINT
Phase 3: AG-06 → AG-07A/AG-07B（並列）→ AG-07C-1/AG-07C-2/AG-07C-3（並列）→ AG-07C-4 → COMPLETED
```

### resume/route.ts の主な変更点

```typescript
// Phase 0追加
const ag01 = await run('AG-01', 'AG-01 インテーク')
const ag01Research = await run('AG-01-RESEARCH', 'AG-01-RESEARCH 会社情報リサーチ')
const ag01Merge = await run('AG-01-MERGE', 'AG-01-MERGE インテーク統合')
send({ type: 'checkpoint', versionId, phase: 1, ... })

// Phase 1: AG-02クラスター + AG-02-POSITION並列
const [ag02, ag02Stp, ag02Journey, ag02Vpc, ag02Position] = await Promise.all([
  run('AG-02', ...),
  run('AG-02-STP', ...),
  run('AG-02-JOURNEY', ...),
  run('AG-02-VPC', ...),
  run('AG-02-POSITION', 'AG-02-POSITION 4軸ポジショニング'),  // 追加
])
const ag02Merge = await run('AG-02-MERGE', ...)

// Phase 3: AG-07C並列化
const [ag07a, ag07b] = await Promise.all([
  run('AG-07A', ...),
  run('AG-07B', ...),
])
// AG-07C-1/2/3を並列実行
const [ag07c1, ag07c2, ag07c3] = await Promise.all([
  run('AG-07C-1', 'AG-07C-1 素材セット Ch.01〜02'),
  run('AG-07C-2', 'AG-07C-2 素材セット Ch.03〜04'),
  run('AG-07C-3', 'AG-07C-3 素材セット Ch.05〜06'),
])
const ag07c4 = await run('AG-07C-4', 'AG-07C-4 サマリー・conceptWords')
```

### types.ts への追加

```typescript
export type AgentId =
  | 'AG-01' | 'AG-01-RESEARCH' | 'AG-01-MERGE'
  | 'AG-02' | 'AG-02-STP' | 'AG-02-JOURNEY' | 'AG-02-VPC' | 'AG-02-MERGE' | 'AG-02-POSITION'
  | 'AG-03' | 'AG-03-HEURISTIC' | 'AG-03-HEURISTIC2' | 'AG-03-GAP' | 'AG-03-DATA' | 'AG-03-MERGE'
  | 'AG-04' | 'AG-04-MAIN' | 'AG-04-INSIGHT' | 'AG-04-MERGE'
  | 'AG-05'
  | 'AG-06'
  | 'AG-07' | 'AG-07A' | 'AG-07B' | 'AG-07C' | 'AG-07C-1' | 'AG-07C-2' | 'AG-07C-3' | 'AG-07C-4'
```

### サイドバーのAGリスト更新

```typescript
const AG_LIST = [
  { id: 'AG-01',         label: 'インテーク' },
  { id: 'AG-01-RESEARCH',label: 'リサーチ' },
  { id: 'AG-01-MERGE',   label: 'インテーク統合' },
  { id: 'AG-02',         label: '市場分析' },
  { id: 'AG-02-STP',     label: 'STP分析' },
  { id: 'AG-02-JOURNEY', label: 'ジャーニー' },
  { id: 'AG-02-VPC',     label: 'VPC分析' },
  { id: 'AG-02-POSITION',label: '4軸ポジション' },
  { id: 'AG-02-MERGE',   label: '市場統合' },
  { id: 'AG-03',         label: '競合分析' },
  { id: 'AG-03-HEURISTIC',  label: '競合UX評価①' },
  { id: 'AG-03-HEURISTIC2', label: '競合UX評価②' },
  { id: 'AG-03-GAP',     label: 'コンテンツGAP' },
  { id: 'AG-03-DATA',    label: 'データ分析' },
  { id: 'AG-03-MERGE',   label: '競合統合' },
  { id: 'AG-04-MAIN',    label: '課題定義' },
  { id: 'AG-04-INSIGHT', label: 'インサイト' },
  { id: 'AG-04-MERGE',   label: '課題統合' },
  { id: 'AG-05',         label: 'ファクトチェック' },
  { id: 'AG-06',         label: '設計草案' },
  { id: 'AG-07A',        label: '設計分析' },
  { id: 'AG-07B',        label: '汎用知見' },
  { id: 'AG-07C-1',      label: '素材 Ch.01-02' },
  { id: 'AG-07C-2',      label: '素材 Ch.03-04' },
  { id: 'AG-07C-3',      label: '素材 Ch.05-06' },
  { id: 'AG-07C-4',      label: '素材 サマリー' },
]
```

---

## Task 4: chartDataの共通レンダラーを実装する

### 実装場所
`src/components/pipeline/ChartRenderer.tsx`（新規作成）

### 対応するchartData.type
```typescript
type ChartType = 'bar' | 'scatter' | 'radar' | 'heatmap'

// Chart.jsを使って自動描画する
// chartData.typeを見て適切なチャートを描画する
// isClient: true のデータポイントを強調表示する
// clientIndex で強調バーを設定する
```

### 使用ライブラリ
```bash
npm install chart.js react-chartjs-2
```

---

## 実装順序まとめ

```
Task 1（1行修正・即実行）→ Task 2（AGクラス作成）→ Task 3（パイプライン更新）→ Task 4（チャートレンダラー）
```
