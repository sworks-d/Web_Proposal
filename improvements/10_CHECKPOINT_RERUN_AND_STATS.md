# 10: チェックポイント差し戻し機能 & 実行時間表示

## 概要

1. **差し戻し機能**: チェックポイントのサマリー項目から、特定のセクションに対して具体的な修正指示を出し、該当AGだけ再実行できる
2. **実行時間表示**: 完了後に総実行時間と各AGの内訳を表示

---

## 1. 差し戻し機能

### ユースケース

```
┌─────────────────────────────────────────────────────────┐
│ ✅ 取れた情報                                          │
├─────────────────────────────────────────────────────────┤
│ HIGH │ ターゲット定義                                  │
│      │ 30代後半〜40代前半の転職検討層...              │
│      │ AG-02                        [修正指示 ✏️]     │
│      │ ┌──────────────────────────────────────────┐   │
│      │ │ 35-39歳・初転職に絞り込んで再分析して   │   │
│      │ └──────────────────────────────────────────┘   │
│      │                    [キャンセル] [再実行 →]     │
└─────────────────────────────────────────────────────────┘
```

### 実装内容

#### A. 型定義追加

**src/lib/checkpoint-summary.ts**

```typescript
export interface GotInfoItem {
  confidence: 'high' | 'medium' | 'low'
  title: string
  summary: string
  source: string  // AgentId
  sectionId?: string  // セクション特定用
}

export interface RerunRequest {
  agentId: string
  sectionId?: string
  instruction: string
}
```

**src/agents/types.ts**

```typescript
export interface AgentInput {
  projectContext: ProjectContext
  previousOutputs: AgentOutput[]
  userInstruction?: string
  rerunInstruction?: string  // ← 追加
}
```

#### B. base-agent.ts 修正

buildUserMessage関数で差し戻し指示を最優先で追加:

```typescript
protected buildUserMessage(input: AgentInput): string {
  const ctx = input.projectContext
  const lines: string[] = []
  
  // 差し戻し指示があれば最優先で追加
  if (input.rerunInstruction) {
    lines.push('═'.repeat(50))
    lines.push('⚠️ 再実行指示（最優先で対応してください）')
    lines.push('═'.repeat(50))
    lines.push(input.rerunInstruction)
    lines.push('═'.repeat(50))
    lines.push('')
  }
  
  lines.push('## 案件情報')
  // ...既存の内容を続ける
  
  return lines.join('\n')
}
```

#### C. APIルート追加

**src/app/api/executions/[id]/rerun-section/route.ts**

```typescript
import { prisma } from '@/lib/prisma'
import { runAgentStep } from '@/lib/pipeline'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const versionId = params.id
  const { agentId, sectionId, instruction } = await req.json()
  
  if (!agentId || !instruction) {
    return Response.json({ error: 'agentId と instruction が必要です' }, { status: 400 })
  }
  
  // 1. 対象AGの前までの出力を取得
  const executions = await prisma.execution.findMany({
    where: { versionId, status: 'COMPLETED' },
    include: { results: { take: 1, orderBy: { id: 'desc' } } },
    orderBy: { id: 'asc' },
  })
  
  // 2. 対象AGより前の出力をpreviousOutputsとして構築
  const targetIndex = executions.findIndex(e => e.agentId === agentId)
  const previousOutputs = executions
    .slice(0, targetIndex)
    .map(e => {
      const raw = e.results[0]?.outputJson
      return raw ? JSON.parse(raw) : null
    })
    .filter(Boolean)
  
  // 3. projectContextを取得
  const version = await prisma.version.findUnique({
    where: { id: versionId },
    include: { project: true },
  })
  
  const projectContext = {
    clientName: version!.project.clientName,
    briefText: version!.project.briefText,
    industryType: version!.project.industryType,
    caseType: version!.project.caseType,
    siteUrl: version!.project.siteUrl,
  }
  
  // 4. 差し戻し指示付きで再実行
  const input = {
    projectContext,
    previousOutputs,
    rerunInstruction: sectionId 
      ? `【差し戻し指示】セクション「${sectionId}」について:\n${instruction}`
      : `【差し戻し指示】\n${instruction}`,
  }
  
  const config = JSON.parse(version!.pipelineConfig ?? '{}')
  
  try {
    const result = await runAgentStep(versionId, agentId, input, config)
    return Response.json({ success: true, result })
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 })
  }
}
```

