'use client'
import { useState, useEffect } from 'react'
import SlidePreview from './SlidePreview'

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

interface TableOfContentsProps {
  versionId: string
  onClose?: () => void
}

export default function TableOfContents({ versionId, onClose }: TableOfContentsProps) {
  const [slides, setSlides] = useState<Slide[]>([])
  const [activeSlide, setActiveSlide] = useState<number>(0)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/versions/${versionId}/slides`)
      .then(r => r.json())
      .then((data: Slide[]) => {
        if (Array.isArray(data) && data.length > 0) setSlides(data)
      })
      .catch(() => {})
  }, [versionId])

  const handleGenerate = async () => {
    setGenerating(true)
    setError(null)
    try {
      const res = await fetch(`/api/versions/${versionId}/slides`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSlides(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate')
    } finally {
      setGenerating(false)
    }
  }

  const chapters = slides.reduce<Record<string, Slide[]>>((acc, s) => {
    if (!acc[s.chapterId]) acc[s.chapterId] = []
    acc[s.chapterId].push(s)
    return acc
  }, {})

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(252,251,239,0.92)', backdropFilter: 'blur(6px)', zIndex: 400, display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: '16px 40px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg)', flexShrink: 0 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-d)', fontSize: '20px', fontWeight: 900, letterSpacing: '-0.02em', textTransform: 'uppercase', color: 'var(--ink)' }}>提案書スライド</div>
          {slides.length > 0 && (
            <div style={{ fontFamily: 'var(--font-c)', fontSize: '11px', color: 'var(--ink3)', marginTop: '4px' }}>全{slides.length}スライド</div>
          )}
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            onClick={handleGenerate}
            disabled={generating}
            style={{ background: generating ? 'var(--bg2)' : 'var(--ink)', color: generating ? 'var(--ink4)' : 'var(--bg)', fontFamily: 'var(--font-d)', fontSize: '8px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', padding: '10px 18px', border: 'none', cursor: generating ? 'not-allowed' : 'pointer', borderRadius: '2px' }}
          >
            {generating ? '生成中...' : slides.length > 0 ? '再生成' : 'スライド生成'}
          </button>
          {onClose && (
            <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '18px', color: 'var(--ink3)', cursor: 'pointer' }}>✕</button>
          )}
        </div>
      </div>

      {error && (
        <div style={{ padding: '12px 40px', background: 'rgba(230,48,34,0.07)', borderBottom: '1px solid var(--red)', fontFamily: 'var(--font-c)', fontSize: '12px', color: 'var(--red)' }}>
          エラー: {error}
        </div>
      )}

      {slides.length === 0 && !generating ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
          <div style={{ fontFamily: 'var(--font-d)', fontSize: '40px', color: 'var(--ink4)' }}>□</div>
          <div style={{ fontFamily: 'var(--font-c)', fontSize: '14px', color: 'var(--ink3)', textAlign: 'center' }}>
            AG-07完了後に「スライド生成」を押してください
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '280px 1fr', minHeight: 0 }}>
          {/* TOC sidebar */}
          <div style={{ borderRight: '1px solid var(--line)', overflowY: 'auto', padding: '20px 0' }}>
            {Object.entries(chapters).map(([chId, chSlides]) => {
              const titleSlide = chSlides.find(s => s.slideType === 'CHAPTER_TITLE' || s.slideType === 'COVER' || s.slideType === 'TABLE_OF_CONTENTS')
              const chapterName = titleSlide?.title ?? chId
              return (
                <div key={chId}>
                  <div style={{ padding: '8px 20px', fontFamily: 'var(--font-d)', fontSize: '8px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--ink3)' }}>
                    {chapterName}
                  </div>
                  {chSlides.map(s => (
                    <button
                      key={s.id}
                      onClick={() => setActiveSlide(s.slideNumber - 1)}
                      style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '12px', padding: '9px 20px', background: activeSlide === s.slideNumber - 1 ? 'var(--red2)' : 'transparent', border: 'none', borderLeft: activeSlide === s.slideNumber - 1 ? '2px solid var(--red)' : '2px solid transparent', cursor: 'pointer' }}
                    >
                      <span style={{ fontFamily: 'var(--font-d)', fontSize: '9px', color: 'var(--ink4)', minWidth: '24px' }}>p.{s.slideNumber}</span>
                      <span style={{ fontFamily: 'var(--font-c)', fontSize: '11.5px', color: activeSlide === s.slideNumber - 1 ? 'var(--ink)' : 'var(--ink2)', fontWeight: activeSlide === s.slideNumber - 1 ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {s.title}
                      </span>
                    </button>
                  ))}
                </div>
              )
            })}
          </div>

          {/* Slide viewer */}
          <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px', gap: '24px', background: 'var(--bg2)' }}>
            {slides.map((s, i) => (
              <div key={s.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <SlidePreview
                  slide={s}
                  scale={0.56}
                  isActive={activeSlide === i}
                  onClick={() => setActiveSlide(i)}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
