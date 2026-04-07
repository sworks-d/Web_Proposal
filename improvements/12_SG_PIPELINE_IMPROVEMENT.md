# 12: 提案書生成システム改善

## 問題

1. **SG-04でJSON出力が途中で切れる** — max_tokens 8192では25枚以上のスライドで不足
2. **ポップアップ依存** — ウィンドウを閉じると処理が止まる
3. **再開機能なし** — エラー時に最初からやり直し
4. **TOPページに完了状態のボタンがない** — AG/SG完了後の確認・DL導線がない
5. **SG再開が最初から始まる** — SG-04で失敗してもSG-01から再開される

---

## 改善内容

### A. TOPページのカードにボタン追加

完了状態の案件カードに「分析確認」「提案書DL」ボタンを追加。

**src/app/page.tsx 修正:**

```tsx
// Project型にSG完了状態を追加
interface Project {
  // ...既存
  sgGeneration?: {
    id: string
    status: string
  } | null
}

// カード内にボタン追加（cardStatus === 'done' の場合）
{cardStatus === 'done' && (
  <div style={{ 
    display: 'flex', 
    gap: '8px', 
    marginTop: '12px',
    borderTop: '1px solid var(--line2)',
    paddingTop: '12px',
  }}>
    <button
      onClick={(e) => {
        e.stopPropagation()
        router.push(`/projects/${p.id}`)
      }}
      style={{
        flex: 1,
        padding: '8px 12px',
        fontSize: '10px',
        fontFamily: 'var(--font-d)',
        fontWeight: 700,
        letterSpacing: '0.1em',
        background: 'var(--bg2)',
        border: '1px solid var(--line2)',
        cursor: 'pointer',
      }}
    >
      分析確認
    </button>
    
    {p.sgGeneration?.status === 'COMPLETED' ? (
      <button
        onClick={(e) => {
          e.stopPropagation()
          window.location.href = `/api/versions/${latestVersion.id}/sg-download`
        }}
        style={{
          flex: 1,
          padding: '8px 12px',
          fontSize: '10px',
          fontFamily: 'var(--font-d)',
          fontWeight: 700,
          letterSpacing: '0.1em',
          background: 'var(--ink)',
          color: 'var(--bg)',
          border: 'none',
          cursor: 'pointer',
        }}
      >
        提案書DL
      </button>
    ) : (
      <button
        onClick={(e) => {
          e.stopPropagation()
          router.push(`/projects/${p.id}/slides`)
        }}
        style={{
          flex: 1,
          padding: '8px 12px',
          fontSize: '10px',
          fontFamily: 'var(--font-d)',
          fontWeight: 700,
          letterSpacing: '0.1em',
          background: 'transparent',
          border: '1px solid var(--line2)',
          cursor: 'pointer',
        }}
      >
        提案書作成
      </button>
    )}
  </div>
)}
```

**API修正（/api/projects）:**

SgGenerationの最新状態も返すようにする。

```typescript
const projects = await prisma.project.findMany({
  include: {
    client: true,
    versions: {
      orderBy: { versionNumber: 'desc' },
      take: 1,
      include: {
        executions: { select: { agentId: true, status: true, isInherited: true } },
        sgGenerations: { orderBy: { startedAt: 'desc' }, take: 1 },
      },
    },
  },
  orderBy: { createdAt: 'desc' },
})

// レスポンス整形でsgGenerationを含める
return projects.map(p => ({
  ...p,
  versions: p.versions.map(v => ({
    ...v,
    sgGeneration: v.sgGenerations[0] ?? null,
  })),
}))
```

### B. SG再開機能の修正（失敗箇所から再開）

**問題**: 現在の実装は毎回新規のSgGenerationを作成し、SG-01から実行している。

**修正**: 既存のERROR状態のSgGenerationを検索し、保存済みの出力を復元して失敗箇所から再開。

**prisma/schema.prisma 修正:**

```prisma
model SgGeneration {
  id           String   @id @default(cuid())
  versionId    String
  version      ProposalVersion @relation(fields: [versionId], references: [id])
  status       String   @default("RUNNING")  // RUNNING | COMPLETED | ERROR
  currentStep  String?  // 現在実行中のSGエージェントID（SG-01〜SG-06）
  params       String   @default("{}")
  
  // 各SGの出力を個別に保存（再開用）
  sg01Output   String?
  sg02Output   String?
  sg03Output   String?
  sg04Output   String?
  sg05Output   String?
  sg06Output   String?
  
  outputJson   String   @default("")  // 最終出力
  errorMessage String?
  startedAt    DateTime @default(now())
  completedAt  DateTime?
}
```

