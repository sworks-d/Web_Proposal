# Claude Code 実装指示書

cd /Users/a05/Web_Proposal && git pull origin main

このファイルを読んで、Task 1 から順番に実装してください。
各Task完了後にコミットしてください。

---

## Task 1：ag-04-insight.ts の IDバグ修正【1行・最優先】

### ファイル
`src/agents/ag-04-insight.ts`

### 変更
```typescript
// 変更前
id: AgentId = 'AG-04'
// 変更後
id: AgentId = 'AG-04-INSIGHT'
```

### types.ts に追加
```typescript
// src/agents/types.ts の AgentId 型に追記
| 'AG-04-INSIGHT'
```

コミット: `fix: ag-04-insight.ts の id を AG-04-INSIGHT に修正`

---

## Task 2：types.ts の AgentId 型を全件更新

`src/agents/types.ts` の `AgentId` 型を以下に差し替える：

```typescript
export type AgentId =
  | 'AG-01' | 'AG-01-RESEARCH' | 'AG-01-MERGE'
  | 'AG-02' | 'AG-02-STP' | 'AG-02-JOURNEY' | 'AG-02-VPC' | 'AG-02-MERGE' | 'AG-02-POSITION'
  | 'AG-03' | 'AG-03-HEURISTIC' | 'AG-03-HEURISTIC2' | 'AG-03-GAP' | 'AG-03-DATA' | 'AG-03-MERGE'
  | 'AG-04' | 'AG-04-MAIN' | 'AG-04-INSIGHT' | 'AG-04-MERGE'
  | 'AG-05'
  | 'AG-06'
  | 'AG-07' | 'AG-07A' | 'AG-07B' | 'AG-07C'
  | 'AG-07C-1' | 'AG-07C-2' | 'AG-07C-3' | 'AG-07C-4'
```

コミット: `feat: types.ts の AgentId に新AG7種を追加`

---

## Task 3：base-agent.ts に新AGの max_tokens を追加

`src/agents/base-agent.ts` の `AG_MAX_TOKENS` に追記：

```typescript
// 既存エントリの後に追加
'AG-01-RESEARCH': 8192,
'AG-01-MERGE':    4096,
'AG-02-POSITION': 8192,
'AG-07C-1': 8192,
'AG-07C-2': 8192,
'AG-07C-3': 6144,
'AG-07C-4': 4096,
```

コミット: `feat: base-agent.ts に新AG7種の max_tokens を追加`

---

## Task 4：新AGクラス 7種を作成

### 共通パターン（ag-01-merge, ag-02-position, ag-07c-1〜4）

以下の6ファイルを同パターンで作成する。
`loadPrompt` の引数だけ変える。

**`src/agents/ag-01-merge.ts`**
```typescript
import { BaseAgent } from './base-agent'
import { AgentId, AgentOutput, ProjectContext } from './types'
import { loadPrompt } from '@/lib/prompt-loader'

export class Ag01MergeAgent extends BaseAgent {
  id: AgentId = 'AG-01-MERGE'
  name = 'インテーク統合'
  protected modelType = 'quality' as const
  getPrompt(_ctx: ProjectContext): string { return loadPrompt('ag-01-merge') }
  parseOutput(raw: string): AgentOutput { return this.fallbackOutput(raw) }
}
```

**`src/agents/ag-02-position.ts`**
```typescript
export class Ag02PositionAgent extends BaseAgent {
  id: AgentId = 'AG-02-POSITION'
  name = '4軸ポジショニング分析'
  protected modelType = 'quality' as const
  getPrompt(_ctx: ProjectContext): string { return loadPrompt('ag-02-position') }
  parseOutput(raw: string): AgentOutput { return this.fallbackOutput(raw) }
}
```

**`src/agents/ag-07c-1.ts`**
```typescript
export class Ag07c1Agent extends BaseAgent {
  id: AgentId = 'AG-07C-1'
  name = '提案書素材 Ch.01〜02'
  protected modelType = 'quality' as const
  getPrompt(_ctx: ProjectContext): string { return loadPrompt('ag-07c-1') }
  parseOutput(raw: string): AgentOutput { return this.fallbackOutput(raw) }
}
```

**`src/agents/ag-07c-2.ts`** / **`ag-07c-3.ts`** / **`ag-07c-4.ts`** も同パターン。
name と loadPrompt のキーだけ変える（ag-07c-2, ag-07c-3, ag-07c-4）。

