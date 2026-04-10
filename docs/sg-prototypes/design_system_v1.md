# SG スライドデザインシステム設計書

## 概要

SGが任意のコンテンツを受け取ったときに、**文字が重ならない・余白が暴れない・読める状態が保証される**レイアウトシステム。

slide-renderer.tsはこの仕様に基づいて書き直す。

---

## 1. 設計原則

### 絶対やってはいけないこと（破綻条件）

| 破綻 | 原因 | 防止ルール |
|------|------|-----------|
| 文字が要素に重なる | overflow:hiddenなしでfixed heightに詰め込む | **全テキスト要素にoverflow制御を入れる** |
| 余白が画面の半分以上 | コンテンツが上に寄って下が空く | **flex:1で残りスペースを必ず使い切る** |
| 文字が読めないほど小さい | A4に情報を詰め込みすぎ | **body最小10px、caption最小8px** |
| テーブルがはみ出す | 列数×セル内テキストが幅を超過 | **5列以上のテーブルは型をsplitに変更** |

### レイアウトの基本構造

全スライドは3層構造：

```
┌──────────────────────────────────────┐
│ HEADER（固定高）                       │ ← セクションラベル + stag
│  max-height: 80px                     │
├──────────────────────────────────────┤
│                                      │
│ CONTENT（flex:1 — 残りを全部使う）      │ ← 型ごとに異なるグリッド
│                                      │
│                                      │
├──────────────────────────────────────┤
│ FOOTER（固定高）                       │ ← ページ番号 + ブリッジ
│  max-height: 40px                     │
└──────────────────────────────────────┘
```

**CONTENT層がflex:1で残り全部を使う**。これが余白問題の唯一の解決策。

---

## 2. スライドタイプ定義（10型）

### 型一覧

| # | 型名 | 用途 | CONTENT層のレイアウト | いつ使うか |
|---|------|------|---------------------|-----------|
| 1 | `cover` | 表紙 | 中央寄せ＋下部帯 | 最初の1枚 |
| 2 | `chapter-title` | 章タイトル | 下寄せ＋ボーダー | 各章の最初 |
| 3 | `statement` | メッセージ＋根拠 | 左:見出し+body / 右:エビデンスorチャート | **headline＋body＋根拠がセットの場合** |
| 4 | `data-split` | データ可視化 | 左:テキスト / 右:チャートorマップ | **visual.typeが存在する場合** |
| 5 | `comparison` | 比較 | N列均等分割（2〜4列） | **visual.type==='table' && headers.length >= 3** |
| 6 | `bands` | 3段構成 | 水平3バンド（均等分割） | **blocks.length === 3** |
| 7 | `metrics` | 数字ヒーロー | 中央に大数字 + 下に説明 | **visual.type==='number'** |
| 8 | `quote` | 引用/結論 | 中央寄せ大テキスト | **role==='hook' \|\| role==='decide'でbody短い** |
| 9 | `grid-cards` | カード一覧 | 2×2 or 3列グリッド | **blocks.length >= 4** |
| 10 | `full-visual` | 全面ビジュアル | チャートが全面を占有 | **visual優先でテキストが少ない場合** |


### 各型のCSS構造

#### 型1: cover
```
.slide[data-type="cover"] {
  display: flex;
  flex-direction: column;
}
.slide[data-type="cover"] .content {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;        /* 中央寄せ */
}
.slide[data-type="cover"] .bottom-stats {
  display: flex;
  border-top: 1px solid var(--border);
  flex-shrink: 0;
}
.slide[data-type="cover"] .bottom-stats > div {
  flex: 1;
  padding: 16px 24px;
  border-right: 1px solid var(--border);
}
```
- headline: mega (44-52px)
- body: max 3行
- 下部帯: 数字が3つ以上ある場合に表示

#### 型2: chapter-title
```
.slide[data-type="chapter-title"] .content {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;      /* 下寄せ */
  padding-bottom: 24px;
  border-bottom: 3px solid var(--accent);
}
```
- headline: mega (40-48px)
- subheadline: body size
- **ページの60%以上が意図的な余白**（これは許容。章の「間」として機能）

