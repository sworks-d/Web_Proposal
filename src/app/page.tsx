'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Ticker from '@/components/layout/Ticker'
import { CHANGELOG } from '@/lib/changelog'
import NavBar from '@/components/layout/NavBar'

const INDUSTRY_OPTIONS = [
  { value: 'recruitment', label: '採用・リクルート' },
  { value: 'btob', label: 'BtoB・サービス業' },
  { value: 'ec', label: 'EC・BtoC' },
  { value: 'corporate', label: 'コーポレートサイト' },
  { value: 'campaign', label: 'キャンペーン・プロモーション' },
  { value: 'general', label: 'その他' },
]

interface VersionInfo {
  id: string
  versionNumber: number
  label: string | null
  status: string
  executions: { agentId: string; status: string; isInherited: boolean }[]
}

interface Project {
  id: string
  title: string
  industryType: string
  createdAt: string
  client: { name: string }
  versions: VersionInfo[]
}

function StatusPill({ status }: { status: string }) {
  if (status === 'running') return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontFamily: 'var(--font-d)', fontSize: '8px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '4px 11px', borderRadius: '99px', background: 'var(--red)', color: '#fff' }}>
      <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'currentColor', opacity: 0.7, animation: 'blink 1s ease-in-out infinite' }} />
      実行中
    </span>
  )
  if (status === 'wait') return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontFamily: 'var(--font-d)', fontSize: '8px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '4px 11px', borderRadius: '99px', background: '#E8C44A', color: '#4A3800' }}>
      <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'currentColor', opacity: 0.7, animation: 'blink 1s ease-in-out infinite' }} />
      確認待ち
    </span>
  )
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontFamily: 'var(--font-d)', fontSize: '8px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '4px 11px', borderRadius: '99px', background: 'var(--line)', color: 'var(--ink3)' }}>
      完了
    </span>
  )
}

