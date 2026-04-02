import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { safeParseJson } from '@/lib/json-cleaner'
import { renderAgentOutput, OutputSection, OutputItem } from '@/lib/output-renderer'

const prisma = new PrismaClient()

const AGENT_ORDER = [
  'AG-01',
  'AG-02', 'AG-02-STP', 'AG-02-JOURNEY', 'AG-02-VPC', 'AG-02-MERGE',
  'AG-03', 'AG-03-HEURISTIC', 'AG-03-HEURISTIC2', 'AG-03-GAP', 'AG-03-DATA', 'AG-03-MERGE',
  'AG-04-MAIN', 'AG-04', 'AG-04-MERGE',
  'AG-05', 'AG-06',
  'AG-07A', 'AG-07B', 'AG-07C',
]

const AG_LABELS: Record<string, string> = {
  'AG-01':            'インテーク担当',
  'AG-02':            '市場骨格分析',
  'AG-02-STP':        'STPセグメンテーション',
  'AG-02-JOURNEY':    'カスタマージャーニー',
  'AG-02-VPC':        'バリュープロポジション',
  'AG-02-MERGE':      '市場分析統合',
  'AG-03':            '競合特定・ポジション',
  'AG-03-HEURISTIC':  'ヒューリスティック評価（上位2社）',
  'AG-03-HEURISTIC2': 'ヒューリスティック評価（残競合）',
  'AG-03-GAP':        'コンテンツギャップ',
  'AG-03-DATA':       'GA4・SC分析',
  'AG-03-MERGE':      '競合分析統合',
  'AG-04-MAIN':       '5Whys・HMW',
  'AG-04':            'インサイト・JTBD',
  'AG-04-MERGE':      '課題定義統合',
  'AG-05':            'ファクトチェック',
  'AG-06':            '設計草案',
  'AG-07A':           '設計根拠ライター',
  'AG-07B':           'リファレンス戦略',
  'AG-07C':           '提案書草案',
}

