# 提案書生成システム（SG）実装指示

## 背景

現状の問題:
- AGが高品質な分析情報を出しているのに、提案書（SG）が箇条書きの羅列になっている
- 図解・ワイヤーフレームが「テキスト指示」のまま描画されていない
- ストーリー・インサイトがなく、「情報の羅列」になっている

目標:
- AGの分析をクライアントが「これでいこう」と即決する提案書に変換
- 表・グラフを実際に描画（chart.js / HTML table）
- PDF出力（A4サイズ）

設計ドキュメント: `improvements/12_SG_PIPELINE_IMPROVEMENT.md`

---

## パラメータ一覧

### 種別（variant）— 何を出力するか

| 値 | 説明 | 章構成 | 想定枚数 |
|---|---|---|---|
| `full` | フルリニューアル | 課題→分析→ターゲット→ジャーニー→コンセプト→設計→IA→コンテンツ→KPI | 25-40枚 |
| `strategy` | 戦略・方向性 | 課題→ターゲット→インサイト→コンセプト→実現イメージ | 15-25枚 |
| `analysis` | 現状分析 | 現状分析→競合分析→ユーザー行動→課題構造→方向性 | 15-25枚 |
| `content` | コンテンツ追加 | コンテンツ課題→ターゲット×コンテンツ→戦略→サイトマップ→ページ設計 | 15-25枚 |
| `spot` | 部分改善・特定ページ | 問題点→課題優先順位→施策一覧→施策詳細→期待効果 | 10-20枚 |

### 型（narrativeType）— どう伝えるか

| 値 | 説明 | 向いている相手 | デフォルト種別 |
|---|---|---|---|
| `insight` | 本質を突く | 課題が言語化されていない | full, strategy |
| `data` | ファクトで説得 | 経営層・数字重視 | analysis |
| `vision` | 大きな絵を描く | 経営者・決裁者 | — |
| `solution` | 実務的に解決 | 担当者・課題が明確 | content, spot |

### トーン（tone）

| 値 | イメージ | 背景色 | アクセント色 |
|---|---|---|---|
| `simple` | Apple的 | #FFFFFF | #0071E3 |
| `rich` | FAS的 | #1A1A1A | #C9A86C |
| `pop` | 東組採用的 | #FFFFFF | #FF6B35 |

### 向き・サイズ（orientation）

**A4サイズ**（16:9ではない）

| 値 | サイズ（mm） | ピクセル（96dpi） |
|---|---|---|
| `landscape` | 297×210 | 1123×794 |
| `portrait` | 210×297 | 794×1123 |

### 聴衆（audience）

| 値 | 特徴 |
|---|---|
| `executive` | 結論先行、数字重視、簡潔 |
| `manager` | 詳細説明、根拠重視、網羅的 |
| `creative` | ビジュアル重視、感性訴求 |

### 重点章（focusChapters）

選択した章は **+60%** のページ配分。最大2つ。JSON配列で保存。

### スポット対象（targetScope）— 種別がspotの時のみ

| 値 | 使用するAGソース |
|---|---|
| `top` | AG-07C-1, AG-02-STP, AG-04-INSIGHT |
| `list` | AG-07C-2, AG-02-JOURNEY |
| `detail` | AG-07C-3, AG-02-JOURNEY |
| `cv-flow` | AG-07C-4, AG-04-INSIGHT |
| `navigation` | AG-07C-1, AG-02-JOURNEY |
| `other` | 全AGソース（自由入力） |

### 提案書名（name）

任意。例: 「経営層向け戦略提案」

---

## エージェント構成

| SG | モデル | 役割 |
|---|---|---|
| SG-01 | Sonnet | 章構成・型選択・ページ配分 |
| SG-02 | **Opus** (`claude-opus-4-20250514`) | インサイト・コピー・緩急設計 |
| SG-04 | Sonnet | 本文生成・スライドタイプ決定 |
| SG-06 | Sonnet | ビジュアル生成（chart.js/table/SVG） |

**削除したSG:**
- SG-03（心理設計）→ SG-02に統合
- SG-05（レイアウト設計）→ SG-04に統合

---

## ビジュアル生成（SG-06）

**生成するもの:**
| タイプ | 方法 |
|---|---|
| 比較表・一覧表 | HTML `<table>` |
| 棒グラフ・円グラフ・線グラフ | chart.js |
| 2x2マトリクス | SVG |
| フロー図（3-5ステップ） | SVG |

