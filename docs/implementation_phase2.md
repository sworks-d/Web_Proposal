# WEB提案書エージェント 実装指示書 Phase 2

**対象リポジトリ:** https://github.com/sworks-d/Web_Proposal.git
**前提:** Phase 1完了済み（AG-01単体動作・チャットUI・プレビュー・DB保存）
**Phase 2のゴール:** AG-02〜07のフルパイプライン動作・人間チェックポイントUI・エクスポート機能

---

## 0. Phase 2の概要

### 追加する機能

1. **AG-02〜07の実装**（AG-02の大分類・SUBの組み合わせ実行含む）
2. **フルパイプライン実行**（AG-01→02→03→04→05→06→07の直列実行）
3. **人間チェックポイントUI**（AG-01完了後のAGセレクター・各フェーズ後の確認画面）
4. **AG-07-STORYのプレビューUI**（長文テキスト・セクション別編集）
5. **Markdownエクスポート**（全AG出力を提案書草案としてMD形式で出力）
6. **Mermaid.js図解レンダリング**（AG-06のsiteMap・userFlowを可視化）

### 変更しないもの

- Phase 1で実装したDB schema（拡張のみ）
- 型定義の基本構造（`AgentInput` / `AgentOutput`）
- プロンプトローダー
- Anthropic APIクライアント

---

## 1. 型定義の拡張

`src/agents/types.ts` に以下を追加する：

```typescript
// AG選択の型
export type PrimaryAgentId =
  | 'ag-02-recruit' | 'ag-02-brand' | 'ag-02-ec'
  | 'ag-02-corp'   | 'ag-02-camp'  | 'ag-02-btob' | 'ag-02-general'

export type SubAgentId =
  | 'ag-02-sub-beauty' | 'ag-02-sub-food'    | 'ag-02-sub-finance'
  | 'ag-02-sub-health' | 'ag-02-sub-education' | 'ag-02-sub-life'
  | 'ag-02-sub-fashion' | 'ag-02-sub-auto'   | 'ag-02-sub-tech'
  | 'ag-02-sub-culture' | 'ag-02-sub-sport'  | 'ag-02-sub-travel'
  | 'ag-02-sub-gov'    | 'ag-02-sub-creative'

// AG-01が出力するレコメンド
export interface AgentRecommendation {
  primary: {
    agentId: PrimaryAgentId
    label: string
    rationale: string
    confidence: 'high' | 'medium' | 'low'
  }
  sub: Array<{
    agentId: SubAgentId
    label: string
    rationale: string
  }>
  secondaryOption?: {
    agentId: PrimaryAgentId
    label: string
    rationale: string
  }
  otherAgents: AgentId[]
}

// チェックポイントの状態
export type CheckpointStatus = 'pending' | 'waiting' | 'approved' | 'rejected'

export interface Checkpoint {
  id: string
  executionId: string
  phase: 1 | 2 | 3 | 4
  status: CheckpointStatus
  agentSelection?: {
    primary: PrimaryAgentId
    sub: SubAgentId[]
    secondary?: PrimaryAgentId
  }
  createdAt: Date
  approvedAt?: Date
}

// パイプラインの実行モード
export type PipelineMode = 'full' | 'spot'

export interface PipelineConfig {
  mode: PipelineMode
  primaryAgent: PrimaryAgentId
  subAgents: SubAgentId[]
  secondaryAgent?: PrimaryAgentId
  startFrom?: AgentId  // スポット起動時の開始AG
}
```

---

## 2. DBスキーマの拡張

`prisma/schema.prisma` に以下を追加する（既存の定義は変更しない）：

```prisma
model Checkpoint {
  id           String           @id @default(cuid())
  executionId  String
  execution    Execution        @relation(fields: [executionId], references: [id])
  phase        Int
  status       CheckpointStatus @default(PENDING)
  selectionJson String?         // AG選択内容をJSONで保存
  createdAt    DateTime         @default(now())
  approvedAt   DateTime?
}

enum CheckpointStatus { PENDING WAITING APPROVED REJECTED }
```

Execution モデルに以下を追加：
```prisma
checkpoints  Checkpoint[]
pipelineConfigJson String?   // PipelineConfigをJSONで保存
```

