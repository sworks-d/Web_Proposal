# バージョン管理・過去データ参照 実装指示書

**前提:** Phase 1のスキーマ（Client / Project / Execution / AgentResult）が実装済み
**目的:** 提案書のバージョン管理・過去データ参照・差分更新

---

## 0. 設計思想

### バージョン管理の単位

```
Client（クライアント）
  └── Project（案件）
        └── ProposalVersion（提案書バージョン）v1, v2, v3...
              └── Execution（パイプライン実行）
                    └── AgentResult（各AG出力）

# Projectは「この案件」という不変の器
# ProposalVersionが「いつ・何を変えたか」を記録する単位
# 各バージョンは独立したExecutionを持つ
```

### 差分更新の考え方

```
v1 → v2 への差分更新：
  - 変更フラグ（変わったAG・変わっていないAG）
  - 変更理由（CDが入力）
  - 引き継いだデータ（前バージョンのAG出力を再利用）

例：「競合URLを追加してAG-03だけ再実行」
  → v2 = v1のAG-01,02,04,05,06,07をそのまま引き継ぎ
  → AG-03だけ新規実行
  → AG-03の出力が変わった影響でAG-04以降を再実行するか選択可能
```

---

## 1. DBスキーマ変更

`prisma/schema.prisma` を以下に**全面置き換え**する：

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
  id           String           @id @default(cuid())
  clientId     String
  client       Client           @relation(fields: [clientId], references: [id])
  title        String
  briefText    String
  industryType String           @default("general")
  status       ProjectStatus    @default(ACTIVE)
  createdAt    DateTime         @default(now())
  updatedAt    DateTime         @updatedAt
  versions     ProposalVersion[]
}

// ── バージョン管理の核心 ──
model ProposalVersion {
  id             String        @id @default(cuid())
  projectId      String
  project        Project       @relation(fields: [projectId], references: [id])
  versionNumber  Int           // 1, 2, 3...
  label          String?       // "初回提案", "ヒアリング後", "コンペ直前" 等CDが命名
  changeReason   String?       // このバージョンで何を変えたか
  status         VersionStatus @default(DRAFT)

  // AG選択（このバージョンで使うAG設定）
  primaryAgent   String        @default("ag-02-general")
  subAgents      String        @default("[]") // JSON array as string
  secondaryAgent String?

  // 親バージョン（差分更新の場合、どのバージョンから派生したか）
  parentVersionId String?
  parentVersion   ProposalVersion?  @relation("VersionHistory", fields: [parentVersionId], references: [id])
  childVersions   ProposalVersion[] @relation("VersionHistory")

  // CDのメモ（ヒアリングで追加した情報など）
  cdNotes        String?       // JSON: { [agentId]: "CDが追加した情報" }

  createdAt      DateTime      @default(now())
  completedAt    DateTime?
  executions     Execution[]
  slides         ProposalSlide[]
}

// ── 各AG実行 ──
model Execution {
  id          String          @id @default(cuid())
  versionId   String
  version     ProposalVersion @relation(fields: [versionId], references: [id])
  agentId     String          // "AG-01" 〜 "AG-07"
  mode        ExecutionMode   @default(FULL)
  status      ExecutionStatus @default(RUNNING)
  isInherited Boolean         @default(false) // 前バージョンから引き継いだ場合 true
  inheritedFromVersionId String? // どのバージョンから引き継いだか
  startedAt   DateTime        @default(now())
  completedAt DateTime?
  results     AgentResult[]
}

model AgentResult {
  id          String    @id @default(cuid())
  executionId String
  execution   Execution @relation(fields: [executionId], references: [id])
  agentId     String
  outputJson  String    // 生の出力（AG出力のJSONをそのまま保存）
  editedJson  String?   // CDが編集した版
  approvedAt  DateTime?
  createdAt   DateTime  @default(now())
}

// ── 企画書スライド（AG-07出力から生成）──
model ProposalSlide {
  id          String          @id @default(cuid())
  versionId   String
  version     ProposalVersion @relation(fields: [versionId], references: [id])
  slideNumber Int             // スライド番号
  chapterId   String          // "ch-01" 等
  sectionId   String          // "sec-01-01" 等
  title       String
  catchCopy   String?
  body        String
  slideType   SlideType       @default(CONTENT)
  layoutHint  String?         // "title-only", "text-left-image-right" 等
  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt
}

