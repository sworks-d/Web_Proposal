# WEB提案書エージェント 実装指示書 Phase 1

**対象リポジトリ:** https://github.com/sworks-d/Web_Proposal.git  
**Phase 1のゴール:** AG-01（インテーク）が単体で動作し、チャットUIから結果をプレビューできる状態にする

---

## 0. 前提・制約

- リポジトリは空の状態から構築する
- ローカルマシンで稼働（localhost）
- Node.js / TypeScript / Next.js（App Router）で統一
- コードとプロンプトは分離する（プロンプトはMarkdownファイルで管理）
- 環境変数は`.env.local`で管理し、`.gitignore`に含める
- `dev.db`（SQLiteファイル）も`.gitignore`に含める

---

## 1. プロジェクト初期化

```bash
# リポジトリのルートで実行
npx create-next-app@latest . \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*" \
  --no-turbopack

# 追加パッケージのインストール
npm install @anthropic-ai/sdk prisma @prisma/client
npm install -D tsx
```

---

## 2. ディレクトリ構成の作成

以下のディレクトリ・ファイルを作成する：

```
/
├── .env.local                          # 環境変数（gitignore対象）
├── .gitignore                          # dev.db / .env.local を追加
├── prisma/
│   └── schema.prisma
├── prompts/
│   └── ag-01-intake/
│       └── default.md
└── src/
    ├── agents/
    │   ├── types.ts
    │   ├── base-agent.ts
    │   └── ag-01-intake.ts
    ├── lib/
    │   ├── anthropic-client.ts
    │   └── prompt-loader.ts
    └── app/
        ├── api/
        │   ├── projects/
        │   │   └── route.ts
        │   ├── clients/
        │   │   └── route.ts
        │   └── executions/
        │       └── route.ts
        ├── page.tsx                    # ダッシュボード
        └── projects/
            └── [id]/
                └── page.tsx            # チャット + プレビューUI
```

---

## 3. 環境変数

`.env.local` を以下の内容で作成する：

```env
ANTHROPIC_API_KEY=your_key_here
DEFAULT_MODEL_FAST=claude-haiku-4-5-20251001
DEFAULT_MODEL_QUALITY=claude-sonnet-4-6
DATABASE_URL="file:./dev.db"
```

---

## 4. .gitignore への追加

既存の`.gitignore`に以下を追記する：

```
.env.local
prisma/dev.db
prisma/*.db-journal
```

---

## 5. Prismaスキーマ

`prisma/schema.prisma` を以下の内容で作成する：

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model Client {
  id        String    @id @default(cuid())
  name      String    @unique
  industry  String?
  size      String?
  notes     String?
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  projects  Project[]
}

model Project {
  id           String        @id @default(cuid())
  clientId     String
  client       Client        @relation(fields: [clientId], references: [id])
  title        String
  briefText    String
  industryType String        @default("general")
  status       ProjectStatus @default(ACTIVE)
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt
  executions   Execution[]
}

model Execution {
  id          String          @id @default(cuid())
  projectId   String
  project     Project         @relation(fields: [projectId], references: [id])
  mode        ExecutionMode   @default(SPOT)
  agentId     String?
  status      ExecutionStatus @default(RUNNING)
  startedAt   DateTime        @default(now())
  completedAt DateTime?
  results     AgentResult[]
}

model AgentResult {
  id          String    @id @default(cuid())
  executionId String
  execution   Execution @relation(fields: [executionId], references: [id])
  agentId     String
  outputJson  String
  editedJson  String?
  approvedAt  DateTime?
  createdAt   DateTime  @default(now())
}

enum ProjectStatus {
  ACTIVE
  ARCHIVED
}

enum ExecutionMode {
  FULL
  SPOT
}

enum ExecutionStatus {
  RUNNING
  WAITING_REVIEW
  COMPLETED
  ERROR
}
```

スキーマ作成後、以下を実行する：

```bash
npx prisma generate
npx prisma db push
```

---

## 6. 型定義

`src/agents/types.ts` を以下の内容で作成する：

```typescript
export type AgentId =
  | 'AG-01'
  | 'AG-02'
  | 'AG-03'
  | 'AG-04'
  | 'AG-05'
  | 'AG-06'
  | 'AG-07'

export type ConfidenceLevel = 'high' | 'medium' | 'low'

export type VizType = 'chart' | 'mermaid' | 'matrix' | 'positioning'
export type RendererType = 'recharts' | 'mermaid' | 'custom-svg'