**生成しないもの（プレースホルダー + 指示）:**
| タイプ | 出力 |
|---|---|
| ワイヤーフレーム | グレーボックス + 「CDが作成: 〇〇」テキスト |
| 複雑な図解 | プレースホルダー + 指示テキスト |

---

## 既存ファイル（置き換え対象）

```
src/agents/sg-01.ts〜sg-06.ts  → 削除
src/agents/sg-types.ts         → src/lib/sg/types.ts に移行
src/lib/sg-pipeline.ts         → src/lib/sg/sg-pipeline.ts に置き換え
src/app/api/sg-generation/     → src/app/api/sg/ に置き換え
prisma/schema.prisma           → SgGenerationモデルを更新
```

---

## Phase 1: 最小実装

### 1. Prismaスキーマ修正

`prisma/schema.prisma` に追加:

```prisma
model SgGeneration {
  id           String   @id @default(cuid())
  versionId    String
  version      ProposalVersion @relation(fields: [versionId], references: [id], onDelete: Cascade)
  
  // 識別用
  name         String?  // 提案書名（例: "経営層向け戦略提案"）
  targetScope  String?  // スポット型の対象（例: "TOPページ", "CVフロー"）
  
  // パラメータ
  variant      String   // full | strategy | analysis | content | spot（種別）
  narrativeType String  // insight | data | vision | solution（型）
  tone         String   // simple | rich | pop
  orientation  String   // landscape | portrait
  slideCount   Int
  audience     String   // executive | manager | creative
  focusChapters String? // 重点章（JSON配列）
  
  // 各SGの出力（JSON文字列）
  sg01Output   String?
  sg02Output   String?
  sg03Output   String?
  sg04Output   String?
  sg05Output   String?
  sg06Output   String?
  
  // 最終出力
  slidesJson   String?
  pdfPath      String?
  
  // ステータス
  status       String   @default("PENDING")  // PENDING | RUNNING | COMPLETED | ERROR
  currentStep  String?
  errorMessage String?
  startedAt    DateTime?
  completedAt  DateTime?
  createdAt    DateTime @default(now())
}
```

ProposalVersionにリレーション追加:
```prisma
model ProposalVersion {
  // ... 既存フィールド
  sgGenerations SgGeneration[]
}
```

`npx prisma db push` を実行。

---

### 2. 型定義

`src/lib/sg/types.ts` を作成:

```typescript
// 種別（何を出力するか）
export type ProposalVariant = 'full' | 'strategy' | 'analysis' | 'content' | 'spot'

// 型（どう伝えるか）
export type NarrativeType = 'insight' | 'data' | 'vision' | 'solution'

// トーン（3種）
export type ToneType = 'simple' | 'rich' | 'pop'

// 種別ごとのデフォルト章構成
export const VARIANT_CHAPTERS: Record<ProposalVariant, string[]> = {
  full: ['課題', '分析', 'ターゲット', 'ジャーニー', 'コンセプト', '設計', 'IA', 'コンテンツ', 'KPI'],
  strategy: ['課題', 'ターゲット', 'インサイト', 'コンセプト', '実現イメージ'],
  analysis: ['現状分析', '競合分析', 'ユーザー行動', '課題構造', '方向性'],
  content: ['コンテンツ課題', 'ターゲット×コンテンツ', '戦略', 'サイトマップ', 'ページ設計'],
  spot: ['問題点', '課題優先順位', '施策一覧', '施策詳細', '期待効果'],
}

// 種別ごとのデフォルト型
export const VARIANT_DEFAULT_NARRATIVE: Record<ProposalVariant, NarrativeType> = {
  full: 'insight',
  strategy: 'insight',
  analysis: 'data',
  content: 'solution',
  spot: 'solution',
}

// 重点章のページ配分ルール
// 選択した章は +60% のページ割り当て
export const FOCUS_CHAPTER_MULTIPLIER = 1.6

// スポット対象の選択肢
export const SPOT_TARGET_OPTIONS = [
  { value: 'top', label: 'TOPページ', agSources: ['AG-07C-1', 'AG-02-STP', 'AG-04-INSIGHT'] },
  { value: 'list', label: '一覧ページ', agSources: ['AG-07C-2', 'AG-02-JOURNEY'] },
  { value: 'detail', label: '詳細ページ', agSources: ['AG-07C-3', 'AG-02-JOURNEY'] },
  { value: 'cv-flow', label: 'CVフロー', agSources: ['AG-07C-4', 'AG-04-INSIGHT'] },
  { value: 'navigation', label: 'ナビゲーション', agSources: ['AG-07C-1', 'AG-02-JOURNEY'] },
  { value: 'other', label: 'その他', agSources: [] }, // 自由入力、全AGソース使用
]

// スライドの役割
export type SlideRole = 
  | 'hook'      // 引き込む
  | 'empathize' // 共感させる
  | 'alert'     // 危機感を与える
  | 'insight'   // 気づきを与える
  | 'convince'  // 納得させる
  | 'visualize' // 見せる
  | 'excite'    // ワクワクさせる
  | 'reassure'  // 安心させる
  | 'decide'    // 決断を促す

// スライドタイプ（10種）
export type SlideType =
  | 'cover'
  | 'chapter-title'
  | 'text-only'
  | 'text-visual-split'
  | 'visual-full'
  | 'wireframe-detail'
  | 'comparison-table'
  | 'flow-diagram'
  | 'matrix-2x2'
  | 'metrics-hero'
  | 'quote'
  | 'roadmap'

// 章の定義
export interface Chapter {
  id: string
  title: string
  role: SlideRole
  pageCount: number
  beforeState: string
  afterState: string
  keyMessage: string
  agSources: string[]
}

// SG-01の出力
export interface Sg01Output {
  proposalType: ProposalType
  proposalTypeReason: string
  chapters: Chapter[]
  pacing: {
    buildUp: string[]
    climax: string[]
    pause: string[]
  }
}

// SG-02の出力
export interface Sg02Output {
  coreInsight: {
    type: 'paradox' | 'structure' | 'reframe'
    statement: string
    evidence: string[]
    implication: string
  }
  coreNarrative: {
    hook: string
    tension: string
    insight: string
    resolution: string
    vision: string
  }
  chapterCopies: {
    chapterId: string
    headline: string
    hookLine: string
    keyPoint: string
    transition: string
  }[]
  clientLanguage: {
    theirWord: string
    ourWord: string
    usage: string
  }[]
}

// スライド
export interface Slide {
  slideNumber: number
  chapterId: string
  type: SlideType
  headline: string
  subheadline?: string
  body?: string[]
  visual?: {
    type: 'wireframe' | 'flow' | 'table' | 'matrix' | 'chart' | 'number'
    data: unknown
    caption?: string
  }
  blocks?: {
    id: string
    title: string
    content: string
  }[]
  role: SlideRole
  agSources: string[]
}

// SG-04の出力
export interface Sg04Output {
  slides: Slide[]
}

// テーマ
export interface Theme {
  bg: string
  bgAlt: string
  text: string
  textSub: string
  accent: string
  accentSub?: string
  fontTitle: string
  fontBody: string
  titleSize: string
  headingSize: string
  bodySize: string
  pagePadding: string
}

// テーマ定義
export const THEMES: Record<ToneType, Theme> = {
  simple: {
    bg: '#FFFFFF',
    bgAlt: '#F5F5F7',
    text: '#1D1D1F',
    textSub: '#6E6E73',
    accent: '#0071E3',
    fontTitle: '"Helvetica Neue", "Hiragino Sans", sans-serif',
    fontBody: '"Helvetica Neue", "Hiragino Sans", sans-serif',
    titleSize: '48px',
    headingSize: '32px',
    bodySize: '16px',
    pagePadding: '80px',
  },
  rich: {
    bg: '#1A1A1A',
    bgAlt: '#242424',
    text: '#F5F5F5',
    textSub: '#999999',
    accent: '#C9A86C',
    fontTitle: '"Georgia", "Hiragino Mincho ProN", serif',
    fontBody: '"Hiragino Sans", sans-serif',
    titleSize: '40px',
    headingSize: '28px',
    bodySize: '14px',
    pagePadding: '60px',
  },
  pop: {
    bg: '#FFFFFF',
    bgAlt: '#FFF8F0',
    text: '#333333',
    textSub: '#666666',
    accent: '#FF6B35',
    accentSub: '#FFB800',
    fontTitle: '"Rounded Mplus 1c", "Hiragino Sans", sans-serif',
    fontBody: '"Hiragino Sans", sans-serif',
    titleSize: '44px',
    headingSize: '30px',
    bodySize: '15px',
    pagePadding: '48px',
  },
}
```