**src/app/api/versions/[id]/sg-pipeline/route.ts 修正:**

```typescript
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: versionId } = await params
  const { params: sgParams, resume } = await req.json() as { params: SgParams; resume?: boolean }

  // 既存のERROR状態のSgGenerationを検索
  let sg = resume 
    ? await prisma.sgGeneration.findFirst({
        where: { versionId, status: 'ERROR' },
        orderBy: { startedAt: 'desc' },
      })
    : null

  // なければ新規作成
  if (!sg) {
    sg = await prisma.sgGeneration.create({
      data: { versionId, status: 'RUNNING', params: JSON.stringify(sgParams) },
    })
  } else {
    // 再開の場合はstatusをRUNNINGに戻す
    await prisma.sgGeneration.update({
      where: { id: sg.id },
      data: { status: 'RUNNING', errorMessage: null },
    })
  }

  // 既存の出力を復元
  const existingOutputs: Partial<Record<SgAgentId, unknown>> = {}
  if (sg.sg01Output) existingOutputs['SG-01'] = JSON.parse(sg.sg01Output)
  if (sg.sg02Output) existingOutputs['SG-02'] = JSON.parse(sg.sg02Output)
  if (sg.sg03Output) existingOutputs['SG-03'] = JSON.parse(sg.sg03Output)
  if (sg.sg04Output) existingOutputs['SG-04'] = JSON.parse(sg.sg04Output)
  if (sg.sg05Output) existingOutputs['SG-05'] = JSON.parse(sg.sg05Output)
  if (sg.sg06Output) existingOutputs['SG-06'] = JSON.parse(sg.sg06Output)

  // runSgPipelineに既存出力を渡す
  const result = await runSgPipeline(
    sg.id,  // generationId
    clientName,
    briefText,
    agOutputs,
    sgParams,
    existingOutputs,  // 再開用
    async (stepId, name, output) => {
      // 各ステップ完了時にDBに保存
      const field = `sg0${stepId.slice(-1)}Output`
      await prisma.sgGeneration.update({
        where: { id: sg.id },
        data: { 
          currentStep: stepId,
          [field]: JSON.stringify(output),
        },
      })
      send({ type: 'step', agentId: stepId, name })
    },
  )
  // ...
}
```

**src/lib/sg-pipeline.ts 修正:**

```typescript
export async function runSgPipeline(
  generationId: string,
  clientName: string,
  briefText: string,
  agOutputs: Record<string, unknown>,
  params: SgParams,
  existingOutputs: Partial<Record<SgAgentId, unknown>>,  // 再開用
  onProgress?: (stepId: SgAgentId, name: string, output: unknown) => Promise<void>,
): Promise<SgPipelineResult> {
  const agents = [
    new Sg01Agent(),
    new Sg02Agent(),
    new Sg03Agent(),
    new Sg04Agent(),
    new Sg05Agent(),
    new Sg06Agent(),
  ]

  // 既存の出力をコピー
  const sgOutputs: Partial<Record<SgAgentId, unknown>> = { ...existingOutputs }

  for (const agent of agents) {
    // 既に出力がある場合はスキップ
    if (sgOutputs[agent.id]) {
      continue
    }

    const input: SgInput = {
      clientName,
      briefText,
      params,
      agOutputs,
      sgOutputs,
    }

    const output = await agent.run(input)
    sgOutputs[agent.id] = output
    
    // コールバックでDB保存
    await onProgress?.(agent.id, agent.name, output)
  }

  return {
    finalOutput: sgOutputs['SG-06'] as SgFinalOutput,
    allOutputs: sgOutputs,
  }
}
```

