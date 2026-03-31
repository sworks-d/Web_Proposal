# WEB提案書エージェント 実装指示書 Phase 1

**対象リポジトリ:** https://github.com/sworks-d/Web_Proposal.git
**Phase 1のゴール:** AG-01（インテーク）が単体で動作し、チャットUIから結果をプレビューできる状態にする

---

## 0. 前提・制約

- リポジトリは空の状態から構築する
- ローカルマシンで稼働（localhost:3000）
- Next.js App Router / TypeScript / Tailwind CSS で統一
- コードとプロンプトは分離する（プロンプトは /prompts/ のMarkdownファイルで管理）
- `.env.local` と `prisma/dev.db` は `.gitignore` に含める
- コンポーネントは全て `src/components/` 以下に配置する

---

## 1. プロジェクト初期化

```bash
npx create-next-app@latest . \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*" \
  --no-turbopack

npm install @anthropic-ai/sdk prisma @prisma/client
npm install -D tsx
```

---

## 2. ディレクトリ構成

```
/
├── .env.local
├── .env.example
├── .gitignore
├── prisma/
│   └── schema.prisma
├── prompts/                        # すでにリポジトリに存在
│   └── ag-01-intake/default.md
└── src/
    ├── agents/
    │   ├── types.ts
    │   ├── base-agent.ts
    │   └── ag-01-intake.ts
    ├── lib/
    │   ├── anthropic-client.ts
    │   └── prompt-loader.ts
    ├── components/
    │   ├── chat/
    │   │   ├── ChatPanel.tsx        # チャットUI全体
    │   │   ├── MessageList.tsx      # メッセージ一覧
    │   │   ├── MessageItem.tsx      # メッセージ1件
    │   │   └── ChatInput.tsx        # 入力欄 + 実行ボタン
    │   ├── preview/
    │   │   ├── PreviewPanel.tsx     # プレビューUI全体
    │   │   ├── SectionCard.tsx      # セクション1件
    │   │   ├── SectionEditor.tsx    # インライン編集
    │   │   └── ConfidenceBadge.tsx  # 信頼度バッジ
    │   └── layout/
    │       └── TwoColumnLayout.tsx  # 2カラムレイアウト
    └── app/
        ├── layout.tsx
        ├── page.tsx                 # ダッシュボード
        ├── projects/
        │   └── [id]/
        │       └── page.tsx         # プロジェクト詳細
        └── api/
            ├── clients/route.ts
            ├── projects/route.ts
            └── executions/route.ts
```

---

## 3. 環境変数

`.env.local` を以下の内容で作成する：

```env
ANTHROPIC_API_KEY=your_key_here
DEFAULT_MODEL_FAST=claude-haiku-4-5-20251001
DEFAULT_MODEL_QUALITY=claude-sonnet-4-6
DATABASE_URL="file:./prisma/dev.db"
```

---

## 4. .gitignore 追記

```
.env.local
prisma/dev.db
prisma/*.db-journal
prisma/*.db-shm
prisma/*.db-wal
```

---

## 5. Prismaスキーマ

`prisma/schema.prisma`:

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

enum ProjectStatus   { ACTIVE ARCHIVED }
enum ExecutionMode   { FULL SPOT }
enum ExecutionStatus { RUNNING WAITING_REVIEW COMPLETED ERROR }
```

```bash
npx prisma generate
npx prisma db push
```

---

## 6. 型定義

`src/agents/types.ts`:

```typescript
export type AgentId =
  | 'AG-01' | 'AG-02' | 'AG-03'
  | 'AG-04' | 'AG-05' | 'AG-06' | 'AG-07'

export type ConfidenceLevel = 'high' | 'medium' | 'low'
export type VizType = 'chart' | 'mermaid' | 'matrix' | 'positioning'
export type RendererType = 'recharts' | 'mermaid' | 'custom-svg'

export interface ProjectContext {
  clientName: string
  clientIndustry?: string
  briefText: string
  industryType: string
  knownConstraints?: string
}

