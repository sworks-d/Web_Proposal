'use client'
import { useState } from 'react'

interface Improvement {
  diagnosis: string
  changes: string[]
  improvedPrompt: string
}

interface PromptImproveModalProps {
  agentId: string
  agentName: string
  improvement: Improvement
  cdFeedback: string
  onClose: () => void
}

export function PromptImproveModal({ agentId, agentName, improvement, cdFeedback, onClose }: PromptImproveModalProps) {
  const [applying, setApplying] = useState(false)
  const [result, setResult] = useState<string>('')

  const handleApply = async () => {
    setApplying(true)
    try {
      const res = await fetch(`/api/agents/${agentId}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          improvedPrompt: improvement.improvedPrompt,
          diagnosis: improvement.diagnosis,
          cdFeedback,
        }),
      })
      const data = await res.json()
      setResult(data.message)
    } catch {
      setResult('保存に失敗しました')
    } finally {
      setApplying(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(252,251,239,0.92)', backdropFilter: 'blur(6px)', zIndex: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ width: '100%', maxWidth: '720px', maxHeight: '80vh', background: 'var(--bg)', border: '1px solid var(--line2)', boxShadow: '0 24px 64px rgba(28,28,23,0.10)', display: 'flex', flexDirection: 'column' }}>

        <div style={{ padding: '20px 28px', borderBottom: '1px solid var(--line)', flexShrink: 0 }}>
          <div style={{ fontFamily: 'var(--font-i)', fontSize: '11px', fontStyle: 'italic', color: 'var(--red)', marginBottom: '4px' }}>✦ プロンプト改善案</div>
          <div style={{ fontFamily: 'var(--font-d)', fontSize: '18px', fontWeight: 900, letterSpacing: '-0.02em', color: 'var(--ink)' }}>{agentName}</div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontFamily: 'var(--font-d)', fontSize: '8px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--ink4)', marginBottom: '8px' }}>診断</div>
            <div style={{ fontFamily: 'var(--font-c)', fontSize: '13px', color: 'var(--ink)', lineHeight: 1.7, padding: '14px 16px', background: 'var(--bg2)', borderLeft: '3px solid var(--red)' }}>
              {improvement.diagnosis}
            </div>
          </div>

          {improvement.changes.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontFamily: 'var(--font-d)', fontSize: '8px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--ink4)', marginBottom: '8px' }}>変更点</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {improvement.changes.map((c, i) => (
                  <div key={i} style={{ display: 'flex', gap: '10px', fontFamily: 'var(--font-c)', fontSize: '12px', color: 'var(--ink2)', padding: '8px 12px', background: 'var(--bg2)' }}>
                    <span style={{ color: 'var(--red)', flexShrink: 0 }}>→</span>
                    <span>{c}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <div style={{ fontFamily: 'var(--font-d)', fontSize: '8px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--ink4)', marginBottom: '8px' }}>改善後のプロンプト</div>
            <pre style={{ fontFamily: 'var(--font-c)', fontSize: '11px', color: 'var(--ink2)', lineHeight: 1.7, background: 'var(--bg2)', padding: '16px', whiteSpace: 'pre-wrap', wordBreak: 'break-word', border: '1px solid var(--line)', maxHeight: '300px', overflowY: 'auto' }}>
              {improvement.improvedPrompt}
            </pre>
          </div>
        </div>

        <div style={{ padding: '16px 28px 22px', borderTop: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          {result ? (
            <div style={{ fontFamily: 'var(--font-c)', fontSize: '12px', color: result.includes('失敗') ? 'var(--red)' : 'var(--ink3)' }}>{result}</div>
          ) : (
            <button onClick={onClose} style={{ background: 'none', border: 'none', fontFamily: 'var(--font-d)', fontSize: '8px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--ink4)', cursor: 'pointer', padding: 0 }}>
              キャンセル
            </button>
          )}
          {!result && (
            <button
              onClick={handleApply}
              disabled={applying}
              style={{ background: applying ? 'var(--bg2)' : 'var(--red)', color: applying ? 'var(--ink4)' : '#fff', fontFamily: 'var(--font-d)', fontSize: '9px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', padding: '12px 24px', border: 'none', cursor: applying ? 'not-allowed' : 'pointer' }}
            >
              {applying ? '適用中...' : 'この改善を適用する →'}
            </button>
          )}
          {result && (
            <button onClick={onClose} style={{ background: 'var(--ink)', color: 'var(--bg)', fontFamily: 'var(--font-d)', fontSize: '9px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', padding: '12px 24px', border: 'none', cursor: 'pointer' }}>
              閉じる
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