---

### 3. SG-01 プロンプト

`prompts/sg-01-structure/default.md` を作成:

```markdown
# SG-01: 提案書構成設計

## 役割

提案書の「型」を選択し、章構成を決定する。

## 入力

- AG全出力（AG-01〜AG-07の分析結果）
- クライアント情報
- パラメータ（枚数、聴衆）

## 提案書の4つの型

### 型A: insight（インサイト・ドリブン）
課題が言語化されていない時に使う。
1. あなたが感じている違和感（hook）
2. その正体（insight）
3. だからこう変わるべき（convince）
4. 具体的にはこうする（visualize）
5. 実現すると何が変わるか（excite）

### 型B: data（データ・ドリブン）
経営層・数字重視の相手に使う。
1. 市場・競合の現状（inform）
2. あなたの現状との差（alert）
3. 差を埋める方法（convince）
4. 実装計画（reassure）
5. 期待効果（decide）

### 型C: vision（ビジョン・ドリブン）
フルリニューアル・経営者向け。
1. 世の中はこう変わっている（alert）
2. あなたの業界もこう変わる（connect）
3. その中であなたはこうあるべき（inspire）
4. そのためのサイト設計（visualize）
5. 未来の姿（excite）

### 型D: solution（課題解決・ドリブン）
課題が明確な改善案件向け。
1. あなたの課題（confirm）
2. 原因分析（insight）
3. 解決策（convince）
4. 優先順位（reassure）
5. 実装計画（decide）

## 型の選択基準

- ヒアリングで課題が言語化されていない → insight
- 経営層への説明が必要、ROI重視 → data
- フルリニューアル、ブランド再定義 → vision
- 課題が明確、改善案件 → solution

## 各章のページ数配分（25枚の場合）

| 章 | 型によるページ数 |
|---|---|
| 表紙・目次 | 2p |
| 章1 | 3-4p |
| 章2 | 4-5p |
| 章3 | 5-6p |
| 章4 | 6-8p |
| 章5 | 3-4p |

## AGソースの割り当て

各章で使用するAGソースを指定する:

- hook/empathize: AG-04-INSIGHT, AG-02-STP.targeting
- alert: AG-03-GAP, AG-03-COMPETITOR
- insight: AG-04-INSIGHT, AG-04-MAIN
- convince: AG-02-STP, AG-02-JOURNEY
- visualize: AG-07C-1, AG-07C-2, AG-07C-3
- excite/decide: AG-06, AG-04-MAIN

## 出力形式

JSONのみ。コードフェンス不要。

{
  "proposalType": "insight|data|vision|solution",
  "proposalTypeReason": "この型を選んだ理由（2文以内）",
  "chapters": [
    {
      "id": "ch-01",
      "title": "章タイトル",
      "role": "hook|empathize|alert|insight|convince|visualize|excite|reassure|decide",
      "pageCount": 3,
      "beforeState": "この章を見る前の読者の心理",
      "afterState": "この章を見た後の読者の心理",
      "keyMessage": "この章で伝える1メッセージ",
      "agSources": ["AG-04-INSIGHT", "AG-02-STP"]
    }
  ],
  "pacing": {
    "buildUp": ["ch-01", "ch-02"],
    "climax": ["ch-03"],
    "pause": ["ch-04"]
  }
}
```

---

### 4. SG-02 プロンプト

`prompts/sg-02-narrative/default.md` を作成（設計ドキュメントのSG-02セクションをそのまま使用）。

Opusを使用。最重要エージェント。

---

### 5. SG-04 プロンプト

`prompts/sg-04-content/default.md` を作成。

AGの情報をスライドに展開するマッピングを含める。

チャプターごとに分割実行:

```typescript
// sg-04はチャプターごとに呼び出す
for (const chapter of sg01Output.chapters) {
  const chapterPrompt = buildChapterPrompt(chapter, agOutputs, sg02Output)
  const slides = await callSg04(chapterPrompt)
  allSlides.push(...slides)
}
```

---

### 6. パイプライン実装

`src/lib/sg/sg-pipeline.ts`:

```typescript
import { prisma } from '@/lib/prisma'
import { callAgent } from '@/lib/agent-runner'
import { Sg01Output, Sg02Output, Sg04Output, Slide, ProposalVariant, NarrativeType, VARIANT_DEFAULT_NARRATIVE } from './types'

interface SgPipelineInput {
  versionId: string
  name?: string                      // 提案書名（任意）
  variant: ProposalVariant           // 種別: full | strategy | analysis | content | spot
  targetScope?: string               // スポット型の対象（例: "TOPページ"）
  narrativeType?: NarrativeType      // 型: 指定なしなら種別に応じて自動選択
  tone: 'simple' | 'rich' | 'pop'
  orientation: 'landscape' | 'portrait'
  slideCount: number
  audience: 'executive' | 'manager' | 'creative'
  focusChapters?: string[]           // 重点章
}

export async function runSgPipeline(input: SgPipelineInput): Promise<string> {
  // 型の自動選択
  const narrativeType = input.narrativeType || VARIANT_DEFAULT_NARRATIVE[input.variant]
  
  // 1. SgGeneration作成
  const sg = await prisma.sgGeneration.create({
    data: {
      versionId: input.versionId,
      name: input.name,
      targetScope: input.targetScope,
      variant: input.variant,
      narrativeType: narrativeType,
      tone: input.tone,
      orientation: input.orientation,
      slideCount: input.slideCount,
      audience: input.audience,
      focusChapters: input.focusChapters ? JSON.stringify(input.focusChapters) : null,
      status: 'RUNNING',
      startedAt: new Date(),
    },
  })

  try {
    // 2. AG出力を取得
    const agOutputs = await getAgOutputs(input.versionId)

    // 3. SG-01: 構成設計
    await updateStep(sg.id, 'SG-01')
    const sg01Output = await runSg01(agOutputs, input)
    await prisma.sgGeneration.update({
      where: { id: sg.id },
      data: { sg01Output: JSON.stringify(sg01Output) },
    })

    // 4. SG-02: ナラティブ設計（Opus）
    await updateStep(sg.id, 'SG-02')
    const sg02Output = await runSg02(agOutputs, sg01Output)
    await prisma.sgGeneration.update({
      where: { id: sg.id },
      data: { sg02Output: JSON.stringify(sg02Output) },
    })

    // 5. SG-04: 本文生成（チャプター分割）
    await updateStep(sg.id, 'SG-04')
    const allSlides: Slide[] = []
    for (const chapter of sg01Output.chapters) {
      const chapterSlides = await runSg04Chapter(agOutputs, sg01Output, sg02Output, chapter)
      allSlides.push(...chapterSlides)
    }
    await prisma.sgGeneration.update({
      where: { id: sg.id },
      data: { sg04Output: JSON.stringify({ slides: allSlides }) },
    })

    // 6. HTMLレンダリング
    await updateStep(sg.id, 'RENDERING')
    const slidesHtml = renderSlides(allSlides, input.tone, input.orientation)

    // 7. PDF生成
    await updateStep(sg.id, 'PDF')
    const pdfPath = await generatePdf(slidesHtml, sg.id)

    // 8. 完了
    await prisma.sgGeneration.update({
      where: { id: sg.id },
      data: {
        slidesJson: JSON.stringify(allSlides),
        pdfPath,
        status: 'COMPLETED',
        completedAt: new Date(),
        currentStep: null,
      },
    })

    return sg.id
  } catch (error) {
    await prisma.sgGeneration.update({
      where: { id: sg.id },
      data: {
        status: 'ERROR',
        errorMessage: error instanceof Error ? error.message : String(error),
      },
    })
    throw error
  }
}

async function updateStep(sgId: string, step: string) {
  await prisma.sgGeneration.update({
    where: { id: sgId },
    data: { currentStep: step },
  })
}
```

---

### 7. HTMLスライドレンダラー

`src/lib/sg/slide-renderer.tsx`:

Phase 1では3種のテンプレートを実装:
- `text-only`: テキストのみ
- `text-visual-split`: 左テキスト・右ビジュアル
- `wireframe-detail`: 左ワイヤー・右3ブロック