```bash
npx prisma generate
npx prisma db push
```

---

## 3. AG-02の実装

### 3.1 AG-02の基本構造

AG-02は「大分類プロンプト」と「SUBプロンプト」を組み合わせて実行する。
SUBがある場合はシステムプロンプトを結合してから実行する。

`src/agents/ag-02-base.ts`:

```typescript
import { BaseAgent } from './base-agent'
import { AgentId, AgentInput, AgentOutput, ProjectContext,
         PrimaryAgentId, SubAgentId } from './types'
import { loadPrompt, loadSubPrompt } from '@/lib/prompt-loader'

export abstract class Ag02BaseAgent extends BaseAgent {
  abstract primaryId: PrimaryAgentId
  protected subIds: SubAgentId[] = []

  setSubAgents(subIds: SubAgentId[]) {
    this.subIds = subIds
  }

  getPrompt(context: ProjectContext): string {
    const primary = loadPrompt(this.primaryId)

    if (this.subIds.length === 0) return primary

    // SUBコンテキストを結合
    const subContexts = this.subIds
      .map(id => loadSubPrompt(id))
      .join('\n\n---\n\n')

    return `${primary}\n\n---\n\n# 業種コンテキスト（SUB）\n\n以下の業種コンテキストをこの分析に統合してください。\n\n${subContexts}`
  }
}
```

### 3.2 各AG-02の実装

`src/agents/ag-02-recruit.ts`:

```typescript
import { Ag02BaseAgent } from './ag-02-base'
import { AgentId, AgentOutput, ProjectContext } from './types'

export class Ag02RecruitAgent extends Ag02BaseAgent {
  id: AgentId = 'AG-02'
  primaryId = 'ag-02-recruit' as const
  name = '市場・業界分析（採用）'
  protected modelType = 'quality' as const

  parseOutput(raw: string): AgentOutput {
    try {
      const p = this.parseJSON<Record<string, unknown>>(raw)
      return {
        agentId: this.id,
        sections: this.parseMarketSections(p),
        visualizations: [],
        metadata: {
          confidence: (p.confidence as 'high' | 'medium' | 'low') ?? 'medium',
          factBasis: (p.factBasis as string[]) ?? [],
          assumptions: (p.assumptions as string[]) ?? [],
          missingInfo: [],
        },
      }
    } catch {
      return this.fallbackOutput(raw)
    }
  }

  private parseMarketSections(p: Record<string, unknown>) {
    const sections = []

    if (p.marketStructure) {
      sections.push({
        id: 'market-structure',
        title: '採用市場の構造',
        content: JSON.stringify(p.marketStructure, null, 2),
        sectionType: 'market',
        isEditable: true,
        canRegenerate: true,
      })
    }
    if (p.targetCandidateProfile) {
      sections.push({
        id: 'target-profile',
        title: 'ターゲット候補者の深層理解',
        content: JSON.stringify(p.targetCandidateProfile, null, 2),
        sectionType: 'target',
        isEditable: true,
        canRegenerate: true,
      })
    }
    if (p.targetHypothesis) {
      sections.push({
        id: 'target-hypothesis',
        title: 'ターゲット仮説',
        content: JSON.stringify(p.targetHypothesis, null, 2),
        sectionType: 'target-hypothesis',
        isEditable: true,
        canRegenerate: true,
      })
    }
    if (p.siteDesignPrinciples) {
      sections.push({
        id: 'site-principles',
        title: 'サイト設計原則（AG-06へのバトン）',
        content: (p.siteDesignPrinciples as Array<{principle: string, rationale: string, priority: string}>)
          .map(s => `**[${s.priority.toUpperCase()}]** ${s.principle}\n→ ${s.rationale}`)
          .join('\n\n'),
        sectionType: 'principles',
        isEditable: true,
        canRegenerate: true,
      })
    }

    return sections
  }

