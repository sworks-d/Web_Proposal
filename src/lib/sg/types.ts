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

// スライドタイプ（12種）
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
