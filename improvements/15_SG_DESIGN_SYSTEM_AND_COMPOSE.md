# 15: SG デザインシステム＋SG-00/SG-COMPOSE 実装指示

## 概要

SGパイプラインの大規模リファクタ。以下を実装する：

1. **SG-00（方向性提案）**の新設
2. **SG-COMPOSE（ページ構成設計）**の新設
3. **3層レイアウトシステム**（グリッド×コンポーネント×コンポジションテンプレート）
4. **slide-renderer.tsの全面書き直し**（デザインシステムベース）
5. **types.tsの拡張**
6. **PDF生成の廃止**→ HTML直接表示

---

## パイプラインフロー（新）

```
AG Output (JSON)
  ↓
SG-00 (Opus, ~$0.60) ← 新設
  → 3-5のコンセプト方向性を提案
  → 推奨ページ数を算出
  → ★パイプラインがここで停止★
  ↓
[CDが方向性 + 枚数 + トーン + 重点章を選択]
  ↓
SG-01 (Sonnet, ~$0.15)
  → 章構成、ページ配分、密度計画
  ↓
SG-02 Narrative (Opus, ~$0.90)
  → インサイト抽出、コピー、ヘッドライン、ブリッジ
  ↓
SG-COMPOSE (Opus, ~$1.80) ← 新設
  → グリッド選択 × コンポーネント配置 × テンプレート選択
  → データマッピング（AGフィールド → ゾーン）
  → ブリッジテキスト生成
  ↓
SG-04 Content (Sonnet, ~$0.60)
  → チャプター分割で本文生成
  → evidence, catch copy, caveat, CD notes
  → Chart.js config
  ↓
SG-06 Visual (Sonnet, ~$0.30)
  → Chart.js初期化パラメータ
  → ポジショニングマップCSS
  → ビジュアルスペックプレースホルダー
  ↓
HTML Renderer (slide-renderer.ts)
  → デザインシステムCSS + データ → A4横 HTML
  ↓
HTML Output（ブラウザ直接表示）

Total: ~$4.35/提案, 3-5分
```

---

## 1. types.ts の変更

### 追加する型定義