### C. SG-04の分割実行
    const sg01 = input.sgOutputs['SG-01'] as Sg01Output | undefined
    const chapters = sg01?.chapters ?? []
    
    const allSlides: Slide[] = []
    
    for (const chapter of chapters) {
      // このチャプターのスロットだけを対象に
      const chapterSlots = this.getSlotsForChapter(chapter, input)
      
      const partialInput = { ...input, _chapterFilter: chapter.id }
      const result = await this.runSingleChapter(partialInput, chapterSlots)
      allSlides.push(...result.slides)
    }
    
    return { slides: allSlides }
  }
}
```

### B. 専用ページでの実行

ポップアップではなく、専用ページ `/projects/[id]/slides` で実行する。

**新規ファイル: src/app/projects/[id]/slides/page.tsx**

```
/projects/[id]/slides
├── パラメータ設定セクション
├── 実行ボタン
├── 進捗表示（リアルタイム）
├── 各SGの出力プレビュー
└── ダウンロードボタン
```

- ページを離れても実行は継続（バックエンド側で完結）
- ページに戻ると現在の状態を表示
- 完了後にpptxダウンロード可能

### C. 各ステップの結果をDBに保存

**prisma/schema.prisma 修正:**

```prisma
model SgGeneration {
  id           String   @id @default(cuid())
  versionId    String
  version      ProposalVersion @relation(fields: [versionId], references: [id])
  status       String   @default("RUNNING")  // RUNNING | COMPLETED | ERROR
  currentStep  String?  // 現在実行中のSGエージェントID
  params       String   @default("{}")        // JSON: SgParams
  
  // 各SGの出力を個別に保存
  sg01Output   String?  // JSON
  sg02Output   String?  // JSON
  sg03Output   String?  // JSON
  sg04Output   String?  // JSON
  sg05Output   String?  // JSON
  sg06Output   String?  // JSON
  
  errorMessage String?
  startedAt    DateTime @default(now())
  completedAt  DateTime?
}
```

### D. 再開機能

**src/lib/sg-pipeline.ts 修正:**

```typescript
export async function runSgPipeline(
  generationId: string,  // DB ID
  resumeFrom?: SgAgentId,  // 再開位置
): Promise<SgPipelineResult> {
  const generation = await prisma.sgGeneration.findUnique({ where: { id: generationId } })
  
  // 既存の出力を復元
  const sgOutputs: Partial<Record<SgAgentId, unknown>> = {}
  if (generation.sg01Output) sgOutputs['SG-01'] = JSON.parse(generation.sg01Output)
  if (generation.sg02Output) sgOutputs['SG-02'] = JSON.parse(generation.sg02Output)
  // ...
  
  const agents = [
    new Sg01Agent(),
    new Sg02Agent(),
    new Sg03Agent(),
    new Sg04Agent(),
    new Sg05Agent(),
    new Sg06Agent(),
  ]
  
  // 再開位置を特定
  const startIndex = resumeFrom 
    ? agents.findIndex(a => a.id === resumeFrom)
    : agents.findIndex(a => !sgOutputs[a.id])
  
  for (let i = startIndex; i < agents.length; i++) {
    const agent = agents[i]
    
    // 現在のステップを更新
    await prisma.sgGeneration.update({
      where: { id: generationId },
      data: { currentStep: agent.id },
    })
    
    try {
      const output = await agent.run(input)
      sgOutputs[agent.id] = output
      
      // 出力をDBに保存（即時）
      await prisma.sgGeneration.update({
        where: { id: generationId },
        data: { [`sg0${i+1}Output`]: JSON.stringify(output) },
      })
    } catch (err) {
      await prisma.sgGeneration.update({
        where: { id: generationId },
        data: { status: 'ERROR', errorMessage: String(err) },
      })
      throw err
    }
  }
  
  await prisma.sgGeneration.update({
    where: { id: generationId },
    data: { status: 'COMPLETED', completedAt: new Date() },
  })
  
  return { finalOutput: sgOutputs['SG-06'] as SgFinalOutput, allOutputs: sgOutputs }
}
```

### E. APIルート修正

**src/app/api/versions/[id]/sg-pipeline/route.ts:**

```typescript
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const versionId = params.id
  const { params: sgParams, resumeFrom } = await req.json()
  
  // 既存のgenerationを検索 or 新規作成
  let generation = await prisma.sgGeneration.findFirst({
    where: { versionId, status: { not: 'COMPLETED' } },
  })
  
  if (!generation) {
    generation = await prisma.sgGeneration.create({
      data: { versionId, params: JSON.stringify(sgParams) },
    })
  }
  
  // バックグラウンドで実行（レスポンスは即座に返す）
  runSgPipeline(generation.id, resumeFrom).catch(console.error)
  
  return Response.json({ generationId: generation.id })
}
```

**ステータス取得API:**

```typescript
// GET /api/sg-generation/[id]/status
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const generation = await prisma.sgGeneration.findUnique({
    where: { id: params.id },
  })
  
  return Response.json({
    status: generation.status,
    currentStep: generation.currentStep,
    hasOutput: {
      'SG-01': !!generation.sg01Output,
      'SG-02': !!generation.sg02Output,
      // ...
    },
    errorMessage: generation.errorMessage,
  })
}
```

### F. UIページ

**src/app/projects/[id]/slides/page.tsx:**

```tsx
'use client'