  private fallbackOutput(raw: string): AgentOutput {
    return {
      agentId: this.id,
      sections: [{
        id: 'raw-output',
        title: '市場分析結果（パース失敗）',
        content: raw,
        sectionType: 'text',
        isEditable: true,
        canRegenerate: true,
      }],
      visualizations: [],
      metadata: { confidence: 'low', factBasis: [], assumptions: [], missingInfo: [] },
    }
  }
}
```

**同様のパターンで以下を実装する（parseOutputの構造のみ各AG固有）：**
- `src/agents/ag-02-brand.ts`
- `src/agents/ag-02-ec.ts`
- `src/agents/ag-02-corp.ts`
- `src/agents/ag-02-camp.ts`
- `src/agents/ag-02-btob.ts`
- `src/agents/ag-02-general.ts`

---

## 4. AG-03〜07の実装

### 4.1 共通パターン

AG-03〜07はすべて `BaseAgent` を継承し、
前フェーズの全出力を `previousOutputs` として受け取る。

`src/agents/ag-03-competitor.ts`:

```typescript
import { BaseAgent } from './base-agent'
import { AgentId, AgentInput, AgentOutput, ProjectContext } from './types'
import { loadPrompt } from '@/lib/prompt-loader'

export class Ag03CompetitorAgent extends BaseAgent {
  id: AgentId = 'AG-03'
  name = '競合・ポジション分析'
  protected modelType = 'quality' as const

  getPrompt(_ctx: ProjectContext): string {
    return loadPrompt('ag-03-competitor')
  }

  parseOutput(raw: string): AgentOutput {
    try {
      const p = this.parseJSON<Record<string, unknown>>(raw)
      const sections = []

      if (p.competitors) {
        sections.push({
          id: 'competitors',
          title: '競合個別評価',
          content: JSON.stringify(p.competitors, null, 2),
          sectionType: 'competitors',
          isEditable: true,
          canRegenerate: true,
        })
      }
      if (p.positioningMap) {
        sections.push({
          id: 'positioning-map',
          title: 'ポジショニングマップ',
          content: JSON.stringify(p.positioningMap, null, 2),
          sectionType: 'visualization',
          isEditable: true,
          canRegenerate: true,
        })
      }
      if (p.differentiationOpportunity) {
        sections.push({
          id: 'differentiation',
          title: '差別化機会・推奨ポジション',
          content: JSON.stringify(p.differentiationOpportunity, null, 2),
          sectionType: 'strategy',
          isEditable: true,
          canRegenerate: true,
        })
      }

      return {
        agentId: this.id,
        sections,
        visualizations: p.positioningMap ? [{
          id: 'positioning-map',
          title: 'ポジショニングマップ',
          vizType: 'positioning',
          renderer: 'custom-svg',
          data: p.positioningMap as Record<string, unknown>,
          exportFormats: ['svg', 'json'],
        }] : [],
        metadata: {
          confidence: (p.confidence as 'high' | 'medium' | 'low') ?? 'medium',
          factBasis: (p.factBasis as string[]) ?? [],
          assumptions: (p.assumptions as string[]) ?? [],
          missingInfo: [],
        },
      }
    } catch {
      return {
        agentId: this.id,
        sections: [{ id: 'raw', title: '競合分析（パース失敗）', content: raw,
          sectionType: 'text', isEditable: true, canRegenerate: true }],
        visualizations: [],
        metadata: { confidence: 'low', factBasis: [], assumptions: [], missingInfo: [] },
      }
    }
  }
}
```

**同様のパターンで以下を実装する：**
- `src/agents/ag-04-insight.ts`
- `src/agents/ag-05-factcheck.ts`
- `src/agents/ag-06-draft.ts`
- `src/agents/ag-07-story.ts`

**AG-07-STORYのparseOutputは特別な処理が必要：**
sectionsの`body`・`essentiallyLine`・`catchCopy`を
プレビューUIで表示できる形式に変換する。

```typescript
// ag-07-story.ts のparseOutput内
if (p.sections) {
  for (const sec of p.sections as Array<Record<string, unknown>>) {
    sections.push({
      id: sec.sectionId as string,
      title: sec.sectionTitle as string,
      content: [
        `**キャッチ：** ${sec.catchCopy}`,
        `**要するに：** ${sec.essentiallyLine}`,
        `---`,
        sec.body,
        `---`,
        `*${sec.editorNote}*`,
      ].join('\n\n'),
      sectionType: 'story-section',
      isEditable: true,
      canRegenerate: false,
    })
  }
}
```

---

## 5. プロンプトローダーの拡張

`src/lib/prompt-loader.ts` に以下を追加する：

```typescript
export function loadPrompt(agentDir: string, variant = 'default'): string {
  const filePath = path.join(process.cwd(), 'prompts', agentDir, `${variant}.md`)
  if (!fs.existsSync(filePath)) {
    throw new Error(`Prompt not found: ${filePath}`)
  }
  return fs.readFileSync(filePath, 'utf-8')
}