export interface Section {
  id: string
  title: string
  content: string        // Markdown形式
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

// SSEで流れるイベントの型
export type SSEEvent =
  | { type: 'status'; message: string }
  | { type: 'complete'; output: AgentOutput; executionId: string }
  | { type: 'error'; message: string }
```

---

## 7. プロンプトローダー

`src/lib/prompt-loader.ts`:

```typescript
import fs from 'fs'
import path from 'path'

export function loadPrompt(agentDir: string, variant = 'default'): string {
  const filePath = path.join(process.cwd(), 'prompts', agentDir, `${variant}.md`)
  if (!fs.existsSync(filePath)) {
    throw new Error(`Prompt not found: ${filePath}`)
  }
  return fs.readFileSync(filePath, 'utf-8')
}

export function loadMarketPrompt(industryType: string): string {
  const dir = path.join(process.cwd(), 'prompts', 'ag-02-market')
  const target = path.join(dir, `${industryType}.md`)
  const fallback = path.join(dir, 'general.md')
  if (fs.existsSync(target)) return fs.readFileSync(target, 'utf-8')
  if (fs.existsSync(fallback)) return fs.readFileSync(fallback, 'utf-8')
  throw new Error(`Market prompt not found: ${industryType}`)
}
```

---

## 8. Anthropic APIクライアント

`src/lib/anthropic-client.ts`:

```typescript
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export type ModelType = 'fast' | 'quality'

export function getModel(type: ModelType = 'fast'): string {
  return type === 'quality'
    ? (process.env.DEFAULT_MODEL_QUALITY ?? 'claude-sonnet-4-6')
    : (process.env.DEFAULT_MODEL_FAST ?? 'claude-haiku-4-5-20251001')
}

export async function callClaude(
  system: string,
  user: string,
  modelType: ModelType = 'fast'
): Promise<string> {
  const res = await anthropic.messages.create({
    model: getModel(modelType),
    max_tokens: 4096,
    system,
    messages: [{ role: 'user', content: user }],
  })
  const block = res.content[0]
  if (block.type !== 'text') throw new Error('Unexpected response type')
  return block.text
}

export default anthropic
```

---

## 9. 基底エージェントクラス

`src/agents/base-agent.ts`:

```typescript
import { AgentId, AgentInput, AgentOutput, ProjectContext } from './types'
import { callClaude, ModelType } from '@/lib/anthropic-client'

export abstract class BaseAgent {
  abstract id: AgentId
  abstract name: string
  protected modelType: ModelType = 'fast'

  abstract getPrompt(context: ProjectContext): string
  abstract parseOutput(raw: string): AgentOutput

  async execute(input: AgentInput): Promise<AgentOutput> {
    const system = this.getPrompt(input.projectContext)
    const user = this.buildUserMessage(input)
    const raw = await callClaude(system, user, this.modelType)
    return this.parseOutput(raw)
  }