export interface ProjectContext {
  clientName: string
  clientIndustry?: string
  briefText: string
  industryType: string
  knownConstraints?: string
  pastProjects?: string   // 過去案件の要約（将来実装）
}

export interface Section {
  id: string
  title: string
  content: string         // Markdown形式
  sectionType: string
  isEditable: boolean
  canRegenerate: boolean
}

export interface Visualization {
  id: string
  title: string
  vizType: VizType
  renderer: RendererType
  data: Record<string, unknown>
  exportFormats: ('svg' | 'png' | 'json')[]
}

export interface OutputMetadata {
  confidence: ConfidenceLevel
  factBasis: string[]
  assumptions: string[]
  missingInfo: string[]
}

export interface AgentInput {
  projectContext: ProjectContext
  previousOutputs: AgentOutput[]
  userInstruction?: string
}

export interface AgentOutput {
  agentId: AgentId
  sections: Section[]
  visualizations: Visualization[]
  metadata: OutputMetadata
}
```

---

## 7. プロンプトローダー

`src/lib/prompt-loader.ts` を以下の内容で作成する：

```typescript
import fs from 'fs'
import path from 'path'

export function loadPrompt(agentId: string, variant: string = 'default'): string {
  const promptPath = path.join(
    process.cwd(),
    'prompts',
    agentId.toLowerCase().replace('-', '-'),
    `${variant}.md`
  )

  if (!fs.existsSync(promptPath)) {
    throw new Error(`Prompt not found: ${promptPath}`)
  }

  return fs.readFileSync(promptPath, 'utf-8')
}

export function loadMarketPrompt(industryType: string): string {
  const variant = industryType || 'general'
  const promptsDir = path.join(process.cwd(), 'prompts', 'ag-02-market')

  // 指定された業界タイプが存在しない場合はgeneralにfallback
  const targetPath = path.join(promptsDir, `${variant}.md`)
  const fallbackPath = path.join(promptsDir, 'general.md')

  if (fs.existsSync(targetPath)) {
    return fs.readFileSync(targetPath, 'utf-8')
  }

  if (fs.existsSync(fallbackPath)) {
    return fs.readFileSync(fallbackPath, 'utf-8')
  }

  throw new Error(`Market prompt not found for industry: ${variant}`)
}
```

---

## 8. Anthropic APIクライアント

`src/lib/anthropic-client.ts` を以下の内容で作成する：

```typescript
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export type ModelType = 'fast' | 'quality'

export function getModel(type: ModelType = 'fast'): string {
  if (type === 'quality') {
    return process.env.DEFAULT_MODEL_QUALITY || 'claude-sonnet-4-6'
  }
  return process.env.DEFAULT_MODEL_FAST || 'claude-haiku-4-5-20251001'
}

export async function callClaude(
  systemPrompt: string,
  userMessage: string,
  modelType: ModelType = 'fast'
): Promise<string> {
  const model = getModel(modelType)

  const response = await anthropic.messages.create({
    model,
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  })

  const content = response.content[0]
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Claude API')
  }

  return content.text
}

// ストリーミング版（SSE用）
export async function* callClaudeStream(
  systemPrompt: string,
  userMessage: string,
  modelType: ModelType = 'fast'
): AsyncGenerator<string> {
  const model = getModel(modelType)

  const stream = anthropic.messages.stream({
    model,
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  })

  for await (const event of stream) {
    if (
      event.type === 'content_block_delta' &&
      event.delta.type === 'text_delta'
    ) {
      yield event.delta.text
    }
  }
}

export default anthropic
```

---

## 9. 基底エージェントクラス

`src/agents/base-agent.ts` を以下の内容で作成する：

```typescript
import { AgentId, AgentInput, AgentOutput, ProjectContext } from './types'
import { callClaude, ModelType } from '@/lib/anthropic-client'

export abstract class BaseAgent {
  abstract id: AgentId
  abstract name: string
  protected modelType: ModelType = 'fast'

  abstract getPrompt(context: ProjectContext): string

  abstract parseOutput(rawText: string): AgentOutput

  async execute(input: AgentInput): Promise<AgentOutput> {
    const systemPrompt = this.getPrompt(input.projectContext)

    const userMessage = this.buildUserMessage(input)

    const rawText = await callClaude(systemPrompt, userMessage, this.modelType)

    return this.parseOutput(rawText)
  }

