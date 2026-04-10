// 種別（何を出力するか）
export type ProposalVariant = 'full' | 'strategy' | 'analysis' | 'content' | 'spot'

// 型（どう伝えるか） — 旧 ProposalType と同義
export type NarrativeType = 'insight' | 'data' | 'vision' | 'solution'

// 後方互換エイリアス
export type ProposalType = NarrativeType

// 種別ごとのデフォルト章構成
export const VARIANT_CHAPTERS: Record<ProposalVariant, string[]> = {
  full:     ['課題', '分析', 'ターゲット', 'ジャーニー', 'コンセプト', '設計', 'IA', 'コンテンツ', 'KPI'],
  strategy: ['課題', 'ターゲット', 'インサイト', 'コンセプト', '実現イメージ'],
  analysis: ['現状分析', '競合分析', 'ユーザー行動', '課題構造', '方向性'],
  content:  ['コンテンツ課題', 'ターゲット×コンテンツ', '戦略', 'サイトマップ', 'ページ設計'],
  spot:     ['問題点', '課題優先順位', '施策一覧', '施策詳細', '期待効果'],
}

// 種別ごとのデフォルト型
export const VARIANT_DEFAULT_NARRATIVE: Record<ProposalVariant, NarrativeType> = {
  full:     'insight',
  strategy: 'insight',
  analysis: 'data',
  content:  'solution',
  spot:     'solution',
}

// 重点章のページ配分倍率（+60%）
export const FOCUS_CHAPTER_MULTIPLIER = 1.6

// スポット対象の選択肢
export const SPOT_TARGET_OPTIONS = [
  { value: 'top',        label: 'TOPページ',    agSources: ['AG-07C-1', 'AG-02-STP', 'AG-04-INSIGHT'] },
  { value: 'list',       label: '一覧ページ',   agSources: ['AG-07C-2', 'AG-02-JOURNEY'] },
  { value: 'detail',     label: '詳細ページ',   agSources: ['AG-07C-3', 'AG-02-JOURNEY'] },
  { value: 'cv-flow',    label: 'CVフロー',      agSources: ['AG-07C-4', 'AG-04-INSIGHT'] },
  { value: 'navigation', label: 'ナビゲーション', agSources: ['AG-07C-1', 'AG-02-JOURNEY'] },
  { value: 'other',      label: 'その他',        agSources: [] },
]

// トーン（3種）
export type ToneType = 'simple' | 'rich' | 'pop'

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

// スライドタイプ
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

// chart.js設定
export interface ChartJsConfig {
  type: 'bar' | 'line' | 'pie' | 'doughnut' | 'radar'
  data: {
    labels: string[]
    datasets: {
      label: string
      data: number[]
      backgroundColor?: string | string[]
      borderColor?: string | string[]
      borderWidth?: number
    }[]
  }
  options?: {
    responsive?: boolean
    maintainAspectRatio?: boolean
    plugins?: { legend?: unknown; title?: { display?: boolean; text?: string } }
    scales?: Record<string, unknown>
    [key: string]: unknown
  }
}

// ワイヤーフレームエリア
export interface WireframeArea {
  id: string
  label: string
  x: number       // left % (0-100)
  y: number       // top % (0-100)
  w: number       // width % (0-100)
  h: number       // height % (0-100)
  description?: string  // 指示テキスト
}

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

// スライド
export interface Slide {
  slideNumber: number
  chapterId: string
  type: SlideType
  compositionTemplate?: CompositionTemplate   // SG-COMPOSEが割り当て
  gridType?: GridType                         // SG-COMPOSEが割り当て
  headline: string
  subheadline?: string
  body?: string[]
  visual?: {
    type: 'wireframe' | 'flow' | 'table' | 'matrix' | 'chart' | 'number'
    data: unknown
    chartConfig?: ChartJsConfig   // SG-06が生成
    wireframeAreas?: WireframeArea[] // SG-06が生成
    caption?: string
  }
  blocks?: {
    id: string
    title: string
    content: string
    sentiment?: 'positive' | 'negative' | 'neutral'
  }[]
  evidence?: {
    stars: number             // 1-3
    fact: string
    source: string
  }[]
  caveat?: string
  cdRequired?: string
  bridgeText?: string
  role: SlideRole
  agSources: string[]
  sectionLabel?: string
  storyTag?: string
}

// SG-04の出力
export interface Sg04Output {
  slides: Slide[]
}

// SG-06の出力（ビジュアル強化）
export interface Sg06Enhancement {
  slideNumber: number
  chartConfig?: ChartJsConfig
  tableData?: { headers: string[]; rows: string[][] }
  wireframeAreas?: WireframeArea[]
}

export interface Sg06Output {
  enhancements: Sg06Enhancement[]
}

// テーマ
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

// テーマ定義
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

// A4サイズ定数
export const A4 = {
  landscape: { width: 1123, height: 794 },
  portrait:  { width: 794,  height: 1123 },
} as const