#### 型3: statement（最頻出型）
```
.slide[data-type="statement"] .content {
  display: grid;
  grid-template-columns: 1fr 1fr;  /* or 5fr 4fr */
  gap: 24px;
  flex: 1;
}
.slide[data-type="statement"] .left {
  display: flex;
  flex-direction: column;
}
.slide[data-type="statement"] .right {
  display: flex;
  flex-direction: column;
}
```
- 左列: headline(lg) → body → エビデンス（下寄せ: margin-top:auto）
- 右列: チャート or カード or ビジュアル（flex:1で全高使用）
- **左右どちらかにチャートがない場合**: 左のbodyを広げる（grid-template-columns: 1fr）
- **オーバーフロー防止**: bodyは`-webkit-line-clamp`でmax 8行。超過分はcaptionで「詳細は別紙」

#### 型4: data-split
```
.slide[data-type="data-split"] .content {
  display: grid;
  grid-template-columns: 45fr 55fr;  /* チャートを広く */
  gap: 0;
  flex: 1;
}
.slide[data-type="data-split"] .text-side {
  padding: 24px;
  display: flex;
  flex-direction: column;
}
.slide[data-type="data-split"] .visual-side {
  background: var(--bg-alt);
  padding: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}
```
- text-side: headline + body + evidence（stackedで下寄せ）
- visual-side: **背景色を変えて視覚的に分離**。チャートが親の高さいっぱいに伸びる

#### 型5: comparison
```
.slide[data-type="comparison"] .content {
  display: grid;
  grid-template-columns: repeat(N, 1fr);  /* Nは比較対象の数 */
  gap: 0;
  flex: 1;
}
.slide[data-type="comparison"] .col {
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--border);
}
.slide[data-type="comparison"] .col-header {
  padding: 12px 16px;
  background: var(--dark);
  color: var(--inv);
  flex-shrink: 0;
}
.slide[data-type="comparison"] .col-body {
  padding: 12px 16px;
  flex: 1;                        /* 残り全部使う */
  display: flex;
  flex-direction: column;
  gap: 8px;
}
```
- 各列が画面高さいっぱいまで伸びる
- テーブルの代替。4列以下で使用
- **5列以上の場合**: data-splitに変換し、右半分にスクロール可能テーブル
- **最後の列（自社）**: 背景色を変えて強調

#### 型6: bands
```
.slide[data-type="bands"] .content {
  display: flex;
  flex-direction: column;
  flex: 1;
}
.slide[data-type="bands"] .band {
  flex: 1;                        /* 均等分割 */
  display: flex;
  align-items: stretch;
  border-bottom: 1px solid var(--border);
}
.slide[data-type="bands"] .band-label {
  width: 100-140px;
  background: var(--dark);
  color: var(--inv);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.slide[data-type="bands"] .band-content {
  flex: 1;
  padding: 12px 20px;
  display: flex;
  align-items: center;
}
```
- 3つのブロック → 画面を3等分
- 各バンドのband-contentはflex:1で横に広がる
- **バンド内のテキストが多い場合**: font-sizeを10pxに縮小
- **4つ以上のブロック**: grid-cardsに切り替え

#### 型7: metrics
```
.slide[data-type="metrics"] .content {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  flex: 1;
}
```
- 数字: 72-96px
- 単位: 24px
- 説明: body size
- **余白は意図的**。数字の「間」として機能

#### 型8: quote
```
.slide[data-type="quote"] .content {
  display: flex;
  flex-direction: column;
  justify-content: center;
  flex: 1;
  max-width: 800px;
  margin: 0 auto;
}
```
- headline: 36-44px
- body: 14-16px
- **余白は意図的**

#### 型9: grid-cards
```
.slide[data-type="grid-cards"] .content {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 8px;
  flex: 1;
  align-content: stretch;        /* 縦方向も埋める */
}
.slide[data-type="grid-cards"] .card {
  padding: 16px;
  display: flex;
  flex-direction: column;
}
```
- 4ブロック: 2×2
- 3ブロック: 3列
- 6ブロック: 3×2
- 各カードが均等にスペースを埋める

---

## 3. 型の選択ロジック

SG-04（またはslide-renderer）が、Slideのデータから最適な型を自動選択する。

