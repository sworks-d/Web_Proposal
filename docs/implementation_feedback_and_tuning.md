# フィードバック・プロンプトチューニング 実装指示書

**前提:** バージョン管理（implementation_version.md）実装済み
**対象機能:**
1. 完了画面フィードバックアンケート（AG-07完了後・ダウンロード前）
2. フィードバックからのプロンプト自動ブラッシュアップ
3. .claude/agents/ と .claude/skills/ の実装への接続

---

## 1. DBスキーマ追加

`prisma/schema.prisma` に以下を追加する：

```prisma
model ProposalFeedback {
  id              String          @id @default(cuid())
  versionId       String
  version         ProposalVersion @relation(fields: [versionId], references: [id])

  overallScore    Int             // Q1: 1〜5
  weakestAgent    String          // Q2: "ag-02-market"|"ag-03-competitor"|"ag-04-insight"|"ag-06-draft"|"ag-07-story"|"none"
  competitorScore Int             // Q3: 1〜3
  targetScore     Int             // Q4: 1〜3
  storyUsability  String          // Q5: "that_usable"|"needs_edit"|"rebuild"
  bestChapter     String          // Q6: chapterId（"ch-01"〜"ch-06"）
  freeComment     String?         // Q7: 100字以内・任意

  // 自動処理（保存時に付与）
  autoFlagAgents  String          @default("[]") // 改善候補AGのJSON配列
  processed       Boolean         @default(false)

  submittedAt     DateTime        @default(now())
}

model PromptVersion {
  id          String   @id @default(cuid())
  agentId     String   // "ag-03-competitor" 等
  version     Int      // 1, 2, 3... / -1 = pending（フィードバック由来の未適用改善候補）
  content     String   // プロンプト全文
  changeNote  String?  // 何を変えたか
  cdFeedback  String?  // CDのフィードバック原文
  appliedAt   DateTime @default(now())
}
```

```bash
npx prisma generate
npx prisma db push
```

---

## 2. API Routes

### 2.1 フィードバック保存・取得

```typescript
// src/app/api/feedback/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// POST: フィードバック保存 + 自動フラグ処理
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { versionId, overallScore, weakestAgent, competitorScore,
          targetScore, storyUsability, bestChapter, freeComment } = body

  // 評価が低いAGを自動フラグ
  const autoFlagAgents: string[] = []
  if (weakestAgent !== 'none') autoFlagAgents.push(weakestAgent)
  if (competitorScore <= 2 && !autoFlagAgents.includes('ag-03-competitor'))
    autoFlagAgents.push('ag-03-competitor')
  if (targetScore <= 2 && !autoFlagAgents.includes('ag-04-insight'))
    autoFlagAgents.push('ag-04-insight')
  if (storyUsability === 'rebuild' && !autoFlagAgents.includes('ag-07-story'))
    autoFlagAgents.push('ag-07-story')

  const feedback = await prisma.proposalFeedback.create({
    data: {
      versionId,
      overallScore,
      weakestAgent,
      competitorScore,
      targetScore,
      storyUsability,
      bestChapter,
      freeComment: freeComment || null,
      autoFlagAgents: JSON.stringify([...new Set(autoFlagAgents)]),
    },
  })

  // freeCommentがある場合、最もフラグされたAGの改善候補として記録
  if (freeComment && autoFlagAgents.length > 0) {
    const latestVersion = await prisma.promptVersion.findFirst({
      where: { agentId: autoFlagAgents[0] },
      orderBy: { version: 'desc' },
    })
    await prisma.promptVersion.create({
      data: {
        agentId: autoFlagAgents[0],
        version: -1, // pending
        content: '',
        changeNote: `フィードバック由来の改善候補`,
        cdFeedback: freeComment,
      },
    })
  }

  return NextResponse.json({ id: feedback.id, autoFlagAgents })
}

// GET: 集計データ（Settings画面用）
export async function GET() {
  const feedbacks = await prisma.proposalFeedback.findMany({
    orderBy: { submittedAt: 'desc' },
    take: 50,
  })

  const avg = (arr: number[]) =>
    arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0

  const countBy = (arr: any[], key: string) =>
    arr.reduce((acc, item) => {
      acc[item[key]] = (acc[item[key]] || 0) + 1
      return acc
    }, {} as Record<string, number>)

  return NextResponse.json({
    totalFeedbacks: feedbacks.length,
    avgOverallScore: avg(feedbacks.map(f => f.overallScore)).toFixed(1),
    avgCompetitorScore: avg(feedbacks.map(f => f.competitorScore)).toFixed(1),
    avgTargetScore: avg(feedbacks.map(f => f.targetScore)).toFixed(1),
    weakestAgentDistribution: countBy(feedbacks, 'weakestAgent'),
    storyUsabilityDistribution: countBy(feedbacks, 'storyUsability'),
    recentFreeComments: feedbacks
      .filter(f => f.freeComment)
      .slice(0, 10)
      .map(f => ({
        comment: f.freeComment,
        agentFlags: JSON.parse(f.autoFlagAgents),
        date: f.submittedAt,
      })),
  })
}
```