function itemToHtml(item: OutputItem): string {
  const content = Array.isArray(item.content) ? item.content : [item.content]

  if (Array.isArray(item.content)) {
    const listItems = item.content.map(c => `<li>${escHtml(String(c))}</li>`).join('')
    return `<ul class="item-list">${listItems}</ul>`
  }

  const text = escHtml(String(item.content))
  const note = item.note && item.note !== 'secondary' ? `<span class="item-note">${escHtml(item.note)}</span>` : ''

  if (item.type === 'warning') {
    return `<div class="item-warning"><span class="warning-icon">⚠</span><div><p>${text}</p>${note ? `<p class="note">${note}</p>` : ''}</div></div>`
  }
  if (item.type === 'principle') {
    return `<div class="item-principle"><strong>${text}</strong>${note ? `<p class="note">${note}</p>` : ''}</div>`
  }
  if (item.type === 'badge-list') {
    const badges = content.map(c => `<span class="badge">${escHtml(String(c))}</span>`).join('')
    return `<div class="badge-row">${badges}</div>`
  }
  // text
  const noteHtml = item.note && item.note !== 'secondary' ? `<p class="note">${escHtml(item.note)}</p>` : ''
  return `<p class="${item.note === 'secondary' ? 'text-secondary' : ''}">${text}</p>${noteHtml}`
}

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const version = await prisma.proposalVersion.findUnique({
    where: { id },
    include: {
      project: { include: { client: true } },
      executions: {
        where: { status: 'COMPLETED' },
        include: { results: true },
        orderBy: { startedAt: 'asc' },
      },
    },
  })
  if (!version) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const outputMap: Record<string, any> = {}
  for (const exec of version.executions) {
    const result = exec.results[0]
    if (!result) continue
    const parsed = safeParseJson(result.editedJson ?? result.outputJson)
    if (parsed) outputMap[exec.agentId] = parsed
  }

  const project = version.project
  const client = project.client
  const versionLabel = version.label ?? `v${version.versionNumber}`
  const dateStr = new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })

  // Build AG sections HTML
  let agHtml = ''
  for (const agentId of AGENT_ORDER) {
    const json = outputMap[agentId]
    if (!json) continue

    const label = AG_LABELS[agentId] ?? agentId
    const sections: OutputSection[] = renderAgentOutput(agentId, json)

    let sectionsHtml = ''
    for (const section of sections) {
      const confBadge = section.confidence
        ? `<span class="conf-badge conf-${section.confidence}">${section.confidence}</span>`
        : ''
      const itemsHtml = section.items.map(itemToHtml).join('')
      sectionsHtml += `
        <div class="section">
          <div class="section-header">
            <span class="section-label">${escHtml(section.label)}</span>
            ${confBadge}
          </div>
          <div class="section-body">${itemsHtml}</div>
        </div>`
    }

    const assumptionsHtml = Array.isArray(json.assumptions) && json.assumptions.length > 0
      ? `<div class="assumptions"><span class="assumptions-label">推測として扱った情報</span><ul>${(json.assumptions as string[]).map(a => `<li>${escHtml(a)}</li>`).join('')}</ul></div>`
      : ''

    agHtml += `
      <div class="ag-block">
        <div class="ag-header">
          <span class="ag-badge">${escHtml(agentId)}</span>
          <span class="ag-title">${escHtml(label)}</span>
        </div>
        ${sectionsHtml}
        ${assumptionsHtml}
      </div>`
  }

  const html = `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escHtml(project.title)} — ${escHtml(versionLabel)}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&family=Noto+Serif+JP:wght@400;700&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --ink: #111;
    --ink2: #333;
    --ink3: #666;
    --ink4: #999;
    --bg: #fff;
    --bg2: #f7f7f5;
    --line: #e8e8e4;
    --red: #c8392b;
    --green: #2d7a4f;
    --amber: #b07c00;
  }

  body {
    font-family: 'Noto Sans JP', 'Hiragino Kaku Gothic ProN', sans-serif;
    font-size: 11px;
    line-height: 1.8;
    color: var(--ink2);
    background: var(--bg);
    padding: 0;
  }

  /* Cover page */
  .cover {
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    min-height: 100vh;
    padding: 60px 64px;
    background: var(--ink);
    color: var(--bg);
    page-break-after: always;
  }
  .cover-meta {
    font-size: 9px;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: rgba(255,255,255,0.5);
    margin-bottom: 24px;
  }
  .cover-title {
    font-family: 'Noto Serif JP', serif;
    font-size: 28px;
    font-weight: 700;
    line-height: 1.3;
    margin-bottom: 16px;
    color: #fff;
  }
  .cover-client {
    font-size: 13px;
    color: rgba(255,255,255,0.75);
    margin-bottom: 8px;
  }
  .cover-date {
    font-size: 10px;
    color: rgba(255,255,255,0.4);
    margin-top: 32px;
  }
  .cover-accent {
    width: 32px;
    height: 2px;
    background: var(--red);
    margin-bottom: 24px;
  }

  /* Main content */
  .content {
    padding: 48px 64px;
    max-width: 860px;
    margin: 0 auto;
  }

  /* AG block */
  .ag-block {
    margin-bottom: 40px;
    page-break-inside: avoid;
  }
  .ag-header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 0;
    border-bottom: 2px solid var(--ink);
    margin-bottom: 16px;
  }
  .ag-badge {
    font-size: 8px;
    font-weight: 700;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    background: var(--ink);
    color: var(--bg);
    padding: 3px 8px;
    border-radius: 2px;
    flex-shrink: 0;
  }
  .ag-title {
    font-size: 13px;
    font-weight: 700;
    color: var(--ink);
    letter-spacing: 0.03em;
  }

  /* Section */
  .section {
    margin-bottom: 20px;
    padding-left: 16px;
    border-left: 2px solid var(--line);
  }
  .section-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
  }
  .section-label {
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--ink3);
  }
  .section-body {
    font-size: 11px;
    line-height: 1.85;
    color: var(--ink2);
  }

  /* Confidence badge */
  .conf-badge {
    font-size: 8px;
    font-weight: 700;
    letter-spacing: 0.1em;
    padding: 2px 6px;
    border-radius: 99px;
    text-transform: uppercase;
  }
  .conf-high   { background: #e6f4ec; color: var(--green); }
  .conf-medium { background: #fff8e1; color: var(--amber); }
  .conf-low    { background: #fce8e6; color: var(--red); }

  /* Items */
  p { margin-bottom: 6px; }
  p.text-secondary { color: var(--ink3); font-size: 10px; }
  .note { color: var(--ink3); font-size: 10px; font-style: italic; margin-top: 2px; }

  ul.item-list {
    list-style: none;
    padding: 0;
    margin: 0 0 8px;
  }
  ul.item-list li {
    padding: 3px 0 3px 14px;
    position: relative;
    border-bottom: 1px solid var(--line);
  }
  ul.item-list li::before {
    content: '—';
    position: absolute;
    left: 0;
    color: var(--ink4);
    font-size: 9px;
  }

  .item-warning {
    display: flex;
    gap: 10px;
    background: #fff8f7;
    border: 1px solid #f5c6c3;
    border-radius: 3px;
    padding: 10px 12px;
    margin-bottom: 8px;
  }
  .warning-icon { color: var(--red); flex-shrink: 0; font-size: 13px; }

  .item-principle {
    background: var(--bg2);
    border-left: 3px solid var(--ink);
    padding: 8px 12px;
    margin-bottom: 8px;
    border-radius: 0 2px 2px 0;
  }
  .item-principle strong { font-size: 11px; color: var(--ink); display: block; margin-bottom: 3px; }

  .badge-row { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }
  .badge {
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.06em;
    background: var(--bg2);
    border: 1px solid var(--line);
    color: var(--ink2);
    padding: 3px 8px;
    border-radius: 2px;
  }

  .assumptions {
    margin-top: 12px;
    padding: 10px 12px;
    background: var(--bg2);
    border-radius: 3px;
    font-size: 10px;
    color: var(--ink3);
  }
  .assumptions-label {
    font-weight: 700;
    font-size: 9px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    display: block;
    margin-bottom: 6px;
  }
  .assumptions ul { padding-left: 14px; }
  .assumptions li { margin-bottom: 3px; }

  /* Print */
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .cover { min-height: 100vh; }
    .ag-block { page-break-inside: avoid; }
    .no-print { display: none; }
  }

  /* Print button (screen only) */
  @media screen {
    .print-bar {
      position: fixed;
      top: 0; left: 0; right: 0;
      background: var(--ink);
      color: #fff;
      padding: 12px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      z-index: 999;
      font-size: 12px;
    }
    .print-btn {
      background: var(--red);
      color: #fff;
      border: none;
      padding: 8px 20px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      border-radius: 2px;
      cursor: pointer;
    }
    body { padding-top: 48px; }
  }
</style>
</head>
<body>
<div class="print-bar no-print">
  <span>${escHtml(project.title)} — ${escHtml(versionLabel)}</span>
  <button class="print-btn" onclick="window.print()">PDF保存 / 印刷</button>
</div>

<div class="cover">
  <div class="cover-meta">Web Proposal Document</div>
  <div class="cover-accent"></div>
  <h1 class="cover-title">${escHtml(project.title)}</h1>
  <p class="cover-client">クライアント：${escHtml(client.name)}　|　${escHtml(client.industry ?? '')}　|　${escHtml(versionLabel)}</p>
  <p class="cover-date">${escHtml(dateStr)}</p>
</div>

<div class="content">
  ${agHtml}
</div>

<script>
  // 自動印刷は無効（ユーザーがボタンで実行）
</script>
</body>
</html>`

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  })
}