// ── Enum ──
enum ProjectStatus   { ACTIVE ARCHIVED }
enum VersionStatus   { DRAFT RUNNING CHECKPOINT COMPLETED ERROR }
enum ExecutionMode   { FULL SPOT }
enum ExecutionStatus { RUNNING WAITING_REVIEW COMPLETED ERROR }
enum SlideType       { COVER CHAPTER_TITLE CONTENT TABLE_OF_CONTENTS APPENDIX }
```

```bash
npx prisma generate
npx prisma db push
```

---

## 2. バージョン管理の操作フロー

### 2.1 新規バージョン作成（初回）

```typescript
// src/lib/version-manager.ts

export async function createFirstVersion(
  projectId: string,
  config: { primaryAgent: string; subAgents: string[]; label?: string }
): Promise<ProposalVersion> {
  return prisma.proposalVersion.create({
    data: {
      projectId,
      versionNumber: 1,
      label: config.label ?? '初回提案',
      primaryAgent: config.primaryAgent,
      subAgents: JSON.stringify(config.subAgents),
      status: 'DRAFT',
    },
  })
}
```

### 2.2 バージョン更新（差分更新）

```typescript
export async function createNextVersion(
  parentVersionId: string,
  options: {
    changeReason: string      // 「競合URLを追加してAG-03を再実行」等
    label?: string            // 「ヒアリング後」等
    agentsToRerun: string[]   // 再実行するAGのID ["AG-03", "AG-04"]
    cdNotes?: Record<string, string> // CDが追加した情報
    newPrimaryAgent?: string  // AG選択を変更する場合
    newSubAgents?: string[]
  }
): Promise<ProposalVersion> {
  const parent = await prisma.proposalVersion.findUnique({
    where: { id: parentVersionId },
    include: { executions: { include: { results: true } } },
  })
  if (!parent) throw new Error('Parent version not found')

  // 次のバージョン番号を取得
  const maxVersion = await prisma.proposalVersion.findFirst({
    where: { projectId: parent.projectId },
    orderBy: { versionNumber: 'desc' },
  })

  const newVersion = await prisma.proposalVersion.create({
    data: {
      projectId: parent.projectId,
      versionNumber: (maxVersion?.versionNumber ?? 0) + 1,
      label: options.label,
      changeReason: options.changeReason,
      parentVersionId,
      primaryAgent: options.newPrimaryAgent ?? parent.primaryAgent,
      subAgents: options.newSubAgents
        ? JSON.stringify(options.newSubAgents)
        : parent.subAgents,
      cdNotes: options.cdNotes ? JSON.stringify(options.cdNotes) : null,
      status: 'DRAFT',
    },
  })

  // 再実行しないAGの結果を「引き継ぎ」として複製
  const agentOrder = ['AG-01','AG-02','AG-03','AG-04','AG-05','AG-06','AG-07']
  const rerunSet = new Set(options.agentsToRerun)

  // agentsToRerun以降のAGは全て再実行（依存関係があるため）
  const firstRerunIndex = Math.min(
    ...options.agentsToRerun.map(a => agentOrder.indexOf(a))
  )

  for (let i = 0; i < agentOrder.length; i++) {
    const agentId = agentOrder[i]
    const shouldRerun = i >= firstRerunIndex

    if (!shouldRerun) {
      // 前バージョンの結果を引き継ぐ
      const prevExecution = parent.executions.find(e => e.agentId === agentId)
      if (prevExecution) {
        const inherited = await prisma.execution.create({
          data: {
            versionId: newVersion.id,
            agentId,
            mode: 'SPOT',
            status: 'COMPLETED',
            isInherited: true,
            inheritedFromVersionId: parentVersionId,
            completedAt: new Date(),
          },
        })
        // AgentResultも複製
        for (const result of prevExecution.results) {
          await prisma.agentResult.create({
            data: {
              executionId: inherited.id,
              agentId: result.agentId,
              outputJson: result.outputJson,
              editedJson: result.editedJson,
              approvedAt: result.approvedAt,
            },
          })
        }
      }
    }
    // 再実行対象はフロントからの実行で埋まる
  }

  return newVersion
}
```

### 2.3 バージョン一覧の取得

```typescript
export async function getVersionHistory(projectId: string) {
  return prisma.proposalVersion.findMany({
    where: { projectId },
    orderBy: { versionNumber: 'asc' },
    include: {
      executions: {
        include: { results: true },
        orderBy: { startedAt: 'asc' },
      },
      slides: { orderBy: { slideNumber: 'asc' } },
      parentVersion: { select: { versionNumber: true, label: true } },
    },
  })
}
```

---

## 3. API Routes

### 3.1 バージョン一覧

```typescript
// src/app/api/projects/[id]/versions/route.ts