### 2.2 プロンプト改善API

```typescript
// src/app/api/agents/[agentId]/improve/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import path from 'path'
import Anthropic from '@anthropic-ai/sdk'

export async function POST(
  req: NextRequest,
  { params }: { params: { agentId: string } }
) {
  const { feedback, currentOutput } = await req.json()
  const agentId = params.agentId

  // プロンプトファイルを読み込む
  const promptPath = path.join(process.cwd(), 'prompts', agentId, 'default.md')
  const currentPrompt = readFileSync(promptPath, 'utf-8')

  const client = new Anthropic()
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4000,
    messages: [{
      role: 'user',
      content: `あなたはプロンプトエンジニアです。
以下のエージェントプロンプトを、CDのフィードバックに基づいて改善してください。

## 現在のプロンプト
${currentPrompt}

## CDのフィードバック
${feedback}

## 実際の出力（改善が必要と判断された出力・先頭2000字）
${JSON.stringify(currentOutput).slice(0, 2000)}

## 指示
1. フィードバックの本質的な問題を特定する
2. プロンプトのどこを・どう変えるべきかを説明する
3. 改善後のプロンプト全文を出力する

## 出力形式（JSONのみ・コードフェンス不要）
{"diagnosis":"何が問題だったか","changes":["変更点1","変更点2"],"improvedPrompt":"改善後のプロンプト全文"}`
    }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  const result = JSON.parse(text)
  return NextResponse.json(result)
}
```

### 2.3 プロンプト適用API

```typescript
// src/app/api/agents/[agentId]/apply/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { writeFileSync, readFileSync, copyFileSync } from 'fs'
import { execSync } from 'child_process'
import path from 'path'
import { prisma } from '@/lib/prisma'

export async function POST(
  req: NextRequest,
  { params }: { params: { agentId: string } }
) {
  const { improvedPrompt, diagnosis, cdFeedback } = await req.json()
  const agentId = params.agentId

  const promptPath = path.join(process.cwd(), 'prompts', agentId, 'default.md')
  const backupPath = promptPath.replace(
    'default.md',
    `default.backup.${Date.now()}.md`
  )

  // バックアップ作成
  copyFileSync(promptPath, backupPath)

  // 書き込み
  writeFileSync(promptPath, improvedPrompt, 'utf-8')

  // DBに記録
  const latest = await prisma.promptVersion.findFirst({
    where: { agentId, version: { gt: 0 } },
    orderBy: { version: 'desc' },
  })
  const nextVersion = (latest?.version ?? 0) + 1

  await prisma.promptVersion.create({
    data: {
      agentId,
      version: nextVersion,
      content: improvedPrompt,
      changeNote: diagnosis,
      cdFeedback: cdFeedback ?? null,
    },
  })

  // Git push（失敗してもローカルは保存済み）
  try {
    execSync(
      `cd ${process.cwd()} && git add prompts/${agentId}/default.md && git commit -m "AG改善: ${agentId}" && git push origin main`,
      { timeout: 30000 }
    )
    return NextResponse.json({ success: true, message: 'GitHubにpushしました', version: nextVersion })
  } catch {
    return NextResponse.json({ success: true, message: 'ローカルに保存しました（git push を手動で実行してください）', version: nextVersion })
  }
}
```

---

## 3. フィードバックUIコンポーネント

### 3.1 FeedbackModal コンポーネント