```typescript
import { Slide, Theme, THEMES, ToneType } from './types'

// A4サイズ（ピクセル @96dpi）
// 横: 1123px × 794px
// 縦: 794px × 1123px
const A4_LANDSCAPE = { width: 1123, height: 794 }
const A4_PORTRAIT = { width: 794, height: 1123 }

export function renderSlides(
  slides: Slide[],
  tone: ToneType,
  orientation: 'landscape' | 'portrait'
): string {
  const theme = THEMES[tone]
  const size = orientation === 'landscape' ? A4_LANDSCAPE : A4_PORTRAIT
  const { width, height } = size

  const slidesHtml = slides.map((slide, i) => renderSlide(slide, theme, width, height, i)).join('\n')

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: ${theme.fontBody}; }
    .slide {
      width: ${width}px;
      height: ${height}px;
      padding: ${theme.pagePadding};
      background: ${theme.bg};
      color: ${theme.text};
      page-break-after: always;
      position: relative;
      overflow: hidden;
    }
    .headline {
      font-family: ${theme.fontTitle};
      font-size: ${theme.headingSize};
      font-weight: 700;
      margin-bottom: 24px;
    }
    .body { font-size: ${theme.bodySize}; line-height: 1.75; }
    .split { display: flex; gap: 40px; height: calc(100% - 80px); }
    .split-left, .split-right { flex: 1; }
    
    /* 表スタイル */
    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 14px;
    }
    .data-table th, .data-table td {
      padding: 12px 16px;
      text-align: left;
      border-bottom: 1px solid ${theme.bgAlt};
    }
    .data-table th {
      background: ${theme.bgAlt};
      font-weight: 700;
      color: ${theme.accent};
    }
    .data-table tr:hover {
      background: ${theme.bgAlt};
    }
    
    /* プレースホルダー */
    .placeholder-box {
      background: ${theme.bgAlt};
      border: 2px dashed ${theme.textSub};
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: ${theme.textSub};
      font-size: 14px;
      text-align: center;
      padding: 24px;
    }
  </style>
</head>
<body>
${slidesHtml}
<script>
  // chart.jsの初期化はスライドごとに行う
  document.querySelectorAll('[data-chart]').forEach(canvas => {
    const config = JSON.parse(canvas.dataset.chart);
    new Chart(canvas, config);
  });
</script>
</body>
</html>
`
}

function renderSlide(slide: Slide, theme: Theme, width: number, height: number, index: number): string {
  switch (slide.type) {
    case 'cover':
      return renderCover(slide, theme)
    case 'chapter-title':
      return renderChapterTitle(slide, theme)
    case 'text-only':
      return renderTextOnly(slide, theme)
    case 'text-visual-split':
      return renderTextVisualSplit(slide, theme, index)
    case 'wireframe-detail':
      return renderWireframeDetail(slide, theme)
    case 'comparison-table':
      return renderComparisonTable(slide, theme)
    case 'chart':
      return renderChart(slide, theme, index)
    default:
      return renderTextOnly(slide, theme) // フォールバック
  }
}

// 比較表テンプレート
function renderComparisonTable(slide: Slide, theme: Theme): string {
  const { headline, visual } = slide
  const tableData = visual?.data as { headers: string[], rows: string[][] }
  
  return `
  <div class="slide">
    <h2 class="headline">${headline}</h2>
    <table class="data-table">
      <thead>
        <tr>${tableData.headers.map(h => `<th>${h}</th>`).join('')}</tr>
      </thead>
      <tbody>
        ${tableData.rows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}
      </tbody>
    </table>
  </div>
  `
}

// グラフテンプレート
function renderChart(slide: Slide, theme: Theme, index: number): string {
  const { headline, visual } = slide
  const chartConfig = JSON.stringify(visual?.data)
  
  return `
  <div class="slide">
    <h2 class="headline">${headline}</h2>
    <div style="height: calc(100% - 100px); display: flex; align-items: center; justify-content: center;">
      <canvas id="chart-${index}" data-chart='${chartConfig}' style="max-width: 100%; max-height: 100%;"></canvas>
    </div>
  </div>
  `
}

// 各テンプレートの実装...
```

---

### 8. PDF生成

`src/lib/sg/pdf-generator.ts`:

```typescript
import puppeteer from 'puppeteer'
import fs from 'fs/promises'
import path from 'path'

// A4サイズ（mm）
// 横: 297mm × 210mm
// 縦: 210mm × 297mm