---

### AG-01-RESEARCH のみ特殊実装（web_search 使用）

**`src/agents/ag-01-research.ts`**

```typescript
import { BaseAgent } from './base-agent'
import { AgentId, AgentOutput, AgentInput, ProjectContext } from './types'
import { loadPrompt } from '@/lib/prompt-loader'
import anthropic from '@/lib/anthropic-client'

export class Ag01ResearchAgent extends BaseAgent {
  id: AgentId = 'AG-01-RESEARCH'
  name = '会社情報リサーチ'
  protected modelType = 'quality' as const

  getPrompt(_ctx: ProjectContext): string {
    return loadPrompt('ag-01-research')
  }

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
          type: 'web_search_20260209' as const,
          name: 'web_search',
          max_uses: 15,
        }
      ],
    })

    const rawText = res.content
      .filter((b): b is { type: 'text'; text: string } => b.type === 'text')
      .map(b => b.text)
      .join('\n')

    this.lastRawText = rawText
    return this.parseOutput(rawText)
  }

  parseOutput(raw: string): AgentOutput {
    return this.fallbackOutput(raw)
  }
}
```

コミット: `feat: 新AGクラス7種を作成（AG-01-RESEARCH/MERGE, AG-02-POSITION, AG-07C-1〜4）`

---

## Task 5：pipeline.ts に新AGを追加

### import に追加

```typescript
import { Ag01ResearchAgent } from '@/agents/ag-01-research'
import { Ag01MergeAgent }    from '@/agents/ag-01-merge'
import { Ag02PositionAgent } from '@/agents/ag-02-position'
import { Ag07c1Agent }       from '@/agents/ag-07c-1'
import { Ag07c2Agent }       from '@/agents/ag-07c-2'
import { Ag07c3Agent }       from '@/agents/ag-07c-3'
import { Ag07c4Agent }       from '@/agents/ag-07c-4'
```

### switch (agentId) に case を追加

既存の `case 'AG-02-JOURNEY':` 等と同じ場所に追記：

```typescript
case 'AG-01-RESEARCH': agent = new Ag01ResearchAgent(); break
case 'AG-01-MERGE':    agent = new Ag01MergeAgent();    break
case 'AG-02-POSITION': agent = new Ag02PositionAgent(); break
case 'AG-07C-1':       agent = new Ag07c1Agent();       break
case 'AG-07C-2':       agent = new Ag07c2Agent();       break
case 'AG-07C-3':       agent = new Ag07c3Agent();       break
case 'AG-07C-4':       agent = new Ag07c4Agent();       break
```

### getInputsForAgent（または同等の入力マッピング関数）に追加

既存の `case 'AG-02-STP': return [...]` と同じパターンで追記。
参照する前段AGの出力フィールドを s() ヘルパーで渡す：

```typescript
case 'AG-01-RESEARCH': return [
  s('intake', 'インテーク情報', `会社名: ${p.clientName ?? ''}\nURL: ${p.clientWebsite ?? ''}\n業種: ${p.clientIndustry ?? ''}`),
]
case 'AG-01-MERGE': return [
  s('intake',    'インテーク申告情報', JSON.stringify(p).slice(0, 600)),
  s('research',  'リサーチ結果',       JSON.stringify(p).slice(0, 600)),
]
case 'AG-02-POSITION': return [
  s('company',   '確定会社情報',       JSON.stringify((p as any).confirmedBasics ?? '').slice(0, 400)),
  s('industry',  '業界ポジション',     JSON.stringify((p as any).industryProfile ?? '').slice(0, 400)),
  s('area',      'エリアプロファイル', JSON.stringify((p as any).areaProfile ?? '').slice(0, 300)),
]
case 'AG-07C-1': return [
  s('mission',     'サイトミッション',   String(p.siteMission ?? '')),
  s('matrix',      '分析マトリクス',     JSON.stringify(p.analysisMatrix ?? '').slice(0, 600)),
  s('target',      'ターゲット定義',     JSON.stringify(p.targetDefinition ?? '').slice(0, 400)),
  s('principles',  '設計原則',          (p.siteDesignPrinciples ?? []).slice(0, 3).map((x: any) => x.principle).join('\n')),
]
case 'AG-07C-2': return [
  s('mission',     'サイトミッション',   String(p.siteMission ?? '')),
  s('matrix',      '分析マトリクス',     JSON.stringify(p.analysisMatrix ?? '').slice(0, 600)),
  s('priorities',  '設計優先順位',      (p.designPriorities ?? []).slice(0, 4).map((d: any) => `[${d.priority}位] ${d.hmwQuestion}: ${d.designAction}`).join('\n')),
  s('ia',          'ページ構成',        (p.contentArchitecture ?? []).slice(0, 6).map((pg: any) => `${pg.pageTitle}: ${pg.designMission}`).join('\n')),
]
case 'AG-07C-3': return [
  s('mission',     'サイトミッション',   String(p.siteMission ?? '')),
  s('ia',          'ページ構成後半',     JSON.stringify(p.contentArchitecture ?? '').slice(0, 400)),
  s('risks',       'リスク・運用注意',   JSON.stringify(p.risks ?? '').slice(0, 300)),
]
case 'AG-07C-4': return [
  s('ch1',         'Ch.01-02素材',      JSON.stringify(p).slice(0, 500)),
  s('ch2',         'Ch.03-04素材',      JSON.stringify(p).slice(0, 500)),
  s('ch3',         'Ch.05-06素材',      JSON.stringify(p).slice(0, 400)),
  s('position',    'ポジション統合',    JSON.stringify((p as any).integratedPosition ?? '').slice(0, 300)),
]
```