```typescript
// src/components/feedback/FeedbackModal.tsx
// 承認済みデザインHTMLは docs/implementation_ui.md の Section 11 を参照

'use client'
import { useState } from 'react'

interface FeedbackModalProps {
  versionId: string
  chapters: { id: string; title: string }[]
  onComplete: () => void  // 送信後にダウンロード開始
  onSkip: () => void      // スキップしてダウンロード
}

export function FeedbackModal({
  versionId, chapters, onComplete, onSkip
}: FeedbackModalProps) {
  const [step, setStep] = useState(1)
  const [answers, setAnswers] = useState<Record<string, any>>({})
  const TOTAL = 7

  const setAnswer = (key: string, value: any) => {
    setAnswers(prev => ({ ...prev, [key]: value }))
  }

  const canProceed = () => {
    // Q7（自由記述）は任意なので常にOK
    if (step === 7) return true
    const required: Record<number, string> = {
      1: 'overallScore', 2: 'weakestAgent', 3: 'competitorScore',
      4: 'targetScore', 5: 'storyUsability', 6: 'bestChapter',
    }
    return answers[required[step]] !== undefined
  }

  const handleSubmit = async () => {
    await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ versionId, ...answers }),
    })
    onComplete()
  }

  // デザインは docs/implementation_ui.md Section 11 の承認済みHTMLに従う
  // 7問のステップ構成:
  // Step 1: 星5段階評価（overallScore）
  // Step 2: 最も薄いAG選択（weakestAgent）
  // Step 3: 競合分析評価 3点（competitorScore）
  // Step 4: ターゲット精度 3点（targetScore）
  // Step 5: ストーリー使用感 3択（storyUsability）
  // Step 6: 最良の章選択（bestChapter）- chaptersプロップを使用
  // Step 7: 自由記述100字（freeComment・任意）

  return (
    // 承認済みデザインHTMLをReactに移植する
    // オーバーレイ背景: rgba(252,251,239,0.92) + backdrop-filter:blur(6px)
    // プログレスバー: height:3px、赤で現在ステップを表示
    // スキップボタン: 常に表示
    <div>
      {/* Section 11 の承認済みHTMLを参照して実装 */}
    </div>
  )
}
```

### 3.2 完了画面へのFeedbackModal統合

```typescript
// src/app/projects/[id]/page.tsx の完了状態部分を修正

// 既存のダウンロードボタンの前にFeedbackModalを挟む

const [showFeedback, setShowFeedback] = useState(false)
const [feedbackDone, setFeedbackDone] = useState(false)

const handleDownloadClick = () => {
  if (!feedbackDone) {
    setShowFeedback(true)  // フィードバックモーダルを開く
  } else {
    startDownload()        // フィードバック済みなら直接ダウンロード
  }
}

const handleFeedbackComplete = () => {
  setShowFeedback(false)
  setFeedbackDone(true)
  startDownload()
}

// 完了画面のダウンロードボタン
<button onClick={handleDownloadClick}>
  ↓ Markdownをダウンロード
</button>

{showFeedback && (
  <FeedbackModal
    versionId={version.id}
    chapters={version.storyLine ?? []}
    onComplete={handleFeedbackComplete}
    onSkip={() => { setShowFeedback(false); setFeedbackDone(true); startDownload() }}
  />
)}
```

---

## 4. プロンプト改善UIコンポーネント

### 4.1 AgentFeedback（AG出力の下に配置）

```typescript
// src/components/agent/AgentFeedback.tsx

'use client'
import { useState } from 'react'

interface AgentFeedbackProps {
  agentId: string
  agentName: string
  currentOutput: string  // outputJson
}

export function AgentFeedback({ agentId, agentName, currentOutput }: AgentFeedbackProps) {
  const [category, setCategory] = useState<string>('')
  const [freeText, setFreeText] = useState('')
  const [loading, setLoading] = useState(false)
  const [improvement, setImprovement] = useState<{
    diagnosis: string
    changes: string[]
    improvedPrompt: string
  } | null>(null)

  const handleImprove = async () => {
    setLoading(true)
    const res = await fetch(`/api/agents/${agentId}/improve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        feedback: `${category}: ${freeText}`,
        currentOutput: JSON.parse(currentOutput),
      }),
    })
    setImprovement(await res.json())
    setLoading(false)
  }

  // デザイン: デザイントークンに従う（FCFBEF背景・Unbounded・赤アクセント）
  // カテゴリボタン: 「薄い・物足りない」「視点が違う」「形式を変えたい」「その他」
  // freeText: 自由記述エリア
  // 「このAGのプロンプトを改善する →」ボタン

  if (improvement) {
    return <PromptImproveModal
      agentId={agentId}
      agentName={agentName}
      improvement={improvement}
      cdFeedback={`${category}: ${freeText}`}
      onClose={() => setImprovement(null)}
    />
  }

  return (
    <div style={{ borderTop: '1px solid rgba(28,28,23,0.1)', padding: '20px 40px' }}>
      {/* フィードバックUI - Section 11 のデザイントーンに合わせる */}
    </div>
  )
}
```

### 4.2 PromptImproveModal（Before/After差分確認）

```typescript
// src/components/agent/PromptImproveModal.tsx

