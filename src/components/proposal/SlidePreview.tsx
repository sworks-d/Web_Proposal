'use client'

interface Slide {
  id: string
  slideNumber: number
  chapterId: string
  sectionId: string
  title: string
  catchCopy: string | null
  body: string
  slideType: string
  layoutHint: string | null
}

const SLIDE_W = 1190
const SLIDE_H = 842

interface SlidePreviewProps {
  slide: Slide
  scale?: number
  isActive?: boolean
  onClick?: () => void
}

export default function SlidePreview({ slide, scale = 0.5, isActive, onClick }: SlidePreviewProps) {
  return (
    <div
      onClick={onClick}
      style={{
        width: SLIDE_W * scale,
        height: SLIDE_H * scale,
        background: '#FCFBEF',
        border: `1.5px solid ${isActive ? 'var(--red)' : 'var(--line2)'}`,
        position: 'relative',
        overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'default',
        flexShrink: 0,
      }}
    >
      <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left', width: SLIDE_W, height: SLIDE_H, position: 'absolute', top: 0, left: 0 }}>
        {slide.slideType === 'COVER' && <CoverLayout slide={slide} />}
        {slide.slideType === 'CHAPTER_TITLE' && <ChapterTitleLayout slide={slide} />}
        {slide.slideType === 'TABLE_OF_CONTENTS' && <TocLayout slide={slide} />}
        {slide.slideType === 'CONTENT' && (
          slide.layoutHint === 'number-hero' ? <NumberHeroLayout slide={slide} /> :
          slide.layoutHint === 'two-column' ? <TwoColumnLayout slide={slide} /> :
          <TextMainLayout slide={slide} />
        )}
      </div>

      {/* slide number badge */}
      <div style={{ position: 'absolute', bottom: '6px', right: '8px', fontFamily: 'var(--font-d)', fontSize: '9px', color: 'var(--ink4)', letterSpacing: '0.06em' }}>
        {slide.slideNumber}
      </div>
    </div>
  )
}

function CoverLayout({ slide }: { slide: Slide }) {
  return (
    <div style={{ width: '100%', height: '100%', background: '#1C1C17', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '80px 96px', position: 'relative' }}>
      <div style={{ position: 'absolute', top: '60px', right: '80px', width: '28px', height: '28px', borderRadius: '50%', background: '#4A9FD4', opacity: 0.7 }} />
      <div style={{ position: 'absolute', bottom: '120px', left: '60px', width: '18px', height: '18px', borderRadius: '50%', background: '#8DC63F', opacity: 0.8 }} />
      <div style={{ fontFamily: "'Unbounded', sans-serif", fontSize: '72px', fontWeight: 900, color: '#FCFBEF', lineHeight: 0.9, letterSpacing: '-0.03em', marginBottom: '32px' }}>
        {slide.title}
      </div>
      {slide.catchCopy && (
        <div style={{ fontFamily: "'Manrope', sans-serif", fontSize: '18px', color: 'rgba(252,251,239,0.6)', lineHeight: 1.6 }}>
          {slide.catchCopy}
        </div>
      )}
      <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: '#E63022' }} />
    </div>
  )
}

function ChapterTitleLayout({ slide }: { slide: Slide }) {
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', padding: '80px 96px', borderLeft: '6px solid #E63022' }}>
      <div>
        <div style={{ fontFamily: "'Sora', sans-serif", fontSize: '14px', color: '#8A8A78', letterSpacing: '0.1em', marginBottom: '24px', textTransform: 'uppercase' }}>Chapter</div>
        <div style={{ fontFamily: "'Unbounded', sans-serif", fontSize: '56px', fontWeight: 900, color: '#1C1C17', lineHeight: 1, letterSpacing: '-0.02em', marginBottom: '20px' }}>
          {slide.title}
        </div>
        {slide.catchCopy && (
          <div style={{ fontFamily: "'Manrope', sans-serif", fontSize: '20px', color: '#4A4A3E', lineHeight: 1.6 }}>
            {slide.catchCopy}
          </div>
        )}
      </div>
    </div>
  )
}