```typescript
function selectSlideType(slide: Slide): SlideType {
  const { visual, blocks, body, role, headline } = slide;
  const bodyLen = (body ?? []).join('').length;
  const blockCount = (blocks ?? []).length;
  const hasChart = visual?.type === 'chart' && visual.chartConfig;
  const hasTable = visual?.type === 'table';
  const hasFlow = visual?.type === 'flow';
  const hasMatrix = visual?.type === 'matrix';
  const hasNumber = visual?.type === 'number';
  const hasWireframe = visual?.type === 'wireframe';
  const tableColCount = hasTable
    ? ((visual.data as any)?.headers?.length ?? 0)
    : 0;

  // 1. 特殊ロール
  if (slide.type === 'cover') return 'cover';
  if (slide.type === 'chapter-title') return 'chapter-title';

  // 2. 数字ヒーロー
  if (hasNumber) return 'metrics';

  // 3. 引用/結論（テキスト短い＋hookまたはdecide）
  if ((role === 'hook' || role === 'decide') && bodyLen < 200 && !visual) {
    return 'quote';
  }

  // 4. 比較（テーブルの列数で判定）
  if (hasTable && tableColCount >= 3 && tableColCount <= 5) {
    return 'comparison';
  }

  // 5. 3バンド（ブロックが3つ）
  if (blockCount === 3 && !visual) {
    return 'bands';
  }

  // 6. グリッドカード（ブロックが4つ以上）
  if (blockCount >= 4) {
    return 'grid-cards';
  }

  // 7. データ分割（チャート/マトリクス/ワイヤーフレーム）
  if (hasChart || hasMatrix || hasWireframe || hasFlow) {
    return 'data-split';
  }

  // 8. テキスト＋根拠（bodyが長い or エビデンスがある）
  if (bodyLen > 100) {
    return 'statement';
  }

  // 9. テーブルが5列以上
  if (hasTable && tableColCount > 5) {
    return 'data-split';  // 右にスクロール可能テーブル
  }

  // 10. フォールバック: statement
  return 'statement';
}
```

### 選択フロー（フローチャート）

```
START
 │
 ├─ cover/chapter-title? → そのまま
 │
 ├─ visual.type === 'number'? → metrics
 │
 ├─ role=hook/decide && bodyLen<200 && no visual? → quote
 │
 ├─ visual.type === 'table' && cols 3-5? → comparison
 │
 ├─ blocks === 3 && no visual? → bands
 │
 ├─ blocks >= 4? → grid-cards
 │
 ├─ has chart/matrix/wireframe/flow? → data-split
 │
 ├─ bodyLen > 100? → statement
 │
 └─ default → statement
```

---

## 4. タイポグラフィ階層

| レベル | 用途 | サイズ | weight | line-height | 最大行数 |
|--------|------|--------|--------|-------------|---------|
| mega | cover/quoteの見出し | 44-52px | 900 | 1.05 | 4行 |
| lg | 章/セクション見出し | 28-36px | 900 | 1.1 | 3行 |
| md | サブ見出し/カードタイトル | 16-20px | 900 | 1.15 | 2行 |
| sm | ラベル/バンドタイトル | 13-15px | 900 | 1.2 | 2行 |
| body | 本文 | 11-12px | 400 | 1.6 | 制限なし（overflow管理） |
| caption | 注釈/出典 | 9-10px | 400 | 1.4 | 2行 |
| label | セクションラベル | 9px | 500-700 | 1.0 | 1行 |

### ジャンプ率

- mega : body = **4:1以上**（44px : 11px）
- これにより見出しが最初に目に入る

### オーバーフロー防止

```css
/* テキスト要素の共通ルール */
.headline {
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: var(--max-lines, 3);
  -webkit-box-orient: vertical;
}

/* body要素 */
.body-text {
  overflow: hidden;
  flex-shrink: 1;  /* スペースが足りなければ縮む */
  min-height: 0;   /* flexboxで縮小を許可 */
}
```

---

## 5. 色と余白のルール

### 余白

| 場所 | 値 | 備考 |
|------|-----|------|
| ページ padding | 32-40px | 型により微調整 |
| grid gap | 20-28px | 型により |
| 要素間 margin | 6-12px | コンパクトに |
| カード内 padding | 14-20px | |

### 背景色の使い分け

- **白（#FFF）**: デフォルト
- **ティンテッド（#EAEAE6）**: data-splitの右側、交互ページ
- **ダーク（#1A1A1A）**: cover、insightのquote、3層概要、chapter-title
- **赤背景（rgba）**: 自社のネガティブ強調

### 色のルール

- ポジティブ（競合の強み）: `var(--green)` #27764E
- ネガティブ（自社の弱み）: `var(--red)` #C0392B
- ニュートラル: `var(--text-sub)` #5A5A58
- アクセント: `var(--dark)` #1A1A1A（ベージュ系のため黒がアクセント）

---

## 6. ブリッジ（ページ間接続）のルール

### 構造

