# 12: 提案書生成システム（全面再設計）

## 目標

**Gensparkを超える提案書を自動生成する。**

Gensparkは「Web Proposal Agentのダッシュボード画面」を渡しただけで、そのトーンを理解して提案書を作った。
同様に、Simple/Rich/Popのリファレンス（Webサイト）を渡すだけで、そのトーンを「提案書」に翻訳できるようにする。

---

## 現状の問題

1. **図解が生成されていない** — `[ビジュアル] chart: ...` がテキストのまま出力
2. **レイアウトがない** — 全ページが箇条書きの羅列
3. **デザインが存在しない** — 余白・強弱・タイポグラフィ・色が設計されていない
4. **「提案書の設計メモ」が出力されている** — 完成品ではなく指示書が出ている

---

## アーキテクチャ（再設計）

```
AG-01〜07: 分析（既存）
    ↓
SG-01: 構成設計（スライドタイプを決定）
    ↓
SG-02: コピー生成（Opus）
    ↓
SG-03: ストーリー設計（Opus）
    ↓
SG-04: 本文生成（チャプター分割）
    ↓
SG-05: レイアウト＋図解データ生成
    ↓
【新規】SG-06-VIZ: SVG/図解を実生成
    - ワイヤーフレーム → SVG
    - フロー図 → SVG
    - 比較表 → HTML
    - 棒グラフ → SVG
    ↓
【新規】HTMLスライドレンダラー（React/Tailwind）
    ↓
Puppeteer → PDF
```

---

## トーン別デザインシステム

### リファレンス

| トーン | 参考 | 特徴 |
|---|---|---|
| **Simple** | Apple | 白ベース、余白大、1スライド1メッセージ、サンセリフ |
| **Rich** | FAS | ダーク基調、情報量多め、セリフ系混在、高級感 |
| **Pop** | 東組採用 | 明るい多色、イラスト多用、丸ゴシック、遊び心 |

### Simple（Apple的）

```typescript
const SIMPLE_THEME = {
  // カラー
  bg: '#FFFFFF',
  bgAlt: '#F5F5F7',
  text: '#1D1D1F',
  textSub: '#6E6E73',
  accent: '#0071E3',
  line: '#E5E5E5',
  
  // タイポグラフィ
  fontTitle: '"SF Pro Display", "Helvetica Neue", sans-serif',
  fontBody: '"SF Pro Text", "Helvetica Neue", sans-serif',
  
  // サイズ（A4ヨコ想定）
  titleSize: '48px',
  headingSize: '32px',
  bodySize: '16px',
  captionSize: '12px',
  
  // ウェイト
  titleWeight: 700,
  bodyWeight: 400,
  
  // 余白
  pagePadding: '80px',
  sectionGap: '48px',
  
  // レイアウト原則
  // - 1スライド1メッセージ
  // - 余白を惜しまない
  // - 数字は大きく単独で見せる
  // - 図解はシンプルな線と円
}
```

### Rich（FAS的）

```typescript
const RICH_THEME = {
  // カラー
  bg: '#1A1A1A',
  bgAlt: '#242424',
  text: '#F5F5F5',
  textSub: '#999999',
  accent: '#C9A86C',       // ゴールド
  accentSub: '#8B7355',
  line: '#333333',
  
  // タイポグラフィ
  fontTitle: '"Georgia", "Times New Roman", serif',
  fontBody: '"Noto Sans JP", sans-serif',
  
  // サイズ
  titleSize: '40px',
  headingSize: '28px',
  bodySize: '14px',
  captionSize: '11px',
  
  // ウェイト
  titleWeight: 400,  // セリフは細め
  bodyWeight: 300,
  
  // 余白
  pagePadding: '60px',
  sectionGap: '40px',
  
  // レイアウト原則
  // - 情報量多め、密度高い
  // - グリッド構成
  // - 細い罫線で区切る
  // - 図解は精緻に
}
```

### Pop（東組採用的）

```typescript
const POP_THEME = {
  // カラー
  bg: '#FFFFFF',
  bgAlt: '#FFF8F0',
  text: '#333333',
  textSub: '#666666',
  accent: '#FF6B35',       // オレンジ
  accentSub: '#FFB800',    // イエロー
  accentAlt: '#00B4D8',    // ブルー
  line: '#E0E0E0',
  
  // タイポグラフィ
  fontTitle: '"Rounded Mplus 1c", "Arial Rounded MT Bold", sans-serif',
  fontBody: '"Noto Sans JP", sans-serif',
  
  // サイズ
  titleSize: '44px',
  headingSize: '30px',
  bodySize: '15px',
  captionSize: '12px',
  
  // ウェイト
  titleWeight: 800,
  bodyWeight: 500,
  
  // 余白
  pagePadding: '48px',
  sectionGap: '32px',
  
  // レイアウト原則
  // - 角丸多用
  // - アイコン・イラスト多め
  // - 多色（3〜4色）
  // - 動きのあるレイアウト
}
```

---