export async function GET(req: NextRequest, { params }) {
  const versions = await getVersionHistory(params.id)
  return NextResponse.json(versions)
}

export async function POST(req: NextRequest, { params }) {
  const body = await req.json()

  // 初回 or 差分更新を判別
  if (body.type === 'new') {
    const version = await createFirstVersion(params.id, body)
    return NextResponse.json(version)
  } else if (body.type === 'update') {
    const version = await createNextVersion(body.parentVersionId, body)
    return NextResponse.json(version)
  }
}
```

### 3.2 バージョン詳細・AG出力参照

```typescript
// src/app/api/versions/[id]/route.ts

export async function GET(req: NextRequest, { params }) {
  const version = await prisma.proposalVersion.findUnique({
    where: { id: params.id },
    include: {
      executions: {
        include: { results: true },
        orderBy: { startedAt: 'asc' },
      },
      slides: { orderBy: { slideNumber: 'asc' } },
    },
  })
  return NextResponse.json(version)
}

// CDのメモ更新
export async function PATCH(req: NextRequest, { params }) {
  const { cdNotes, label } = await req.json()
  const updated = await prisma.proposalVersion.update({
    where: { id: params.id },
    data: {
      cdNotes: cdNotes ? JSON.stringify(cdNotes) : undefined,
      label: label ?? undefined,
    },
  })
  return NextResponse.json(updated)
}
```

---

## 4. チェックポイントUI の再設計

**変更方針:** チェックポイント = AG出力のレビュー＋判断。AG選択は初回設定時に行う。

### 4.1 チェックポイントの表示内容

各フェーズ完了時に以下を表示する：

```typescript
// src/components/checkpoint/CheckpointReview.tsx

interface CheckpointReviewProps {
  phase: 1 | 2 | 3 | 4
  versionId: string
  completedAgents: AgentResult[]
  onApprove: (cdNotes: Record<string, string>) => void
  onRerun: (agentIds: string[]) => void
}
```

**表示レイアウト:**

```
┌─────────────────────────────────────────────────────┐
│ ✋ フェーズ2完了 — 確認してください                  │
│ AG-02 市場分析 / AG-03 競合分析                      │
├─────────────────────────────────────────────────────┤
│ ✅ 取れた情報（信頼度付き）                          │
│                                                     │
│ [high]  採用市場の競合構造                           │
│         電力業界の採用は東電・関電・中部電力の3社が  │
│         主軸。DX人材の争奪が激化...                  │
│                                                     │
│ [med]   ターゲット候補者層の仮説                     │
│         30〜40代・現職エネルギー系・転職回数1〜2回   │
│         ※ AG-01インテーク情報から推定               │
│                                                     │
│ [med]   競合サイト設計水準                           │
│         東電は候補者コミュニティ機能あり...          │
│         ※ URL直接確認済み                           │
├─────────────────────────────────────────────────────┤
│ ❓ 取れなかった情報 → ヒアリング項目                 │
│                                                     │
│ □ 中部電力の現状採用数・今期目標数                   │
│   → クライアントに確認してください                  │
│   [ ここに確認した内容を入力 __________________ ]   │
│                                                     │
│ □ グループ3社の採用優先順位（HD/PG/ミライズ）        │
│   → クライアントに確認してください                  │
│   [ ここに確認した内容を入力 __________________ ]   │
│                                                     │
│ □ 関西電力サイトのURL（直接確認できず）              │
│   → 検索または確認してください                      │
│   [ URLを入力 _____________________________________ ] │
├─────────────────────────────────────────────────────┤
│ 判断してください                                    │
│                                                     │
│ ● このまま次へ進む（ヒアリング項目は後で更新可）     │
│ ○ 特定のAGを再実行する                             │
│   □ AG-02 市場分析  □ AG-03 競合分析               │
├─────────────────────────────────────────────────────┤
│ [次のフェーズへ進む →]          [再実行して確認する] │
└─────────────────────────────────────────────────────┘
```

### 4.2 「取れた情報」の生成ロジック

```typescript
// src/lib/checkpoint-summary.ts