#### D. CheckpointInlineSection修正

**src/components/checkpoint/CheckpointInlineSection.tsx**

propsに追加:
```typescript
interface CheckpointInlineSectionProps {
  // ...既存
  onRerunSection: (agentId: string, sectionId: string | undefined, instruction: string) => Promise<void>
}
```

コンポーネント内にstate追加:
```typescript
const [rerunTarget, setRerunTarget] = useState<{ agentId: string; sectionId?: string; title: string } | null>(null)
const [rerunInstruction, setRerunInstruction] = useState('')
const [isRerunning, setIsRerunning] = useState(false)

const handleRerun = async () => {
  if (!rerunTarget || !rerunInstruction.trim()) return
  setIsRerunning(true)
  try {
    await onRerunSection(rerunTarget.agentId, rerunTarget.sectionId, rerunInstruction)
    setRerunTarget(null)
    setRerunInstruction('')
  } finally {
    setIsRerunning(false)
  }
}
```

gotInfo.mapの各項目に「修正指示 ✏️」ボタンを追加。
クリックで入力UIを展開し、指示入力後に「再実行 →」で該当AGを再実行。

#### E. 親コンポーネントでハンドラ実装

**src/app/projects/[id]/page.tsx**

```typescript
const handleRerunSection = async (agentId: string, sectionId: string | undefined, instruction: string) => {
  if (!currentVersionId) return
  
  addStatus(`${agentId} を再実行中...`)
  
  const res = await fetch(`/api/executions/${currentVersionId}/rerun-section`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agentId, sectionId, instruction }),
  })
  
  if (!res.ok) {
    addStatus(`再実行エラー: ${await res.text()}`)
    return
  }
  
  const { result } = await res.json()
  addStatus(`${agentId} 再実行完了`)
  
  // outputsを更新
  setOutputs(prev => prev.map(o => o.agentId === agentId ? result : o))
}
```

CheckpointInlineSectionに渡す:
```tsx
<CheckpointInlineSection
  // ...既存props
  onRerunSection={handleRerunSection}
/>
```

#### F. checkpoint-summary.tsでsectionIdを追加

```typescript
for (const section of output.sections ?? []) {
  gotInfo.push({
    confidence: conf as 'high' | 'medium' | 'low',
    title: section.title,
    summary: section.content?.slice(0, 120) ?? '',
    source: output.agentId,
    sectionId: section.id,  // ← 追加
  })
}
```

---

## 2. 実行時間表示

### 表示イメージ

```
┌────────────────────────────────────────┐
│ ⏱️ 総実行時間  3分42秒      ▼ 詳細   │
├────────────────────────────────────────┤
│ AG-01           12秒                   │
│ AG-01-RESEARCH  45秒                   │
│ AG-02           38秒                   │
│ AG-02-JOURNEY   22秒                   │
│ ...                                    │
└────────────────────────────────────────┘
```

### 実装内容

#### A. DBスキーマ追加

**prisma/schema.prisma**

AgentResultにdurationMsを追加:

```prisma
model AgentResult {
  // 既存フィールド...
  completedAt  DateTime?
  createdAt    DateTime  @default(now())
  durationMs   Int?      // ← 追加：実行時間（ミリ秒）
}
```

マイグレーション:
```bash
npx prisma migrate dev --name add_duration_ms
```

#### B. pipeline.tsで実行時間を記録

**src/lib/pipeline.ts**

runAgentStep関数:

```typescript
export async function runAgentStep(...) {
  const startTime = Date.now()
  
  // ...既存の処理
  
  try {
    // ...agent.execute()
    
    const durationMs = Date.now() - startTime
    
    await prisma.agentResult.create({
      data: {
        executionId: execution.id,
        agentId,
        status: 'COMPLETED',
        outputJson: cleanedText,
        durationMs,  // ← 追加
        completedAt: new Date(),
      },
    })
  } catch (err) {
    const durationMs = Date.now() - startTime
    
    await prisma.agentResult.create({
      data: {
        // ...
        durationMs,  // ← 追加
      },
    })
  }
}
```

#### C. 統計APIルート追加

**src/app/api/executions/[id]/stats/route.ts**