**注意：** 上記の `p` は各AGの前段出力をパースしたオブジェクト。
既存コードの `getInputsForAgent` の引数パターンに合わせて実装すること。

コミット: `feat: pipeline.ts に新AG7種のcase分岐と入力マッピングを追加`

---

## Task 6：resume/route.ts のパイプライン更新

### Phase 判定ロジックの変更

```typescript
// 変更前
const phase = completedAgIds.includes('AG-05') ? 3
  : completedAgIds.includes('AG-03-MERGE') ? 2
  : 1

// 変更後
const phase = completedAgIds.includes('AG-05') ? 3
  : completedAgIds.includes('AG-03-MERGE') ? 2
  : completedAgIds.includes('AG-01-MERGE') ? 1
  : 0
```

### PIPELINE_AGENTS リスト（サイドバー表示）の更新

既存の AG_LIST または PIPELINE_AGENTS 配列を以下に差し替える：

```typescript
const PIPELINE_AGENTS = [
  { id: 'AG-01',           label: 'インテーク' },
  { id: 'AG-01-RESEARCH',  label: '会社情報リサーチ' },
  { id: 'AG-01-MERGE',     label: 'インテーク統合' },
  { id: 'AG-02',           label: '市場分析' },
  { id: 'AG-02-STP',       label: 'STP分析' },
  { id: 'AG-02-JOURNEY',   label: 'カスタマージャーニー' },
  { id: 'AG-02-VPC',       label: 'バリュープロポジション' },
  { id: 'AG-02-POSITION',  label: '4軸ポジション' },
  { id: 'AG-02-MERGE',     label: '市場分析統合' },
  { id: 'AG-03',           label: '競合特定' },
  { id: 'AG-03-HEURISTIC', label: 'UX評価①' },
  { id: 'AG-03-HEURISTIC2',label: 'UX評価②' },
  { id: 'AG-03-GAP',       label: 'コンテンツGAP' },
  { id: 'AG-03-DATA',      label: 'データ分析' },
  { id: 'AG-03-MERGE',     label: '競合分析統合' },
  { id: 'AG-04-MAIN',      label: '課題定義' },
  { id: 'AG-04-INSIGHT',   label: 'インサイト分析' },
  { id: 'AG-04-MERGE',     label: '課題定義統合' },
  { id: 'AG-05',           label: 'ファクトチェック' },
  { id: 'AG-06',           label: '設計草案' },
  { id: 'AG-07A',          label: '設計分析' },
  { id: 'AG-07B',          label: '汎用知見' },
  { id: 'AG-07C-1',        label: '素材 Ch.01-02' },
  { id: 'AG-07C-2',        label: '素材 Ch.03-04' },
  { id: 'AG-07C-3',        label: '素材 Ch.05-06' },
  { id: 'AG-07C-4',        label: '素材 サマリー' },
]
```

### Phase 0 を挿入

現在の `if (phase === 1) {` の前に Phase 0 を追加する：

