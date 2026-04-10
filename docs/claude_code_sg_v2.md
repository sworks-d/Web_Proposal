# Claude Code 実装指示 — SGデザインシステム v2

## このドキュメントの目的

あなたは Web_Proposal リポジトリの SG（提案書生成）パイプラインを大規模リファクタする。
このファイルが実装の全体マップ。上から順に読めば何をすべきかわかる。

---

## 背景（3行で）

- Web_Proposal は Web提案書を自動生成するシステム。AG（分析エージェント群）が分析し、SG（スライド生成エージェント群）が提案書を生成する。
- 現行のSGはPDF出力だが壊れている（テーブルのボディが空、本文なし）。PDFを廃止し、HTML直接表示に切り替える。
- 今回の実装は「SG-00（方向性提案）の新設」「SG-COMPOSE（ページ構成設計）の新設」「3層レイアウトシステムの実装」「slide-renderer.tsの全面書き直し」。

---

## 必読ドキュメント（この順番で読む）

### 1. 設計仕様（最重要）
**`improvements/15_SG_DESIGN_SYSTEM_AND_COMPOSE.md`**

全仕様がこの1ファイルに入っている。以下が含まれる：
- パイプラインフロー（SG-00 → SG-01 → SG-02 → SG-COMPOSE → SG-04 → SG-06 → HTML）
- types.ts に追加すべき全型定義（コピペ可能なTypeScript）
- Theme の変更（新しいカラートークン体系）
- SG-00 のプロンプトとエージェント仕様
- SG-COMPOSE のプロンプトとエージェント仕様
- sg-pipeline.ts の2フェーズ分割設計
- slide-renderer.ts の設計方針
- API routes の変更
- Prisma スキーマ変更
- UI の変更（方向性選択画面）
- テストケース
- 実装優先順位（Phase 1 / Phase 2）

### 2. HTMLプロトタイプ（実装リファレンス）
**`docs/sg-prototypes/prototype_simple_v3.html`**

実際に動くHTMLサンプル。ブラウザで開いて確認できる。
このファイルから以下を読み取る：
- CSSクラス体系（`.tm` `.tl` `.tmd` `.tsm` `.tb` `.tlab` 等）
- タイポグラフィ階層（72px / 48px / 34px / 20px / 12px）
- Chart.js の設定パターン（12pxフォント、pointLabels padding:8px）
- 3層ページ構造（.H header / .C content / .F footer）
- 中央空洞防止の実装方法（mt-autoなし、space-between、gap:12px）
- コンポーネントの実装例（callout、evidence、catch copy、caveat等）

### 3. 既存コード（変更対象）
- `src/lib/sg/types.ts` — 型定義。大幅に拡張する
- `src/lib/sg/sg-pipeline.ts` — パイプライン。2フェーズに分割する
- `src/lib/sg/slide-renderer.ts` — 全面書き直し
- `src/lib/sg/pdf-generator.ts` — 使用停止（ファイルは残す）

### 4. 旧設計ドキュメント（参考程度）
- `improvements/12_SG_PIPELINE_IMPROVEMENT.md` — 旧SG設計
- `improvements/13_SG_IMPLEMENTATION_INSTRUCTIONS.md` — 旧実装指示
- `improvements/08_SLIDE_GENERATION_SYSTEM.md` — 初期設計

---

## 実装タスク（Phase 1 — この順番で）

### Step 1: Prisma スキーマ更新

`prisma/schema.prisma` の SgGeneration モデルに以下を追加：
```prisma
directionOutput    String?
selectedDirection  String?
composeOutput      String?
htmlOutput         String?
```
追加後: `npx prisma db push`

### Step 2: types.ts 拡張

`improvements/15_SG_DESIGN_SYSTEM_AND_COMPOSE.md` の「1. types.ts の変更」セクションにある型定義を全て追加する。
Themeも新しい定義に置き換える。

主な追加：
- `Sg00Output`, `ConceptDirection`
- `GridType` (18種), `ComponentType` (50種), `CompositionTemplate` (63種)
- `PageComposition`, `SgComposeOutput`
- `Slide` の拡張（evidence, caveat, cdRequired, bridgeText, sectionLabel, storyTag）
- 新しい `Theme` 定義と `THEMES`

### Step 3: SG-00 プロンプト + エージェント

1. `prompts/sg-00-direction/default.md` を作成（仕様書のプロンプト内容をそのまま使う）
2. `src/agents/slide-gen/sg-00-direction.ts` を作成
   - モデル: Opus (`premium`)
   - max_tokens: 4096
   - 入力: AG全エージェント出力JSON
   - 出力: `Sg00Output`

### Step 4: SG-COMPOSE プロンプト + エージェント

1. `prompts/sg-compose/default.md` を作成（仕様書のプロンプト内容をそのまま使う）
2. `src/agents/slide-gen/sg-compose.ts` を作成
   - モデル: Opus (`premium`)
   - max_tokens: 16384
   - 入力: SG-01出力 + SG-02出力 + 選択方向性 + AGデータ
   - 出力: `SgComposeOutput`