export function loadSubPrompt(subId: string): string {
  const filePath = path.join(process.cwd(), 'prompts', subId, 'default.md')
  if (!fs.existsSync(filePath)) {
    console.warn(`Sub prompt not found: ${subId}, skipping`)
    return ''
  }
  return fs.readFileSync(filePath, 'utf-8')
}

export function loadMarketPromptWithSub(
  primaryId: string,
  subIds: string[]
): string {
  const primary = loadPrompt(primaryId)
  if (subIds.length === 0) return primary

  const subContexts = subIds
    .map(id => loadSubPrompt(id))
    .filter(Boolean)
    .join('\n\n---\n\n')

  if (!subContexts) return primary

  return `${primary}\n\n---\n\n# 業種コンテキスト（SUB）\n\n以下の業種コンテキストをこの分析に統合してください。\n\n${subContexts}`
}
```

---

## 6. パイプラインオーケストレーター

`src/lib/pipeline.ts`:

```typescript
import { PrismaClient } from '@prisma/client'
import { AgentInput, AgentOutput, AgentId, PipelineConfig } from '@/agents/types'
import { IntakeAgent } from '@/agents/ag-01-intake'
import { Ag02RecruitAgent } from '@/agents/ag-02-recruit'
import { Ag02BrandAgent } from '@/agents/ag-02-brand'
import { Ag02EcAgent } from '@/agents/ag-02-ec'
import { Ag02CorpAgent } from '@/agents/ag-02-corp'
import { Ag02CampAgent } from '@/agents/ag-02-camp'
import { Ag02BtobAgent } from '@/agents/ag-02-btob'
import { Ag02GeneralAgent } from '@/agents/ag-02-general'
import { Ag03CompetitorAgent } from '@/agents/ag-03-competitor'
import { Ag04InsightAgent } from '@/agents/ag-04-insight'
import { Ag05FactcheckAgent } from '@/agents/ag-05-factcheck'
import { Ag06DraftAgent } from '@/agents/ag-06-draft'
import { Ag07StoryAgent } from '@/agents/ag-07-story'

const prisma = new PrismaClient()

// 大分類IDからエージェントインスタンスを生成
function createAg02Agent(primaryId: string) {
  const map: Record<string, () => InstanceType<typeof Ag02RecruitAgent>> = {
    'ag-02-recruit': () => new Ag02RecruitAgent(),
    'ag-02-brand':   () => new Ag02BrandAgent(),
    'ag-02-ec':      () => new Ag02EcAgent(),
    'ag-02-corp':    () => new Ag02CorpAgent(),
    'ag-02-camp':    () => new Ag02CampAgent(),
    'ag-02-btob':    () => new Ag02BtobAgent(),
    'ag-02-general': () => new Ag02GeneralAgent(),
  }
  const factory = map[primaryId]
  if (!factory) throw new Error(`Unknown AG-02 primary: ${primaryId}`)
  return factory()
}

// パイプラインの1ステップを実行してDBに保存
export async function runAgentStep(
  executionId: string,
  agentId: AgentId,
  input: AgentInput,
  config: PipelineConfig
): Promise<AgentOutput> {

  let agent
  switch (agentId) {
    case 'AG-01': agent = new IntakeAgent(); break
    case 'AG-02': {
      const ag02 = createAg02Agent(config.primaryAgent)
      ag02.setSubAgents(config.subAgents)
      if (config.secondaryAgent) {
        // セカンダリが指定されている場合は並列実行して結果をマージ
        // Phase 2では単一実行のみ対応、Phase 3で並列実行を実装
      }
      agent = ag02
      break
    }
    case 'AG-03': agent = new Ag03CompetitorAgent(); break
    case 'AG-04': agent = new Ag04InsightAgent(); break
    case 'AG-05': agent = new Ag05FactcheckAgent(); break
    case 'AG-06': agent = new Ag06DraftAgent(); break
    case 'AG-07': agent = new Ag07StoryAgent(); break
    default: throw new Error(`Unknown agent: ${agentId}`)
  }

  const output = await agent.execute(input)

  // DBに保存
  await prisma.agentResult.create({
    data: {
      executionId,
      agentId,
      outputJson: JSON.stringify(output),
    },
  })

  return output
}