function TocLayout({ slide }: { slide: Slide }) {
  const items = slide.body.split('\n').filter(Boolean)
  return (
    <div style={{ width: '100%', height: '100%', padding: '72px 96px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ fontFamily: "'Unbounded', sans-serif", fontSize: '32px', fontWeight: 900, color: '#1C1C17', marginBottom: '40px', letterSpacing: '-0.02em' }}>目次</div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '0' }}>
        {items.map((item, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '14px 0', borderBottom: '1px solid rgba(28,28,23,0.1)' }}>
            <span style={{ fontFamily: "'Unbounded', sans-serif", fontSize: '11px', color: '#C4C4AC', minWidth: '24px' }}>{String(i + 1).padStart(2, '0')}</span>
            <span style={{ fontFamily: "'Manrope', sans-serif", fontSize: '20px', fontWeight: 600, color: '#1C1C17' }}>{item.replace(/^\d+\.\s*/, '')}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function TextMainLayout({ slide }: { slide: Slide }) {
  const parts = slide.body.split('---')
  const lead = parts[0]?.trim()
  const body = parts.slice(1).join('---').trim()

  return (
    <div style={{ width: '100%', height: '100%', padding: '64px 96px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ fontFamily: "'Unbounded', sans-serif", fontSize: '28px', fontWeight: 900, color: '#1C1C17', lineHeight: 1.1, letterSpacing: '-0.02em', marginBottom: '16px' }}>
        {slide.title}
      </div>
      {slide.catchCopy && (
        <div style={{ fontFamily: "'Raleway', sans-serif", fontSize: '16px', fontStyle: 'italic', color: '#E63022', marginBottom: '28px', letterSpacing: '0.03em' }}>
          {slide.catchCopy}
        </div>
      )}
      {lead && (
        <div style={{ fontFamily: "'Manrope', sans-serif", fontSize: '22px', fontWeight: 600, color: '#1C1C17', lineHeight: 1.5, marginBottom: '24px', borderLeft: '4px solid #E63022', paddingLeft: '20px' }}>
          {lead}
        </div>
      )}
      {body && (
        <div style={{ fontFamily: "'Manrope', sans-serif", fontSize: '16px', color: '#4A4A3E', lineHeight: 1.8, flex: 1 }}>
          {body}
        </div>
      )}
    </div>
  )
}

function NumberHeroLayout({ slide }: { slide: Slide }) {
  return (
    <div style={{ width: '100%', height: '100%', padding: '64px 96px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '60px', alignItems: 'center' }}>
      <div>
        <div style={{ fontFamily: "'Unbounded', sans-serif", fontSize: '120px', fontWeight: 900, color: '#E63022', lineHeight: 1 }}>—</div>
        <div style={{ fontFamily: "'Sora', sans-serif", fontSize: '16px', color: '#8A8A78', marginTop: '16px' }}>{slide.catchCopy}</div>
      </div>
      <div>
        <div style={{ fontFamily: "'Unbounded', sans-serif", fontSize: '28px', fontWeight: 900, color: '#1C1C17', marginBottom: '20px', lineHeight: 1.1 }}>{slide.title}</div>
        <div style={{ fontFamily: "'Manrope', sans-serif", fontSize: '16px', color: '#4A4A3E', lineHeight: 1.8 }}>{slide.body.replace('---', '').trim()}</div>
      </div>
    </div>
  )
}

function TwoColumnLayout({ slide }: { slide: Slide }) {
  const [left = '', right = ''] = slide.body.split('---')
  return (
    <div style={{ width: '100%', height: '100%', padding: '64px 96px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ fontFamily: "'Unbounded', sans-serif", fontSize: '28px', fontWeight: 900, color: '#1C1C17', marginBottom: '32px', lineHeight: 1.1 }}>{slide.title}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', flex: 1 }}>
        <div style={{ background: '#F5F3E2', padding: '28px', fontFamily: "'Manrope', sans-serif", fontSize: '16px', color: '#4A4A3E', lineHeight: 1.7 }}>{left.trim()}</div>
        <div style={{ background: '#F5F3E2', padding: '28px', fontFamily: "'Manrope', sans-serif", fontSize: '16px', color: '#4A4A3E', lineHeight: 1.7 }}>{right.trim()}</div>
      </div>
    </div>
  )
}