```typescript
// ═══ SG-00 ═══

export interface ConceptDirection {
  id: string                    // "A", "B", "C", "D"
  concept: string               // 「3秒で閉じている」
  angle: string                 // 「危機感起点」
  coreMessage: string           // ヘッドラインになるメッセージ
  storyArc: string              // ストーリーの流れの概要
  strength: string              // この方向の強み
  risk: string                  // リスク
  bestFor: string               // 最適な相手（経営層、担当者等）
}

export interface Sg00Output {
  directions: ConceptDirection[]   // 3-5方向
  recommendation: string           // 推奨するdirection.id
  reason: string                   // 推奨理由
  recommendedPageCount: number     // AGデータ量から算出した推奨枚数
  pageCountReason: string          // 推奨枚数の根拠
}

// ═══ SG-COMPOSE ═══

// ページグリッド（18種）
export type GridType =
  | 'G-01'  // 全面1ゾーン
  | 'G-02'  // 左右2分割（50:50）
  | 'G-03'  // 左2/3 + 右1/3
  | 'G-04'  // 横3等分
  | 'G-05'  // 縦3等分（バンド）
  | 'G-06'  // 横N等分（4-6列）
  | 'G-07'  // 左1/3 + 右2/3
  | 'G-08'  // 上1/3 + 下2/3
  | 'G-09'  // 上2/3 + 下1/3
  | 'G-10'  // 上バー + 下2分割
  | 'G-11'  // 左サイドバー + 右上下
  | 'G-12'  // 2×2グリッド
  | 'G-13'  // 上バー + 中3列 + 下バー
  | 'G-14'  // 上帯 + 下4列
  | 'G-15'  // 3行×2列
  | 'G-16'  // 左右2分割 + 下帯
  | 'G-17'  // 左40% + 右上下2段
  | 'G-18'  // フリーゾーン（5+）

// ゾーンコンポーネント（50種）
export type ComponentType =
  // テキスト系
  | 't-mega'           // 72px見出し
  | 't-headline-body'  // lg見出し + 本文
  | 't-body-only'      // 本文のみ
  | 't-callout'        // ダーク背景 + 白太字
  | 't-quote'          // 中央寄せ大テキスト
  | 't-kpi-row'        // 大数字 × 2-4 横並び
  | 't-kpi-single'     // 巨大数字1つ
  | 't-evidence'       // ★付き根拠リスト
  | 't-catch-options'  // タグ + コピー + 理由
  | 't-caveat'         // 赤ボーダー注意書き
  | 't-cd-note'        // 青ボーダーCD確認
  | 't-section-label'  // 左上ラベル
  | 't-bridge'         // 次への問いかけ
  // チャート系
  | 'c-bar-h'          // 横棒
  | 'c-bar-v'          // 縦棒
  | 'c-radar'          // レーダー
  | 'c-doughnut'       // ドーナツ
  | 'c-line'           // 折れ線
  | 'c-scatter'        // 散布図
  | 'c-pos-map'        // ポジショニングマップ(CSS)
  // 構造系
  | 's-compare-cols'   // N列比較
  | 's-stacked-cards'  // 縦積みカード
  | 's-band-item'      // バンド1段
  | 's-flow-steps'     // ステップ
  | 's-timeline'       // タイムライン
  | 's-icon-grid'      // アイコングリッド
  | 's-table'          // ストライプテーブル
  | 's-gap-bar'        // GAPバー
  | 's-vis-spec'       // ビジュアルスペック
  | 's-wireframe'      // ワイヤーフレーム
  | 's-funnel'         // ファネル図
  | 's-tree'           // ツリー構造
  | 's-journey-map'    // ジャーニーマップ
  // 装飾系
  | 'd-number-big'     // 巨大装飾数字
  | 'd-divider'        // 区切り線
  | 'd-accent-bar'     // 短い太線
  | 'd-photo-area'     // 写真エリア
  | 'd-dark-band'      // ダーク帯
  | 'd-stats-bar'      // 下部数字帯
  | 'd-chapter-number' // 章番号
  | 'd-icon-circle'    // 円形アイコン
  | 't-toc'            // 目次リスト

// コンポジションテンプレート（63種）
export type CompositionTemplate =
  // A. カバー・タイトル系
  | 'A-01' | 'A-02' | 'A-03' | 'A-04' | 'A-05' | 'A-06' | 'A-07'
  // B. メッセージ主導型
  | 'B-01' | 'B-02' | 'B-03' | 'B-04' | 'B-05' | 'B-06' | 'B-07' | 'B-08' | 'B-09' | 'B-10'
  // C. データ・チャート系
  | 'C-01' | 'C-02' | 'C-03' | 'C-04' | 'C-05' | 'C-06' | 'C-07' | 'C-08' | 'C-09' | 'C-10' | 'C-11' | 'C-12'
  // D. 比較・分析系
  | 'D-01' | 'D-02' | 'D-03' | 'D-04' | 'D-05' | 'D-06' | 'D-07' | 'D-08'
  // E. フロー・プロセス系
  | 'E-01' | 'E-02' | 'E-03' | 'E-04' | 'E-05' | 'E-06'
  // F. カード・グリッド系
  | 'F-01' | 'F-02' | 'F-03' | 'F-04' | 'F-05' | 'F-06' | 'F-07' | 'F-08'
  // G. バンド・セグメント系
  | 'G-01' | 'G-02' | 'G-03' | 'G-04' | 'G-05' | 'G-06'
  // H. 特殊系
  | 'H-01' | 'H-02' | 'H-03' | 'H-04' | 'H-05'

// SG-COMPOSEの出力
export interface ZoneComponent {
  componentId: ComponentType
  data: unknown                 // コンポーネント固有のデータ
  flex?: number                 // ゾーン内での比率（default 1）
}

export interface PageZone {
  zoneId: string                // "A", "B", "C", "D", "E", "F"
  components: ZoneComponent[]
}

export interface PageComposition {
  pageNumber: number
  compositionTemplate: CompositionTemplate   // プリセットテンプレートID
  gridType: GridType
  zones: PageZone[]
  background: 'white' | 'dark' | 'tinted'
  bridgeText?: string           // 次ページへの問いかけ
  sectionLabel?: string         // 左上ラベル（例: "01 課題提起"）
  storyTag?: string             // 根拠紐付け（例: "根拠 → 3層設計"）
  density: 'high' | 'medium' | 'low'
}

export interface SgComposeOutput {
  pages: PageComposition[]
  storyArc: string              // 全体ストーリー概要
  peakPage: number              // ピークページ番号
}

// Slide interfaceの拡張
export interface Slide {
  slideNumber: number
  chapterId: string
  type: SlideType
  compositionTemplate?: CompositionTemplate   // 追加
  gridType?: GridType                         // 追加
  headline: string
  subheadline?: string
  body?: string[]
  visual?: {
    type: 'wireframe' | 'flow' | 'table' | 'matrix' | 'chart' | 'number'
    data: unknown
    chartConfig?: ChartJsConfig
    wireframeAreas?: WireframeArea[]
    caption?: string
  }
  blocks?: {
    id: string
    title: string
    content: string
    sentiment?: 'positive' | 'negative' | 'neutral'  // 追加：色分け
  }[]
  evidence?: {                // 追加
    stars: number             // 1-3
    fact: string
    source: string
  }[]
  caveat?: string             // 追加
  cdRequired?: string         // 追加
  bridgeText?: string         // 追加
  role: SlideRole
  agSources: string[]
  sectionLabel?: string       // 追加
  storyTag?: string           // 追加
}
```