'use client'
import { useState } from 'react'

interface PromptImproveModalProps {
  agentId: string
  agentName: string
  improvement: {
    diagnosis: string
    changes: string[]
    improvedPrompt: string
  }
  cdFeedback: string
  onClose: () => void
}

export function PromptImproveModal({
  agentId, agentName, improvement, cdFeedback, onClose
}: PromptImproveModalProps) {
  const [applying, setApplying] = useState(false)
  const [result, setResult] = useState<string>('')

  const handleApply = async () => {
    setApplying(true)
    const res = await fetch(`/api/agents/${agentId}/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        improvedPrompt: improvement.improvedPrompt,
        diagnosis: improvement.diagnosis,
        cdFeedback,
      }),
    })
    const data = await res.json()
    setResult(data.message)
    setApplying(false)
  }

  // 表示内容:
  // 1. diagnosis（何が問題だったか）
  // 2. changes（変更点リスト）
  // 3. Before/After diff表示（変更前: 現在のプロンプト / 変更後: improvedPrompt）
  // 4. 「この改善を適用する →」ボタン + キャンセル
  // 5. 適用後: 「GitHubにpushしました」または「ローカルに保存しました」

  return (
    <div>
      {/* オーバーレイ - Section 11 のデザイントーンに合わせる */}
    </div>
  )
}
```

---

## 5. Settings画面（フィードバック集計の表示）

```typescript
// src/app/settings/page.tsx に追加

// フィードバック集計セクション
async function FeedbackSummary() {
  const res = await fetch('/api/feedback')
  const data = await res.json()

  return (
    <section>
      <h2>AG改善フィードバック集計</h2>
      <p>総フィードバック数: {data.totalFeedbacks}</p>
      <p>全体満足度: {data.avgOverallScore} / 5</p>
      <p>競合分析評価: {data.avgCompetitorScore} / 3</p>
      <p>ターゲット精度: {data.avgTargetScore} / 3</p>

      <h3>最もフィードバックが多いAG</h3>
      {/* weakestAgentDistribution を棒グラフまたはリストで表示 */}

      <h3>最近のコメント</h3>
      {data.recentFreeComments.map((c: any, i: number) => (
        <div key={i}>
          <p>{c.comment}</p>
          <p>対象AG: {c.agentFlags.join(', ')}</p>
        </div>
      ))}

      <h3>pending改善候補</h3>
      {/* PromptVersion.version=-1 のものを一覧表示 */}
      {/* 「このフィードバックを元に改善案を生成する →」ボタン */}
    </section>
  )
}
```

---

## 6. .claude/agents/ と .claude/skills/ の実装との接続

**Claude Codeへの指示：**

`.claude/agents/` と `.claude/skills/` に定義されたAGの仕様が、
`src/agents/` 以下の実装と一致しているか確認・修正すること。

具体的な確認ポイント：

```
確認1: base-agent.ts が cdNotes を受け取ってシステムプロンプトに追加しているか
  → .claude/agents/insight.md の cdNotesIntegration を参照

確認2: AG実行が .claude/agents/*.md の executionPolicy に従っているか
  → 例: AG-05がfailを返した場合に AG-06 に進まない制御が実装されているか

確認3: pipeline.ts が .claude/skills/run-pipeline.md の手順通りに動いているか
  → チェックポイント①②③④のトリガーポイントを確認

確認4: checkpoint-summary.ts の出力が .claude/skills/checkpoint.md と一致しているか
  → gotInfo / missingInfo の構造を確認

確認5: slide-generator.ts が .claude/skills/slide-gen.md の layoutHint決定ルールに従っているか
  → visualSuggestion のパターンマッチングを確認
```

---

## 7. 実装優先順位

```
Priority 1（DBスキーマ・すぐ実行）:
  - ProposalFeedback / PromptVersion モデル追加
  - npx prisma db push

Priority 2（API実装）:
  - /api/feedback（POST・GET）
  - /api/agents/[id]/improve
  - /api/agents/[id]/apply

Priority 3（UIコンポーネント）:
  - FeedbackModal（docs/implementation_ui.md Section 11 のHTMLを参照）
  - AgentFeedback
  - PromptImproveModal
  - 完了画面へのFeedbackModal統合

Priority 4（Settings画面）:
  - フィードバック集計表示
  - pending改善候補の一覧

Priority 5（.claude整合性確認）:
  - base-agent.ts の cdNotes 対応確認
  - pipeline.ts のチェックポイント制御確認
  - slide-generator.ts の layoutHint確認
```