```typescript
// Phase 0: AG-01 → AG-01-RESEARCH → AG-01-MERGE → CHECKPOINT
if (phase === 0) {
  const ag01 = await run('AG-01', 'インテーク')
  send({ type: 'status', message: 'AG-01-RESEARCH 会社情報リサーチ中（web_search）...' })
  const ag01Research = await run('AG-01-RESEARCH', '会社情報リサーチ')
  const ag01Merge    = await run('AG-01-MERGE',    'インテーク統合')
  await setVersionStatus(versionId, 'CHECKPOINT')
  send({ type: 'checkpoint', versionId, phase: 1, outputs: newOutputs })
}
```

### Phase 1 に AG-02-POSITION を追加

```typescript
// 変更前
const [ag02, ag02Stp, ag02Journey, ag02Vpc] = await Promise.all([
  run('AG-02', ...),
  run('AG-02-STP', ...),
  run('AG-02-JOURNEY', ...),
  run('AG-02-VPC', ...),
])

// 変更後
const [ag02, ag02Stp, ag02Journey, ag02Vpc, ag02Position] = await Promise.all([
  run('AG-02',          `AG-02（${config.primaryAgent}）市場骨格分析`),
  run('AG-02-STP',      'STP分析'),
  run('AG-02-JOURNEY',  'カスタマージャーニー'),
  run('AG-02-VPC',      'バリュープロポジション'),
  run('AG-02-POSITION', '4軸ポジショニング'),
])
```

### Phase 3 の AG-07C を分割並列化

```typescript
// 変更前
const ag07c = await run('AG-07C', 'ストーリーエディター')

// 変更後
send({ type: 'status', message: 'AG-07C-1/2/3 素材セット並列生成中...' })
const [ag07c1, ag07c2, ag07c3] = await Promise.all([
  run('AG-07C-1', '素材セット Ch.01〜02'),
  run('AG-07C-2', '素材セット Ch.03〜04'),
  run('AG-07C-3', '素材セット Ch.05〜06'),
])
send({ type: 'status', message: 'AG-07C-4 サマリー生成中...' })
const ag07c4 = await run('AG-07C-4', 'サマリー・conceptWords')
```

コミット: `feat: resume/route.ts パイプライン更新（Phase 0追加・AG-02-POSITION並列・AG-07C分割）`

---

## Task 7：ChartRenderer コンポーネントの作成

### インストール
```bash
npm install chart.js react-chartjs-2
```

### `src/components/pipeline/ChartRenderer.tsx` を新規作成

