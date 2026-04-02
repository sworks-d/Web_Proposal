'use client'
import { useState } from 'react'

interface FeedbackModalProps {
  versionId: string
  chapters: { id: string; title: string }[]
  onComplete: () => void
  onSkip: () => void
}

const TOTAL = 7

const WEAKEST_AGENT_OPTIONS = [
  { value: 'ag-02-market', main: 'AG-02 市場・業界分析', sub: '市場構造・ターゲット仮説の解像度が低かった' },
  { value: 'ag-03-competitor', main: 'AG-03 競合分析', sub: '競合の設計意図の読み解きが表面的だった' },
  { value: 'ag-04-insight', main: 'AG-04 課題構造化', sub: '本質課題の定義が浅かった・Why-Whyが弱かった' },
  { value: 'ag-06-draft', main: 'AG-06 設計草案', sub: 'IA・導線・コンテンツ設計の根拠が弱かった' },
  { value: 'ag-07-story', main: 'AG-07 ストーリー・コピー', sub: '提案書の流れ・コンセプトワードが響かなかった' },
  { value: 'none', main: '特になし・全体的に満足', sub: '' },
]

const STORY_OPTIONS = [
  { value: 'that_usable', main: 'このまま使える', sub: '構成・流れともに問題なし' },
  { value: 'needs_edit', main: '一部修正すれば使える', sub: '章の順番・コピー等を調整すれば問題なし' },
  { value: 'rebuild', main: '大幅に作り直しが必要', sub: '構成・方向性から見直す必要がある' },
]

const DEFAULT_CHAPTERS = [
  { id: 'ch-01', title: '現状認識の共有' },
  { id: 'ch-02', title: '課題の本質定義' },
  { id: 'ch-03', title: '解決の方向性' },
  { id: 'ch-04', title: '具体的な提案内容' },
  { id: 'ch-05', title: '期待効果' },
  { id: 'ch-06', title: '進め方・スケジュール' },
]