### Theme の変更

```typescript
// 現行のThemeを以下に置き換え

export interface Theme {
  // Backgrounds
  bg: string           // ページ背景
  bgWhite: string      // 白
  bgDark: string       // ダーク
  bgDark2: string      // ダーク濃いめ
  bgAlt: string        // ティンテッド
  bgAlt2: string       // ティンテッド濃いめ

  // Text
  text: string
  textSub: string
  textDim: string
  textInv: string

  // Semantic
  negative: string
  positive: string
  info: string

  // Border
  border: string
  borderLight: string

  // Typography
  fontFamily: string
  tMega: string        // 72px
  tLg: string          // 48px
  tMd: string          // 34px
  tSm: string          // 20px
  tBody: string        // 12px (minimum)
  tLabel: string       // 12px
  tStatLg: string      // 64px
  tStatMd: string      // 40px
  tStatSm: string      // 28px
}

export const THEMES: Record<ToneType, Theme> = {
  simple: {
    bg: '#F2F0EC',
    bgWhite: '#FFFFFF',
    bgDark: '#1A1A1A',
    bgDark2: '#282828',
    bgAlt: '#EAEAE6',
    bgAlt2: '#E0DED9',
    text: '#1A1A1A',
    textSub: '#555555',
    textDim: '#999999',
    textInv: '#F0EDE8',
    negative: '#C0392B',
    positive: '#27764E',
    info: '#2C5F8A',
    border: '#D4D2CD',
    borderLight: '#E8E6E1',
    fontFamily: "'Noto Sans JP', -apple-system, sans-serif",
    tMega: '72px', tLg: '48px', tMd: '34px', tSm: '20px',
    tBody: '12px', tLabel: '12px',
    tStatLg: '64px', tStatMd: '40px', tStatSm: '28px',
  },
  rich: {
    bg: '#0C0C0E',
    bgWhite: '#161619',
    bgDark: '#0C0C0E',
    bgDark2: '#1C1C20',
    bgAlt: '#1A1A1E',
    bgAlt2: '#242428',
    text: '#E8E6E3',
    textSub: '#8A8A8F',
    textDim: '#5A5A60',
    textInv: '#0C0C0E',
    negative: '#E85D5D',
    positive: '#5DC98A',
    info: '#5D8DE8',
    border: 'rgba(255,255,255,0.06)',
    borderLight: 'rgba(255,255,255,0.03)',
    fontFamily: "'Noto Serif JP', 'Noto Sans JP', serif",
    tMega: '72px', tLg: '48px', tMd: '34px', tSm: '20px',
    tBody: '12px', tLabel: '12px',
    tStatLg: '64px', tStatMd: '40px', tStatSm: '28px',
  },
  pop: {
    bg: '#FFFFFF',
    bgWhite: '#FFFFFF',
    bgDark: '#2D2D2D',
    bgDark2: '#3D3D3D',
    bgAlt: '#FFF5EE',
    bgAlt2: '#FFEDE0',
    text: '#333333',
    textSub: '#666666',
    textDim: '#AAAAAA',
    textInv: '#FFFFFF',
    negative: '#E8523A',
    positive: '#2DA86B',
    info: '#3B82F6',
    border: '#E5E5E5',
    borderLight: '#F0F0F0',
    fontFamily: "'Noto Sans JP', -apple-system, sans-serif",
    tMega: '72px', tLg: '48px', tMd: '34px', tSm: '20px',
    tBody: '12px', tLabel: '12px',
    tStatLg: '64px', tStatMd: '40px', tStatSm: '28px',
  },
}
```