## スライドタイプ（10種）

| タイプ | 用途 | レイアウト |
|---|---|---|
| `cover` | 表紙 | センター配置、キーメッセージ大 |
| `chapter-title` | 章タイトル | 大きな見出し + サブコピー |
| `text-visual-split` | 説明ページ | 左テキスト / 右図解（または逆） |
| `wireframe` | UI設計 | 左ワイヤー / 右説明3ブロック |
| `flow-diagram` | 導線設計 | フロー図 + 説明 |
| `comparison-table` | 比較 | 表形式 |
| `metrics` | KPI・数値 | 大きな数字 + 説明 |
| `matrix` | マトリクス | 2x2または軸図 |
| `roadmap` | 優先順位 | フェーズ分け |
| `quote` | 強調 | 大きなテキスト |

---

## SG-06-VIZ: 図解生成エージェント

### 概要

SG-05が出力した「図解指示」を、実際のSVG/HTMLに変換する。

### 入力

```json
{
  "type": "wireframe",
  "title": "グループTOP",
  "components": [
    { "type": "header", "content": "ロゴ / ナビ / CTA" },
    { "type": "hero", "content": "FV: コピー & サブコピー" },
    { "type": "cta-row", "buttons": ["職種から探す", "面談予約"] },
    { "type": "grid-3col", "items": ["DX・IT系", "インフラ系", "営業系"] }
  ]
}
```

### 出力（SVG）

```svg
<svg viewBox="0 0 400 600" xmlns="http://www.w3.org/2000/svg">
  <!-- Header -->
  <rect x="0" y="0" width="400" height="40" fill="#f5f5f5" stroke="#e0e0e0"/>
  <text x="16" y="25" font-size="11" fill="#666">ロゴ / ナビ / CTA</text>
  
  <!-- Hero -->
  <rect x="12" y="52" width="376" height="100" fill="#e8e8e8" rx="4"/>
  <text x="24" y="95" font-size="14" fill="#333">FV: コピー & サブコピー</text>
  
  <!-- CTA Row -->
  <rect x="24" y="120" width="80" height="28" rx="4" fill="#333"/>
  <text x="36" y="138" font-size="10" fill="#fff">職種から探す</text>
  <rect x="112" y="120" width="70" height="28" rx="4" fill="none" stroke="#333"/>
  <text x="124" y="138" font-size="10" fill="#333">面談予約</text>
  
  <!-- 3 Column Grid -->
  <rect x="12" y="170" width="120" height="60" fill="#f0f0f0" rx="4"/>
  <rect x="140" y="170" width="120" height="60" fill="#f0f0f0" rx="4"/>
  <rect x="268" y="170" width="120" height="60" fill="#f0f0f0" rx="4"/>
  <text x="45" y="205" font-size="11" fill="#333">DX・IT系</text>
  <text x="170" y="205" font-size="11" fill="#333">インフラ系</text>
  <text x="300" y="205" font-size="11" fill="#333">営業系</text>
</svg>
```

### 図解タイプと生成ロジック

| タイプ | 生成方法 |
|---|---|
| `wireframe` | コンポーネント定義 → SVGレイアウト |
| `flow-diagram` | ノード＋エッジ → 矢印付きSVG |
| `comparison-table` | 行列データ → HTML table |
| `bar-chart` | データ配列 → SVG棒グラフ |
| `pie-chart` | データ配列 → SVG円グラフ |
| `matrix-2x2` | 4象限データ → SVGマトリクス |
| `timeline` | フェーズ配列 → SVGタイムライン |

---

## HTMLスライドレンダラー

### 概要

SG-04〜06の出力を受け取り、HTMLスライドを生成する。

### スライドテンプレート（React/Tailwind）

```tsx
// src/components/slides/templates/TextVisualSplit.tsx
interface Props {
  theme: Theme
  title: string
  body: string[]
  visual: string  // SVG or img URL
  visualPosition: 'left' | 'right'
  chapterId: string
  pageNumber: number
  totalPages: number
}

export function TextVisualSplit({ theme, title, body, visual, visualPosition, chapterId, pageNumber, totalPages }: Props) {
  const isLeft = visualPosition === 'left'
  
  return (
    <div 
      className="slide"
      style={{
        width: '1024px',
        height: '768px',
        padding: theme.pagePadding,
        background: theme.bg,
        fontFamily: theme.fontBody,
        color: theme.text,
        display: 'flex',
        flexDirection: isLeft ? 'row' : 'row-reverse',
        gap: '48px',
      }}
    >
      {/* Visual側 */}
      <div style={{ flex: 1 }}>
        <div dangerouslySetInnerHTML={{ __html: visual }} />
      </div>
      
      {/* Text側 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ 
          fontSize: '10px', 
          color: theme.textSub, 
          marginBottom: '12px',
          fontWeight: 600,
          letterSpacing: '0.1em',
        }}>
          {chapterId.toUpperCase()}
        </div>
        
        <h2 style={{ 
          fontSize: theme.headingSize, 
          fontWeight: theme.titleWeight,
          fontFamily: theme.fontTitle,
          marginBottom: '24px',
          lineHeight: 1.3,
        }}>
          {title}
        </h2>
        
        <div style={{ fontSize: theme.bodySize, lineHeight: 1.8 }}>
          {body.map((p, i) => (
            <p key={i} style={{ marginBottom: '16px' }}>{p}</p>
          ))}
        </div>
      </div>
      
      {/* Footer */}
      <div style={{
        position: 'absolute',
        bottom: '24px',
        right: '24px',
        fontSize: '10px',
        color: theme.textSub,
      }}>
        {pageNumber} / {totalPages}
      </div>
    </div>
  )
}
```