// チェックポイントを作成して待機状態にする
export async function createCheckpoint(
  executionId: string,
  phase: 1 | 2 | 3 | 4
) {
  return prisma.checkpoint.create({
    data: { executionId, phase, status: 'WAITING' },
  })
}

// チェックポイントを承認して次のフェーズへ
export async function approveCheckpoint(
  checkpointId: string,
  selectionJson?: string
) {
  return prisma.checkpoint.update({
    where: { id: checkpointId },
    data: { status: 'APPROVED', selectionJson, approvedAt: new Date() },
  })
}
```

---

## 7. API Routes の追加

### 7.1 `src/app/api/executions/pipeline/route.ts`

フルパイプラインの実行制御エンドポイント。
SSEで各フェーズの状態をリアルタイムで通知する。

```typescript
import { NextRequest } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { runAgentStep, createCheckpoint } from '@/lib/pipeline'
import { ProjectContext, PipelineConfig, SSEEvent } from '@/agents/types'

const prisma = new PrismaClient()

export async function POST(req: NextRequest) {
  const { projectId, config } = await req.json() as {
    projectId: string
    config: PipelineConfig
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { client: true },
  })
  if (!project) return new Response('Not found', { status: 404 })

  const execution = await prisma.execution.create({
    data: {
      projectId,
      mode: config.mode === 'full' ? 'FULL' : 'SPOT',
      status: 'RUNNING',
      pipelineConfigJson: JSON.stringify(config),
    },
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
        const previousOutputs: AgentOutput[] = []

        // ── フェーズ1：AG-01 ──
        send({ type: 'status', message: 'AG-01 インテーク実行中...' })
        const ag01Output = await runAgentStep(
          execution.id, 'AG-01',
          { projectContext, previousOutputs: [] }, config
        )
        previousOutputs.push(ag01Output)

        // チェックポイント①（AG選択）
        const cp1 = await createCheckpoint(execution.id, 1)
        send({ type: 'checkpoint', checkpointId: cp1.id, phase: 1,
          recommendation: ag01Output.sections.find(s => s.id === 'recommended-agents'),
          output: ag01Output })

        // ✋ ここで一時停止 → フロントがAG選択を送信するまで待機
        // フロントから /api/executions/checkpoint/[id]/approve に
        // AG選択情報と共にPOSTが来たら次のフェーズへ

        send({ type: 'waiting', checkpointId: cp1.id })
        controller.close()

      } catch (err) {
        await prisma.execution.update({
          where: { id: execution.id },
          data: { status: 'ERROR' },
        })
        send({ type: 'error', message: err instanceof Error ? err.message : 'Unknown error' })
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

### 7.2 `src/app/api/executions/[id]/resume/route.ts`

チェックポイント承認後に次のフェーズを実行するエンドポイント。

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { approveCheckpoint, runAgentStep, createCheckpoint } from '@/lib/pipeline'
import { PipelineConfig, ProjectContext, AgentOutput } from '@/agents/types'

const prisma = new PrismaClient()

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { checkpointId, agentSelection } = await req.json()
  const executionId = params.id

  // チェックポイントを承認
  await approveCheckpoint(checkpointId, JSON.stringify(agentSelection))

  const execution = await prisma.execution.findUnique({
    where: { id: executionId },
    include: { project: { include: { client: true } }, results: true },
  })
  if (!execution) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const config = JSON.parse(execution.pipelineConfigJson!) as PipelineConfig
  // AG選択でconfigを上書き
  if (agentSelection) {
    config.primaryAgent = agentSelection.primary
    config.subAgents = agentSelection.sub ?? []
    config.secondaryAgent = agentSelection.secondary
  }

  const projectContext: ProjectContext = {
    clientName: execution.project.client.name,
    briefText: execution.project.briefText,
    industryType: execution.project.industryType,
  }

  // 前フェーズの出力を復元
  const previousOutputs: AgentOutput[] = execution.results
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    .map(r => JSON.parse(r.editedJson ?? r.outputJson) as AgentOutput)

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
      }

      try {
        const phase = execution.checkpoints?.length ?? 1

        // フェーズ2：AG-02 + AG-03
        if (phase === 1) {
          send({ type: 'status', message: `AG-02（${config.primaryAgent}）実行中...` })
          const ag02 = await runAgentStep(executionId, 'AG-02',
            { projectContext, previousOutputs }, config)
          previousOutputs.push(ag02)

          send({ type: 'status', message: 'AG-03 競合分析実行中...' })
          const ag03 = await runAgentStep(executionId, 'AG-03',
            { projectContext, previousOutputs }, config)
          previousOutputs.push(ag03)

          const cp2 = await createCheckpoint(executionId, 2)
          send({ type: 'checkpoint', checkpointId: cp2.id, phase: 2,
            outputs: [ag02, ag03] })
          send({ type: 'waiting', checkpointId: cp2.id })
        }

        // フェーズ3：AG-04 + AG-05
        else if (phase === 2) {
          send({ type: 'status', message: 'AG-04 課題構造化実行中...' })
          const ag04 = await runAgentStep(executionId, 'AG-04',
            { projectContext, previousOutputs }, config)
          previousOutputs.push(ag04)

          send({ type: 'status', message: 'AG-05 ファクトチェック実行中...' })
          const ag05 = await runAgentStep(executionId, 'AG-05',
            { projectContext, previousOutputs }, config)
          previousOutputs.push(ag05)

          const cp3 = await createCheckpoint(executionId, 3)
          send({ type: 'checkpoint', checkpointId: cp3.id, phase: 3,
            outputs: [ag04, ag05] })
          send({ type: 'waiting', checkpointId: cp3.id })
        }

        // フェーズ4：AG-06 + AG-07
        else if (phase === 3) {
          send({ type: 'status', message: 'AG-06 設計草案作成中...' })
          const ag06 = await runAgentStep(executionId, 'AG-06',
            { projectContext, previousOutputs }, config)
          previousOutputs.push(ag06)

          send({ type: 'status', message: 'AG-07 提案書草案執筆中...' })
          const ag07 = await runAgentStep(executionId, 'AG-07',
            { projectContext, previousOutputs }, config)
          previousOutputs.push(ag07)

          await prisma.execution.update({
            where: { id: executionId },
            data: { status: 'WAITING_REVIEW', completedAt: new Date() },
          })

          const cp4 = await createCheckpoint(executionId, 4)
          send({ type: 'checkpoint', checkpointId: cp4.id, phase: 4,
            outputs: [ag06, ag07] })
          send({ type: 'complete', executionId })
        }

      } catch (err) {
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

### 7.3 `src/app/api/executions/[id]/export/route.ts`

Markdownエクスポートエンドポイント。

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { AgentOutput } from '@/agents/types'

const prisma = new PrismaClient()

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const execution = await prisma.execution.findUnique({
    where: { id: params.id },
    include: { results: true, project: { include: { client: true } } },
  })
  if (!execution) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const results = execution.results
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    .map(r => JSON.parse(r.editedJson ?? r.outputJson) as AgentOutput)

  const md = buildMarkdown(execution.project, results)

  return new NextResponse(md, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Content-Disposition': `attachment; filename="proposal-${params.id}.md"`,
    },
  })
}