  protected buildUserMessage(input: AgentInput): string {
    const lines = [
      '## 案件情報',
      `クライアント名: ${input.projectContext.clientName}`,
      `業種: ${input.projectContext.clientIndustry ?? '未設定'}`,
      `業界タイプ: ${input.projectContext.industryType}`,
      `\n依頼内容:\n${input.projectContext.briefText}`,
    ]
    if (input.projectContext.knownConstraints) {
      lines.push(`\n制約条件:\n${input.projectContext.knownConstraints}`)
    }
    if (input.previousOutputs.length > 0) {
      lines.push('\n## 前エージェントの出力サマリー')
      for (const prev of input.previousOutputs) {
        lines.push(`\n### ${prev.agentId}`)
        for (const s of prev.sections.slice(0, 3)) {
          lines.push(`**${s.title}**\n${s.content.slice(0, 500)}`)
        }
      }
    }
    if (input.userInstruction) {
      lines.push(`\n## 追加指示\n${input.userInstruction}`)
    }
    return lines.join('\n')
  }

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

`src/agents/ag-01-intake.ts`:

```typescript
import { BaseAgent } from './base-agent'
import { AgentId, AgentOutput, ProjectContext } from './types'
import { loadPrompt } from '@/lib/prompt-loader'

interface IntakeRaw {
  projectSummary: string
  missingInfo: string[]
  hearingItems: string[]
  recommendedAgents: string[]
  assumptions: string[]
}

export class IntakeAgent extends BaseAgent {
  id: AgentId = 'AG-01'
  name = 'インテーク担当'

  getPrompt(_ctx: ProjectContext): string {
    return loadPrompt('ag-01-intake')
  }

  parseOutput(raw: string): AgentOutput {
    try {
      const p = this.parseJSON<IntakeRaw>(raw)
      return {
        agentId: this.id,
        sections: [
          {
            id: 'project-summary',
            title: '案件サマリー',
            content: p.projectSummary,
            sectionType: 'summary',
            isEditable: true,
            canRegenerate: true,
          },
          {
            id: 'missing-info',
            title: '不足情報リスト',
            content: p.missingInfo.map(i => `- ${i}`).join('\n'),
            sectionType: 'checklist',
            isEditable: true,
            canRegenerate: false,
          },
          {
            id: 'hearing-items',
            title: '追加ヒアリング項目',
            content: p.hearingItems.map(i => `- ${i}`).join('\n'),
            sectionType: 'checklist',
            isEditable: true,
            canRegenerate: true,
          },
        ],
        visualizations: [],
        metadata: {
          confidence: 'medium',
          factBasis: ['クライアントからの依頼テキスト'],
          assumptions: p.assumptions,
          missingInfo: p.missingInfo,
        },
      }
    } catch {
      return {
        agentId: this.id,
        sections: [{
          id: 'raw-output',
          title: 'インテーク結果（パース失敗）',
          content: raw,
          sectionType: 'text',
          isEditable: true,
          canRegenerate: true,
        }],
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

## 11. API Routes

### `src/app/api/clients/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET() {
  const clients = await prisma.client.findMany({ orderBy: { updatedAt: 'desc' } })
  return NextResponse.json(clients)
}

export async function POST(req: NextRequest) {
  const { name, industry, size, notes } = await req.json()
  if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 })
  const client = await prisma.client.upsert({
    where: { name },
    update: { industry, size, notes },
    create: { name, industry, size, notes },
  })
  return NextResponse.json(client)
}
```

### `src/app/api/projects/route.ts`

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
  const { clientName, title, briefText, industryType } = await req.json()
  if (!clientName || !title || !briefText) {
    return NextResponse.json({ error: 'clientName, title, briefText are required' }, { status: 400 })
  }
  const client = await prisma.client.upsert({
    where: { name: clientName },
    update: {},
    create: { name: clientName },
  })
  const project = await prisma.project.create({
    data: { clientId: client.id, title, briefText, industryType: industryType ?? 'general' },
    include: { client: true },
  })
  return NextResponse.json(project)
}
```

### `src/app/api/executions/route.ts`

```typescript
import { NextRequest } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { IntakeAgent } from '@/agents/ag-01-intake'
import { ProjectContext, SSEEvent } from '@/agents/types'

const prisma = new PrismaClient()

export async function POST(req: NextRequest) {
  const { projectId, agentId, userInstruction } = await req.json()
  if (!projectId || !agentId) {
    return new Response(JSON.stringify({ error: 'projectId and agentId are required' }), { status: 400 })
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { client: true },
  })
  if (!project) {
    return new Response(JSON.stringify({ error: 'Project not found' }), { status: 404 })
  }

  const execution = await prisma.execution.create({
    data: { projectId, mode: 'SPOT', agentId, status: 'RUNNING' },
  })

  const projectContext: ProjectContext = {
    clientName: project.client.name,
    clientIndustry: project.client.industry ?? undefined,
    briefText: project.briefText,
    industryType: project.industryType,
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: SSEEvent) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
      }

      try {
        send({ type: 'status', message: `${agentId} を実行中...` })

        let agent
        if (agentId === 'AG-01') {
          agent = new IntakeAgent()
        } else {
          throw new Error(`${agentId} は未実装です（Phase 2以降）`)
        }

        const output = await agent.execute({
          projectContext,
          previousOutputs: [],
          userInstruction,
        })

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
      } catch (err) {
        await prisma.execution.update({
          where: { id: execution.id },
          data: { status: 'ERROR' },
        })
        send({ type: 'error', message: err instanceof Error ? err.message : 'Unknown error' })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
```