---

## PDF生成（Puppeteer）

### 概要

HTMLスライドをPuppeteerでレンダリングし、PDFに変換する。

### 実装

```typescript
// src/lib/pdf-generator.ts
import puppeteer from 'puppeteer'

interface PdfOptions {
  orientation: 'landscape' | 'portrait'
  slides: string[]  // HTML文字列の配列
}

export async function generatePdf(options: PdfOptions): Promise<Buffer> {
  const { orientation, slides } = options
  
  const browser = await puppeteer.launch({ headless: true })
  const page = await browser.newPage()
  
  const width = orientation === 'landscape' ? 1024 : 768
  const height = orientation === 'landscape' ? 768 : 1024
  
  await page.setViewport({ width, height })
  
  const pdfBuffers: Buffer[] = []
  
  for (const slideHtml of slides) {
    await page.setContent(slideHtml, { waitUntil: 'networkidle0' })
    
    const pdf = await page.pdf({
      width: `${width}px`,
      height: `${height}px`,
      printBackground: true,
    })
    
    pdfBuffers.push(pdf)
  }
  
  await browser.close()
  
  // PDF結合（pdf-lib）
  return mergePdfs(pdfBuffers)
}
```

---

## SgGeneration履歴管理

### スキーマ追加

```prisma
model SgGeneration {
  id           String   @id @default(cuid())
  versionId    String
  version      ProposalVersion @relation(fields: [versionId], references: [id])
  
  // パラメータ
  proposalType String           // full | strategy | analysis | content | improvement
  tone         String           // simple | rich | pop
  orientation  String           // landscape | portrait
  slideCount   Int
  params       String   @default("{}")
  
  // 各SGの出力（再開用）
  sg01Output   String?
  sg02Output   String?
  sg03Output   String?
  sg04Output   String?
  sg05Output   String?
  sg06Output   String?
  
  // 最終出力
  slidesJson   String?          // 全スライドのJSON
  pdfPath      String?          // 生成されたPDFのパス
  
  status       String   @default("RUNNING")
  currentStep  String?
  errorMessage String?
  startedAt    DateTime @default(now())
  completedAt  DateTime?
}
```

### 履歴一覧表示

同じ分析データから複数の提案書を生成できる。
- 種別: フル提案 / 戦略提案 / 分析提案
- トーン: Simple / Rich / Pop
- 向き: A4ヨコ / A4タテ

履歴として全て保存し、いつでもダウンロード可能。

---

## ページ単位の修正機能

### API

```typescript
// POST /api/sg-generation/[id]/revise
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { pageNumber, instruction } = await req.json()
  
  const sg = await prisma.sgGeneration.findUnique({ where: { id: params.id } })
  const slides = JSON.parse(sg.slidesJson)
  const targetSlide = slides[pageNumber - 1]
  
  // SG-REVISEエージェントで修正
  const revised = await reviseSlide(targetSlide, instruction, sg.params)
  
  // 更新
  slides[pageNumber - 1] = revised
  await prisma.sgGeneration.update({
    where: { id: params.id },
    data: { slidesJson: JSON.stringify(slides) },
  })
  
  // PDF再生成
  await regeneratePdf(params.id)
  
  return Response.json({ success: true })
}
```

---

## 実装順序

1. **prisma スキーマ修正** + db push
2. **テーマ定義** — Simple/Rich/Popの定数定義
3. **スライドテンプレート作成** — 10種のReactコンポーネント
4. **SG-05 修正** — レイアウト＋図解データ生成
5. **SG-06-VIZ 新規作成** — SVG/図解生成
6. **HTMLスライドレンダラー** — テーマ適用
7. **PDF生成** — Puppeteer
8. **専用ページ** `/projects/[id]/slides`
9. **再開機能** — 各SG出力をDB保存
10. **修正機能** — ページ単位の修正API + UI
11. **TOPページボタン** — 確認/DLボタン追加

---

## 補足: pptxは諦める

pptxgenjsで「使える」提案書を作るのは現実的に厳しい。
- テキスト配置・フォント・行間の微調整が困難
- 図・ビジュアルはSVGか画像を別途生成して貼る必要がある
- レイアウトの「良さ」をロジックで表現する限界

**結論: HTMLスライド → PDF に一本化する。**