export function buildCheckpointSummary(results: AgentResult[]) {
  const gotInfo: Array<{ confidence: string; title: string; summary: string; source: string }> = []
  const missingInfo: Array<{ item: string; reason: string; confirmMethod: string }> = []

  for (const result of results) {
    const output = JSON.parse(result.editedJson ?? result.outputJson)

    // 各AGの出力から「取れた情報」を抽出
    if (output.factBasis) {
      for (const fact of output.factBasis) {
        gotInfo.push({ confidence: 'high', title: fact, summary: '', source: result.agentId })
      }
    }
    if (output.assumptions) {
      for (const assumption of output.assumptions) {
        gotInfo.push({ confidence: 'medium', title: assumption, summary: '', source: result.agentId })
      }
    }

    // AG-05のrequiresClientConfirmationをそのままヒアリング項目に
    if (output.requiresClientConfirmation) {
      for (const item of output.requiresClientConfirmation) {
        missingInfo.push({
          item: item.item,
          reason: item.reason,
          confirmMethod: item.impactIfUnconfirmed,
        })
      }
    }

    // 各AGのmissingInfoも収集
    if (output.missingInfo) {
      for (const mi of output.missingInfo) {
        missingInfo.push({ item: mi, reason: '', confirmMethod: '' })
      }
    }
  }

  return { gotInfo, missingInfo }
}
```

---

## 5. 過去データ参照UI

### 5.1 サイドバーの全AG参照

**パイプライン実行画面の左サイドバー改善：**

```typescript
// src/components/pipeline/AgentRail.tsx

// 変更前: クリックしても何も起きない
// 変更後: 完了済みのAGをクリックするとOutputPanelに出力を表示

