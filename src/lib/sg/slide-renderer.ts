import { Slide, Theme, THEMES, ToneType, A4, SgComposeOutput, PageComposition, PageZone, ZoneComponent, ChartJsConfig, WireframeArea } from './types'

let chartIndex = 0

// ═══════════════════════════════════════════════
// CSS生成
// ═══════════════════════════════════════════════

export function generateDesignSystemCSS(theme: Theme): string {
  return `
/* ── DESIGN SYSTEM v2 — 12px MINIMUM ── */
:root {
  --pw: 1123px; --ph: 794px;
  --t-mega: ${theme.tMega}; --t-lg: ${theme.tLg}; --t-md: ${theme.tMd}; --t-sm: ${theme.tSm};
  --t-body: ${theme.tBody}; --t-label: ${theme.tLabel};
  --t-stat-lg: ${theme.tStatLg}; --t-stat-md: ${theme.tStatMd}; --t-stat-sm: ${theme.tStatSm};
  --lh-mega: 1.02; --lh-lg: 1.06; --lh-md: 1.12; --lh-sm: 1.2; --lh-body: 1.6;
  --fw-h: 900; --fw-b: 400; --fw-l: 700;
  --bg: ${theme.bg}; --wh: ${theme.bgWhite}; --dk: ${theme.bgDark}; --dk2: ${theme.bgDark2};
  --alt: ${theme.bgAlt}; --alt2: ${theme.bgAlt2};
  --tx: ${theme.text}; --ts: ${theme.textSub}; --td: ${theme.textDim}; --inv: ${theme.textInv};
  --neg: ${theme.negative}; --pos: ${theme.positive}; --info: ${theme.info};
  --bdr: ${theme.border}; --bl: ${theme.borderLight};
  --f: ${theme.fontFamily};
}
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: var(--f); background: #555; font-size: var(--t-body); line-height: var(--lh-body); -webkit-font-smoothing: antialiased; color: var(--tx); }
.S { width: var(--pw); height: var(--ph); margin: 4px auto; overflow: hidden; display: flex; flex-direction: column; background: var(--wh); position: relative; }
.S.dk { background: var(--dk); color: var(--inv); }
.S.tn { background: var(--alt); }
.H { flex-shrink: 0; height: 32px; padding: 0 36px; display: flex; justify-content: space-between; align-items: center; }
.H .sl { font-size: var(--t-label); font-weight: var(--fw-l); letter-spacing: .14em; text-transform: uppercase; color: var(--td); }
.H .sl b { color: var(--tx); }
.dk .H .sl { color: rgba(255,255,255,.3); }
.dk .H .sl b { color: rgba(255,255,255,.5); }
.H .tag { font-size: var(--t-label); font-weight: var(--fw-l); letter-spacing: .1em; text-transform: uppercase; color: var(--td); border: 1px solid var(--bdr); padding: 2px 8px; }
.dk .H .tag { border-color: rgba(255,255,255,.12); color: rgba(255,255,255,.25); }
.C { flex: 1; min-height: 0; overflow: hidden; display: flex; flex-direction: column; }
.F { flex-shrink: 0; height: 32px; padding: 0 36px; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--bl); font-size: var(--t-body); color: var(--td); }
.F .nx { color: var(--tx); font-weight: var(--fw-h); text-align: right; max-width: 400px; }
.dk .F { border-color: rgba(255,255,255,.06); color: rgba(255,255,255,.2); }
.dk .F .nx { color: rgba(255,255,255,.45); }
.tm { font-size: var(--t-mega); font-weight: var(--fw-h); line-height: var(--lh-mega); letter-spacing: -.03em; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; }
.tm em { font-style: normal; text-decoration: underline; text-decoration-thickness: 3px; text-underline-offset: 6px; }
.tl { font-size: var(--t-lg); font-weight: var(--fw-h); line-height: var(--lh-lg); letter-spacing: -.02em; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.tl em { font-style: normal; text-decoration: underline; text-decoration-thickness: 2px; text-underline-offset: 4px; }
.tmd { font-size: var(--t-md); font-weight: var(--fw-h); line-height: var(--lh-md); }
.tsm { font-size: var(--t-sm); font-weight: var(--fw-h); line-height: var(--lh-sm); }
.tb { font-size: var(--t-body); color: var(--ts); line-height: var(--lh-body); flex-shrink: 1; min-height: 0; overflow: hidden; }
.dk .tb { color: rgba(255,255,255,.45); }
.tlab { font-size: var(--t-label); font-weight: var(--fw-l); letter-spacing: .14em; text-transform: uppercase; color: var(--td); }
.dk .tlab { color: rgba(255,255,255,.2); }
.st-lg { font-size: var(--t-stat-lg); font-weight: var(--fw-h); line-height: 1; letter-spacing: -.03em; }
.st-md { font-size: var(--t-stat-md); font-weight: var(--fw-h); line-height: 1; letter-spacing: -.03em; }
.st-sm { font-size: var(--t-stat-sm); font-weight: var(--fw-h); line-height: 1; letter-spacing: -.02em; }
.st-u { font-size: calc(var(--t-body) + 2px); font-weight: var(--fw-l); margin-left: 2px; }
.st-l { font-size: var(--t-body); color: var(--td); margin-top: 3px; }
.dk .st-l { color: rgba(255,255,255,.2); }
.co { background: var(--dk); color: var(--inv); padding: 12px 16px; }
.co-l { font-size: var(--t-label); font-weight: var(--fw-l); letter-spacing: .1em; text-transform: uppercase; opacity: .4; margin-bottom: 3px; }
.co-t { font-size: var(--t-sm); font-weight: var(--fw-h); line-height: 1.25; }
.ev { font-size: var(--t-body); padding: 5px 0; display: flex; gap: 6px; border-bottom: 1px solid var(--bl); color: var(--ts); }
.ev:last-child { border: 0; }
.ev b { flex-shrink: 0; min-width: 28px; font-weight: var(--fw-l); color: var(--tx); }
.bw { padding: 8px 12px; font-size: var(--t-body); color: var(--neg); line-height: 1.5; border-left: 2px solid var(--neg); background: rgba(192,57,43,.04); }
.bi { padding: 8px 12px; font-size: var(--t-body); color: var(--info); line-height: 1.5; border-left: 2px solid var(--info); background: rgba(44,95,138,.04); }
.cc { display: flex; gap: 8px; padding: 8px 10px; background: var(--alt); margin-bottom: 3px; }
.cc-a { font-size: var(--t-label); font-weight: var(--fw-l); letter-spacing: .06em; text-transform: uppercase; background: var(--dk); color: var(--inv); padding: 2px 6px; flex-shrink: 0; margin-top: 1px; }
.cc-c { font-size: var(--t-sm); font-weight: var(--fw-h); line-height: 1.2; }
.cc-n { font-size: var(--t-body); color: var(--td); margin-top: 2px; }
.ch { display: flex; align-items: center; justify-content: center; min-height: 0; flex: 1; }
.ch canvas { width: 100% !important; max-height: 100%; }
.pm { position: relative; border-left: 2px solid var(--tx); border-bottom: 2px solid var(--tx); flex: 1; min-height: 0; }
.pm .ax { position: absolute; font-size: var(--t-body); font-weight: var(--fw-l); color: var(--td); }
.pm .ax-x { bottom: -16px; left: 50%; transform: translateX(-50%); }
.pm .ax-y { top: 50%; left: -20px; transform: rotate(-90deg); white-space: nowrap; }
.pm .dot { position: absolute; transform: translate(-50%,50%); font-size: var(--t-body); font-weight: var(--fw-l); white-space: nowrap; padding: 2px 6px; }
.pm .dc { background: var(--alt); color: var(--ts); }
.pm .dt { background: var(--dk); color: var(--inv); }
.pm .cr { position: absolute; background: var(--bl); }
.pm .crh { width: 100%; height: 1px; top: 50%; }
.pm .crv { width: 1px; height: 100%; left: 50%; }
.vsp { border: 1.5px dashed var(--bdr); padding: 12px 16px; text-align: center; }
.vsp b { font-size: var(--t-label); font-weight: var(--fw-l); letter-spacing: .08em; text-transform: uppercase; color: var(--td); display: block; margin-bottom: 3px; }
.vsp span { font-size: var(--t-body); color: var(--ts); }
.f { display: flex; }
.fc { flex-direction: column; }
.f1 { flex: 1; min-height: 0; min-width: 0; }
.zone { display: flex; flex-direction: column; gap: 8px; justify-content: flex-start; }
.ac { align-items: center; }
.as { align-items: stretch; }
.jc { justify-content: center; }
.oh { overflow: hidden; }
.p-s { padding: 12px 16px; }
.p-m { padding: 16px 24px; }
.p-l { padding: 24px 36px; }
.bg-dk { background: var(--dk); color: var(--inv); }
.bg-dk2 { background: var(--dk2); color: var(--inv); }
.bg-alt { background: var(--alt); }
.bg-wh { background: var(--wh); }
.br { border-right: 1px solid var(--bl); }
.bb { border-bottom: 1px solid var(--bl); }
.bt { border-top: 1px solid var(--bl); }
.dk .br, .dk .bb, .dk .bt { border-color: rgba(255,255,255,.06); }
.c-neg { color: var(--neg); }
.c-pos { color: var(--pos); }
.c-info { color: var(--info); }
.gap-2 { gap: 2px; }
.gap-4 { gap: 4px; }
.gap-6 { gap: 6px; }
.gap-8 { gap: 8px; }
.gap-12 { gap: 12px; }
`
}