---

## 2. SG-00 プロンプト

### ファイル: `prompts/sg-00-direction/default.md`

```
あなたはCDの思考を代行するコンセプトプランナーです。

## 入力
分析データ（AG-01〜AG-07Cの出力JSON）

## 目的
分析データから3-5のコンセプト方向性を提案し、CDが方向性を選択できるようにする。

## 出力
JSON形式で以下を出力：

{
  "directions": [
    {
      "id": "A",
      "concept": "コンセプト名（8文字以内）",
      "angle": "切り口（例：危機感起点、成長機会起点、差別化資産起点）",
      "coreMessage": "提案書のメインメッセージになる1文（30文字以内）",
      "storyArc": "ストーリーの流れ概要（50文字以内）",
      "strength": "この方向の強み（30文字以内）",
      "risk": "リスク（30文字以内）",
      "bestFor": "最適な相手（経営層、担当者等）"
    }
  ],
  "recommendation": "推奨するdirection.id",
  "reason": "推奨理由（50文字以内）",
  "recommendedPageCount": 15,
  "pageCountReason": "AGデータの情報量からN章×平均Mページで算出"
}

## 方向性の出し方

1. AGデータの中から「最も衝撃的な事実」を探す → 危機感起点の方向
2. AGデータの中から「最も大きな機会」を探す → 成長機会起点の方向
3. AGデータの中から「競合にない独自資産」を探す → 差別化起点の方向
4. AGデータの中から「UX/UI設計で解決できる具体的問題」を探す → 設計起点の方向
5. 上記から質の高い3-5方向を選択

## 推奨ページ数の算出方法

AGの各エージェント出力のデータ量を計測：
- AG-01（企業・市場）: 出力あり → +2-3ページ
- AG-02（STP・ジャーニー・ポジショニング）: 出力あり → +3-4ページ
- AG-03（競合・ベンチマーク）: 出力あり → +2-3ページ
- AG-04（課題・インサイト）: 出力あり → +2-3ページ
- カバー・TOC・ビジョン: 常に+3ページ

合計が推奨ページ数。12-20が標準レンジ。
```

### エージェントファイル: `src/agents/slide-gen/sg-00-direction.ts`

- モデル: Opus (`premium`)
- max_tokens: 4096
- 入力: AG全エージェント出力のJSON
- 出力: `Sg00Output`

---

## 3. SG-COMPOSE プロンプト

### ファイル: `prompts/sg-compose/default.md`