const AgentRail = ({ version, activeAgentId, onSelectAgent }) => {
  return (
    <div className="rail">
      {AGENT_ORDER.map(agentId => {
        const execution = version.executions.find(e => e.agentId === agentId)
        const isDone = execution?.status === 'COMPLETED'
        const isActive = agentId === activeAgentId
        const isInherited = execution?.isInherited

        return (
          <div
            key={agentId}
            className={`r-item ${isDone ? 'done' : ''} ${isActive ? 'on' : ''} ${!isDone ? 'grey' : ''}`}
            onClick={() => isDone && onSelectAgent(agentId)}
          >
            <div className="r-ico">{isDone ? '✓' : agentId.replace('AG-', '')}</div>
            <div className="r-info">
              <div className="r-id">{agentId}</div>
              <div className="r-name">{AG_LABELS[agentId]}</div>
              <div className="r-st">
                {isActive ? '実行中...' :
                 isInherited ? 'v前バージョンから引き継ぎ' :
                 isDone ? '完了 — クリックで参照' : '待機中'}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
```

### 5.2 バージョン履歴パネル

```typescript
// src/components/version/VersionHistory.tsx
// プロジェクト詳細ページの右上に「v1 ▾」のドロップダウンで表示

interface VersionHistoryProps {
  versions: ProposalVersion[]
  currentVersionId: string
  onSelectVersion: (versionId: string) => void
  onCreateUpdate: () => void  // 「このバージョンを更新する」
}

// 表示例:
// ┌─────────────────────────┐
// │ v3  コンペ直前  ● 実行中│ ← 現在
// │ v2  ヒアリング後  ✓ 完了│
// │ v1  初回提案    ✓ 完了  │
// │ ─────────────────────── │
// │ [+ このバージョンを更新] │
// └─────────────────────────┘
```

### 5.3 バージョン更新モーダル

```typescript
// src/components/version/CreateUpdateModal.tsx

// 表示内容:
// - 変更理由の入力（必須）: "競合URLを追加してAG-03を再実行"
// - バージョン名（任意）: "ヒアリング後"
// - 再実行するAGの選択:
//   □ AG-01 インテーク（再実行すると全AGに影響）
//   □ AG-02 市場分析
//   ■ AG-03 競合分析  ← チェック済み
//   □ AG-04 課題構造化（AG-03変更の影響あり → 自動チェック）
//   □ AG-05 ファクトチェック（同上）
//   □ AG-06 設計草案（同上）
//   □ AG-07 提案書草案（同上）
//
// 依存関係の警告:
// 「AG-03を再実行するとAG-04〜07の結果も変わる可能性があります。
//  AG-04以降も再実行しますか？」
//
// ボタン:
// [AG-03のみ再実行（他は引き継ぎ）]  [AG-03以降を全て再実行]
```

---

## 6. 企画書スライドの生成・表示

### 6.1 AG-07完了後のスライド生成

```typescript
// src/lib/slide-generator.ts

export async function generateSlides(versionId: string): Promise<ProposalSlide[]> {
  const version = await prisma.proposalVersion.findUnique({
    where: { id: versionId },
    include: { executions: { include: { results: true } } },
  })

  const ag07Result = version?.executions
    .find(e => e.agentId === 'AG-07')
    ?.results[0]
  if (!ag07Result) throw new Error('AG-07 result not found')

  const story = JSON.parse(ag07Result.editedJson ?? ag07Result.outputJson)
  const slides: Omit<ProposalSlide, 'id' | 'createdAt' | 'updatedAt'>[] = []
  let slideNumber = 1

  // 表紙スライド
  slides.push({
    versionId,
    slideNumber: slideNumber++,
    chapterId: 'cover',
    sectionId: 'cover',
    title: story.conceptWords?.[0]?.copy ?? '提案書',
    catchCopy: story.conceptWords?.[0]?.rationale,
    body: '',
    slideType: 'COVER',
    layoutHint: 'cover-full',
  })

  // 目次スライド
  slides.push({
    versionId,
    slideNumber: slideNumber++,
    chapterId: 'toc',
    sectionId: 'toc',
    title: '目次',
    catchCopy: null,
    body: story.storyLine?.map((ch, i) =>
      `${i + 1}. ${ch.chapterTitle}`
    ).join('\n'),
    slideType: 'TABLE_OF_CONTENTS',
    layoutHint: 'toc',
  })

  // 各章のスライド
  for (const section of story.sections ?? []) {
    const chapter = story.storyLine?.find(ch => ch.chapterId === section.chapterId)

    // Chapter扉スライド（sectionの最初だけ）
    const isFirstInChapter = story.sections
      .filter(s => s.chapterId === section.chapterId)[0]?.sectionId === section.sectionId
    if (isFirstInChapter && chapter) {
      slides.push({
        versionId,
        slideNumber: slideNumber++,
        chapterId: section.chapterId,
        sectionId: 'chapter-title',
        title: chapter.chapterTitle,
        catchCopy: chapter.role,
        body: '',
        slideType: 'CHAPTER_TITLE',
        layoutHint: 'chapter-title',
      })
    }

    // コンテンツスライド
    slides.push({
      versionId,
      slideNumber: slideNumber++,
      chapterId: section.chapterId,
      sectionId: section.sectionId,
      title: section.sectionTitle,
      catchCopy: section.catchCopy,
      body: [
        section.essentiallyLine,
        '---',
        section.body,
        section.editorNote ? `※ ${section.editorNote}` : '',
      ].filter(Boolean).join('\n\n'),
      slideType: 'CONTENT',
      layoutHint: section.visualSuggestion?.startsWith('[数字') ? 'number-hero'
                : section.visualSuggestion?.startsWith('[比較') ? 'two-column'
                : 'text-main',
    })
  }

  // DBに保存
  await prisma.proposalSlide.deleteMany({ where: { versionId } })
  await prisma.proposalSlide.createMany({ data: slides })

  return prisma.proposalSlide.findMany({
    where: { versionId },
    orderBy: { slideNumber: 'asc' },
  })
}
```

### 6.2 A4横スライドプレビュー

```typescript
// src/components/proposal/SlidePreview.tsx
// A4横: 297mm × 210mm → 画面表示: 1190px × 842px（縮小して表示）

const SLIDE_W = 1190  // px（A4横の比率）
const SLIDE_H = 842   // px

const SlidePreview = ({ slide, scale = 0.6 }) => (
  <div
    style={{
      width: SLIDE_W * scale,
      height: SLIDE_H * scale,
      transform: `scale(1)`,
      background: '#FCFBEF',
      border: '1px solid rgba(28,28,23,0.1)',
      position: 'relative',
      overflow: 'hidden',
      fontFamily: 'Manrope, Zen Kaku Gothic New, sans-serif',
    }}
  >
    {slide.slideType === 'COVER' && <CoverLayout slide={slide} />}
    {slide.slideType === 'CHAPTER_TITLE' && <ChapterTitleLayout slide={slide} />}
    {slide.slideType === 'TABLE_OF_CONTENTS' && <TocLayout slide={slide} />}
    {slide.slideType === 'CONTENT' && (
      slide.layoutHint === 'number-hero' ? <NumberHeroLayout slide={slide} /> :
      slide.layoutHint === 'two-column' ? <TwoColumnLayout slide={slide} /> :
      <TextMainLayout slide={slide} />
    )}
  </div>
)
```

### 6.3 目次・ページ構成パネル

```typescript
// src/components/proposal/TableOfContents.tsx
// AG-07完了後に右パネルに表示

// 表示例:
// ┌─────────────────────────────────────────────────────┐
// │ 提案書草案完成   全7章 · 推定22スライド              │
// │ [スライドプレビュー] [Markdown] [エクスポート準備中] │
// ├─────────────────────────────────────────────────────┤
// │ p.1   表紙                                          │
// │ p.2   目次                                          │
// │ ─────────────────────                              │
// │ p.3   Ch.1 現状認識の共有          ▸ 3スライド      │
// │ p.6   Ch.2 課題の本質定義          ▸ 3スライド      │
// │ p.9   Ch.3 解決の方向性            ▸ 3スライド      │
// │ p.12  Ch.4 具体的な提案内容        ▸ 6スライド      │
// │ p.18  Ch.5 期待効果                ▸ 3スライド      │
// │ p.21  Ch.6 進め方・スケジュール    ▸ 3スライド      │
// │                                                     │
// │ 各スライドをクリックで編集可能                       │
// └─────────────────────────────────────────────────────┘
```

---

## 7. アウトプット形式の明示

**AG-07完了後の画面で以下を明示する：**

```
現在のアウトプット形式（Phase 2）:
  ✅ Markdownファイル（ダウンロード可能）
  ✅ ブラウザ内スライドプレビュー（A4横・編集可能）
  ✅ スライドテキスト一括コピー

今後対応予定（Phase 3）:
  ⏳ pptx出力（PowerPoint形式）
  ⏳ PDFエクスポート
  ⏳ ヒアリングシート自動生成（Word/PDF）
```

---

## 8. 実装優先順位

```
Priority 1（DBスキーマ変更・必須）:
  - schema.prisma を上記に更新
  - npx prisma db push
  - 既存データのマイグレーション（Executionをversionに紐付け）

Priority 2（バージョン基本操作）:
  - version-manager.ts の実装
  - /api/projects/[id]/versions API
  - バージョン作成UI（新規プロジェクト作成フローに統合）

Priority 3（チェックポイント再設計）:
  - checkpoint-summary.ts の実装
  - CheckpointReview コンポーネント
  - CDメモ入力→次AGへの反映

Priority 4（過去データ参照）:
  - AgentRail のクリック参照
  - VersionHistory ドロップダウン
  - CreateUpdateModal

Priority 5（スライド生成・表示）:
  - slide-generator.ts
  - SlidePreview（A4横）
  - TableOfContents パネル
```
