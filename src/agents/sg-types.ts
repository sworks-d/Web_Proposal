export type SgAgentId = 'SG-01' | 'SG-02' | 'SG-03' | 'SG-04' | 'SG-05' | 'SG-06'

export type SlideProposalType = 'full' | 'strategy' | 'analysis' | 'content' | 'improvement'
export type SlideTone = 'simple' | 'rich' | 'pop'
export type SlideAudience = 'executive' | 'manager' | 'creative'
export type FocusChapter = 'issue' | 'analysis' | 'target' | 'insight' | 'design'

export interface SgParams {
  type: SlideProposalType
  slideCount: number       // 10–50
  focusChapters: FocusChapter[]  // max 2
  tone: SlideTone
  audience: SlideAudience
}

// Data passed into every SG agent
export interface SgInput {
  clientName: string
  briefText: string
  params: SgParams
  // Aggregated AG output — keys are agentId (e.g. 'AG-04-INSIGHT')
  agOutputs: Record<string, unknown>
  // Accumulated SG outputs from earlier steps
  sgOutputs: Partial<Record<SgAgentId, unknown>>
}

// ── SG-01 output ──
export interface SgSlotDef {
  id: string
  role: string
  purpose: string
}

export interface SgChapterDef {
  id: string
  title: string
  chapterRole: string
  slideCount: number
  slots: SgSlotDef[]
}

export interface Sg01Output {
  chapters: SgChapterDef[]
  totalSlides: number
  rationale: string
}

// ── SG-02 output ──
export interface SgChapterCopy {
  chapterId: string
  heading: string
  hook: string
}

export interface Sg02Output {
  keyMessage: string
  subCopy: string
  chapterCopies: SgChapterCopy[]
}

// ── SG-03 output ──
export interface SgPacedChapter {
  id: string
  narrativeRole: 'intro' | 'development' | 'climax' | 'close'
  informationDensity: 'light' | 'medium' | 'heavy'
  openingHook: string
  emotionalTarget: string
}

export interface Sg03Output {
  orderedChapterIds: string[]
  pacedChapters: SgPacedChapter[]
  pacingRationale: string
}

// ── SG-04 output ──
export interface SgSlideContent {
  slotId: string
  chapterId: string
  title: string
  body: string[]
  notes: string
}

export interface Sg04Output {
  slides: SgSlideContent[]
}

// ── SG-05 output ──
export type VisualType = 'none' | 'photo' | 'chart' | 'diagram' | 'icon' | 'screenshot'

export interface SgVisualSpec {
  slotId: string
  visualType: VisualType
  direction: string
  layoutSuggestion: string
}

export interface Sg05Output {
  slideVisuals: SgVisualSpec[]
}

// ── SG-06 output (final) ──
export interface SgFinalSlide {
  slideNumber: number
  chapterId: string
  slotId: string
  narrativeRole: string
  title: string
  body: string[]
  visualType: VisualType
  visualDirection: string
  layoutHint: string
  notes: string
}

export interface SgFinalOutput {
  metadata: {
    clientName: string
    type: SlideProposalType
    tone: SlideTone
    audience: SlideAudience
    slideCount: number
  }
  concept: {
    keyMessage: string
    subCopy: string
  }
  slides: SgFinalSlide[]
}