```
あなたは提案書のページ構成を設計するクリエイティブディレクターです。

## 入力
- SG-01の章構成
- SG-02のコピー・ヘッドライン
- 選択されたコンセプト方向性（SG-00の出力からCDが選んだもの）
- AGの分析データ
- ユーザー設定（枚数、トーン、重点章）

## 目的
各ページに「どのグリッド × どのコンポーネント」を配置するかを決定する。
ストーリーの文脈を理解した上で、情報密度と伝わり方を最適化する。

## 3層レイアウトシステム

### Layer 1: ページグリッド（18種）
ページの物理的なゾーン分割。
G-01(全面) G-02(左右50:50) G-03(左2/3右1/3) G-04(横3列) G-05(縦3バンド)
G-06(横N列) G-07(左1/3右2/3) G-08(上1/3下2/3) G-09(上2/3下1/3)
G-10(上バー+下2分割) G-11(左サイド+右上下) G-12(2×2) G-13(上+中3列+下)
G-14(上帯+下4列) G-15(3行×2列) G-16(左右+下帯) G-17(左40+右上下) G-18(フリー)

### Layer 2: ゾーンコンポーネント（50種）
各ゾーンに入る部品。

### Layer 3: コンポジションテンプレート（63種）
グリッド×コンポーネントの組み合わせプリセット。
1ページに複数テンプレートを組み合わせることが可能。

## タイポグラフィ（12px下限）
mega: 72px (ジャンプ率6:1) — カバー、ピーク、ビジョン
lg: 48px (4:1) — 各ページメイン見出し
md: 34px (2.8:1) — カード見出し、バンド見出し
sm: 20px (1.7:1) — ラベル見出し
body: 12px (1:1) — 本文、注釈、出典、caveat、全て
label: 12px — letter-spacing:0.14emで差別化
Chart.js全フォント: 12px
stat数字: lg 64px / md 40px / sm 28px

## 絶対禁止ルール

### 中央空洞防止（全型共通）
1. margin-top:auto 全面禁止
2. 要素3つ以上 → justify-content:space-between
3. 要素2つ → 親にgap:12pxで上詰め。余白は最下部のみ

### 文字の重なり防止
1. mega: -webkit-line-clamp:3
2. lg: -webkit-line-clamp:2
3. body: overflow:hidden + flex-shrink:1 + min-height:0
4. Chart.js pointLabels: padding:8px

### その他
1. 12px以下のフォントサイズは使用禁止
2. 空のゾーンを残さない。データ不足ならグリッドを変更
3. テーブルが5列以上の場合、data-split型に変更

## ストーリー接続（ブリッジ）
各ページのフッターに次ページへの問いかけを配置。
- 分析ページ → 「では、なぜ〜なのか？」
- 解決策の前 → 「〜をどう設計するか →」
- 最後 → 「結局、何が起きるのか？ →」

## 出力形式
JSON形式で PageComposition[] を出力。
```

### エージェントファイル: `src/agents/slide-gen/sg-compose.ts`

- モデル: Opus (`premium`)
- max_tokens: 16384（最大のSG）
- 入力: SG-01出力 + SG-02出力 + 選択された方向性 + AGデータ + ユーザー設定
- 出力: `SgComposeOutput`

---

## 4. sg-pipeline.ts の変更

### 主な変更点

1. **SG-00ステップを追加**。`runSg00Direction()`を呼び、結果をDBに保存して停止。
2. **ユーザー選択後に再開**する仕組み。`resumeAfterDirectionSelection()`でSG-01以降を実行。
3. **SG-COMPOSEステップを追加**。SG-02の後、SG-04の前に実行。
4. **PDF生成を削除**。`generatePdf()`呼び出しを削除し、HTML出力のみにする。
5. **slide-renderer.tsの呼び出しを変更**。SG-COMPOSEの`PageComposition[]`を渡す。

### パイプライン関数の分割

```typescript
// Phase 1: 方向性提案（SG-00のみ）
export async function runDirectionProposal(input: SgPipelineInput): Promise<Sg00Output>

// Phase 2: 提案書生成（SG-01 → SG-02 → SG-COMPOSE → SG-04 → SG-06 → HTML）
export async function runProposalGeneration(
  input: SgPipelineInput,
  selectedDirection: ConceptDirection,
): Promise<string>  // HTML string
```

### SgPipelineInput の変更

```typescript
export interface SgPipelineInput {
  versionId: string
  name?: string
  variant: ProposalVariant
  narrativeType?: NarrativeType
  targetScope?: string
  tone: ToneType
  orientation: 'landscape'     // portraitは廃止。横固定。
  slideCount: number            // ユーザー指定（推奨値はSG-00が算出）
  audience: 'executive' | 'manager' | 'creative'
  focusChapters?: string[]
  selectedDirection?: ConceptDirection  // 追加：SG-00で選ばれた方向性
}
```

---

## 5. slide-renderer.ts の全面書き直し

### 設計方針

現行の`renderSlide()`（switch文で12型を分岐）を廃止。
代わりに：

1. **デザインシステムCSS**を生成する関数 → `generateDesignSystemCSS(theme: Theme): string`
2. **コンポーネントレンダラー** → `renderComponent(comp: ZoneComponent, theme: Theme): string`
3. **グリッドレンダラー** → `renderGrid(grid: GridType, zones: PageZone[], theme: Theme): string`
4. **ページレンダラー** → `renderPage(page: PageComposition, theme: Theme): string`

### デザインシステムCSS の要件

以下のルールをCSSに含める：