---

## 12. コンポーネント仕様

### 12.1 `src/components/layout/TwoColumnLayout.tsx`

**役割:** 左右2カラムの固定レイアウト。左がチャット、右がプレビュー。

```
┌────────────────────────────────────────────────────┐
│ ヘッダー（プロジェクト名・クライアント名）            │
├─────────────────────┬──────────────────────────────┤
│                     │                              │
│  左カラム           │  右カラム                    │
│  幅: 40%            │  幅: 60%                     │
│  ChatPanel          │  PreviewPanel                │
│                     │                              │
│  高さ: 100vh        │  高さ: 100vh                 │
│  overflow-y: auto   │  overflow-y: auto            │
│                     │                              │
└─────────────────────┴──────────────────────────────┘
```

**Props:**
```typescript
interface TwoColumnLayoutProps {
  projectTitle: string
  clientName: string
  left: React.ReactNode
  right: React.ReactNode
}
```

---

### 12.2 `src/components/chat/ChatPanel.tsx`

**役割:** チャットUI全体の制御。メッセージ一覧・入力欄・エージェント実行を管理する。

**内部状態:**
```typescript
const [messages, setMessages] = useState<ChatMessage[]>([])
const [isRunning, setIsRunning] = useState(false)
const [input, setInput] = useState('')
```

**ChatMessageの型:**
```typescript
interface ChatMessage {
  id: string
  role: 'user' | 'agent' | 'system'
  content: string
  timestamp: Date
  agentId?: AgentId
}
```

**エージェント実行フロー:**
1. ユーザーが入力欄に追加指示を入力（任意）して「AG-01 を実行」ボタンを押す
2. ユーザーメッセージをmessages に追加
3. `isRunning = true` にしてボタンとinputを無効化
4. `fetch('/api/executions', { method: 'POST', body: ... })` を呼び出す
5. `response.body` を `ReadableStream` として読み取る
6. SSEイベントをパースして以下の処理を行う：
   - `type: 'status'` → systemメッセージとして messages に追加
   - `type: 'complete'` → agentメッセージを追加し、`onComplete(output)` コールバックを呼ぶ
   - `type: 'error'` → エラーメッセージを messages に追加
7. 完了後 `isRunning = false`

**Props:**
```typescript
interface ChatPanelProps {
  projectId: string
  onComplete: (output: AgentOutput) => void
}
```

---

### 12.3 `src/components/chat/MessageList.tsx`

**役割:** メッセージ一覧を表示。新着メッセージが来たら自動スクロール。

**表示ルール:**
- `role: 'user'` → 右寄せ・青背景（bg-blue-500 text-white）
- `role: 'agent'` → 左寄せ・グレー背景（bg-gray-100）・左端にAGIDバッジ
- `role: 'system'` → 中央寄せ・小さいフォント・グレーテキスト（実行ステータス表示用）

**自動スクロール:**
```typescript
const bottomRef = useRef<HTMLDivElement>(null)
useEffect(() => {
  bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
}, [messages])
```

**Props:**
```typescript
interface MessageListProps {
  messages: ChatMessage[]
}
```

---

### 12.4 `src/components/chat/ChatInput.tsx`

**役割:** テキスト入力欄とエージェント実行ボタン。

**レイアウト:**
```
┌──────────────────────────────────────────┐
│ AG-01 インテーク担当          [実行]      │
├──────────────────────────────────────────┤
│ 追加指示（任意）                          │
│ テキストエリア（3行）                     │
│                                          │
└──────────────────────────────────────────┘
```