```typescript
import { prisma } from '@/lib/prisma'

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const versionId = params.id
  
  const executions = await prisma.execution.findMany({
    where: { versionId },
    include: { 
      results: { 
        select: { agentId: true, durationMs: true, status: true, createdAt: true, completedAt: true }
      }
    },
    orderBy: { id: 'asc' },
  })
  
  const agentStats = executions.flatMap(e => 
    e.results.map(r => ({
      agentId: r.agentId,
      durationMs: r.durationMs ?? (r.completedAt && r.createdAt 
        ? new Date(r.completedAt).getTime() - new Date(r.createdAt).getTime()
        : null),
      status: r.status,
    }))
  )
  
  const totalDurationMs = agentStats
    .filter(s => s.durationMs !== null)
    .reduce((sum, s) => sum + (s.durationMs ?? 0), 0)
  
  return Response.json({
    totalDurationMs,
    totalDurationFormatted: formatDuration(totalDurationMs),
    agentStats: agentStats.map(s => ({
      ...s,
      durationFormatted: s.durationMs ? formatDuration(s.durationMs) : '-',
    })),
  })
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  
  if (minutes > 0) {
    return `${minutes}分${remainingSeconds}秒`
  }
  return `${seconds}秒`
}
```

#### D. 表示コンポーネント追加

**src/components/pipeline/ExecutionStats.tsx**

```typescript
'use client'
import { useEffect, useState } from 'react'

interface AgentStat {
  agentId: string
  durationMs: number | null
  durationFormatted: string
  status: string
}

interface ExecutionStatsProps {
  versionId: string
}

export function ExecutionStats({ versionId }: ExecutionStatsProps) {
  const [stats, setStats] = useState<{
    totalDurationFormatted: string
    agentStats: AgentStat[]
  } | null>(null)
  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    fetch(`/api/executions/${versionId}/stats`)
      .then(r => r.json())
      .then(setStats)
  }, [versionId])

  if (!stats) return null

  return (
    <div style={{ 
      padding: '12px 16px', 
      background: 'var(--bg2)', 
      borderRadius: '4px',
      marginTop: '16px',
    }}>
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          cursor: 'pointer',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '14px' }}>⏱️</span>
          <span style={{ 
            fontFamily: 'var(--font-d)', 
            fontSize: '11px', 
            fontWeight: 700,
            color: 'var(--ink3)',
          }}>
            総実行時間
          </span>
          <span style={{ 
            fontFamily: 'var(--font-d)', 
            fontSize: '14px', 
            fontWeight: 700,
            color: 'var(--ink)',
          }}>
            {stats.totalDurationFormatted}
          </span>
        </div>
        <span style={{ fontSize: '10px', color: 'var(--ink4)' }}>
          {isExpanded ? '▲ 閉じる' : '▼ 詳細'}
        </span>
      </div>

      {isExpanded && (
        <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {stats.agentStats.map((stat, i) => (
            <div 
              key={i} 
              style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                padding: '6px 8px',
                background: stat.status === 'COMPLETED' ? 'transparent' : 'rgba(255,0,0,0.05)',
                borderRadius: '2px',
              }}
            >
              <span style={{ 
                fontFamily: 'var(--font-d)', 
                fontSize: '10px', 
                color: 'var(--ink3)',
              }}>
                {stat.agentId}
              </span>
              <span style={{ 
                fontFamily: 'var(--font-d)', 
                fontSize: '10px', 
                fontWeight: 600,
                color: stat.status === 'COMPLETED' ? 'var(--ink)' : 'var(--red)',
              }}>
                {stat.durationFormatted}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

#### E. 親コンポーネントで表示

**src/app/projects/[id]/page.tsx**

```tsx
import { ExecutionStats } from '@/components/pipeline/ExecutionStats'

// 完了状態の場合に表示
{appStatus === 'completed' && currentVersionId && (
  <ExecutionStats versionId={currentVersionId} />
)}
```

---

## 実装順序

1. prisma スキーマに durationMs 追加 + migrate
2. types.ts に rerunInstruction 追加
3. base-agent.ts の buildUserMessage 修正
4. checkpoint-summary.ts に sectionId 追加
5. API: /api/executions/[id]/rerun-section 作成
6. API: /api/executions/[id]/stats 作成
7. pipeline.ts で durationMs を記録
8. CheckpointInlineSection に差し戻しUI追加
9. ExecutionStats コンポーネント作成
10. projects/[id]/page.tsx で統合