```css
/* 3層構造 */
.S { width: 1123px; height: 794px; display: flex; flex-direction: column; overflow: hidden; }
.S-header { flex-shrink: 0; height: 32px; }
.S-content { flex: 1; min-height: 0; overflow: hidden; }
.S-footer { flex-shrink: 0; height: 32px; }

/* 中央空洞防止 - 全型共通 */
/* ルール1: margin-top:auto 禁止 → CSSに.mt-autoクラスを定義しない */
/* ルール2: 要素3つ以上 → justify-content:space-between */
/* ルール3: 要素2つ → gap:12px上詰め */

/* タイポグラフィ - 12px下限 */
/* CSSカスタムプロパティでテーマのフォントサイズを適用 */

/* Chart.js - 全フォント12px */
/* Chart.defaults.font.size = 12 */
```

### コンポーネントレンダラーの実装

50種のコンポーネントそれぞれに対して、HTML生成関数を実装。
例：

```typescript
function renderMega(data: { text: string }): string {
  return `<div class="tm">${esc(data.text)}</div>`
}

function renderEvidence(data: { items: { stars: number; fact: string; source: string }[] }): string {
  return data.items.map(item =>
    `<div class="ev"><b>${'★'.repeat(item.stars)}</b><span>${esc(item.fact)} — ${esc(item.source)}</span></div>`
  ).join('')
}

function renderCallout(data: { label: string; text: string }): string {
  return `<div class="co"><div class="co-l">${esc(data.label)}</div><div class="co-t">${esc(data.text)}</div></div>`
}
```

---

## 6. pdf-generator.ts の廃止

- `pdf-generator.ts` を削除
- `sg-pipeline.ts` から `generatePdf()` の呼び出しを削除
- API routes から PDF ダウンロード関連を削除
- 代わりに HTML を直接返す

---

## 7. API routes の変更

### 新規追加

```
POST /api/sg/direction    → SG-00を実行し、方向性を返す
POST /api/sg/generate     → 方向性選択後、SG-01以降を実行
GET  /api/sg/[id]/html    → 生成済みHTMLを返す
```

### 削除

```
GET /api/sg/[id]/download  → PDF ダウンロードを削除
```

---

## 8. Prisma スキーマ変更

```prisma
model SgGeneration {
  // 既存フィールドはそのまま

  // 追加
  directionOutput    String?    // SG-00のJSON出力
  selectedDirection  String?    // CDが選んだ方向性ID ("A", "B", etc.)
  composeOutput      String?    // SG-COMPOSEのJSON出力
  htmlOutput         String?    // 生成済みHTML（pdfOutputの代替）

  // pdfOutput フィールドは残す（後方互換）が、新規生成では使用しない
}
```

---

## 9. UI の変更

### 提案書作成フローの変更

```
現行：
設定画面 → [生成開始] → 待機 → PDF表示

新：
設定画面 → [方向性を提案] → SG-00実行 → 
方向性選択画面（3-5カードから選ぶ + 推奨枚数表示）→ 
[この方向で生成] → SG-01以降実行 → 待機 → HTML表示
```

### 方向性選択画面のUI

```
┌─────────────────────────────────────────────┐
│ コンセプトの方向性を選んでください           │
│                                             │
│ 推奨ページ数: 15ページ                       │
│ (AGデータ量から算出)                         │
│                                             │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐        │
│ │ A ★推奨  │ │ B       │ │ C       │        │
│ │          │ │          │ │          │       │
│ │ 3秒で    │ │ 東名阪  │ │ 若手    │        │
│ │ 閉じている│ │ エリア  │ │ 裁量    │        │
│ │          │ │ 戦略    │ │ モデル  │        │
│ │ 危機感   │ │ 成長    │ │ 差別化  │        │
│ │ 起点     │ │ 機会    │ │ 資産    │        │
│ └─────────┘ └─────────┘ └─────────┘        │
│                                             │
│ ページ数: [15] (推奨: 15)                    │
│ トーン:   ○Simple ○Rich ○Pop               │
│ 重点章:   □課題 □分析 □インサイト           │
│                                             │
│           [この方向で生成する →]              │
└─────────────────────────────────────────────┘
```

---

## 10. テストケース

矢作建設工業（既存versionId）で以下を確認：