```
┌──────────────────────────────────────┐
│ SECTION 01/02          次への問い →   │
└──────────────────────────────────────┘
```

### ブリッジテキストの生成ルール

SGが各スライドの`bridgeText`を生成する。ルール：

1. **問いかけ型**: 次のページが分析の場合 → 「では、なぜ〜なのか？」
2. **予告型**: 次のページが解決策の場合 → 「〜をどう設計するか →」
3. **収束型**: 最後のページの場合 → 「結局、何が起きるのか？ →」
4. **なし**: chapter-titleの場合（章タイトル自体がブリッジ）

---

## 7. 型選択の改善指針

### データ不足時のフォールバック

| 状態 | フォールバック |
|------|---------------|
| visual.dataが空 | data-split → statement に変更 |
| tableのrowsが空 | comparison → statement に変更（ヘッダーだけのテーブルを防ぐ） |
| chartConfigが不正 | チャート部分を「データ準備中」プレースホルダーに |
| bodyが空 | headlineのフォントサイズを拡大し、quoteに切り替え |

### コンテンツ量による動的調整

```typescript
function adjustForContentVolume(slide: Slide, type: SlideType): SlideType {
  const bodyLen = (slide.body ?? []).join('').length;
  const blockCount = (slide.blocks ?? []).length;

  // statement型でテキストが極端に少ない → quote
  if (type === 'statement' && bodyLen < 80 && !slide.visual) {
    return 'quote';
  }

  // comparison型で列が多すぎる → data-split
  if (type === 'comparison') {
    const cols = (slide.visual?.data as any)?.headers?.length ?? 0;
    if (cols > 5) return 'data-split';
  }

  // bands型でブロック内テキストが長い → grid-cardsの方が安全
  if (type === 'bands' && blockCount === 3) {
    const maxBlockLen = Math.max(
      ...(slide.blocks ?? []).map(b => b.content.length)
    );
    if (maxBlockLen > 200) return 'grid-cards';
  }

  return type;
}
```

---

## 8. Slide interfaceの拡張

```typescript
export interface Slide {
  slideNumber: number;
  chapterId: string;
  type: SlideType;           // SGが指定 or selectSlideType()で自動決定
  headline: string;
  subheadline?: string;
  body?: string[];
  visual?: {
    type: 'wireframe' | 'flow' | 'table' | 'matrix' | 'chart' | 'number';
    data: unknown;
    chartConfig?: ChartJsConfig;
    wireframeAreas?: WireframeArea[];
    caption?: string;
  };
  blocks?: {
    id: string;
    title: string;
    content: string;
    sentiment?: 'positive' | 'negative' | 'neutral';  // 追加：色分け用
  }[];
  evidence?: {                // 追加：根拠データ
    stars: number;            // 1-3
    fact: string;
    source: string;
  }[];
  caveat?: string;            // 追加：注意書き
  cdRequired?: string;        // 追加：CD確認事項
  bridgeText?: string;        // 追加：次ページへの問いかけ
  role: SlideRole;
  agSources: string[];
  sectionLabel?: string;      // 追加：左上のラベル（例：「課題提起」「競合分析」）
  storyTag?: string;          // 追加：根拠の紐付け（例：「根拠→3層設計」）
}
```

---

## 9. 実装優先順位

1. **selectSlideType()とadjustForContentVolume()を実装**
   → これだけで型の自動選択が動く

2. **slide-renderer.tsを10型対応に書き直し**
   → 各型のCSS構造を実装。flex:1とoverflow管理を徹底

3. **Slide interfaceにevidence/caveat/bridgeText等を追加**
   → SG-04のプロンプトを更新して出力させる

4. **テーマ対応**
   → CSS変数をsimple/rich/popで切り替え

---

## 10. 検証方法

### 破綻テスト

以下のケースで型が破綻しないことを確認：

| テストケース | 期待動作 |
|-------------|---------|
| bodyが0文字 | quote or megaサイズ拡大 |
| bodyが1000文字超 | line-clamp + overflow:hidden |
| テーブルが8列 | data-splitにフォールバック |
| テーブルのrowsが空 | statementにフォールバック |
| blocksが7つ | grid-cards（3列×3行、1つ空） |
| chartConfigが不正JSON | プレースホルダー表示 |
| headlineが80文字超 | line-clamp:3 + font-size縮小 |
| 全フィールドが最大長 | overflowしないことを確認 |
| 全フィールドが最小長 | 余白が半分以下であることを確認 |