export default function SlidesPage({ params }: { params: { id: string } }) {
  const versionId = params.id
  const [generation, setGeneration] = useState<SgGeneration | null>(null)
  const [status, setStatus] = useState<'idle' | 'running' | 'error' | 'completed'>('idle')
  
  // ポーリングでステータス取得
  useEffect(() => {
    if (!generation) return
    const interval = setInterval(async () => {
      const res = await fetch(`/api/sg-generation/${generation.id}/status`)
      const data = await res.json()
      setStatus(data.status)
      if (data.status === 'COMPLETED' || data.status === 'ERROR') {
        clearInterval(interval)
      }
    }, 2000)
    return () => clearInterval(interval)
  }, [generation])
  
  const handleStart = async () => {
    const res = await fetch(`/api/versions/${versionId}/sg-pipeline`, {
      method: 'POST',
      body: JSON.stringify({ params }),
    })
    const { generationId } = await res.json()
    setGeneration({ id: generationId })
    setStatus('running')
  }
  
  const handleResume = async () => {
    await fetch(`/api/versions/${versionId}/sg-pipeline`, {
      method: 'POST',
      body: JSON.stringify({ resumeFrom: generation.currentStep }),
    })
    setStatus('running')
  }
  
  return (
    <div>
      {/* パラメータ設定 */}
      {/* 進捗表示 */}
      {/* エラー時: 再開ボタン */}
      {/* 完了時: ダウンロードボタン */}
    </div>
  )
}
```

---

## 実装順序

1. prisma スキーマ修正（SgGenerationに sg01Output〜sg06Output, currentStep 追加）+ db push
2. sg-base-agent.ts JSONパース改善（閉じカッコ補完）
3. SG-04 分割実行対応（チャプターごとに分割）
4. sg-pipeline.ts 再開機能対応（既存出力をスキップ）
5. API修正（sg-pipeline: 既存ERROR検索、各ステップ保存）
6. /api/projects 修正（sgGenerationの状態を返す）
7. TOPページ（page.tsx）にボタン追加
8. /projects/[id]/slides ページ作成
9. 既存のポップアップを削除 or 新ページへのリンクに変更

---

## 補足: JSONパース改善

SG系でもJSONパース失敗時のリカバリを追加:

**src/agents/sg-base-agent.ts:**

```typescript
protected parseOutput(raw: string): unknown {
  // コードフェンス除去
  let cleaned = raw
    .replace(/^```json\s*/m, '')
    .replace(/^```\s*/m, '')
    .replace(/\s*```$/m, '')
    .trim()
  
  // JSON開始位置を探す
  const jsonStart = cleaned.search(/[\[{]/)
  if (jsonStart > 0) {
    cleaned = cleaned.slice(jsonStart)
  }
  
  // 途中で切れている場合の補完
  try {
    return JSON.parse(cleaned)
  } catch {
    // 閉じカッコ補完を試行
    const openBraces = (cleaned.match(/{/g) || []).length
    const closeBraces = (cleaned.match(/}/g) || []).length
    const openBrackets = (cleaned.match(/\[/g) || []).length
    const closeBrackets = (cleaned.match(/]/g) || []).length
    
    let fixed = cleaned
    for (let i = 0; i < openBrackets - closeBrackets; i++) fixed += ']'
    for (let i = 0; i < openBraces - closeBraces; i++) fixed += '}'
    
    try {
      return JSON.parse(fixed)
    } catch {
      throw new Error(`JSON parse failed. Raw: ${raw.slice(0, 500)}`)
    }
  }
}
```