1. SG-00が3-5方向を提案し、推奨ページ数を算出できること
2. 方向Aを選択後、SG-01 → SG-02 → SG-COMPOSE → SG-04 → SG-06が順次実行されること
3. SG-COMPOSEが各ページにコンポジションテンプレートを割り当てていること
4. 生成されたHTMLが12px下限のタイポグラフィで表示されること
5. 中央空洞が発生しないこと
6. Chart.jsのラベルが文字に重ならないこと
7. ブリッジテキストが各ページのフッターに表示されること
8. Simpleトーンで正しい色が適用されること

---

## 11. 実装の優先順位

### Phase 1（必須・先にやる）
1. types.ts の拡張
2. SG-00 のプロンプト + エージェントファイル
3. SG-COMPOSE のプロンプト + エージェントファイル
4. sg-pipeline.ts の2フェーズ分割
5. slide-renderer.ts の全面書き直し（デザインシステムCSS + コンポーネントレンダラー）
6. pdf-generator.ts の廃止
7. API routes の変更

### Phase 2（後でよい）
1. 方向性選択UIの実装
2. Rich / Pop トーンのCSS変数定義
3. 63テンプレート全ての実装（Phase 1では使用頻度の高い15-20テンプレートのみ）
4. 推奨ページ数のUI表示
5. 破綻テスト（全テンプレート × 最大/最小データ量）

---

## 12. 参照すべきドキュメント

- `improvements/12_SG_PIPELINE_IMPROVEMENT.md` — 旧SG設計（一部流用可能）
- `improvements/13_SG_IMPLEMENTATION_INSTRUCTIONS.md` — 旧実装指示（一部流用可能）
- `improvements/08_SLIDE_GENERATION_SYSTEM.md` — 初期設計（方向性の参考）

### 参照すべきHTMLサンプル

本セッションで作成した出力サンプル：
- `/mnt/user-data/outputs/yahagi_final_v3.html` — 最新の出力サンプル。12px下限、中央空洞防止ルール適用済み。CSSクラス体系・Chart.js設定・ページ構造の実装リファレンスとして使用すること。
- `/mnt/user-data/outputs/SG_SLIDE_DESIGN_SYSTEM.md` — デザインシステム設計書（初版、10型）。考え方は有効だが、63テンプレートに拡張済み。

---

## Claude Code 実行コマンド

```
リポジトリ: /Users/a05/Web_Proposal (ローカル)
GitHub: https://github.com/sworks-d/Web_Proposal

## 必読ドキュメント
1. improvements/15_SG_DESIGN_SYSTEM_AND_COMPOSE.md ← このファイル
2. src/lib/sg/types.ts ← 現行の型定義
3. src/lib/sg/sg-pipeline.ts ← 現行のパイプライン
4. src/lib/sg/slide-renderer.ts ← 書き直し対象

## 実装タスク（Phase 1）

1. types.ts を拡張（上記「追加する型定義」と「Theme の変更」をそのまま適用）
2. prompts/sg-00-direction/default.md を作成
3. src/agents/slide-gen/sg-00-direction.ts を作成
4. prompts/sg-compose/default.md を作成
5. src/agents/slide-gen/sg-compose.ts を作成
6. sg-pipeline.ts を2フェーズに分割（runDirectionProposal + runProposalGeneration）
7. slide-renderer.ts を全面書き直し
   - generateDesignSystemCSS()
   - renderComponent() × 50種
   - renderGrid() × 18種
   - renderPage()
   - renderSlides() を修正
8. pdf-generator.ts を使用停止（ファイルは残す、呼び出しを削除）
9. API routes: POST /api/sg/direction, POST /api/sg/generate, GET /api/sg/[id]/html
10. Prismaスキーマに directionOutput, selectedDirection, composeOutput, htmlOutput を追加
11. npx prisma db push

## 重要ポイント
- フォント最小12px。9px, 10px, 11pxは全て12pxに統一。
- margin-top:auto は全面禁止。
- Chart.jsのfont.sizeは全て12px。pointLabelsのpadding:8px。
- SG-00はOpus。SG-COMPOSEもOpus。
- orientationは'landscape'固定。portraitは廃止。
- HTMLのプロトタイプは /mnt/user-data/outputs/yahagi_final_v3.html を参照。
```