```typescript
'use client'
import { useEffect, useRef } from 'react'
import {
  Chart, BarController, BarElement, ScatterController, PointElement,
  RadarController, RadialLinearScale, CategoryScale, LinearScale,
  LineElement, Filler, Tooltip, Legend,
} from 'chart.js'

Chart.register(
  BarController, BarElement, ScatterController, PointElement,
  RadarController, RadialLinearScale, CategoryScale, LinearScale,
  LineElement, Filler, Tooltip, Legend
)

export function ChartRenderer({ data }: { data: Record<string, unknown> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const chartRef  = useRef<Chart | null>(null)

  useEffect(() => {
    if (!canvasRef.current || !data) return
    chartRef.current?.destroy()
    const ctx = canvasRef.current.getContext('2d')
    if (!ctx) return

    const type = data.type as string
    const CLIENT_COLOR = '#1D9E75'
    const OTHER_COLOR  = '#B4B2A9'
    const TARGET_COLOR = '#EF9F27'

    if (type === 'bar') {
      const labels  = (data.labels  as string[]) ?? []
      const values  = (data.values  as number[]) ?? []
      const ci      = data.clientIndex as number ?? -1
      chartRef.current = new Chart(ctx, {
        type: 'bar',
        data: {
          labels,
          datasets: [{ data: values, backgroundColor: labels.map((_, i) => i === ci ? CLIENT_COLOR : OTHER_COLOR), borderWidth: 0 }],
        },
        options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } },
      })
    }

    if (type === 'scatter') {
      const plots = (data.plots as Array<{ label: string; x: number; y: number; isClient?: boolean }>) ?? []
      const target = data.targetPlot as { label: string; x: number; y: number } | undefined
      const xAxis  = data.xAxis as { label: string; min?: number; max?: number }
      const yAxis  = data.yAxis as { label: string; min?: number; max?: number }
      const datasets = [
        { label: '競合', data: plots.filter(p => !p.isClient).map(p => ({ x: p.x, y: p.y })), backgroundColor: OTHER_COLOR, pointRadius: 6 },
        { label: 'CLIENT', data: plots.filter(p => p.isClient).map(p => ({ x: p.x, y: p.y })), backgroundColor: CLIENT_COLOR, pointRadius: 10 },
        ...(target ? [{ label: '目標', data: [{ x: target.x, y: target.y }], backgroundColor: TARGET_COLOR, pointRadius: 8 }] : []),
      ]
      chartRef.current = new Chart(ctx, {
        type: 'scatter',
        data: { datasets },
        options: { responsive: true, scales: { x: { title: { display: true, text: xAxis?.label ?? '' }, min: xAxis?.min, max: xAxis?.max }, y: { title: { display: true, text: yAxis?.label ?? '' }, min: yAxis?.min, max: yAxis?.max } } },
      })
    }

    if (type === 'radar') {
      const axes     = (data.axes     as string[]) ?? []
      const datasets = (data.datasets as Array<{ label: string; values: number[]; isClient?: boolean }>) ?? []
      chartRef.current = new Chart(ctx, {
        type: 'radar',
        data: {
          labels: axes,
          datasets: datasets.map(ds => ({
            label: ds.label,
            data: ds.values,
            borderColor:     ds.isClient ? CLIENT_COLOR : OTHER_COLOR,
            backgroundColor: ds.isClient ? 'rgba(29,158,117,0.15)' : 'transparent',
            borderWidth: ds.isClient ? 2 : 1,
          })),
        },
        options: { responsive: true, scales: { r: { beginAtZero: true, max: 10 } } },
      })
    }

    return () => { chartRef.current?.destroy() }
  }, [data])

  return (
    <div style={{ padding: '12px 0' }}>
      {data.title && (
        <div style={{ fontSize: '11px', color: 'var(--ink3)', fontFamily: 'var(--font-d)', letterSpacing: '0.08em', marginBottom: '8px' }}>
          {data.title as string}
          {data.unit && <span style={{ marginLeft: '6px', opacity: 0.6 }}>({data.unit as string})</span>}
          {data.reliability && <span style={{ marginLeft: '8px', opacity: 0.5 }}>{data.reliability as string}</span>}
        </div>
      )}
      <canvas ref={canvasRef} style={{ maxHeight: '260px' }} />
    </div>
  )
}
```

### AG出力表示箇所に組み込む

`src/components/pipeline/OutputPanel.tsx` または各AG出力を表示しているコンポーネントで、
AG の outputJson に `chartData` フィールドがある場合に ChartRenderer を呼び出す：

```typescript
import { ChartRenderer } from '@/components/pipeline/ChartRenderer'

// outputJson をパース後の処理に追加
const parsed = safeParseJson(outputJson)
if (parsed?.chartData) {
  Object.entries(parsed.chartData as Record<string, Record<string, unknown>>)
    .map(([key, chart]) => (
      <ChartRenderer key={key} data={chart} />
    ))
}
```

コミット: `feat: ChartRenderer コンポーネント追加（bar/scatter/radar）`

---

## 動作確認手順

```bash
# Task 1〜7 完了後
cd /Users/a05/Web_Proposal
npm run dev

# ブラウザで確認
# 1. 新規案件作成 → フルパイプライン実行
# 2. サイドバーに AG-01-RESEARCH / AG-01-MERGE / AG-02-POSITION が表示されること
# 3. Phase 0 → Phase 1 → Phase 2 → Phase 3 の順に進むこと
# 4. AG-07C-1/2/3 が並列実行されること（ログで確認）
# 5. AG-07C-4 がその後に実行されること
# 6. AG出力に chartData がある場合にグラフが描画されること
```

---

## Task 8：AG-03-CURRENT のクラスファイルと組み込み

### 8-1. クラスファイルを作成

`src/agents/ag-03-current.ts`：

```typescript
import { BaseAgent } from './base-agent'
import { AgentId, AgentOutput, ProjectContext } from './types'
import { loadPrompt } from '@/lib/prompt-loader'

export class Ag03CurrentAgent extends BaseAgent {
  id: AgentId = 'AG-03-CURRENT'
  name = '現状サイト多角的分析'
  protected modelType = 'quality' as const
  getPrompt(_ctx: ProjectContext): string { return loadPrompt('ag-03-current') }
  parseOutput(raw: string): AgentOutput { return this.fallbackOutput(raw) }
}
```

