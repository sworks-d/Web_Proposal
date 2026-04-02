'use client'
import { useState } from 'react'
import { PromptImproveModal } from './PromptImproveModal'

interface AgentFeedbackProps {
  agentId: string
  agentName: string
  currentOutput: string
}

const CATEGORIES = [
  '薄い・物足りない',
  '視点が違う',
  '形式を変えたい',
  'その他',
]

interface Improvement {
  diagnosis: string
  changes: string[]
  improvedPrompt: string
}

export function AgentFeedback({ agentId, agentName, currentOutput }: AgentFeedbackProps) {
  const [category, setCategory] = useState('')
  const [freeText, setFreeText] = useState('')
  const [loading, setLoading] = useState(false)
  const [improvement, setImprovement] = useState<Improvement | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleImprove = async () => {
    if (!category && !freeText.trim()) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/agents/${agentId}/improve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feedback: [category, freeText].filter(Boolean).join(': '),
          currentOutput: (() => { try { return JSON.parse(currentOutput) } catch { return currentOutput } })(),
        }),
      })
      if (!res.ok) throw new Error('改善案の生成に失敗しました')
      setImprovement(await res.json())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  if (improvement) {
    return (
      <PromptImproveModal
        agentId={agentId}
        agentName={agentName}
        improvement={improvement}
        cdFeedback={[category, freeText].filter(Boolean).join(': ')}
        onClose={() => setImprovement(null)}
      />
    )
  }

  return (
    <div style={{ borderTop: '1px solid rgba(28,28,23,0.08)', padding: '20px 40px', background: 'var(--bg2)' }}>
      <div style={{ fontFamily: 'var(--font-d)', fontSize: '8px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--ink4)', marginBottom: '12px' }}>
        このAGへのフィードバック
      </div>

      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setCategory(category === cat ? '' : cat)}
            style={{ padding: '6px 12px', border: `1px solid ${category === cat ? 'var(--red)' : 'var(--line2)'}`, background: category === cat ? 'rgba(230,48,34,0.06)' : 'transparent', fontFamily: 'var(--font-c)', fontSize: '11px', color: category === cat ? 'var(--red)' : 'var(--ink2)', cursor: 'pointer' }}
          >
            {cat}
          </button>
        ))}
      </div>

      <textarea
        value={freeText}
        onChange={e => setFreeText(e.target.value)}
        placeholder="具体的に何が問題だったか（任意）"
        style={{ width: '100%', border: '1px solid var(--line2)', background: 'var(--bg)', padding: '10px 14px', fontFamily: 'var(--font-c)', fontSize: '12px', color: 'var(--ink)', resize: 'none', height: '64px', outline: 'none', marginBottom: '12px' }}
      />

      {error && (
        <div style={{ fontFamily: 'var(--font-c)', fontSize: '11px', color: 'var(--red)', marginBottom: '10px' }}>{error}</div>
      )}

      <button
        onClick={handleImprove}
        disabled={loading || (!category && !freeText.trim())}
        style={{ background: loading ? 'var(--bg2)' : 'var(--ink)', color: loading ? 'var(--ink4)' : 'var(--bg)', fontFamily: 'var(--font-d)', fontSize: '8px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', padding: '10px 18px', border: 'none', cursor: loading ? 'not-allowed' : 'pointer' }}
      >
        {loading ? '改善案を生成中...' : `このAGのプロンプトを改善する →`}
      </button>
    </div>
  )
}