function buildMarkdown(project: Record<string, unknown>, outputs: AgentOutput[]): string {
  const client = (project.client as Record<string, string>)
  const lines: string[] = [
    `# ${project.title as string}`,
    `**クライアント：** ${client.name}`,
    `**作成日：** ${new Date().toLocaleDateString('ja-JP')}`,
    '',
    '---',
    '',
  ]

  for (const output of outputs) {
    lines.push(`## ${output.agentId}`)
    lines.push('')
    for (const section of output.sections) {
      lines.push(`### ${section.title}`)
      lines.push('')
      lines.push(section.content)
      lines.push('')
    }
    if (output.metadata.assumptions.length > 0) {
      lines.push('**推測として扱った情報：**')
      for (const a of output.metadata.assumptions) {
        lines.push(`- ${a}`)
      }
      lines.push('')
    }
    lines.push('---')
    lines.push('')
  }

  return lines.join('\n')
}
```

---

## 8. コンポーネント仕様

### 8.1 `src/components/checkpoint/AgentSelector.tsx`

AG-01完了後に表示するAGセレクターUI。
AG-01の`recommendedAgents`を受け取り、選択肢として表示する。

**レイアウト：**
```
┌─────────────────────────────────────────────────────┐
│ AGを選択してください                                  │
├─────────────────────────────────────────────────────┤
│ 大分類（必須・1つ選択）                              │
│                                                     │
│ ● AG-02-RECRUIT 採用・リクルート [推奨] ✓            │
│ ○ AG-02-BRAND   ブランド体験                        │
│ ○ AG-02-CORP    コーポレート                        │
│ ○ AG-02-EC      EC・購買                           │
│ ○ AG-02-CAMP    キャンペーン                        │
│ ○ AG-02-BTOB    BtoB                              │
├─────────────────────────────────────────────────────┤
│ 業種コンテキスト（任意・複数選択可）                   │
│                                                     │
│ ☑ ag-02-sub-life  くらし・住まい・環境 [推奨]        │
│ ☐ ag-02-sub-finance 金融・保険                      │
│ ☐ ag-02-sub-tech  PC・家電・通信                    │
│ ...                                                 │
├─────────────────────────────────────────────────────┤
│ 推奨の根拠：電力会社のキャリア採用サイト案件のため    │
├─────────────────────────────────────────────────────┤
│              [この選択で実行する]                    │
└─────────────────────────────────────────────────────┘
```

**Props：**
```typescript
interface AgentSelectorProps {
  recommendation: AgentRecommendation
  onConfirm: (selection: {
    primary: PrimaryAgentId
    sub: SubAgentId[]
    secondary?: PrimaryAgentId
  }) => void
}
```

**内部状態：**
```typescript
const [selectedPrimary, setSelectedPrimary] = useState(recommendation.primary.agentId)
const [selectedSub, setSelectedSub] = useState<SubAgentId[]>(
  recommendation.sub.map(s => s.agentId)
)
```

---

### 8.2 `src/components/checkpoint/CheckpointPanel.tsx`

各フェーズのチェックポイントで表示する確認UI。

**表示内容：**
- フェーズ名と実行したAGの一覧
- 各AGの出力サマリー（SectionCardで表示）
- 「次のフェーズへ進む」ボタン
- 「この内容を修正してから進む」（セクション編集後に進める）
- フェーズ1のみ：AgentSelectorを表示

**Props：**
```typescript
interface CheckpointPanelProps {
  phase: 1 | 2 | 3 | 4
  checkpointId: string
  outputs: AgentOutput[]
  recommendation?: AgentRecommendation  // フェーズ1のみ
  onApprove: (selection?: AgentSelection) => void
}
```

---

### 8.3 `src/components/preview/StoryPreviewPanel.tsx`

AG-07-STORYの出力専用プレビューUI。
通常のPreviewPanelとは別に実装する。

**表示構造：**
```
┌─────────────────────────────────────────────────────┐
│ コンセプトワード                                      │
│ ┌────────────────────────────────────────────────┐  │
│ │ 「会いたい人が、自分から来る採用へ。」          │  │
│ │ 根拠：安定イメージを逆手に取り...              │  │
│ └────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────┤
│ Chapter 1：現状認識の共有                            │
│                                                     │
│ [sec-01-01]                                         │
│ キャッチ：今のサイトでは応募が来ない理由がある       │
│ 要するに：100人来ても2人しか応募しない状態           │
│ ─────────────────────────────────────────          │
│ 本文：中部電力グループのキャリアサイトは...          │
│ ─────────────────────────────────────────          │
│ 📝 CDへの注記：実際の応募率データを入れてください   │
│ [編集]                                              │
├─────────────────────────────────────────────────────┤
│ [Markdownとしてエクスポート]                        │
└─────────────────────────────────────────────────────┘
```

**Props：**
```typescript
interface StoryPreviewPanelProps {
  output: AgentOutput | null
  executionId: string
  onSectionEdit: (sectionId: string, newContent: string) => void
}
```

---

### 8.4 Mermaid.jsレンダリング

`src/components/preview/MermaidRenderer.tsx`:

```typescript
'use client'
import { useEffect, useRef } from 'react'