  protected buildUserMessage(input: AgentInput): string {
    const lines: string[] = []

    lines.push('## 案件情報')
    lines.push(`クライアント名: ${input.projectContext.clientName}`)
    lines.push(`業種: ${input.projectContext.clientIndustry || '未設定'}`)
    lines.push(`依頼内容:\n${input.projectContext.briefText}`)

    if (input.projectContext.knownConstraints) {
      lines.push(`\n制約条件:\n${input.projectContext.knownConstraints}`)
    }

    if (input.previousOutputs.length > 0) {
      lines.push('\n## 前エージェントの出力サマリー')
      for (const prev of input.previousOutputs) {
        lines.push(`\n### ${prev.agentId}`)
        // セクションの最初の内容のみ（トークン節約）
        for (const section of prev.sections.slice(0, 3)) {
          lines.push(`**${section.title}**\n${section.content.slice(0, 500)}...`)
        }
      }
    }

    if (input.userInstruction) {
      lines.push(`\n## 追加指示\n${input.userInstruction}`)
    }

    return lines.join('\n')
  }

  // JSONパースのユーティリティ（フェンス除去対応）
  protected parseJSON<T>(text: string): T {
    const cleaned = text
      .replace(/^```json\s*/m, '')
      .replace(/^```\s*/m, '')
      .replace(/```\s*$/m, '')
      .trim()

    return JSON.parse(cleaned) as T
  }
}
```

---

## 10. AG-01 インテーク担当

`src/agents/ag-01-intake.ts` を以下の内容で作成する：

```typescript
import { BaseAgent } from './base-agent'
import { AgentId, AgentInput, AgentOutput, ProjectContext } from './types'
import { loadPrompt } from '@/lib/prompt-loader'

export class IntakeAgent extends BaseAgent {
  id: AgentId = 'AG-01'
  name = 'インテーク担当'

  getPrompt(context: ProjectContext): string {
    return loadPrompt('ag-01-intake')
  }

  parseOutput(rawText: string): AgentOutput {
    try {
      // JSON出力を試みる
      const parsed = this.parseJSON<{
        projectSummary: string
        missingInfo: string[]
        hearingItems: string[]
        recommendedAgents: string[]
        assumptions: string[]
      }>(rawText)

      return {
        agentId: this.id,
        sections: [
          {
            id: 'project-summary',
            title: '案件サマリー',
            content: parsed.projectSummary,
            sectionType: 'summary',
            isEditable: true,
            canRegenerate: true,
          },
          {
            id: 'missing-info',
            title: '不足情報リスト',
            content: parsed.missingInfo.map((item) => `- ${item}`).join('\n'),
            sectionType: 'checklist',
            isEditable: true,
            canRegenerate: false,
          },
          {
            id: 'hearing-items',
            title: '追加ヒアリング項目',
            content: parsed.hearingItems.map((item) => `- ${item}`).join('\n'),
            sectionType: 'checklist',
            isEditable: true,
            canRegenerate: true,
          },
        ],
        visualizations: [],
        metadata: {
          confidence: 'medium',
          factBasis: ['クライアントからの依頼テキスト'],
          assumptions: parsed.assumptions || [],
          missingInfo: parsed.missingInfo,
        },
      }
    } catch {
      // JSONパース失敗時はテキストをそのまま返す
      return {
        agentId: this.id,
        sections: [
          {
            id: 'raw-output',
            title: 'インテーク結果',
            content: rawText,
            sectionType: 'text',
            isEditable: true,
            canRegenerate: true,
          },
        ],
        visualizations: [],
        metadata: {
          confidence: 'low',
          factBasis: [],
          assumptions: [],
          missingInfo: ['出力のパースに失敗しました。内容を確認してください。'],
        },
      }
    }
  }
}
```

---

## 11. AG-01のプロンプトファイル

`prompts/ag-01-intake/default.md` を以下の内容で作成する：

```markdown
# AG-01 インテーク担当

## Role
あなたはWEB制作会社のシニアアカウントプランナーです。
クライアントからの依頼情報を整理し、提案書作成に必要な情報を構造化することが専門です。
推測や憶測で情報を補完せず、不明な点は明示的に「不足情報」として列挙してください。

## Instructions
以下の手順で処理してください：

1. 依頼テキストから確定情報を抽出する
2. 提案書作成に必要だが不足している情報を特定する
3. 追加ヒアリングが必要な項目を優先度順に整理する
4. 推測として扱った情報を明示する

## Constraints
- ファクトとして確認できない情報は assumptions に含める
- 「おそらく」「と思われる」等の推測表現を使わない
- 情報が不明な場合は missingInfo に追記する

## Output Format
必ず以下のJSON形式のみで出力してください。
説明文・前置き・Markdownコードフェンス（```）は不要です。

{
  "projectSummary": "案件の全体像を3〜5文で記述。確定情報のみ使用。",
  "missingInfo": [
    "不足している情報を具体的に記述",
    "例：予算規模（概算でも可）",
    "例：現サイトのCV率・月間訪問者数"
  ],
  "hearingItems": [
    "追加で確認すべき質問を具体的に記述",
    "例：競合として意識している企業はどこか",
    "例：意思決定者は人事部長か、それとも経営層か"
  ],
  "recommendedAgents": [
    "この案件で実行を推奨するエージェントIDのリスト",
    "例：AG-02, AG-03, AG-04"
  ],
  "assumptions": [
    "推測として扱った情報を記述",
    "例：ターゲットは20〜40代と想定（依頼文に記載なし）"
  ]
}
```

---

## 12. API Routes

### 12.1 クライアント一覧・作成

`src/app/api/clients/route.ts` を以下の内容で作成する：

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET() {
  const clients = await prisma.client.findMany({
    orderBy: { updatedAt: 'desc' },
  })
  return NextResponse.json(clients)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { name, industry, size, notes } = body

  if (!name) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 })
  }

  const client = await prisma.client.upsert({
    where: { name },
    update: { industry, size, notes },
    create: { name, industry, size, notes },
  })

  return NextResponse.json(client)
}
```

### 12.2 プロジェクト一覧・作成

`src/app/api/projects/route.ts` を以下の内容で作成する：

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET() {
  const projects = await prisma.project.findMany({
    include: { client: true },
    orderBy: { updatedAt: 'desc' },
  })
  return NextResponse.json(projects)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { clientName, title, briefText, industryType, knownConstraints } = body

  if (!clientName || !title || !briefText) {
    return NextResponse.json(
      { error: 'clientName, title, briefText are required' },
      { status: 400 }
    )
  }

  // クライアントをupsert
  const client = await prisma.client.upsert({
    where: { name: clientName },
    update: {},
    create: { name: clientName },
  })

  const project = await prisma.project.create({
    data: {
      clientId: client.id,
      title,
      briefText,
      industryType: industryType || 'general',
    },
    include: { client: true },
  })

  return NextResponse.json(project)
}
```

### 12.3 エージェント実行（SSEストリーミング）

`src/app/api/executions/route.ts` を以下の内容で作成する：

```typescript
import { NextRequest } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { IntakeAgent } from '@/agents/ag-01-intake'
import { ProjectContext } from '@/agents/types'

const prisma = new PrismaClient()

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { projectId, agentId, userInstruction } = body

  if (!projectId || !agentId) {
    return new Response(
      JSON.stringify({ error: 'projectId and agentId are required' }),
      { status: 400 }
    )
  }

  // プロジェクト取得
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { client: true },
  })