export function FeedbackModal({ versionId, chapters, onComplete, onSkip }: FeedbackModalProps) {
  const [step, setStep] = useState(1)
  const [completed, setCompleted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [answers, setAnswers] = useState<{
    overallScore?: number
    weakestAgent?: string
    competitorScore?: number
    targetScore?: number
    storyUsability?: string
    bestChapter?: string
    freeComment?: string
  }>({})

  const chapterList = chapters.length > 0 ? chapters : DEFAULT_CHAPTERS

  const setAnswer = (key: string, value: string | number) => {
    setAnswers(prev => ({ ...prev, [key]: value }))
  }

  const canProceed = () => {
    if (step === 7) return true
    const required: Record<number, string> = {
      1: 'overallScore', 2: 'weakestAgent', 3: 'competitorScore',
      4: 'targetScore', 5: 'storyUsability', 6: 'bestChapter',
    }
    return answers[required[step] as keyof typeof answers] !== undefined
  }

  const handleNext = async () => {
    if (step < TOTAL) {
      setStep(s => s + 1)
    } else {
      setSubmitting(true)
      try {
        await fetch('/api/feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            versionId,
            overallScore: answers.overallScore ?? 3,
            weakestAgent: answers.weakestAgent ?? 'none',
            competitorScore: answers.competitorScore ?? 2,
            targetScore: answers.targetScore ?? 2,
            storyUsability: answers.storyUsability ?? 'needs_edit',
            bestChapter: answers.bestChapter ?? 'ch-01',
            freeComment: answers.freeComment || null,
          }),
        })
        setCompleted(true)
      } catch {
        setCompleted(true)
      } finally {
        setSubmitting(false)
      }
    }
  }

  const progressWidth = `${(step / TOTAL) * 100}%`

  const s: Record<string, React.CSSProperties> = {
    overlay: { position: 'fixed', inset: 0, background: 'rgba(252,251,239,0.92)', backdropFilter: 'blur(6px)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' },
    modal: { width: '100%', maxWidth: '620px', background: 'var(--bg)', border: '1px solid var(--line2)', boxShadow: '0 24px 64px rgba(28,28,23,0.10)', position: 'relative', overflow: 'hidden' },
    progTrack: { height: '3px', background: 'var(--line)', position: 'relative' },
    progFill: { height: '100%', background: 'var(--red)', transition: 'width 0.4s ease', width: progressWidth },
    header: { padding: '24px 28px 18px', borderBottom: '1px solid var(--line)' },
    eyebrow: { fontFamily: 'var(--font-i)', fontSize: '11px', fontStyle: 'italic', color: 'var(--red)', letterSpacing: '0.04em', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '7px' },
    title: { fontFamily: 'var(--font-d)', fontSize: '20px', fontWeight: 900, letterSpacing: '-0.02em', textTransform: 'uppercase' as const, color: 'var(--ink)', lineHeight: 1 },
    desc: { fontFamily: 'var(--font-c)', fontSize: '12px', color: 'var(--ink3)', marginTop: '7px', lineHeight: 1.6 },
    progLabel: { fontFamily: 'var(--font-d)', fontSize: '9px', fontWeight: 400, letterSpacing: '0.15em', textTransform: 'uppercase' as const, color: 'var(--ink4)', marginTop: '10px' },
    body: { padding: '28px 28px 20px' },
    qlabel: { fontFamily: 'var(--font-i)', fontSize: '11px', fontStyle: 'italic', color: 'var(--ink3)', letterSpacing: '0.04em', marginBottom: '6px' },
    qtext: { fontFamily: 'var(--font-d)', fontSize: '15px', fontWeight: 700, color: 'var(--ink)', lineHeight: 1.3, letterSpacing: '-0.01em', marginBottom: '20px' },
    footer: { padding: '16px 28px 22px', borderTop: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' },
    btnSkip: { background: 'none', border: 'none', fontFamily: 'var(--font-d)', fontSize: '8px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' as const, color: 'var(--ink4)', cursor: 'pointer', padding: 0 },
    btnBack: { background: 'transparent', border: '1px solid var(--line2)', color: 'var(--ink2)', fontFamily: 'var(--font-d)', fontSize: '8px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' as const, padding: '10px 18px', cursor: 'pointer' },
    btnNext: { background: canProceed() ? 'var(--ink)' : 'var(--line)', color: canProceed() ? 'var(--bg)' : 'var(--ink4)', fontFamily: 'var(--font-d)', fontSize: '9px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' as const, padding: '12px 24px', border: 'none', cursor: canProceed() ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: '8px' },
  }

  if (completed) {
    return (
      <div style={s.overlay}>
        <div style={s.modal}>
          <div style={s.progTrack}><div style={{ ...s.progFill, width: '100%' }} /></div>
          <div style={{ padding: '48px 28px', textAlign: 'center' }}>
            <div style={{ fontSize: '36px', marginBottom: '16px' }}>✦</div>
            <div style={{ fontFamily: 'var(--font-d)', fontSize: '22px', fontWeight: 900, letterSpacing: '-0.02em', color: 'var(--ink)', marginBottom: '8px' }}>ありがとうございます</div>
            <div style={{ fontFamily: 'var(--font-c)', fontSize: '13px', color: 'var(--ink3)', lineHeight: 1.7, marginBottom: '28px' }}>
              フィードバックを受け取りました。<br />回答内容はAGのプロンプト改善に<br />自動で反映されます。
            </div>
            <div style={{ fontFamily: 'var(--font-i)', fontStyle: 'italic', fontSize: '12px', color: 'var(--ink4)', marginBottom: '28px' }}>
              改善が適用されるのは次回の実行からです
            </div>
            <button
              onClick={onComplete}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', background: 'var(--ink)', color: 'var(--bg)', fontFamily: 'var(--font-d)', fontSize: '9px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', padding: '14px 28px', border: 'none', cursor: 'pointer' }}
            >
              <span>↓</span> Markdownをダウンロード
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={s.overlay}>
      <div style={s.modal}>
        <div style={s.progTrack}><div style={s.progFill} /></div>

        <div style={s.header}>
          <div style={s.eyebrow}>✦ フィードバック</div>
          <div style={s.title}>提案書の品質について</div>
          <div style={s.desc}>回答内容はAGのプロンプト改善に自動で反映されます。約90秒で完了します。</div>
          <div style={s.progLabel}>{step} / {TOTAL}</div>
        </div>

        <div style={s.body}>
          {step === 1 && (
            <div>
              <div style={s.qlabel}>Q1 — 全体評価</div>
              <div style={s.qtext}>今回の提案書草案の<br />完成度はどのくらいですか？</div>
              <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                {[1, 2, 3, 4, 5].map(v => (
                  <div
                    key={v}
                    onClick={() => setAnswer('overallScore', v)}
                    style={{ width: '44px', height: '44px', border: `1px solid ${(answers.overallScore ?? 0) >= v ? 'var(--red)' : 'var(--line2)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '20px', color: (answers.overallScore ?? 0) >= v ? 'var(--red)' : 'var(--ink4)', background: (answers.overallScore ?? 0) >= v ? 'rgba(230,48,34,0.06)' : 'transparent', userSelect: 'none' }}
                  >★</div>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-c)', fontSize: '10px', color: 'var(--ink4)' }}>
                <span>使えない</span><span>完璧</span>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <div style={s.qlabel}>Q2 — 弱点特定</div>
              <div style={s.qtext}>最も「薄い・物足りない」と<br />感じたのはどのフェーズですか？</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                {WEAKEST_AGENT_OPTIONS.map(opt => (
                  <div
                    key={opt.value}
                    onClick={() => setAnswer('weakestAgent', opt.value)}
                    style={{ display: 'flex', alignItems: 'flex-start', gap: '13px', padding: '13px 16px', border: `1px solid ${answers.weakestAgent === opt.value ? 'var(--red)' : 'var(--line)'}`, cursor: 'pointer', background: answers.weakestAgent === opt.value ? 'rgba(230,48,34,0.06)' : 'transparent', userSelect: 'none' }}
                  >
                    <div style={{ width: '15px', height: '15px', border: `1.5px solid ${answers.weakestAgent === opt.value ? 'var(--red)' : 'var(--line2)'}`, borderRadius: '50%', flexShrink: 0, marginTop: '2px', background: answers.weakestAgent === opt.value ? 'var(--red)' : 'transparent', position: 'relative' }}>
                      {answers.weakestAgent === opt.value && <div style={{ position: 'absolute', top: '2.5px', left: '2.5px', width: '8px', height: '8px', background: '#fff', borderRadius: '50%' }} />}
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)' }}>{opt.main}</div>
                      {opt.sub && <div style={{ fontFamily: 'var(--font-c)', fontSize: '11px', color: 'var(--ink3)', marginTop: '2px' }}>{opt.sub}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <div style={s.qlabel}>Q3 — 競合分析の深度</div>
              <div style={s.qtext}>競合サイトの「設計意図の読み解き」は<br />どの程度できていましたか？</div>
              <ThreePointRating
                labels={['表面的\nだった', 'まあまあ\nだった', '十分\nだった']}
                value={answers.competitorScore}
                onChange={v => setAnswer('competitorScore', v)}
              />
            </div>
          )}

          {step === 4 && (
            <div>
              <div style={s.qlabel}>Q4 — ターゲット設定の精度</div>
              <div style={s.qtext}>「誰に・どんな状態で・何を伝えるか」の<br />ターゲット設定は適切でしたか？</div>
              <ThreePointRating
                labels={['ズレが\nあった', '概ね\n合っていた', 'ぴったり\nだった']}
                value={answers.targetScore}
                onChange={v => setAnswer('targetScore', v)}
              />
            </div>
          )}

          {step === 5 && (
            <div>
              <div style={s.qlabel}>Q5 — ストーリー構成の使用感</div>
              <div style={s.qtext}>今回の提案書の章構成・ストーリーラインは<br />実際の提案に使えそうですか？</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                {STORY_OPTIONS.map(opt => (
                  <div
                    key={opt.value}
                    onClick={() => setAnswer('storyUsability', opt.value)}
                    style={{ display: 'flex', alignItems: 'flex-start', gap: '13px', padding: '13px 16px', border: `1px solid ${answers.storyUsability === opt.value ? 'var(--red)' : 'var(--line)'}`, cursor: 'pointer', background: answers.storyUsability === opt.value ? 'rgba(230,48,34,0.06)' : 'transparent', userSelect: 'none' }}
                  >
                    <div style={{ width: '15px', height: '15px', border: `1.5px solid ${answers.storyUsability === opt.value ? 'var(--red)' : 'var(--line2)'}`, borderRadius: '50%', flexShrink: 0, marginTop: '2px', background: answers.storyUsability === opt.value ? 'var(--red)' : 'transparent', position: 'relative' }}>
                      {answers.storyUsability === opt.value && <div style={{ position: 'absolute', top: '2.5px', left: '2.5px', width: '8px', height: '8px', background: '#fff', borderRadius: '50%' }} />}
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)' }}>{opt.main}</div>
                      <div style={{ fontFamily: 'var(--font-c)', fontSize: '11px', color: 'var(--ink3)', marginTop: '2px' }}>{opt.sub}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 6 && (
            <div>
              <div style={s.qlabel}>Q6 — 最良のパート</div>
              <div style={s.qtext}>提案書の中で一番<br />「よく書けていた」のはどこですか？</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                {chapterList.map((ch, i) => (
                  <div
                    key={ch.id}
                    onClick={() => setAnswer('bestChapter', ch.id)}
                    style={{ padding: '11px 14px', border: `1px solid ${answers.bestChapter === ch.id ? 'var(--red)' : 'var(--line)'}`, cursor: 'pointer', background: answers.bestChapter === ch.id ? 'rgba(230,48,34,0.06)' : 'transparent', userSelect: 'none' }}
                  >
                    <div style={{ fontFamily: 'var(--font-d)', fontSize: '9px', fontWeight: 700, color: answers.bestChapter === ch.id ? 'var(--red)' : 'var(--ink4)', letterSpacing: '0.1em', marginBottom: '4px' }}>
                      Ch.{String(i + 1).padStart(2, '0')}
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ink)', lineHeight: 1.3 }}>{ch.title}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 7 && (
            <div>
              <div style={s.qlabel}>Q7 — AGへの一言（任意）</div>
              <div style={s.qtext}>AGへのフィードバックを<br />自由に書いてください</div>
              <textarea
                maxLength={100}
                placeholder={'例：「競合分析でサイトの導線まで評価してほしかった」「ターゲットを共働き世帯に絞りすぎた」等'}
                value={answers.freeComment ?? ''}
                onChange={e => setAnswer('freeComment', e.target.value)}
                style={{ width: '100%', border: '1px solid var(--line2)', background: 'var(--bg2)', padding: '13px 16px', fontFamily: 'var(--font-c)', fontSize: '13px', color: 'var(--ink)', resize: 'none', height: '88px', outline: 'none' }}
              />
              <div style={{ fontFamily: 'var(--font-c)', fontSize: '10px', color: 'var(--ink4)', textAlign: 'right', marginTop: '5px' }}>
                {(answers.freeComment ?? '').length} / 100字
              </div>
            </div>
          )}
        </div>

        <div style={s.footer}>
          <button onClick={onSkip} style={s.btnSkip}>スキップしてダウンロード</button>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {step > 1 && (
              <button onClick={() => setStep(s => s - 1)} style={s.btnBack}>← 戻る</button>
            )}
            <button
              onClick={handleNext}
              disabled={!canProceed() || submitting}
              style={s.btnNext}
            >
              {submitting ? '送信中...' : step === TOTAL ? '送信する ✦' : '次へ →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ThreePointRating({ labels, value, onChange }: { labels: string[]; value?: number; onChange: (v: number) => void }) {
  return (
    <div style={{ display: 'flex', gap: '6px', marginBottom: '4px' }}>
      {[1, 2, 3].map((v, i) => (
        <div
          key={v}
          onClick={() => onChange(v)}
          style={{ flex: 1, padding: '12px 8px', border: `1px solid ${value === v ? 'var(--red)' : 'var(--line2)'}`, textAlign: 'center', cursor: 'pointer', background: value === v ? 'rgba(230,48,34,0.06)' : 'transparent', userSelect: 'none' }}
        >
          <div style={{ fontFamily: 'var(--font-d)', fontSize: '18px', fontWeight: 900, color: value === v ? 'var(--red)' : 'var(--ink)', lineHeight: 1, marginBottom: '3px' }}>{v}</div>
          <div style={{ fontFamily: 'var(--font-c)', fontSize: '10px', color: 'var(--ink3)', whiteSpace: 'pre-line' }}>{labels[i]}</div>
        </div>
      ))}
    </div>
  )
}
