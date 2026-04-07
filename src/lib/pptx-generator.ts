import PptxGenJS from 'pptxgenjs'
import { SgFinalOutput, SgFinalSlide, SlideTone } from '@/agents/sg-types'

// ── Tone themes ──────────────────────────────────────────────
const THEMES: Record<SlideTone, {
  bg: string; text: string; accent: string; sub: string; fontTitle: string; fontBody: string;
}> = {
  simple: {
    bg: 'FFFFFF', text: '1D1D1F', accent: '0071E3', sub: '6E6E73',
    fontTitle: 'Helvetica Neue', fontBody: 'Helvetica Neue',
  },
  rich: {
    bg: '1A1A1A', text: 'F5F5F5', accent: 'C9A86C', sub: '999999',
    fontTitle: 'Georgia', fontBody: 'Georgia',
  },
  pop: {
    bg: 'F8F8F8', text: '333333', accent: 'FF6B35', sub: '666666',
    fontTitle: 'Arial Rounded MT Bold', fontBody: 'Arial',
  },
}

const SLIDE_W = 10  // inches
const SLIDE_H = 5.625

function hexToRgb(hex: string): string {
  // pptxgenjs accepts hex without #
  return hex.replace('#', '')
}

function addCoverSlide(pptx: PptxGenJS, output: SgFinalOutput, theme: typeof THEMES.simple) {
  const slide = pptx.addSlide()
  slide.background = { color: hexToRgb(theme.bg) }

  // Accent line
  slide.addShape(pptx.ShapeType.rect, {
    x: 0.6, y: 2.0, w: 0.08, h: 1.2,
    fill: { color: hexToRgb(theme.accent) },
    line: { color: hexToRgb(theme.accent) },
  })

  // Client name
  slide.addText(output.metadata.clientName, {
    x: 0.8, y: 1.8, w: SLIDE_W - 1.6, h: 0.4,
    fontSize: 11, color: hexToRgb(theme.sub),
    fontFace: theme.fontBody, bold: false,
  })

  // Key message
  slide.addText(output.concept.keyMessage, {
    x: 0.8, y: 2.1, w: SLIDE_W - 3.0, h: 1.4,
    fontSize: 28, color: hexToRgb(theme.text),
    fontFace: theme.fontTitle, bold: true, wrap: true,
  })

  // Sub copy
  slide.addText(output.concept.subCopy, {
    x: 0.8, y: 3.6, w: SLIDE_W - 3.0, h: 0.8,
    fontSize: 14, color: hexToRgb(theme.sub),
    fontFace: theme.fontBody, wrap: true,
  })
}