  if (!project) {
    return new Response(
      JSON.stringify({ error: 'Project not found' }),
      { status: 404 }
    )
  }

  // Execution作成
  const execution = await prisma.execution.create({
    data: {
      projectId,
      mode: 'SPOT',
      agentId,
      status: 'RUNNING',
    },
  })

  const projectContext: ProjectContext = {
    clientName: project.client.name,
    clientIndustry: project.client.industry || undefined,
    briefText: project.briefText,
    industryType: project.industryType,
  }

  // SSEレスポンス
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
        )
      }

      try {
        send({ type: 'status', message: `${agentId} を実行中...` })

        // エージェント選択（Phase 1はAG-01のみ）
        let agent
        if (agentId === 'AG-01') {
          agent = new IntakeAgent()
        } else {
          throw new Error(`Agent ${agentId} is not implemented yet`)
        }

        const output = await agent.execute({
          projectContext,
          previousOutputs: [],
          userInstruction,
        })

        // 結果をDBに保存
        await prisma.agentResult.create({
          data: {
            executionId: execution.id,
            agentId,
            outputJson: JSON.stringify(output),
          },
        })

        await prisma.execution.update({
          where: { id: execution.id },
          data: { status: 'WAITING_REVIEW', completedAt: new Date() },
        })

        send({ type: 'complete', output, executionId: execution.id })
      } catch (error) {
        await prisma.execution.update({
          where: { id: execution.id },
          data: { status: 'ERROR' },
        })

        send({
          type: 'error',
          message: error instanceof Error ? error.message : 'Unknown error',
        })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
```

---

## 13. フロントエンド

### 13.1 ダッシュボード（トップページ）

`src/app/page.tsx` を以下の内容で作成する：

新規プロジェクト作成フォームと、既存プロジェクト一覧を表示する画面。

**表示要素：**
- ページタイトル：「WEB提案書エージェント」
- 新規プロジェクト作成フォーム（以下のフィールド）
  - クライアント名（テキスト入力・必須）
  - 案件タイトル（テキスト入力・必須）
  - 依頼内容（テキストエリア・必須・最低5行）
  - 業界タイプ（セレクトボックス：recruitment / btob / ec / corporate / campaign / general）
  - 「プロジェクト作成」ボタン
- 既存プロジェクト一覧（カード形式）
  - クライアント名・案件タイトル・作成日
  - クリックで `/projects/[id]` へ遷移

**動作：**
- フォーム送信時に `POST /api/projects` を呼び出す
- 作成成功後に `/projects/[id]` へ自動遷移
- ページ読み込み時に `GET /api/projects` でプロジェクト一覧を取得して表示

### 13.2 プロジェクト詳細ページ（チャット + プレビュー）

`src/app/projects/[id]/page.tsx` を以下の内容で作成する：

左側にチャットUI、右側にプレビューUIの2カラムレイアウト。

**左カラム：チャットUI**

表示要素：
- チャット履歴（メッセージ一覧）
- エージェント選択ボタン（Phase 1はAG-01のみ）
- メッセージ入力欄
- 「実行」ボタン

動作：
- 「AG-01を実行」ボタンまたは入力欄への指示送信で `POST /api/executions` を呼び出す
- SSEでストリーミングを受信し、ステータスメッセージをチャット欄にリアルタイム表示
- 実行完了時に右カラムのプレビューを更新する

**右カラム：プレビューUI**

表示要素：
- エージェント出力をセクション単位で表示
- 各セクションにはタイトル・本文・信頼度バッジ（high=緑 / medium=黄 / low=赤）
- 各セクションに「編集」ボタン（クリックでインライン編集モードに切り替え）
- 編集モード時は「保存」「キャンセル」ボタンを表示
- 不足情報・要確認事項をハイライト表示（黄色背景）

**SSEの受信処理：**

```typescript
const eventSource = new EventSource('/api/executions') // POSTはfetchで実行後SSEを別途受信
// ※ SSEはGETのみ対応のため、実行はfetchでPOSTし、
//    レスポンスをReadableStreamとして処理する

const response = await fetch('/api/executions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ projectId, agentId: 'AG-01', userInstruction }),
})

