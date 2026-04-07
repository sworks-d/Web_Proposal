# 12: 提案書生成システム改善

## 問題

1. **SG-04でJSON出力が途中で切れる** — max_tokens 8192では25枚以上のスライドで不足
2. **ポップアップ依存** — ウィンドウを閉じると処理が止まる
3. **再開機能なし** — エラー時に最初からやり直し

---

## 改善内容

### A. SG-04の分割実行

25枚のスライド全てを1回で生成するのは無理がある。チャプターごとに分割実行する。

**src/agents/sg-04.ts を修正:**

```typescript
export class Sg04Agent extends SgBaseAgent {
  id: SgAgentId = 'SG-04'
  name = '本文生成'
  protected modelType = 'quality' as const
  protected maxTokens = 4096  // 1チャプター分に縮小

  // チャプターごとに分割実行
  async run(input: SgInput): Promise<Sg04Output> {
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

1. prisma スキーマ修正（SgGeneration拡張）+ migrate
2. SG-04 分割実行対応
3. sg-pipeline.ts 再開機能対応
4. API修正（sg-pipeline, sg-generation/[id]/status）
5. /projects/[id]/slides ページ作成
6. 既存のポップアップを削除 or 新ページへのリンクに変更

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