export async function generatePdf(
  html: string, 
  sgId: string,
  orientation: 'landscape' | 'portrait'
): Promise<string> {
  const browser = await puppeteer.launch({ headless: true })
  const page = await browser.newPage()
  
  await page.setContent(html, { waitUntil: 'networkidle0' })
  
  const outputDir = path.join(process.cwd(), 'public', 'proposals')
  await fs.mkdir(outputDir, { recursive: true })
  
  const pdfPath = path.join(outputDir, `${sgId}.pdf`)
  
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    landscape: orientation === 'landscape',
    printBackground: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
  })
  
  await browser.close()
  
  return `/proposals/${sgId}.pdf`
}
```

Puppeteerをインストール: `npm install puppeteer`

---

### 9. API Route

`src/app/api/sg/generate/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { runSgPipeline } from '@/lib/sg/sg-pipeline'

export async function POST(req: Request) {
  const body = await req.json()
  
  const sgId = await runSgPipeline({
    versionId: body.versionId,
    name: body.name,                           // 提案書名（任意）
    variant: body.variant || 'full',           // 種別（必須）
    targetScope: body.targetScope,             // スポット対象（spot時のみ）
    narrativeType: body.narrativeType,         // 型（省略可、自動選択）
    tone: body.tone || 'simple',
    orientation: body.orientation || 'landscape',
    slideCount: body.slideCount || 25,
    audience: body.audience || 'manager',
    focusChapters: body.focusChapters,         // 重点章（省略可）
  })
  
  return NextResponse.json({ sgId })
}
```

### 10. 提案書一覧API

`src/app/api/sg/list/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const versionId = searchParams.get('versionId')
  
  if (!versionId) {
    return NextResponse.json({ error: 'versionId required' }, { status: 400 })
  }
  
  const proposals = await prisma.sgGeneration.findMany({
    where: { versionId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      variant: true,
      targetScope: true,
      narrativeType: true,
      tone: true,
      slideCount: true,
      audience: true,
      status: true,
      currentStep: true,
      pdfPath: true,
      createdAt: true,
      completedAt: true,
    },
  })
  
  return NextResponse.json({ proposals })
}
```

`src/app/api/sg/[id]/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const sg = await prisma.sgGeneration.findUnique({
    where: { id: params.id },
  })
  
  if (!sg) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  
  return NextResponse.json(sg)
}
```

---

### 10. UI（SlideGeneratorPanel更新）

既存の `SlideGeneratorPanel.tsx` を更新して新しいAPIを使用。

---

## ディレクトリ構成

```
src/lib/sg/
  types.ts           # 型定義
  sg-pipeline.ts     # パイプライン
  slide-renderer.tsx # HTMLレンダラー
  pdf-generator.ts   # PDF生成
  prompts/
    sg-01.ts         # SG-01プロンプトビルダー
    sg-02.ts         # SG-02プロンプトビルダー
    sg-04.ts         # SG-04プロンプトビルダー

prompts/
  sg-01-structure/default.md
  sg-02-narrative/default.md
  sg-04-content/default.md

src/app/api/sg/
  generate/route.ts
  [id]/route.ts
```

---

## 実装順序（Phase 1）

1. `npx prisma db push`（スキーマ）
2. `src/lib/sg/types.ts`
3. `src/lib/sg/sg-pipeline.ts`
4. `src/lib/sg/slide-renderer.tsx`
5. `src/lib/sg/pdf-generator.ts`
6. API routes
7. 提案書一覧UI

## 作成済みプロンプト

```
prompts/sg-01-structure/default.md  ← 作成済み
prompts/sg-02-narrative/default.md  ← 作成済み
prompts/sg-04-content/default.md    ← 作成済み
prompts/sg-06-visual/default.md     ← 作成済み
```

---

## エージェント構成（確定）

| SG | モデル | 役割 |
|---|---|---|
| SG-01 | Sonnet | 章構成・型選択・ページ配分 |
| SG-02 | **Opus** | インサイト・コピー・緩急設計（旧SG-03統合） |
| SG-04 | Sonnet | 本文生成・スライドタイプ決定（旧SG-05統合） |
| SG-06 | Sonnet | ビジュアル生成（chart.js/table/SVG） |

**削除したSG:**
- SG-03（心理設計）→ SG-02に統合
- SG-05（レイアウト設計）→ SG-04に統合

---

## 注意点

- SG-02はOpusを使用（`claude-opus-4-20250514`）
- SG-01, SG-04はSonnetを使用
- SG-04はチャプターごとに分割実行（1回で全スライドは無理）
- AG出力はversionから取得（既存の`getAgOutputs`を流用）
- 設計ドキュメント `/home/claude/Web_Proposal/improvements/12_SG_PIPELINE_IMPROVEMENT.md` を必ず読んでから実装