function addContentSlide(
  pptx: PptxGenJS,
  slideData: SgFinalSlide,
  theme: typeof THEMES.simple,
  slideNumber: number,
  totalSlides: number,
) {
  const slide = pptx.addSlide()
  slide.background = { color: hexToRgb(theme.bg) }

  const layout = slideData.layoutHint

  // Chapter role indicator (top-left small)
  slide.addText(slideData.chapterId.toUpperCase(), {
    x: 0.4, y: 0.18, w: 3, h: 0.22,
    fontSize: 7.5, color: hexToRgb(theme.sub),
    fontFace: theme.fontBody, bold: false,
  })

  // Slide number (top-right)
  slide.addText(`${slideNumber} / ${totalSlides}`, {
    x: SLIDE_W - 1.4, y: 0.18, w: 1.0, h: 0.22,
    fontSize: 7.5, color: hexToRgb(theme.sub),
    fontFace: theme.fontBody, align: 'right',
  })

  // Accent bar under header
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0.5, w: SLIDE_W, h: 0.015,
    fill: { color: hexToRgb(theme.accent), transparency: 60 },
    line: { color: hexToRgb(theme.accent), transparency: 60 },
  })

  const isCenterMessage = layout === 'center-message' || layout === 'full-bleed-image'
  const isTwoColumn = layout === 'two-column'
  const isDataHero = layout === 'data-hero'

  if (isCenterMessage) {
    // Large title center
    slide.addText(slideData.title, {
      x: 0.8, y: 1.4, w: SLIDE_W - 1.6, h: 2.0,
      fontSize: 36, color: hexToRgb(theme.text),
      fontFace: theme.fontTitle, bold: true, align: 'center', wrap: true,
    })
    if (slideData.body.length > 0) {
      slide.addText(slideData.body[0], {
        x: 1.2, y: 3.6, w: SLIDE_W - 2.4, h: 0.8,
        fontSize: 16, color: hexToRgb(theme.sub),
        fontFace: theme.fontBody, align: 'center', wrap: true,
      })
    }
  } else if (isDataHero && slideData.body.length > 0) {
    // Title
    slide.addText(slideData.title, {
      x: 0.6, y: 0.65, w: SLIDE_W - 1.2, h: 0.6,
      fontSize: 18, color: hexToRgb(theme.text),
      fontFace: theme.fontTitle, bold: true,
    })
    // Big number/stat
    slide.addText(slideData.body[0], {
      x: 0.6, y: 1.4, w: SLIDE_W - 1.2, h: 1.8,
      fontSize: 72, color: hexToRgb(theme.accent),
      fontFace: theme.fontTitle, bold: true, align: 'center',
    })
    // Remaining bullets
    const rest = slideData.body.slice(1)
    if (rest.length > 0) {
      slide.addText(rest.map(b => `• ${b}`).join('\n'), {
        x: 0.6, y: 3.4, w: SLIDE_W - 1.2, h: 1.6,
        fontSize: 13, color: hexToRgb(theme.sub),
        fontFace: theme.fontBody, wrap: true,
      })
    }
  } else if (isTwoColumn && slideData.body.length >= 2) {
    // Title
    slide.addText(slideData.title, {
      x: 0.6, y: 0.65, w: SLIDE_W - 1.2, h: 0.6,
      fontSize: 20, color: hexToRgb(theme.text),
      fontFace: theme.fontTitle, bold: true,
    })
    const mid = Math.ceil(slideData.body.length / 2)
    const left = slideData.body.slice(0, mid)
    const right = slideData.body.slice(mid)
    const colW = (SLIDE_W - 1.6) / 2 - 0.1

    slide.addText(left.map(b => `• ${b}`).join('\n'), {
      x: 0.6, y: 1.4, w: colW, h: SLIDE_H - 2.0,
      fontSize: 13, color: hexToRgb(theme.text),
      fontFace: theme.fontBody, wrap: true,
    })
    slide.addText(right.map(b => `• ${b}`).join('\n'), {
      x: 0.7 + colW, y: 1.4, w: colW, h: SLIDE_H - 2.0,
      fontSize: 13, color: hexToRgb(theme.text),
      fontFace: theme.fontBody, wrap: true,
    })
  } else {
    // Standard: title + bullets
    slide.addText(slideData.title, {
      x: 0.6, y: 0.65, w: SLIDE_W - 1.2, h: 0.7,
      fontSize: 22, color: hexToRgb(theme.text),
      fontFace: theme.fontTitle, bold: true, wrap: true,
    })

    const bulletText = slideData.body.map(b => `• ${b}`).join('\n')
    slide.addText(bulletText, {
      x: 0.6, y: 1.5, w: SLIDE_W - 1.2, h: SLIDE_H - 2.2,
      fontSize: 14, color: hexToRgb(theme.text),
      fontFace: theme.fontBody, wrap: true, lineSpacingMultiple: 1.4,
    })
  }

  // Visual direction note (bottom, small)
  if (slideData.visualDirection) {
    slide.addText(`[ビジュアル] ${slideData.visualType}: ${slideData.visualDirection}`, {
      x: 0.4, y: SLIDE_H - 0.4, w: SLIDE_W - 0.8, h: 0.3,
      fontSize: 7, color: hexToRgb(theme.sub),
      fontFace: theme.fontBody,
    })
  }
}

export async function generatePptxBuffer(output: SgFinalOutput): Promise<Buffer> {
  const pptx = new PptxGenJS()
  pptx.layout = 'LAYOUT_WIDE' // 16:9

  const theme = THEMES[output.metadata.tone] ?? THEMES.simple

  // Cover slide
  addCoverSlide(pptx, output, theme)

  // Content slides
  const totalSlides = output.slides.length + 1 // +1 for cover
  output.slides.forEach((slide, i) => {
    addContentSlide(pptx, slide, theme, i + 2, totalSlides)
  })

  // Generate as Node.js Buffer
  const data = await pptx.write({ outputType: 'nodebuffer' })
  return data as Buffer
}