const reader = response.body?.getReader()
const decoder = new TextDecoder()

while (reader) {
  const { done, value } = await reader.read()
  if (done) break

  const text = decoder.decode(value)
  const lines = text.split('\n').filter(line => line.startsWith('data: '))

  for (const line of lines) {
    const data = JSON.parse(line.replace('data: ', ''))
    // typeに応じてUIを更新
    if (data.type === 'status') { /* ステータス表示 */ }
    if (data.type === 'complete') { /* プレビュー更新 */ }
    if (data.type === 'error') { /* エラー表示 */ }
  }
}
```

---

## 14. 動作確認手順

実装完了後、以下の順で動作確認を行う：

```bash
# 1. 開発サーバー起動
npm run dev

# 2. ブラウザで http://localhost:3000 を開く

# 3. 新規プロジェクト作成
#    - クライアント名：中部電力グループ
#    - 案件タイトル：キャリア採用サイト統合リニューアル提案
#    - 依頼内容：（オリエン資料の内容を貼り付け）
#    - 業界タイプ：recruitment

# 4. プロジェクト詳細ページで「AG-01を実行」

# 5. チャット欄にステータスが表示され、
#    右側プレビューに結果が表示されることを確認
```

---

## 15. Phase 1完了の定義

以下が全て動作すること：

- [ ] `npm run dev` でエラーなく起動する
- [ ] トップページでプロジェクトを作成できる
- [ ] プロジェクト詳細ページでAG-01を実行できる
- [ ] チャット欄にリアルタイムでステータスが表示される
- [ ] プレビュー欄にAG-01の出力（案件サマリー・不足情報・ヒアリング項目）が表示される
- [ ] 各セクションをインライン編集できる
- [ ] DBに実行結果が保存される（Prisma Studioで確認）

---

## 16. Phase 2で追加する内容（参考）

- AG-02〜06の実装
- フルパイプライン実行（AG-01→02→03→04→05→06）
- 人間チェックポイント制御
- Markdown / JSONエクスポート
- Recharts / Mermaidによる図解レンダリング
- 業界タイプ判定ロジック