export default function HomePage() {
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [showModal, setShowModal] = useState(false)
  const [changelogOpen, setChangelogOpen] = useState(false)
  const [clientName, setClientName] = useState('')
  const [title, setTitle] = useState('')
  const [industryType, setIndustryType] = useState('recruitment')
  const [briefText, setBriefText] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/projects').then(r => r.json()).then(setProjects).catch(() => {})
  }, [])

  const handleDelete = async (projectId: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm(`「${name}」を削除しますか？\nこの操作は取り消せません。`)) return
    setDeletingId(projectId)
    try {
      await fetch(`/api/projects/${projectId}`, { method: 'DELETE' })
      setProjects(prev => prev.filter(p => p.id !== projectId))
    } catch {}
    setDeletingId(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!clientName.trim() || !title.trim() || !briefText.trim()) {
      setError('クライアント名・案件タイトル・依頼内容は必須です')
      return
    }
    setError('')
    setSubmitting(true)
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientName: clientName.trim(), title: title.trim(), briefText: briefText.trim(), industryType }),
      })
      const project = await res.json()
      if (!res.ok) throw new Error(project.error)
      router.push(`/projects/${project.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : '作成に失敗しました')
      setSubmitting(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'transparent',
    border: 'none',
    borderBottom: '1px solid var(--line2)',
    padding: '8px 0',
    fontSize: '14px',
    color: 'var(--ink)',
    fontFamily: 'var(--font-b)',
    outline: 'none',
  }

  const labelStyle: React.CSSProperties = {
    fontFamily: 'var(--font-d)',
    fontSize: '8.5px',
    fontWeight: 700,
    letterSpacing: '0.18em',
    textTransform: 'uppercase',
    color: 'var(--ink3)',
    display: 'block',
    marginBottom: '6px',
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Ticker items={[
        { text: 'WEB PROPOSAL AGENT' },
        { text: 'MULTI-AGENT SYSTEM', hot: true },
        { text: '9 業種AG · 16 SUB · 7 フェーズ' },
        { text: 'POWERED BY CLAUDE', hot: true },
      ]} />
      <NavBar context="全案件" />

      {/* Hero */}
      <div style={{
        padding: '72px 44px 60px',
        borderBottom: '1px solid var(--line)',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '48px',
        alignItems: 'end',
        position: 'relative',
      }}>
        {/* decorative dots */}
        <div style={{ position: 'absolute', right: '180px', top: '40px', width: '14px', height: '14px', borderRadius: '50%', background: 'var(--dot-b)', opacity: 0.7 }} />
        <div style={{ position: 'absolute', right: '120px', bottom: '80px', width: '9px', height: '9px', borderRadius: '50%', background: 'var(--dot-g)', opacity: 0.8 }} />

        <h1 style={{
          fontFamily: 'var(--font-d)',
          fontSize: 'clamp(56px, 7.5vw, 112px)',
          fontWeight: 900,
          lineHeight: 0.86,
          letterSpacing: '-0.03em',
          textTransform: 'uppercase',
          color: 'var(--ink)',
        }}>
          WEB<br />
          PRO<span style={{ color: 'var(--red)' }}>POS</span><span style={{ color: 'var(--ink4)', fontWeight: 400 }}>AL</span><br />
          AGENT
        </h1>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '6px' }}>
          <p style={{ fontFamily: 'var(--font-i)', fontSize: '11px', fontStyle: 'italic', color: 'var(--ink3)', letterSpacing: '0.06em' }}>
            多業種対応マルチエージェントシステム
          </p>
          <p style={{ fontFamily: 'var(--font-c)', fontSize: '13.5px', lineHeight: 1.8, color: 'var(--ink2)' }}>
            案件情報を入力するだけで、市場分析・競合調査・課題構造化・設計草案・提案書草案を自動生成。CDが提案書づくりに集中できる環境をつくります。
          </p>
          <div style={{ display: 'flex', border: '1px solid var(--line2)' }}>
            {[{ n: '9', l: '業種AG' }, { n: '16', l: '業種SUB' }, { n: '7', l: 'フェーズ' }].map((item, i) => (
              <div key={i} style={{ flex: 1, padding: '14px 18px', borderRight: i < 2 ? '1px solid var(--line2)' : 'none' }}>
                <div style={{ fontFamily: 'var(--font-d)', fontSize: '28px', fontWeight: 900, lineHeight: 1, marginBottom: '3px' }}>{item.n}</div>
                <div style={{ fontFamily: 'var(--font-c)', fontSize: '9px', color: 'var(--ink3)', letterSpacing: '0.08em' }}>{item.l}</div>
              </div>
            ))}
          </div>
          <button
            onClick={() => setShowModal(true)}
            style={{
              alignSelf: 'flex-start',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              background: 'var(--ink)',
              color: 'var(--bg)',
              fontFamily: 'var(--font-d)',
              fontSize: '9px',
              fontWeight: 700,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              padding: '13px 22px',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <span style={{ width: '15px', height: '15px', border: '1.5px solid rgba(252,251,239,0.45)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', lineHeight: 1 }}>+</span>
            新規案件を作成
          </button>

        </div>
      </div>

      {/* Project list */}
      <div style={{ padding: '22px 44px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: 'var(--font-i)', fontSize: '12px', fontStyle: 'italic', color: 'var(--ink3)', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--ink)', display: 'inline-block' }} />
          進行中・完了案件
        </span>
        <span style={{ fontFamily: 'var(--font-c)', fontSize: '11px', color: 'var(--ink4)' }}>{projects.length}件</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)' }}>
        {projects.map((p, idx) => {
          const isLast = (idx + 1) % 3 === 0
          const latestVersion = p.versions[0]
          const vStatus = latestVersion?.status ?? null
          const cardStatus = !latestVersion ? 'none'
            : vStatus === 'RUNNING' ? 'running'
            : vStatus === 'CHECKPOINT' ? 'wait'
            : vStatus === 'COMPLETED' ? 'done'
            : 'none'
          // count completed AGs from executions
          const doneAGs = latestVersion
            ? latestVersion.executions.filter(e => e.status === 'COMPLETED').length
            : 0
          const accentColor = cardStatus === 'running' ? 'var(--red)' : cardStatus === 'wait' ? '#E8C44A' : 'transparent'

          return (
            <div
              key={p.id}
              onClick={() => router.push(`/projects/${p.id}`)}
              style={{
                borderTop: '1px solid var(--line)',
                borderRight: isLast ? 'none' : '1px solid var(--line)',
                padding: '30px 36px 26px',
                position: 'relative',
                overflow: 'hidden',
                cursor: 'pointer',
                background: 'var(--bg)',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg2)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg)')}
            >
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: accentColor }} />
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '22px' }}>
                <span style={{ fontFamily: 'var(--font-d)', fontSize: '9px', fontWeight: 400, color: 'var(--ink4)', letterSpacing: '0.1em' }}>
                  {String(idx + 1).padStart(3, '0')}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <StatusPill status={cardStatus === 'none' ? 'done' : cardStatus} />
                  <button
                    onClick={e => handleDelete(p.id, p.client.name, e)}
                    disabled={deletingId === p.id}
                    title="削除"
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'var(--ink4)', fontSize: '13px', lineHeight: 1,
                      padding: '2px 4px', borderRadius: '2px',
                      opacity: deletingId === p.id ? 0.4 : 1,
                    }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--red)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--ink4)')}
                  >
                    {deletingId === p.id ? '…' : '✕'}
                  </button>
                </div>
              </div>
              <div style={{ fontFamily: 'var(--font-d)', fontSize: '19px', fontWeight: 900, lineHeight: 1.1, letterSpacing: '-0.02em', textTransform: 'uppercase', marginBottom: '6px' }}>
                {p.client.name}
              </div>
              <div style={{ fontFamily: 'var(--font-c)', fontSize: '11px', color: 'var(--ink3)', lineHeight: 1.5, marginBottom: '22px' }}>
                {p.title}
              </div>
              {/* 7 progress pips */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '5px' }}>
                {[...Array(7)].map((_, i) => {
                  const pipColor = i < doneAGs ? 'var(--ink)' : i === doneAGs && cardStatus === 'running' ? 'var(--red)' : 'var(--line2)'
                  return <div key={i} style={{ flex: 1, height: '2.5px', borderRadius: '99px', background: pipColor }} />
                })}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '18px' }}>
                <span style={{ fontFamily: 'var(--font-c)', fontSize: '10px', color: 'var(--ink4)' }}>
                  {new Date(p.createdAt).toLocaleDateString('ja-JP').replace(/\//g, '.')}
                </span>
                <span style={{ fontSize: '15px', color: 'var(--ink3)' }}>↗</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* New project modal */}
      {showModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(252,251,239,0.88)',
            backdropFilter: 'blur(5px)',
            zIndex: 300,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}
        >
          <div style={{
            width: '560px',
            maxHeight: '90vh',
            background: 'var(--bg)',
            border: '1px solid var(--line2)',
            boxShadow: '0 28px 72px rgba(28,28,23,0.11)',
            overflowY: 'auto',
          }}>
            <div style={{ padding: '26px 30px 22px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontFamily: 'var(--font-i)', fontSize: '11px', fontStyle: 'italic', color: 'var(--ink3)', marginBottom: '7px' }}>新規案件</div>
                <div style={{ fontFamily: 'var(--font-d)', fontSize: '24px', fontWeight: 900, letterSpacing: '-0.02em', textTransform: 'uppercase' }}>プロジェクト作成</div>
              </div>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: '17px', color: 'var(--ink3)', cursor: 'pointer' }}>✕</button>
            </div>

            <form onSubmit={handleSubmit} style={{ padding: '22px 30px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div>
                  <label style={labelStyle}>クライアント名 <span style={{ color: 'var(--red)' }}>*</span></label>
                  <input value={clientName} onChange={e => setClientName(e.target.value)} style={inputStyle} placeholder="例：中部電力グループ" />
                </div>
                <div>
                  <label style={labelStyle}>案件タイトル <span style={{ color: 'var(--red)' }}>*</span></label>
                  <input value={title} onChange={e => setTitle(e.target.value)} style={inputStyle} placeholder="例：キャリア採用サイト統合リニューアル" />
                </div>
                <div>
                  <label style={labelStyle}>業界タイプ</label>
                  <select value={industryType} onChange={e => setIndustryType(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                    {INDUSTRY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>依頼内容 <span style={{ color: 'var(--red)' }}>*</span></label>
                  <textarea
                    value={briefText}
                    onChange={e => setBriefText(e.target.value)}
                    rows={6}
                    style={{ ...inputStyle, resize: 'vertical' }}
                    placeholder="オリエン内容・依頼背景・制約条件などを入力してください"
                  />
                </div>
                {error && <p style={{ fontFamily: 'var(--font-c)', fontSize: '12px', color: 'var(--red)' }}>{error}</p>}
              </div>
              <div style={{ borderTop: '1px solid var(--line)', paddingTop: '16px', marginTop: '22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontFamily: 'var(--font-c)', fontSize: '11px', color: 'var(--ink3)', lineHeight: 1.6 }}>入力後、AG-01が自動的に起動します</span>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    background: submitting ? 'var(--ink4)' : 'var(--ink)',
                    color: 'var(--bg)',
                    fontFamily: 'var(--font-d)',
                    fontSize: '9px',
                    fontWeight: 700,
                    letterSpacing: '0.15em',
                    textTransform: 'uppercase',
                    padding: '13px 26px',
                    border: 'none',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    borderRadius: '2px',
                  }}
                >
                  {submitting ? '作成中...' : '作成する →'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* UPDATES — ページ最下部 */}
      <div style={{ borderTop: '1px solid var(--line)', margin: '0' }}>
        <button
          onClick={() => setChangelogOpen(p => !p)}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '18px 44px', background: 'transparent', border: 'none', cursor: 'pointer',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontFamily: 'var(--font-d)', fontSize: '8px', fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--ink3)' }}>
              UPDATES
            </span>
            <span style={{ fontFamily: 'var(--font-c)', fontSize: '10px', color: 'var(--ink4)' }}>
              {CHANGELOG[0].version} — {CHANGELOG[0].date}
            </span>
          </div>
          <span style={{
            fontFamily: 'var(--font-d)', fontSize: '9px', color: 'var(--ink3)',
            display: 'inline-block', transition: 'transform 0.2s',
            transform: changelogOpen ? 'rotate(180deg)' : 'rotate(0deg)',
          }}>▾</span>
        </button>

        {changelogOpen && (
          <div style={{ borderTop: '1px solid var(--line)' }}>
            {CHANGELOG.map((entry, i) => (
              <div
                key={entry.version}
                style={{
                  borderBottom: '1px solid var(--line)',
                  padding: '20px 44px',
                  display: 'grid',
                  gridTemplateColumns: '180px 1fr',
                  gap: '32px',
                  alignItems: 'start',
                }}
              >
                {/* 左：バージョン・日付・タグ */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingTop: '2px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontFamily: 'var(--font-d)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--ink)' }}>
                      {entry.version}
                    </span>
                    {i === 0 && (
                      <span style={{ fontFamily: 'var(--font-d)', fontSize: '7px', fontWeight: 700, letterSpacing: '0.1em', padding: '2px 6px', background: 'var(--ink)', color: 'var(--bg)', textTransform: 'uppercase' }}>
                        LATEST
                      </span>
                    )}
                  </div>
                  <span style={{ fontFamily: 'var(--font-c)', fontSize: '10px', color: 'var(--ink3)' }}>
                    {entry.date}
                  </span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '2px' }}>
                    {entry.tags.map(tag => (
                      <span key={tag} style={{
                        fontFamily: 'var(--font-d)', fontSize: '7px', fontWeight: 700,
                        letterSpacing: '0.06em', padding: '2px 6px',
                        border: '1px solid var(--line2)', color: 'var(--ink3)',
                      }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                {/* 右：タイトル＋更新内容 */}
                <div>
                  <div style={{ fontFamily: 'var(--font-c)', fontSize: '12px', fontWeight: 500, color: 'var(--ink)', marginBottom: '8px', lineHeight: 1.4 }}>
                    {entry.title}
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '14px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    {entry.items.map((item, j) => (
                      <li key={j} style={{ fontFamily: 'var(--font-c)', fontSize: '11px', color: 'var(--ink2)', lineHeight: 1.6 }}>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