### Step 5: sg-pipeline.ts の2フェーズ分割

```typescript
// Phase 1: 方向性提案のみ（SG-00）
export async function runDirectionProposal(input: SgPipelineInput): Promise<Sg00Output>

// Phase 2: 方向性選択後に実行（SG-01 → SG-02 → SG-COMPOSE → SG-04 → SG-06 → HTML）
export async function runProposalGeneration(
  input: SgPipelineInput,
  selectedDirection: ConceptDirection,
): Promise<string>
```

- 既存の `runSgPipeline()` は `runProposalGeneration()` に名前変更
- SG-COMPOSE のステップを SG-02 の後、SG-04 の前に追加
- PDF生成の呼び出しを削除
- orientation は `'landscape'` 固定

### Step 6: slide-renderer.ts 全面書き直し

**最も作業量が多いステップ。**

構造：
```
generateDesignSystemCSS(theme)  → CSSテキスト
renderComponent(comp, theme)    → HTML片（50種のswitch）
renderGrid(grid, zones, theme)  → ゾーン配置HTML
renderPage(page, theme)         → 1ページのHTML（Header + Content + Footer）
renderSlides(pages, theme)      → 全ページHTML + CSS + Chart.js
```

**実装のポイント：**
- `docs/sg-prototypes/prototype_simple_v3.html` のCSSをベースにする
- 全フォントサイズは12px以上（CSS変数で管理）
- Chart.js は `Chart.defaults.font.size = 12` + `pointLabels.padding = 8`
- `margin-top: auto` は全面禁止。代わりに `justify-content: space-between`（要素3+）または `gap: 12px`（要素2）
- 全ページの Content 層は `flex: 1; min-height: 0; overflow: hidden;`

**Phase 1 で実装するテンプレート（優先20種）：**
A-01, A-02, A-06, A-07,
B-01, B-03, B-04, B-10,
C-01, C-07, C-08,
D-01, D-04, D-07,
E-02,
F-02,
G-01, G-02, G-03,
H-02

残りはPhase 2で追加。

### Step 7: API routes

```
POST /api/sg/direction    → runDirectionProposal() を呼ぶ
POST /api/sg/generate     → runProposalGeneration() を呼ぶ
GET  /api/sg/[id]/html    → DB から htmlOutput を返す
```

### Step 8: PDF 関連の無効化

- `sg-pipeline.ts` から `generatePdf()` の呼び出しを削除
- `pdf-generator.ts` は削除しない（後方互換のため残す）
- PDF ダウンロードの API route がある場合、HTML にリダイレクト

---

## 絶対守るルール（実装中に迷ったらここを見る）

| ルール | 理由 |
|--------|------|
| フォント最小12px | CDからの明確な指示。9/10/11pxは全て12pxに |
| margin-top:auto 禁止 | 中央に空洞ができる。space-between or gap で代替 |
| Chart.jsフォント12px | 全ラベル、凡例、タイトル、pointLabels |
| Chart.js pointLabels padding:8px | テキストとレーダー線の重なり防止 |
| flex:1でContent層を埋める | 余白がページ下半分に集中する問題の防止 |
| orientationは landscape固定 | A4横置き(1123×794px)のみ |
| SG-00とSG-COMPOSEはOpus | コンセプト策定とページ構成設計はCDの判断を代行するため |
| HTMLで直接出力 | PDF変換は廃止済み |

---

## ファイル構成（実装後の想定）

```
src/lib/sg/
├── types.ts                  ← 拡張
├── sg-pipeline.ts            ← 2フェーズに分割
├── slide-renderer.ts         ← 全面書き直し
├── pdf-generator.ts          ← 使用停止（残す）
└── design-system.ts          ← 新規（CSSとコンポーネントの定義）

src/agents/slide-gen/
├── sg-00-direction.ts        ← 新規
├── sg-compose.ts             ← 新規
├── sg-01-structure.ts        ← 既存（変更なし）
├── sg-02-narrative.ts        ← 既存（変更なし）
├── sg-04-content.ts          ← 既存（Slide拡張に対応）
└── sg-06-visual.ts           ← 既存（変更なし）

prompts/
├── sg-00-direction/default.md  ← 新規
├── sg-compose/default.md       ← 新規
├── sg-01-structure/            ← 既存
├── sg-02-narrative/            ← 既存
├── sg-04-content/              ← 既存
└── sg-06-visual/               ← 既存

docs/sg-prototypes/
├── prototype_simple_v3.html   ← CSSとレイアウトの実装リファレンス
└── design_system_v1.md        ← 初期デザインシステム（参考）
```

---

## 質問がある場合

この指示書で不明な点があれば、`improvements/15_SG_DESIGN_SYSTEM_AND_COMPOSE.md` を参照。
それでも不明な場合は、`docs/sg-prototypes/prototype_simple_v3.html` のHTMLソースを実際に読んで、CSSクラスとレイアウト構造を確認すること。
