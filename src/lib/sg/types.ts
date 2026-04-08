// 提案書の型（4種）
export type ProposalType = 'insight' | 'data' | 'vision' | 'solution'

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
    chartConfig?: ChartJsConfig   // SG-06が生成
    wireframeAreas?: WireframeArea[] // SG-06が生成
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
    headingSize: '28px',
    bodySize: '14px',
    pagePadding: '64px',
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
    headingSize: '24px',
    bodySize: '13px',
    pagePadding: '56px',
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
    headingSize: '26px',
    bodySize: '13px',
    pagePadding: '52px',
  },
}

// A4サイズ定数
export const A4 = {
  landscape: { width: 1123, height: 794 },
  portrait:  { width: 794,  height: 1123 },
} as const