interface MermaidRendererProps {
  code: string
  title?: string
}

export function MermaidRenderer({ code, title }: MermaidRendererProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const render = async () => {
      const mermaid = (await import('mermaid')).default
      mermaid.initialize({ startOnLoad: false, theme: 'neutral' })
      if (ref.current) {
        const id = `mermaid-${Math.random().toString(36).slice(2)}`
        const { svg } = await mermaid.render(id, code)
        ref.current.innerHTML = svg
      }
    }
    render()
  }, [code])

  return (
    <div>
      {title && <p className="text-sm text-gray-500 mb-2">{title}</p>}
      <div ref={ref} className="overflow-x-auto" />
    </div>
  )
}
```

```bash
npm install mermaid
```

---

## 9. ページ仕様の追加・変更

### 9.1 `src/app/projects/[id]/page.tsx` の変更

Phase 1の2カラムレイアウトに以下を追加する：

**状態の追加：**
```typescript
const [checkpointState, setCheckpointState] = useState<{
  id: string
  phase: 1 | 2 | 3 | 4
  outputs: AgentOutput[]
  recommendation?: AgentRecommendation
} | null>(null)
const [pipelineConfig, setPipelineConfig] = useState<PipelineConfig | null>(null)
const [storyOutput, setStoryOutput] = useState<AgentOutput | null>(null)
```

**SSEイベントの処理追加：**
```typescript
// type: 'checkpoint' を受信した時
case 'checkpoint':
  setCheckpointState({
    id: event.checkpointId,
    phase: event.phase,
    outputs: event.outputs ?? [],
    recommendation: event.recommendation,
  })
  break