**仕様:**
- 上部: エージェント名ラベル（「AG-01 インテーク担当」）+ 「実行」ボタン
- 下部: テキストエリア（placeholder: 「追加指示があれば入力してください（任意）」）
- `isRunning=true` 時: ボタンを「実行中...」表示にして disabled にする
- ボタンのスタイル: 通常=bg-blue-600 text-white / disabled=bg-gray-300 text-gray-500

**Props:**
```typescript
interface ChatInputProps {
  value: string
  onChange: (v: string) => void
  onSubmit: () => void
  isRunning: boolean
}
```

---

### 12.5 `src/components/preview/PreviewPanel.tsx`

**役割:** エージェント出力のプレビュー全体。セクション一覧とメタデータを表示。

**表示状態:**
- 出力なし → 「AG-01を実行すると結果がここに表示されます」という空状態メッセージ
- 出力あり → セクション一覧（SectionCard × n）+ メタデータエリア

**メタデータエリア（出力の下部に表示）:**
```
┌─────────────────────────────────────────┐
│ 全体信頼度: [medium バッジ]              │
│                                         │
│ 根拠情報:                               │
│ ・クライアントからの依頼テキスト          │
│                                         │
│ 推測として扱った情報:                    │
│ ・ターゲットは30〜40代と想定             │
└─────────────────────────────────────────┘
```

**Props:**
```typescript
interface PreviewPanelProps {
  output: AgentOutput | null
  onSectionEdit: (sectionId: string, newContent: string) => void
}
```

---

### 12.6 `src/components/preview/SectionCard.tsx`

**役割:** セクション1件の表示・編集切り替え。

**通常表示状態:**
```
┌─────────────────────────────────────────┐
│ 案件サマリー              [medium] [編集]│
├─────────────────────────────────────────┤
│ 中部電力グループ3社（HD・PG・ミライズ）  │
│ のキャリア採用サイトを統合リニューアル   │
│ するコンペ提案案件。...                  │
└─────────────────────────────────────────┘
```