// ═══════════════════════════════════════════════
// ユーティリティ
// ═══════════════════════════════════════════════

function esc(str: unknown): string {
  if (str == null) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function toBodyArr(body: unknown): string[] {
  if (!body) return []
  if (Array.isArray(body)) return body.map(String)
  return [String(body)]
}

function renderChartCanvas(chartConfig: ChartJsConfig): string {
  const id = `chart-${++chartIndex}`
  const configJson = esc(JSON.stringify(chartConfig))
  return `<canvas id="${id}" data-chart="${configJson}" style="width:100%;height:100%;"></canvas>`
}

function safeObj(v: unknown): Record<string, unknown> {
  return (v && typeof v === 'object' && !Array.isArray(v)) ? v as Record<string, unknown> : {}
}

function safeArr<T>(v: unknown): T[] {
  return Array.isArray(v) ? v as T[] : []
}

function gz(page: PageComposition, id: string): PageZone | undefined {
  return page.zones.find(z => z.zoneId === id)
}

function rzc(zone: PageZone | undefined): string {
  if (!zone) return ''
  return zone.components.map(comp => renderComponent(comp)).join('\n')
}

// ═══════════════════════════════════════════════
// コンポーネントレンダラー（50種）
// ═══════════════════════════════════════════════

export function renderComponent(comp: ZoneComponent): string {
  const d = (comp.data as Record<string, unknown>) ?? {}

  switch (comp.componentId) {

    case 't-mega': {
      return `<div class="tm">${esc(d.text ?? d.headline ?? '')}</div>`
    }

    case 't-headline-body': {
      const body = String(d.body ?? d.subheadline ?? '')
      return `<div style="display:flex;flex-direction:column;gap:12px">
        <div class="tl">${esc(d.headline ?? d.text ?? '')}</div>
        ${body ? `<div class="tb">${esc(body)}</div>` : ''}
      </div>`
    }

    case 't-body-only': {
      const items = safeArr<string>(d.items)
      return items.length > 0
        ? `<div class="tb">${items.map(t => `<p>${esc(t)}</p>`).join('')}</div>`
        : `<div class="tb">${esc(d.text ?? '')}</div>`
    }

    case 't-callout': {
      return `<div class="co"><div class="co-l">${esc(d.label ?? '')}</div><div class="co-t">${esc(d.text ?? d.body ?? '')}</div></div>`
    }

    case 't-quote': {
      const source = String(d.source ?? '')
      return `<div style="display:flex;flex-direction:column;justify-content:center;height:100%;padding:0 24px">
        <div style="font-size:64px;font-weight:900;line-height:0.8;margin-bottom:8px;opacity:.15">"</div>
        <div class="tl">${esc(d.text ?? d.quote ?? '')}</div>
        ${source ? `<div class="tb" style="margin-top:12px">— ${esc(source)}</div>` : ''}
      </div>`
    }

    case 't-kpi-row': {
      const items = safeArr<{ value: string; unit?: string; label: string }>(d.items)
      return `<div class="f gap-8">${items.map(item =>
        `<div>
          <div class="st-md">${esc(item.value)}<span class="st-u">${esc(item.unit ?? '')}</span></div>
          <div class="st-l">${esc(item.label)}</div>
        </div>`
      ).join('')}</div>`
    }

    case 't-kpi-single': {
      const label = String(d.label ?? '')
      return `<div style="text-align:center">
        <div class="st-lg">${esc(d.value ?? '')}<span class="st-u">${esc(d.unit ?? '')}</span></div>
        ${label ? `<div class="st-l" style="text-align:center">${esc(label)}</div>` : ''}
      </div>`
    }

    case 't-evidence': {
      const items = safeArr<{ stars: number; fact: string; source: string }>(d.items)
      return `<div>
        <div class="tlab" style="margin-bottom:4px">エビデンス</div>
        ${items.map(item =>
          `<div class="ev"><b>${'★'.repeat(Math.min(item.stars ?? 1, 3))}</b><span>${esc(item.fact)} — ${esc(item.source)}</span></div>`
        ).join('')}
      </div>`
    }

    case 't-catch-options': {
      const items = safeArr<{ tag: string; copy: string; reason?: string }>(d.items)
      return `<div style="display:flex;flex-direction:column;gap:3px">${items.map(item =>
        `<div class="cc">
          <div class="cc-a">${esc(item.tag)}</div>
          <div style="flex:1"><div class="cc-c">${esc(item.copy)}</div>${item.reason ? `<div class="cc-n">${esc(item.reason)}</div>` : ''}</div>
        </div>`
      ).join('')}</div>`
    }

    case 't-caveat': {
      return `<div class="bw"><b>⚠ CAVEAT</b> ${esc(d.text ?? d.caveat ?? '')}</div>`
    }

    case 't-cd-note': {
      return `<div class="bi"><b>📌 CD確認</b> ${esc(d.text ?? d.note ?? '')}</div>`
    }

    case 't-section-label': {
      return `<div class="tlab">${esc(d.label ?? d.text ?? '')}</div>`
    }

    case 't-bridge': {
      return `<div class="tb" style="font-weight:var(--fw-l)">${esc(d.text ?? '')}</div>`
    }

    case 't-toc': {
      const items = safeArr<{ number?: string; label: string; title: string; bridge?: string }>(d.items)
      return `<div style="display:flex;height:100%">${items.map((item, i) => {
        const altBg = i % 2 === 0 ? '' : 'background:var(--alt);'
        const isDark = i % 4 === 0 || i % 4 === 3
        return `<div class="f1 f fc p-s" style="${altBg}${isDark ? 'background:var(--dk);' : ''}justify-content:space-between">
          <div><div style="font-size:56px;font-weight:900;line-height:1;opacity:.05${isDark ? ';color:var(--inv)' : ''}">${esc(item.number ?? String(i + 1))}</div></div>
          <div>
            <div class="tmd" style="${isDark ? 'color:var(--inv)' : ''};margin-bottom:4px">${esc(item.label)}</div>
            <div class="tsm" style="${isDark ? 'color:var(--inv)' : ''}">${esc(item.title)}</div>
          </div>
          ${item.bridge ? `<div class="tb" style="${isDark ? 'color:rgba(255,255,255,.25)' : ''}">${esc(item.bridge)}</div>` : ''}
        </div>`
      }).join('')}</div>`
    }

    case 'c-bar-h':
    case 'c-bar-v':
    case 'c-radar':
    case 'c-doughnut':
    case 'c-line':
    case 'c-scatter': {
      const chartConfig = d.chartConfig as ChartJsConfig | undefined
      if (chartConfig) {
        return `<div class="ch">${renderChartCanvas(chartConfig)}</div>`
      }
      return `<div class="ch" style="background:var(--alt);border:1px solid var(--bdr)">
        <div class="vsp"><b>${esc(d.label ?? comp.componentId)}</b><span>グラフデータ生成中...</span></div>
      </div>`
    }

    case 'c-pos-map': {
      const items = safeArr<{ x: number; y: number; label: string; target?: boolean }>(d.items)
      return `<div class="pm">
        <div class="cr crh"></div><div class="cr crv"></div>
        ${d.xLabel ? `<div class="ax ax-x">${esc(d.xLabel)}</div>` : ''}
        ${d.yLabel ? `<div class="ax ax-y">${esc(d.yLabel)}</div>` : ''}
        ${items.map(item => `<div class="dot ${item.target ? 'dt' : 'dc'}" style="left:${item.x}%;bottom:${item.y}%">${esc(item.label)}</div>`).join('')}
      </div>`
    }

    case 's-compare-cols': {
      const cols = safeArr<{ title: string; items: { label: string; text: string; sentiment?: string }[]; highlight?: boolean }>(d.cols)
      return `<div style="display:flex;height:100%">${cols.map((col, i) => {
        const highlightStyle = col.highlight ? 'background:rgba(192,57,43,.04)' : ''
        const headerBg = col.highlight ? 'var(--neg)' : 'var(--dk)'
        return `<div class="f1 f fc" style="${highlightStyle}${i < cols.length - 1 ? ';border-right:1px solid var(--bl)' : ''}">
          <div style="background:${headerBg};padding:12px 16px;flex-shrink:0"><div class="tsm" style="color:var(--inv)">${esc(col.title)}</div></div>
          <div class="f fc p-s f1 oh" style="justify-content:space-between">
            ${safeArr<{ label: string; text: string; sentiment?: string }>(col.items).map(item => {
              const sentColor = item.sentiment === 'positive' ? 'var(--pos)' : item.sentiment === 'negative' ? 'var(--neg)' : 'inherit'
              return `<div><div class="tlab">${esc(item.label)}</div><div class="tb" style="font-weight:var(--fw-l);color:${sentColor}">${esc(item.text)}</div></div>`
            }).join('')}
          </div>
        </div>`
      }).join('')}</div>`
    }

    case 's-stacked-cards': {
      const cards = safeArr<{ title: string; content: string; sentiment?: string }>(d.cards)
      return `<div style="display:flex;flex-direction:column;gap:4px;height:100%">${cards.map(card => {
        const sentColor = card.sentiment === 'positive' ? 'var(--pos)' : card.sentiment === 'negative' ? 'var(--neg)' : 'var(--info)'
        return `<div class="f1 f as bg-alt oh">
          <div style="background:${sentColor};width:4px;flex-shrink:0"></div>
          <div class="f1 f ac" style="padding:8px 12px">
            <div><div class="tb" style="font-weight:var(--fw-l)">${esc(card.title)}</div><div class="tb">${esc(card.content)}</div></div>
          </div>
        </div>`
      }).join('')}</div>`
    }

    case 's-band-item': {
      const bands = safeArr<{ label: string; left: string; right?: string; solution?: string }>(d.bands)
      return `<div class="f1 f fc" style="min-height:0">${bands.map((band, i) =>
        `<div class="f1 f as ${i > 0 ? 'bt' : ''}">
          <div class="bg-dk f fc jc ac" style="width:90px;padding:8px"><div class="tmd" style="color:var(--inv)">${esc(band.label)}</div></div>
          <div class="f1 f ac p-m">
            <div class="f1"><div class="tb" style="font-weight:var(--fw-l)">${esc(band.left)}</div></div>
            ${band.right ? `<div class="f1" style="border-left:1px solid var(--bl);padding-left:14px"><div class="tb" style="font-weight:var(--fw-l)">${esc(band.right)}</div></div>` : ''}
          </div>
          ${band.solution ? `<div class="bg-alt f fc jc ac" style="width:120px;padding:8px;text-align:center"><div class="tb" style="margin-bottom:2px">→ 解決</div><div class="tsm c-info">${esc(band.solution)}</div></div>` : ''}
        </div>`
      ).join('')}</div>`
    }

    case 's-flow-steps': {
      const steps = safeArr<{ label: string; sublabel?: string }>(d.steps)
      return `<div style="display:flex;flex-direction:column;gap:6px">${steps.map((s, i) =>
        `<div class="f as bg-alt" style="gap:10px;padding:9px 12px;border-radius:4px">
          <div style="width:26px;height:26px;background:var(--dk);color:var(--inv);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:var(--t-label);font-weight:var(--fw-h);flex-shrink:0">${i + 1}</div>
          <div>
            <div class="tb" style="font-weight:600;line-height:1.4">${esc(s.label)}</div>
            ${s.sublabel ? `<div class="tb" style="color:var(--td);margin-top:2px">${esc(s.sublabel)}</div>` : ''}
          </div>
        </div>`
      ).join('')}</div>`
    }

    case 's-timeline': {
      const items = safeArr<{ date: string; label: string; desc?: string }>(d.items)
      return `<div style="display:flex;flex-direction:column;gap:0">${items.map((item, i) =>
        `<div class="f" style="gap:12px;padding:8px 0;${i > 0 ? 'border-top:1px solid var(--bl)' : ''}">
          <div style="width:80px;flex-shrink:0;font-weight:var(--fw-l);font-size:var(--t-label);color:var(--td)">${esc(item.date)}</div>
          <div><div class="tb" style="font-weight:var(--fw-l)">${esc(item.label)}</div>${item.desc ? `<div class="tb">${esc(item.desc)}</div>` : ''}</div>
        </div>`
      ).join('')}</div>`
    }

    case 's-icon-grid': {
      const items = safeArr<{ icon?: string; title: string; desc?: string }>(d.items)
      return `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px">${items.map(item =>
        `<div class="bg-alt" style="padding:12px;display:flex;flex-direction:column;gap:4px">
          ${item.icon ? `<div style="font-size:20px">${esc(item.icon)}</div>` : ''}
          <div class="tb" style="font-weight:var(--fw-l)">${esc(item.title)}</div>
          ${item.desc ? `<div class="tb">${esc(item.desc)}</div>` : ''}
        </div>`
      ).join('')}</div>`
    }

    case 's-table': {
      const headers = safeArr<string>(d.headers)
      const rows = safeArr<string[]>(d.rows)
      return `<div style="overflow:auto;flex:1">
        <table style="width:100%;border-collapse:collapse;font-size:var(--t-body)">
          <thead><tr>${headers.map(h => `<th style="background:var(--dk);color:var(--inv);padding:9px 11px;text-align:left;font-weight:var(--fw-h);font-size:var(--t-label);letter-spacing:.03em">${esc(h)}</th>`).join('')}</tr></thead>
          <tbody>${rows.map((row, ri) =>
            `<tr style="${ri % 2 === 1 ? 'background:var(--alt)' : ''}">${safeArr<string>(row).map(cell =>
              `<td style="padding:8px 11px;border-bottom:1px solid var(--bl);color:var(--tx);vertical-align:top">${esc(cell)}</td>`
            ).join('')}</tr>`
          ).join('')}</tbody>
        </table>
      </div>`
    }

    case 's-gap-bar': {
      const items = safeArr<{ label: string; current: number; target: number; max?: number }>(d.items)
      return `<div style="display:flex;flex-direction:column;gap:6px">${items.map(item => {
        const max = item.max ?? 10
        const curPct = Math.round((item.current / max) * 100)
        const tgtPct = Math.round((item.target / max) * 100)
        return `<div>
          <div style="display:flex;justify-content:space-between;margin-bottom:3px">
            <div class="tb" style="font-weight:var(--fw-l)">${esc(item.label)}</div>
            <div class="tb"><span class="c-neg">${item.current}/${max}</span> → ${item.target}/${max}</div>
          </div>
          <div style="background:var(--alt);height:8px;position:relative">
            <div style="background:var(--neg);width:${curPct}%;height:100%;position:absolute"></div>
            <div style="background:var(--pos);width:${tgtPct - curPct}%;height:100%;position:absolute;left:${curPct}%"></div>
          </div>
        </div>`
      }).join('')}</div>`
    }

    case 's-vis-spec': {
      return `<div class="vsp"><b>${esc(d.title ?? d.label ?? 'VISUAL SPEC')}</b><span>${esc(d.spec ?? d.description ?? '')}</span></div>`
    }

    case 's-wireframe': {
      const areas = safeArr<WireframeArea>(d.areas)
      if (areas.length === 0) {
        return `<div class="vsp" style="flex:1"><b>WIREFRAME</b><span>${esc(d.description ?? 'ワイヤーフレーム')}</span></div>`
      }
      return `<div style="position:relative;flex:1;min-height:0;background:var(--alt);border:2px dashed var(--ts)">
        ${areas.map(a =>
          `<div style="position:absolute;left:${a.x}%;top:${a.y}%;width:${a.w}%;height:${a.h}%;border:1.5px solid var(--ts);display:flex;align-items:center;justify-content:center;background:var(--bg);padding:4px;text-align:center;overflow:hidden">
            <div style="font-size:var(--t-label);font-weight:var(--fw-l);color:var(--td)">${esc(a.label)}</div>
          </div>`
        ).join('')}
      </div>`
    }

    case 's-funnel': {
      const stages = safeArr<{ label: string; value?: string | number }>(d.stages)
      return `<div style="display:flex;flex-direction:column;gap:4px;align-items:center">${stages.map((s, i) => {
        const width = 100 - i * (60 / Math.max(stages.length - 1, 1))
        return `<div style="width:${width}%;background:var(--dk);color:var(--inv);text-align:center;padding:8px;opacity:${1 - i * 0.15}">
          <div class="tb" style="color:var(--inv);font-weight:var(--fw-l)">${esc(s.label)}</div>
          ${s.value ? `<div class="tb" style="color:rgba(255,255,255,.4)">${esc(String(s.value))}</div>` : ''}
        </div>`
      }).join('')}</div>`
    }

    case 's-tree': {
      const root = String(d.root ?? '')
      const branches = safeArr<{ label: string; children?: string[] }>(d.branches)
      return `<div style="display:flex;flex-direction:column;gap:8px">
        ${root ? `<div class="tsm" style="text-align:center;margin-bottom:8px">${esc(root)}</div>` : ''}
        <div style="display:flex;gap:8px;justify-content:space-around">${branches.map(b =>
          `<div style="flex:1;display:flex;flex-direction:column;gap:4px;align-items:center">
            <div class="bg-dk p-s" style="text-align:center;width:100%"><div class="tb" style="color:var(--inv);font-weight:var(--fw-l)">${esc(b.label)}</div></div>
            ${safeArr<string>(b.children).map(c =>
              `<div class="bg-alt p-s" style="text-align:center;width:100%"><div class="tb">${esc(c)}</div></div>`
            ).join('')}
          </div>`
        ).join('')}</div>
      </div>`
    }

    case 's-journey-map': {
      const stages = safeArr<{ stage: string; action?: string; emotion?: string; pain?: string }>(d.stages)
      return `<div style="display:flex;height:100%">${stages.map((s, i) =>
        `<div class="f1 f fc" style="${i < stages.length - 1 ? 'border-right:1px solid var(--bl)' : ''}">
          <div class="bg-dk p-s" style="flex-shrink:0;text-align:center"><div class="tb" style="color:var(--inv);font-weight:var(--fw-l)">${esc(s.stage)}</div></div>
          ${s.action ? `<div class="p-s bb"><div class="tlab">行動</div><div class="tb">${esc(s.action)}</div></div>` : ''}
          ${s.emotion ? `<div class="p-s bb"><div class="tlab">感情</div><div class="tb">${esc(s.emotion)}</div></div>` : ''}
          ${s.pain ? `<div class="p-s"><div class="tlab">課題</div><div class="tb c-neg">${esc(s.pain)}</div></div>` : ''}
        </div>`
      ).join('')}</div>`
    }

    case 'd-number-big': {
      return `<div style="font-size:120px;font-weight:900;line-height:1;opacity:${esc(d.opacity ?? '.06')};pointer-events:none;user-select:none">${esc(d.number ?? d.text ?? '')}</div>`
    }

    case 'd-divider': {
      return `<div style="width:100%;height:2px;background:var(--dk)"></div>`
    }

    case 'd-accent-bar': {
      return `<div style="width:40px;height:3px;background:${esc(d.color ?? 'var(--neg)')}"></div>`
    }

    case 'd-photo-area': {
      return `<div style="flex:1;min-height:0;border:1.5px dashed rgba(255,255,255,.1);display:flex;align-items:center;justify-content:center">
        <div class="tlab" style="color:rgba(255,255,255,.12);text-align:center">${esc(d.label ?? 'キービジュアル')}</div>
      </div>`
    }

    case 'd-dark-band': {
      return `<div class="co"><div class="co-t">${esc(d.text ?? '')}</div></div>`
    }

    case 'd-stats-bar': {
      const items = safeArr<{ value: string; unit?: string; label: string }>(d.items)
      return `<div class="f gap-8">${items.map(item =>
        `<div><div class="st-sm">${esc(item.value)}<span class="st-u">${esc(item.unit ?? '')}</span></div><div class="st-l">${esc(item.label)}</div></div>`
      ).join('')}</div>`
    }

    case 'd-chapter-number': {
      return `<div>
        <div style="font-size:var(--t-stat-lg);font-weight:var(--fw-h);line-height:1;letter-spacing:-.03em">${esc(d.number ?? d.text ?? '')}</div>
        ${d.label ? `<div class="tlab" style="margin-top:4px">${esc(d.label)}</div>` : ''}
      </div>`
    }

    case 'd-icon-circle': {
      return `<div style="display:flex;flex-direction:column;align-items:center;gap:6px">
        <div style="width:48px;height:48px;background:var(--dk);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:20px">${esc(d.icon ?? '')}</div>
        ${d.label ? `<div class="tlab" style="text-align:center">${esc(d.label)}</div>` : ''}
      </div>`
    }

    default:
      return `<div class="vsp"><b>${esc(comp.componentId)}</b><span>未実装コンポーネント</span></div>`
  }
}

// ═══════════════════════════════════════════════
// グリッドレンダラー（18種）
// ═══════════════════════════════════════════════

export function renderGrid(page: PageComposition): string {
  switch (page.gridType) {

    case 'G-01':
      return `<div class="f1 f fc p-l oh" style="gap:12px">${rzc(gz(page, 'A'))}</div>`

    case 'G-02':
      return `<div style="display:flex;height:100%">
        <div class="f1 br f fc p-l oh" style="gap:12px">${rzc(gz(page, 'A'))}</div>
        <div class="f1 f fc p-l oh" style="gap:12px">${rzc(gz(page, 'B'))}</div>
      </div>`

    case 'G-03':
      return `<div style="display:flex;height:100%">
        <div style="width:62%;display:flex;flex-direction:column;padding:8px 20px 8px 36px;overflow:hidden;gap:12px">${rzc(gz(page, 'A'))}</div>
        <div style="width:38%;background:var(--alt);display:flex;flex-direction:column;padding:20px 24px;gap:12px">${rzc(gz(page, 'B'))}</div>
      </div>`

    case 'G-04':
      return `<div style="display:flex;height:100%">
        <div class="f1 br f fc p-m oh" style="gap:12px">${rzc(gz(page, 'A'))}</div>
        <div class="f1 br f fc p-m oh" style="gap:12px">${rzc(gz(page, 'B'))}</div>
        <div class="f1 f fc p-m oh" style="gap:12px">${rzc(gz(page, 'C'))}</div>
      </div>`

    case 'G-05':
      return `<div style="display:flex;flex-direction:column;height:100%">
        <div class="f1 bb f fc p-m oh" style="gap:12px">${rzc(gz(page, 'A'))}</div>
        <div class="f1 bb f fc p-m oh" style="gap:12px">${rzc(gz(page, 'B'))}</div>
        <div class="f1 f fc p-m oh" style="gap:12px">${rzc(gz(page, 'C'))}</div>
      </div>`

    case 'G-06': {
      const zoneIds = ['A', 'B', 'C', 'D', 'E', 'F'].filter(id => gz(page, id))
      return `<div style="display:flex;height:100%">${zoneIds.map((id, i) =>
        `<div class="f1 f fc p-s oh ${i < zoneIds.length - 1 ? 'br' : ''}" style="gap:12px;justify-content:space-between">${rzc(gz(page, id))}</div>`
      ).join('')}</div>`
    }

    case 'G-07':
      return `<div style="display:flex;height:100%">
        <div style="width:38%;background:var(--alt);display:flex;flex-direction:column;padding:20px 24px;gap:12px">${rzc(gz(page, 'A'))}</div>
        <div style="width:62%;display:flex;flex-direction:column;padding:8px 36px 8px 20px;overflow:hidden;gap:12px">${rzc(gz(page, 'B'))}</div>
      </div>`

    case 'G-08':
      return `<div style="display:flex;flex-direction:column;height:100%">
        <div style="height:33%;border-bottom:1px solid var(--bl);display:flex;flex-direction:column;padding:12px 36px;gap:8px">${rzc(gz(page, 'A'))}</div>
        <div style="flex:1;display:flex;flex-direction:column;padding:12px 36px;gap:12px">${rzc(gz(page, 'B'))}</div>
      </div>`

    case 'G-09':
      return `<div style="display:flex;flex-direction:column;height:100%">
        <div style="flex:2;border-bottom:1px solid var(--bl);display:flex;flex-direction:column;padding:12px 36px;gap:12px">${rzc(gz(page, 'A'))}</div>
        <div style="flex:1;display:flex;flex-direction:column;padding:12px 36px;gap:8px">${rzc(gz(page, 'B'))}</div>
      </div>`

    case 'G-10':
      return `<div style="display:flex;flex-direction:column;height:100%">
        <div style="flex-shrink:0;border-bottom:1px solid var(--bl);padding:8px 36px;display:flex;flex-direction:column;gap:8px">${rzc(gz(page, 'A'))}</div>
        <div style="flex:1;display:flex">
          <div class="f1 br f fc p-m oh" style="gap:12px">${rzc(gz(page, 'B'))}</div>
          <div class="f1 f fc p-m oh" style="gap:12px">${rzc(gz(page, 'C'))}</div>
        </div>
      </div>`

    case 'G-11':
      return `<div style="display:flex;height:100%">
        <div style="width:200px;background:var(--alt);display:flex;flex-direction:column;padding:16px;gap:12px;flex-shrink:0">${rzc(gz(page, 'A'))}</div>
        <div style="flex:1;display:flex;flex-direction:column">
          <div class="f1 bb f fc p-m oh" style="gap:12px">${rzc(gz(page, 'B'))}</div>
          <div class="f1 f fc p-m oh" style="gap:12px">${rzc(gz(page, 'C'))}</div>
        </div>
      </div>`

    case 'G-12':
      return `<div style="display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;height:100%">
        <div class="br bb f fc p-m oh" style="gap:8px">${rzc(gz(page, 'A'))}</div>
        <div class="bb f fc p-m oh" style="gap:8px">${rzc(gz(page, 'B'))}</div>
        <div class="br f fc p-m oh" style="gap:8px">${rzc(gz(page, 'C'))}</div>
        <div class="f fc p-m oh" style="gap:8px">${rzc(gz(page, 'D'))}</div>
      </div>`

    case 'G-13':
      return `<div style="display:flex;flex-direction:column;height:100%">
        <div style="flex-shrink:0;padding:8px 36px;border-bottom:1px solid var(--bl)">${rzc(gz(page, 'A'))}</div>
        <div style="flex:1;display:flex">
          <div class="f1 br f fc p-m oh" style="gap:8px">${rzc(gz(page, 'B'))}</div>
          <div class="f1 br f fc p-m oh" style="gap:8px">${rzc(gz(page, 'C'))}</div>
          <div class="f1 f fc p-m oh" style="gap:8px">${rzc(gz(page, 'D'))}</div>
        </div>
        <div style="flex-shrink:0;padding:8px 36px;border-top:1px solid var(--bl)">${rzc(gz(page, 'E'))}</div>
      </div>`

    case 'G-14': {
      const cols = ['B', 'C', 'D', 'E'].filter(id => gz(page, id))
      return `<div style="display:flex;flex-direction:column;height:100%">
        <div style="flex-shrink:0;padding:8px 36px;border-bottom:1px solid var(--bl)">${rzc(gz(page, 'A'))}</div>
        <div style="flex:1;display:flex">${cols.map((id, i) =>
          `<div class="f1 ${i < cols.length - 1 ? 'br' : ''} f fc p-m oh" style="gap:8px">${rzc(gz(page, id))}</div>`
        ).join('')}</div>
      </div>`
    }

    case 'G-15': {
      const ids = ['A', 'B', 'C', 'D', 'E', 'F']
      return `<div style="display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr 1fr;height:100%">${ids.map((id, i) =>
        `<div class="${i % 2 === 0 ? 'br' : ''} ${i < 4 ? 'bb' : ''} f fc p-m oh" style="gap:8px">${rzc(gz(page, id))}</div>`
      ).join('')}</div>`
    }

    case 'G-16':
      return `<div style="display:flex;flex-direction:column;height:100%">
        <div style="flex:1;display:flex">
          <div class="f1 br f fc p-l oh" style="gap:12px">${rzc(gz(page, 'A'))}</div>
          <div class="f1 f fc p-l oh" style="gap:12px">${rzc(gz(page, 'B'))}</div>
        </div>
        <div style="flex-shrink:0;padding:8px 36px;border-top:1px solid var(--bl)">${rzc(gz(page, 'C'))}</div>
      </div>`

    case 'G-17':
      return `<div style="display:flex;height:100%">
        <div style="width:40%;display:flex;flex-direction:column;padding:16px 20px 16px 36px;gap:12px">${rzc(gz(page, 'A'))}</div>
        <div style="flex:1;display:flex;flex-direction:column">
          <div class="f1 bb f fc p-m oh" style="gap:8px">${rzc(gz(page, 'B'))}</div>
          <div class="f1 f fc p-m oh" style="gap:8px">${rzc(gz(page, 'C'))}</div>
        </div>
      </div>`

    case 'G-18':
    default: {
      return `<div style="display:flex;flex-direction:column;height:100%;gap:8px;padding:12px 36px">${page.zones.map(z =>
        `<div style="flex:1;min-height:0;overflow:hidden">${rzc(z)}</div>`
      ).join('')}</div>`
    }
  }
}

// ═══════════════════════════════════════════════
// コンポジションテンプレートレンダラー（Phase 1: 20種）
// ═══════════════════════════════════════════════

function renderByCompositionTemplate(page: PageComposition): string {
  switch (page.compositionTemplate) {

    case 'A-01':
      return `<div style="display:flex;height:100%">
        <div class="f1 br f fc jc p-l" style="background:var(--dk2);gap:12px">${rzc(gz(page, 'A'))}</div>
        <div class="f1 f fc jc p-l" style="gap:16px">${rzc(gz(page, 'B'))}</div>
      </div>`

    case 'A-02':
      return `<div class="f1 f fc jc ac p-l" style="text-align:center;gap:16px;background:var(--dk);color:var(--inv)">${rzc(gz(page, 'A'))}</div>`

    case 'A-06': {
      const A = gz(page, 'A')
      const tocComp = A?.components.find(c => c.componentId === 't-toc')
      if (tocComp) return `<div class="f1 oh">${renderComponent(tocComp)}</div>`
      return renderGrid(page)
    }

    case 'A-07':
      return `<div class="f1 f fc" style="justify-content:flex-end;padding:0 36px 28px;border-bottom:2px solid var(--dk)">
        ${rzc(gz(page, 'A'))}
      </div>`

    case 'B-01':
      return `<div style="display:flex;height:100%">
        <div style="width:62%;display:flex;flex-direction:column;padding:8px 20px 8px 36px;overflow:hidden;gap:12px">${rzc(gz(page, 'A'))}</div>
        <div style="width:38%;background:var(--alt);display:flex;flex-direction:column;padding:20px 24px;gap:12px">${rzc(gz(page, 'B'))}</div>
      </div>`

    case 'B-03':
      return `<div class="f1 f fc jc p-l" style="gap:16px">${rzc(gz(page, 'A'))}</div>`

    case 'B-04':
      return `<div style="display:flex;height:100%">
        <div class="f1 f fc jc ac p-l" style="gap:12px;text-align:center">${rzc(gz(page, 'A'))}</div>
        <div class="f1 f fc jc p-l" style="gap:12px">${rzc(gz(page, 'B'))}</div>
      </div>`

    case 'B-10':
      return `<div class="f1 f fc p-l" style="gap:12px">${rzc(gz(page, 'A'))}</div>`

    case 'C-01':
      return `<div style="display:flex;height:100%">
        <div style="width:60%;background:var(--alt);display:flex;flex-direction:column;padding:20px 24px;gap:12px">${rzc(gz(page, 'A'))}</div>
        <div style="width:40%;display:flex;flex-direction:column;padding:16px 36px 16px 20px;gap:12px">${rzc(gz(page, 'B'))}</div>
      </div>`

    case 'C-07':
      return `<div style="display:flex;height:100%">
        <div style="width:42%;display:flex;flex-direction:column;padding:12px 16px 12px 28px;gap:12px">${rzc(gz(page, 'A'))}</div>
        <div style="width:58%;display:flex;flex-direction:column;padding:12px 28px 12px 16px;gap:12px">${rzc(gz(page, 'B'))}</div>
      </div>`

    case 'C-08':
      return `<div style="display:flex;height:100%">
        <div class="f1 br f fc p-m oh" style="gap:12px">${rzc(gz(page, 'A'))}</div>
        <div class="f1 f fc p-m oh" style="gap:12px">${rzc(gz(page, 'B'))}</div>
      </div>`

    case 'D-01': {
      const zoneIds = ['A', 'B', 'C', 'D'].filter(id => gz(page, id))
      return `<div style="display:flex;height:100%">${zoneIds.map((id, i) =>
        `<div class="f1 f fc ${i < zoneIds.length - 1 ? 'br' : ''}">${rzc(gz(page, id))}</div>`
      ).join('')}</div>`
    }

    case 'D-04':
      return `<div style="display:flex;height:100%">
        <div style="width:45%;display:flex;flex-direction:column;padding:8px 16px 8px 36px;overflow:hidden;gap:12px">${rzc(gz(page, 'A'))}</div>
        <div style="width:55%;background:var(--alt);display:flex;flex-direction:column;padding:12px 28px;gap:12px">${rzc(gz(page, 'B'))}</div>
      </div>`

    case 'D-07':
      return `<div style="display:flex;flex-direction:column;height:100%;padding:12px 36px;gap:12px">
        <div style="display:flex;gap:8px;flex-shrink:0">${rzc(gz(page, 'A'))}</div>
        <div class="f1 oh">${rzc(gz(page, 'B'))}</div>
      </div>`

    case 'E-02':
      return `<div class="f1 f fc p-l" style="gap:12px">
        ${rzc(gz(page, 'A'))}
        ${rzc(gz(page, 'B'))}
      </div>`

    case 'F-02': {
      const A = gz(page, 'A')
      const B = gz(page, 'B')
      if (A && B) {
        return `<div style="display:flex;height:100%">
          <div class="f1 br f fc p-m oh" style="gap:12px">${rzc(A)}</div>
          <div class="f1 f fc p-m oh" style="gap:12px">${rzc(B)}</div>
        </div>`
      }
      return renderGrid(page)
    }

    case 'G-01':
    case 'G-02': {
      // バンド系: Aがheader、B以降がband
      const header = gz(page, 'A')
      const bands = page.zones.filter(z => z.zoneId !== 'A')
      return `<div style="display:flex;flex-direction:column;height:100%">
        ${header ? `<div style="padding:4px 36px 8px;flex-shrink:0">${rzc(header)}</div>` : ''}
        <div class="f1 f fc" style="min-height:0">${bands.map((zone, i) =>
          `<div class="f1 f as ${i > 0 ? 'bt' : ''}">${rzc(zone)}</div>`
        ).join('')}</div>
      </div>`
    }

    case 'G-03': {
      const A = gz(page, 'A')
      return `<div style="display:flex;flex-direction:column;height:100%">
        <div class="f1 f fc" style="min-height:0">${rzc(A)}</div>
      </div>`
    }

    case 'H-02':
      return `<div class="f1 f fc jc" style="gap:20px;padding:36px">
        ${rzc(gz(page, 'A'))}
        ${rzc(gz(page, 'B'))}
      </div>`

    default:
      return renderGrid(page)
  }
}

// ═══════════════════════════════════════════════
// ページレンダラー
// ═══════════════════════════════════════════════

export function renderPage(page: PageComposition, slideData: Slide | undefined, _theme: Theme): string {
  const bgClass = page.background === 'dark' ? 'dk' : page.background === 'tinted' ? 'tn' : ''
  const sectionLabel = page.sectionLabel ?? slideData?.sectionLabel ?? ''
  const storyTag = page.storyTag ?? slideData?.storyTag ?? ''
  const bridgeText = page.bridgeText ?? slideData?.bridgeText ?? ''
  const pageNum = page.pageNumber

  const slParts = sectionLabel.split(' ')
  const slNum = slParts[0] ?? ''
  const slText = slParts.slice(1).join(' ')

  const headerHtml = `<div class="H">
    <div class="sl">${sectionLabel ? `<b>${esc(slNum)}</b> ${esc(slText)}` : ''}</div>
    ${storyTag ? `<div class="tag">${esc(storyTag)}</div>` : ''}
  </div>`

  const contentHtml = `<div class="C">${renderByCompositionTemplate(page)}</div>`

  const footerHtml = `<div class="F">
    <span>${esc(String(pageNum))}</span>
    ${bridgeText ? `<div class="nx">${esc(bridgeText)}</div>` : ''}
  </div>`

  return `<div class="S ${bgClass}">${headerHtml}${contentHtml}${footerHtml}</div>`
}

// ═══════════════════════════════════════════════
// フォールバック: Slide → PageComposition 変換
// ═══════════════════════════════════════════════

function slideVisualToComponent(slide: Slide): ZoneComponent {
  if (!slide.visual) {
    return { componentId: 's-vis-spec', data: { title: 'ビジュアル', spec: '' } }
  }
  const { type, data, chartConfig, caption } = slide.visual

  if (type === 'chart' && chartConfig) {
    const compId = chartConfig.type === 'bar' ? 'c-bar-v' :
                   chartConfig.type === 'radar' ? 'c-radar' :
                   chartConfig.type === 'doughnut' ? 'c-doughnut' : 'c-line'
    return { componentId: compId, data: { chartConfig, label: caption ?? '' } }
  }
  if (type === 'table') return { componentId: 's-table', data }
  if (type === 'flow') return { componentId: 's-flow-steps', data }
  if (type === 'wireframe') {
    return { componentId: 's-wireframe', data: { areas: slide.visual.wireframeAreas, description: caption ?? '' } }
  }
  if (type === 'number') return { componentId: 't-kpi-single', data }
  if (type === 'matrix') return { componentId: 'c-pos-map', data }
  return { componentId: 's-vis-spec', data: { title: String(type), spec: caption ?? '' } }
}

function slideToPageComposition(slide: Slide): PageComposition {
  type BgType = 'white' | 'dark' | 'tinted'
  const zones: PageComposition['zones'] = []
  let template: PageComposition['compositionTemplate'] = 'B-01'
  let gridType: PageComposition['gridType'] = 'G-01'
  let bg: BgType = 'white'

  if (slide.compositionTemplate && slide.gridType) {
    const mainZone: PageComposition['zones'][number] = { zoneId: 'A', components: [] }
    mainZone.components.push({ componentId: 't-headline-body', data: { headline: slide.headline, body: slide.subheadline ?? '' } })
    if (slide.body?.length) mainZone.components.push({ componentId: 't-body-only', data: { items: slide.body } })
    if (slide.evidence?.length) mainZone.components.push({ componentId: 't-evidence', data: { items: slide.evidence } })
    if (slide.caveat) mainZone.components.push({ componentId: 't-caveat', data: { text: slide.caveat } })
    zones.push(mainZone)
    if (slide.visual) zones.push({ zoneId: 'B', components: [slideVisualToComponent(slide)] })
    return {
      pageNumber: slide.slideNumber,
      compositionTemplate: slide.compositionTemplate,
      gridType: slide.gridType,
      zones, background: 'white',
      bridgeText: slide.bridgeText,
      sectionLabel: slide.sectionLabel,
      storyTag: slide.storyTag,
      density: 'medium',
    }
  }

  const mainZone: PageComposition['zones'][number] = { zoneId: 'A', components: [] }

  switch (slide.type) {
    case 'cover':
      template = 'A-01'; gridType = 'G-02'; bg = 'dark'
      zones.push({ zoneId: 'A', components: [{ componentId: 'd-photo-area', data: { label: 'カバービジュアル' } }] })
      mainZone.components.push({ componentId: 't-mega', data: { text: slide.headline } })
      if (slide.subheadline) mainZone.components.push({ componentId: 't-body-only', data: { text: slide.subheadline } })
      zones.push({ ...mainZone, zoneId: 'B' })
      break

    case 'chapter-title':
      template = 'A-07'; gridType = 'G-01'
      mainZone.components.push({ componentId: 'd-chapter-number', data: { number: String(slide.slideNumber), label: 'Chapter' } })
      mainZone.components.push({ componentId: 't-headline-body', data: { headline: slide.headline, body: slide.subheadline ?? '' } })
      zones.push(mainZone)
      break

    case 'metrics-hero':
      template = 'B-03'; gridType = 'G-01'
      mainZone.components.push({ componentId: 't-headline-body', data: { headline: slide.headline } })
      if (slide.visual?.type === 'number') mainZone.components.push({ componentId: 't-kpi-single', data: slide.visual.data })
      zones.push(mainZone)
      break

    case 'quote':
      template = 'H-02'; gridType = 'G-01'; bg = 'dark'
      mainZone.components.push({ componentId: 't-quote', data: { text: slide.headline, source: slide.subheadline ?? '' } })
      zones.push(mainZone)
      break

    default:
      template = 'B-01'; gridType = slide.visual ? 'G-03' : 'G-01'
      mainZone.components.push({ componentId: 't-headline-body', data: { headline: slide.headline, body: slide.subheadline ?? '' } })
      if (slide.body?.length) mainZone.components.push({ componentId: 't-body-only', data: { items: slide.body } })
      if (slide.evidence?.length) mainZone.components.push({ componentId: 't-evidence', data: { items: slide.evidence } })
      if (slide.caveat) mainZone.components.push({ componentId: 't-caveat', data: { text: slide.caveat } })
      zones.push(mainZone)
      if (slide.visual) zones.push({ zoneId: 'B', components: [slideVisualToComponent(slide)] })
  }

  return {
    pageNumber: slide.slideNumber,
    compositionTemplate: template,
    gridType,
    zones,
    background: bg,
    bridgeText: slide.bridgeText,
    sectionLabel: slide.sectionLabel,
    storyTag: slide.storyTag,
    density: 'medium',
  }
}

// ═══════════════════════════════════════════════
// メインエントリーポイント
// ═══════════════════════════════════════════════

export function renderSlides(
  slides: Slide[],
  tone: ToneType,
  composeOutput?: SgComposeOutput,
): string {
  const theme = THEMES[tone]
  chartIndex = 0

  const pages: PageComposition[] = composeOutput
    ? composeOutput.pages
    : slides.map(slide => slideToPageComposition(slide))

  const slideMap = new Map(slides.map(s => [s.slideNumber, s]))

  const slidesHtml = pages.map(page => {
    const slide = slideMap.get(page.pageNumber)
    return renderPage(page, slide, theme)
  }).join('\n')

  const css = generateDesignSystemCSS(theme)

  const chartInitScript = `<script>
window.addEventListener('load', function() {
  if (typeof Chart !== 'undefined') {
    Chart.defaults.font.family = ${JSON.stringify(theme.fontFamily)};
    Chart.defaults.font.size = 12;
    Chart.defaults.color = ${JSON.stringify(theme.textSub)};
  }
  document.querySelectorAll('[data-chart]').forEach(function(canvas) {
    try {
      var config = JSON.parse(canvas.getAttribute('data-chart'));
      if (config.options) {
        config.options.plugins = config.options.plugins || {};
        config.options.plugins.legend = config.options.plugins.legend || {};
        config.options.plugins.legend.labels = Object.assign({ font: { size: 12 } }, config.options.plugins.legend.labels);
        if (config.type === 'radar') {
          config.options.scales = config.options.scales || {};
          config.options.scales.r = config.options.scales.r || {};
          config.options.scales.r.pointLabels = Object.assign({ font: { size: 12 }, padding: 8 }, config.options.scales.r.pointLabels);
          config.options.scales.r.ticks = Object.assign({ font: { size: 12 } }, config.options.scales.r.ticks);
        }
      }
      new Chart(canvas, config);
    } catch(e) { console.error('Chart init error:', e); }
  });
  window.chartsReady = true;
});
</script>`

  const { width, height } = A4['landscape']

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300;400;500;700;900&family=Noto+Serif+JP:wght@400;700;900&display=swap" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
  <style>${css}
    .S { width: ${width}px; height: ${height}px; }
  </style>
</head>
<body>
${slidesHtml}
${chartInitScript}
</body>
</html>`
}