// type: 'complete' を受信した時（AG-07完了）
case 'complete':
  setStoryOutput(outputs.find(o => o.agentId === 'AG-07') ?? null)
  break
```

**チェックポイント表示のロジック：**
チェックポイント状態がある場合、右カラムにCheckpointPanelを表示する。
CheckpointPanelで「次のフェーズへ」が押されたら `/api/executions/[id]/resume` にPOSTする。

---

## 10. 動作確認手順

```bash
# 1. DBスキーマを更新
npx prisma generate
npx prisma db push

# 2. 開発サーバー起動
npm run dev

# 3. 中部電力案件で検証
#    既存プロジェクトを開く（または新規作成）
#    業界タイプ：採用・リクルート
#    「フルパイプライン実行」ボタンを押す

# 4. 以下のフローを確認する：
#    - AG-01が実行される
#    - チェックポイント①でAGセレクターが表示される
#    - AG-02-RECRUIT + SUB-LIFEが選択された状態で「実行」
#    - AG-02・AG-03が実行される
#    - チェックポイント②で確認画面が表示される
#    - 「次へ」でAG-04・AG-05が実行される
#    - チェックポイント③で確認
#    - 「次へ」でAG-06・AG-07が実行される
#    - AG-07の出力がStoryPreviewPanelで表示される
#    - 「エクスポート」でMarkdownが出力される
```

---

## 11. Phase 2 完了の定義

- [ ] AG-02〜07が単体で実行できる
- [ ] フルパイプラインが4フェーズ全て実行できる
- [ ] 各チェックポイントで一時停止・確認・再開ができる
- [ ] AG-01完了後にAGセレクターが表示され選択できる
- [ ] SUBプロンプトとの組み合わせ実行ができる
- [ ] AG-07の出力がStoryPreviewPanelで表示される
- [ ] Markdownエクスポートが機能する
- [ ] Mermaid図解がレンダリングされる

---

## 12. Phase 3 で追加する内容（参考）

- AG-07-VISUALの実装（DALL-E 3 API連携）
- ポジショニングマップのSVGレンダリング（カスタムSVGコンポーネント）
- セカンダリAGの並列実行
- pptxエクスポート（python-pptx）
- 案件一覧のダッシュボード強化