### 8-2. types.ts に追加

```typescript
| 'AG-03-CURRENT'
```

### 8-3. base-agent.ts に max_tokens を追加

```typescript
'AG-03-CURRENT': 8192,
```

### 8-4. pipeline.ts に case を追加

```typescript
import { Ag03CurrentAgent } from '@/agents/ag-03-current'
// switch に追加
case 'AG-03-CURRENT': agent = new Ag03CurrentAgent(); break
```

入力マッピング（getInputsForAgent）：

```typescript
case 'AG-03-CURRENT': return [
  s('url',      '現状サイトURL',        String((p as any).currentSiteUrl ?? '')),
  s('target',   'ターゲット定義',       JSON.stringify((p as any).targetDefinition ?? (p as any).targeting ?? '').slice(0, 400)),
  s('criteria', '比較軸',              JSON.stringify((p as any).decisionCriteria ?? []).slice(0, 400)),
  s('barriers', '心理的競合',          JSON.stringify((p as any).layer3_psychological ?? []).slice(0, 300)),
]
```

### 8-5. resume/route.ts に組み込む

Phase 1 の AG-03クラスターに AG-03-CURRENT を追加。
**実行条件：inputPattern が B または C の時のみ実行する。**

```typescript
// AG-01の出力から inputPattern を取得（既存の runDataAgent 判定の近くに追加）
const ag01Json = safeParseJson(ag01Result?.results?.[0]?.outputJson)
const runDataAgent    = ag01Json?.inputPattern === 'C'
const runCurrentAgent = ag01Json?.inputPattern === 'B' || ag01Json?.inputPattern === 'C'

// Phase 1: AG-03クラスター並列
const ag03Promises = [
  run('AG-03',              'AG-03 競合特定・ポジション'),
  run('AG-03-HEURISTIC',    'AG-03-HEURISTIC ヒューリスティック評価①'),
  run('AG-03-HEURISTIC2',   'AG-03-HEURISTIC2 ヒューリスティック評価②'),
  run('AG-03-GAP',          'AG-03-GAP コンテンツギャップ'),
]
if (runDataAgent)    ag03Promises.push(run('AG-03-DATA',    'AG-03-DATA GA4・SC分析'))
if (runCurrentAgent) ag03Promises.push(run('AG-03-CURRENT', 'AG-03-CURRENT 現状サイト8軸分析'))
const ag03Results = await Promise.all(ag03Promises)
```

### 8-6. PIPELINE_AGENTS リストに追加（AG-03-DATA の後）

```typescript
{ id: 'AG-03-CURRENT', label: '現状サイト分析' },
```

コミット: `feat: AG-03-CURRENT 現状サイト8軸分析を追加（リニューアル案件のみ実行）`

---

## Task 9：pipeline.ts の JSON クリーニング修正【バグ修正】

### 問題
AG-07C-4 など一部のAGが ` ```json ... ``` ` コードフェンス付きで出力した場合、
`outputJson` にそのまま保存されてUIの表示が失敗する。

### 修正
`src/lib/pipeline.ts` の `rawText` を保存する前に、コードフェンスを除去して
クリーンなJSONだけを `outputJson` に保存するよう修正する。

**この修正はすでに `src/lib/pipeline.ts` に適用済み（`cleanedText` 変数を使用）。**
確認のみ：

```typescript
// 以下の変数と処理が存在することを確認する
let cleanedText = ''
// ...
const fenceMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/)
if (fenceMatch) {
  cleanedText = fenceMatch[1].trim()
} else {
  const jsonStart = rawText.search(/[\[{]/)
  const jsonEnd   = Math.max(rawText.lastIndexOf('}'), rawText.lastIndexOf(']'))
  cleanedText = (jsonStart !== -1 && jsonEnd > jsonStart)
    ? rawText.slice(jsonStart, jsonEnd + 1)
    : rawText.trim()
}
// 保存時
outputJson: cleanedText || rawText
```

もし適用されていない場合は上記を `runAgentStep` 内の `agentResult.create` の直前に追加する。

コミット: `fix: pipeline.ts で outputJson 保存前にコードフェンスを除去`