**編集状態（「編集」ボタンクリック後）:**
```
┌─────────────────────────────────────────┐
│ 案件サマリー              [保存] [キャンセル]│
├─────────────────────────────────────────┤
│ ┌─────────────────────────────────────┐ │
│ │ テキストエリア（編集可能）           │ │
│ │ rows=8                              │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

**仕様:**
- 内部状態: `isEditing: boolean`, `editValue: string`
- 「編集」クリック → `isEditing = true`, `editValue = section.content`
- 「保存」クリック → `onEdit(section.id, editValue)` を呼び、`isEditing = false`
- 「キャンセル」クリック → `isEditing = false`（変更破棄）
- `sectionType === 'checklist'` の場合: Markdown の `- ` をチェックリスト風に表示

**信頼度バッジ（ConfidenceBadge）の色:**
- `high` → bg-green-100 text-green-800
- `medium` → bg-yellow-100 text-yellow-800
- `low` → bg-red-100 text-red-800

**Props:**
```typescript
interface SectionCardProps {
  section: Section
  confidence: ConfidenceLevel
  onEdit: (sectionId: string, newContent: string) => void
}
```

---

### 12.7 `src/components/preview/ConfidenceBadge.tsx`

**役割:** 信頼度を色付きバッジで表示するシンプルなコンポーネント。

```typescript
interface ConfidenceBadgeProps {
  level: ConfidenceLevel
}
// 表示テキスト: high → "信頼度: 高", medium → "信頼度: 中", low → "信頼度: 低（要確認）"
```

---

## 13. ページ仕様

### 13.1 `src/app/page.tsx` — ダッシュボード

**URL:** `/`

**レイアウト:**
```
┌─────────────────────────────────────────────────┐
│  WEB提案書エージェント                           │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌──────────────────────────────────────────┐  │
│  │ 新規プロジェクト作成                      │  │
│  │                                          │  │
│  │ クライアント名 *    [________________]   │  │
│  │ 案件タイトル *      [________________]   │  │
│  │ 業界タイプ          [▼ 採用・リクルート] │  │
│  │ 依頼内容 *                               │  │
│  │ [____________________________________]  │  │
│  │ [____________________________________]  │  │
│  │ [____________________________________]  │  │
│  │ [____________________________________]  │  │
│  │ [____________________________________]  │  │
│  │                                          │  │
│  │              [プロジェクトを作成]         │  │
│  └──────────────────────────────────────────┘  │
│                                                 │
│  最近のプロジェクト                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │中部電力G  │ │          │ │          │       │
│  │キャリア...│ │          │ │          │       │
│  │2026/3/31  │ │          │ │          │       │
│  └──────────┘ └──────────┘ └──────────┘       │
└─────────────────────────────────────────────────┘
```

**業界タイプのセレクトボックスの選択肢:**
```
採用・リクルート (recruitment)
BtoB・サービス業 (btob)
EC・BtoC (ec)
コーポレートサイト (corporate)
キャンペーン・プロモーション (campaign)
その他 (general)
```

**フォーム送信の処理:**
1. バリデーション（クライアント名・タイトル・依頼内容が空なら送信不可）
2. `POST /api/projects` を呼び出す
3. 成功したら `router.push('/projects/${project.id}')` で遷移
4. エラー時はフォーム下部にエラーメッセージを表示

**プロジェクト一覧の処理:**
- ページ読み込み時に `GET /api/projects` で取得
- カードクリックで `/projects/${id}` へ遷移

---

### 13.2 `src/app/projects/[id]/page.tsx` — プロジェクト詳細

**URL:** `/projects/[id]`

**状態管理:**
```typescript
const [project, setProject] = useState<Project | null>(null)
const [output, setOutput] = useState<AgentOutput | null>(null)
```

**処理:**
- ページ読み込み時に `GET /api/projects/${id}` でプロジェクト情報を取得
- `ChatPanel` の `onComplete` コールバックで `output` を更新
- `PreviewPanel` の `onSectionEdit` で編集内容を `output` の該当セクションに反映

**レイアウト:**
```tsx
<TwoColumnLayout
  projectTitle={project.title}
  clientName={project.client.name}
  left={
    <ChatPanel
      projectId={id}
      onComplete={(output) => setOutput(output)}
    />
  }
  right={
    <PreviewPanel
      output={output}
      onSectionEdit={(sectionId, newContent) => {
        // output の該当セクションを更新
        setOutput(prev => prev ? {
          ...prev,
          sections: prev.sections.map(s =>
            s.id === sectionId ? { ...s, content: newContent } : s
          )
        } : null)
      }}
    />
  }
/>
```

---

## 14. 動作確認手順

```bash
# 1. 開発サーバー起動
npm run dev

# 2. ブラウザで http://localhost:3000 を開く

# 3. 新規プロジェクト作成
#    クライアント名: 中部電力グループ
#    案件タイトル: キャリア採用サイト統合リニューアル提案
#    業界タイプ: 採用・リクルート
#    依頼内容: （オリエン内容を貼り付け）

# 4. プロジェクト詳細ページで「AG-01を実行」ボタンを押す

# 5. 以下を確認する:
#    - チャット欄に「AG-01を実行中...」と表示される
#    - 右側プレビューに「案件サマリー」「不足情報リスト」「追加ヒアリング項目」が表示される
#    - 各セクションの「編集」ボタンでインライン編集できる
#    - DBに結果が保存される（npx prisma studio で確認）
```

---

## 15. Phase 1 完了の定義

- [ ] `npm run dev` でエラーなく起動する
- [ ] トップページでプロジェクトを作成できる
- [ ] プロジェクト詳細ページでAG-01を実行できる
- [ ] チャット欄に実行ステータスがリアルタイムで表示される
- [ ] プレビュー欄にAG-01の出力が表示される
- [ ] 各セクションをインライン編集できる
- [ ] DBに実行結果が保存される

---

## 16. Phase 2 で追加する内容（参考）

- AG-02〜06 の実装
- フルパイプライン実行（AG-01→02→03→04→05→06）
- 人間チェックポイント制御
- Markdown / JSON エクスポート
- Recharts / Mermaid による図解レンダリング
- 業界タイプ判定ロジック（ルールベース）
