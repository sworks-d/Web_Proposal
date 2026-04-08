import { Slide, Theme, THEMES, ToneType, A4, ChartJsConfig, WireframeArea } from './types'

let chartIndex = 0

export function renderSlides(
  slides: Slide[],
  tone: ToneType,
  orientation: 'landscape' | 'portrait',
): string {
  const theme = THEMES[tone]
  const { width, height } = A4[orientation]
  chartIndex = 0

  const slidesHtml = slides.map(slide => renderSlide(slide, theme, width, height)).join('\n')

  // chart.js初期化スクリプト
  const chartInitScript = `
<script>
window.addEventListener('load', function() {
  const canvases = document.querySelectorAll('[data-chart]');
  canvases.forEach(function(canvas) {
    try {
      const config = JSON.parse(canvas.getAttribute('data-chart'));
      new Chart(canvas, config);
    } catch(e) { console.error('Chart init error:', e); }
  });
  window.chartsReady = true;
});
</script>`

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: ${theme.fontBody}; background: #888; }
    .slide {
      width: ${width}px;
      min-height: ${height}px;
      height: ${height}px;
      padding: ${theme.pagePadding};
      background: ${theme.bg};
      color: ${theme.text};
      page-break-after: always;
      position: relative;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    .slide + .slide { margin-top: 16px; }
    .headline {
      font-family: ${theme.fontTitle};
      font-size: ${theme.headingSize};
      font-weight: 700;
      line-height: 1.25;
      margin-bottom: 16px;
      color: ${theme.text};
      flex-shrink: 0;
    }
    .subheadline {
      font-size: calc(${theme.bodySize} * 1.05);
      color: ${theme.textSub};
      margin-bottom: 18px;
      line-height: 1.5;
      flex-shrink: 0;
    }
    .body-text {
      font-size: ${theme.bodySize};
      line-height: 1.8;
      color: ${theme.text};
    }
    .body-text p { margin-bottom: 10px; }
    .split {
      display: flex;
      gap: 32px;
      flex: 1;
      min-height: 0;
    }
    .split-left { flex: 1; display: flex; flex-direction: column; min-width: 0; }
    .split-right { flex: 1; display: flex; flex-direction: column; justify-content: center; min-width: 0; }
    .accent-bar {
      width: 40px;
      height: 3px;
      background: ${theme.accent};
      margin-bottom: 16px;
      border-radius: 2px;
      flex-shrink: 0;
    }
    .blocks { display: flex; flex-direction: column; gap: 10px; }
    .block {
      background: ${theme.bgAlt};
      padding: 12px 14px;
      border-radius: 6px;
      border-left: 3px solid ${theme.accent};
    }
    .block-title {
      font-weight: 700;
      font-size: 10px;
      color: ${theme.accent};
      text-transform: uppercase;
      letter-spacing: 0.08em;
      margin-bottom: 5px;
    }
    .block-content {
      font-size: calc(${theme.bodySize} * 0.9);
      color: ${theme.text};
      line-height: 1.55;
    }
    .slide-number {
      position: absolute;
      bottom: 18px;
      right: 24px;
      font-size: 10px;
      color: ${theme.textSub};
      font-family: ${theme.fontBody};
    }
    /* cover */
    .cover-content {
      display: flex;
      flex-direction: column;
      justify-content: center;
      height: 100%;
    }
    .cover-title {
      font-family: ${theme.fontTitle};
      font-size: ${theme.titleSize};
      font-weight: 700;
      line-height: 1.2;
      color: ${theme.text};
      margin-bottom: 20px;
    }
    .cover-sub {
      font-size: calc(${theme.bodySize} * 1.15);
      color: ${theme.textSub};
      line-height: 1.6;
    }
    /* chapter-title */
    .chapter-title-content {
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      height: 100%;
      padding-bottom: 28px;
      border-bottom: 2px solid ${theme.accent};
    }
    .chapter-label {
      font-size: 11px;
      color: ${theme.accent};
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      margin-bottom: 10px;
    }
    .chapter-title-text {
      font-family: ${theme.fontTitle};
      font-size: calc(${theme.headingSize} * 1.15);
      font-weight: 700;
      color: ${theme.text};
      line-height: 1.2;
    }
    /* table */
    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: calc(${theme.bodySize} * 0.88);
    }
    .data-table th {
      background: ${theme.accent};
      color: #fff;
      padding: 9px 11px;
      text-align: left;
      font-weight: 700;
      font-size: 11px;
      letter-spacing: 0.03em;
    }
    .data-table td {
      padding: 8px 11px;
      border-bottom: 1px solid ${theme.bgAlt};
      color: ${theme.text};
      vertical-align: top;
    }
    .data-table tr:nth-child(even) td { background: ${theme.bgAlt}; }
    /* flow */
    .flow-steps { display: flex; flex-direction: column; gap: 7px; }
    .flow-step {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 9px 12px;
      background: ${theme.bgAlt};
      border-radius: 5px;
    }
    .flow-step-num {
      width: 26px;
      height: 26px;
      background: ${theme.accent};
      color: #fff;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: 700;
      flex-shrink: 0;
    }
    .flow-step-label { font-size: calc(${theme.bodySize} * 0.95); font-weight: 600; line-height: 1.4; }
    .flow-step-sublabel { font-size: 11px; color: ${theme.textSub}; margin-top: 2px; }
    /* wireframe */
    .wireframe-container {
      position: relative;
      width: 100%;
      flex: 1;
      background: ${theme.bgAlt};
      border: 2px dashed ${theme.textSub};
      border-radius: 4px;
      min-height: 140px;
    }
    .wireframe-area {
      position: absolute;
      border: 1.5px solid ${theme.textSub};
      border-radius: 3px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: ${theme.bg};
      text-align: center;
      padding: 4px 6px;
      overflow: hidden;
    }
    .wireframe-label {
      font-size: 10px;
      font-weight: 700;
      color: ${theme.textSub};
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .wireframe-desc {
      font-size: 9px;
      color: ${theme.accent};
      margin-top: 3px;
      line-height: 1.3;
    }
    /* chart */
    .chart-wrapper {
      flex: 1;
      position: relative;
      min-height: 0;
    }
    /* metrics */
    .metrics-value {
      font-family: ${theme.fontTitle};
      font-size: 72px;
      font-weight: 700;
      color: ${theme.accent};
      line-height: 1;
    }
    .metrics-unit {
      font-size: 28px;
      color: ${theme.textSub};
      margin-left: 6px;
      vertical-align: super;
      font-size: 18px;
    }
    /* quote */
    .quote-mark {
      font-size: 72px;
      color: ${theme.accent};
      line-height: 0.8;
      margin-bottom: 12px;
      font-family: Georgia, serif;
    }
    .quote-text {
      font-family: ${theme.fontTitle};
      font-size: calc(${theme.headingSize} * 0.9);
      font-style: italic;
      line-height: 1.5;
      color: ${theme.text};
    }
  </style>
</head>
<body>
${slidesHtml}
${chartInitScript}
</body>
</html>`
}

function esc(str: unknown): string {
  if (str == null) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// SG-04がbodyを文字列で返すケースをarray化
function toBodyArr(body: unknown): string[] {
  if (!body) return []
  if (Array.isArray(body)) return body.map(String)
  return [String(body)]
}

function renderChartCanvas(chartConfig: ChartJsConfig, width: number, height: number): string {
  const id = `chart-${++chartIndex}`
  const configJson = esc(JSON.stringify(chartConfig))
  return `<canvas id="${id}" data-chart="${configJson}" width="${width}" height="${height}" style="max-width:100%;max-height:100%;"></canvas>`
}

function renderWireframe(areas: WireframeArea[] | undefined, visualData: unknown): string {
  // SG-06からのwireframeAreas優先、なければvisual.dataを使用
  const areasToRender: WireframeArea[] = areas && areas.length > 0
    ? areas
    : Array.isArray((visualData as { areas?: unknown })?.areas)
      ? (visualData as { areas: WireframeArea[] }).areas
      : []

  if (areasToRender.length === 0) {
    return `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--textSub,#999);font-size:13px;">ワイヤーフレーム生成中...</div>`
  }

  const areaHtml = areasToRender.map(a =>
    `<div class="wireframe-area" style="left:${a.x}%;top:${a.y}%;width:${a.w}%;height:${a.h}%;">
      <div class="wireframe-label">${esc(a.label)}</div>
      ${a.description ? `<div class="wireframe-desc">${esc(a.description)}</div>` : ''}
    </div>`
  ).join('')

  return `<div class="wireframe-container">${areaHtml}</div>`
}

function safeObj(v: unknown): Record<string, unknown> {
  return (v && typeof v === 'object' && !Array.isArray(v)) ? v as Record<string, unknown> : {}
}

function renderVisual(slide: Slide, theme: Theme): string {
  if (!slide.visual) return ''
  const { type, data, caption, chartConfig, wireframeAreas } = slide.visual

  let content = ''

  if (type === 'chart') {
    if (chartConfig) {
      content = `<div class="chart-wrapper">${renderChartCanvas(chartConfig, 400, 260)}</div>`
    } else {
      content = `<div style="background:${theme.bgAlt};border-radius:6px;padding:20px;text-align:center;color:${theme.textSub};font-size:12px;">グラフ生成中...</div>`
    }
  } else if (type === 'table') {
    const d = safeObj(data) as { headers?: string[]; rows?: string[][] }
    const headers = (d.headers ?? []).map(h => `<th>${esc(h)}</th>`).join('')
    const rows = (d.rows ?? []).map(row =>
      `<tr>${(Array.isArray(row) ? row : []).map(cell => `<td>${esc(cell)}</td>`).join('')}</tr>`
    ).join('')
    content = `<div style="overflow-x:auto;"><table class="data-table"><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table></div>`
  } else if (type === 'flow') {
    const d = safeObj(data) as { steps?: { label: string; sublabel?: string }[]; nodes?: { label: string; description?: string }[] }
    // stepsかnodesどちらでも受け取れるよう対応
    const rawSteps = Array.isArray(d.steps) ? d.steps : Array.isArray(d.nodes) ? d.nodes.map(n => ({ label: n.label, sublabel: n.description })) : []
    const steps = rawSteps.map((s, i) =>
      `<div class="flow-step">
        <div class="flow-step-num">${i + 1}</div>
        <div>
          <div class="flow-step-label">${esc(s.label)}</div>
          ${s.sublabel ? `<div class="flow-step-sublabel">${esc(s.sublabel)}</div>` : ''}
        </div>
      </div>`
    ).join('')
    content = `<div class="flow-steps">${steps || '<div style="color:#999;font-size:12px;">データなし</div>'}</div>`
  } else if (type === 'number') {
    const d = safeObj(data) as { value?: string; unit?: string; description?: string }
    content = `<div style="text-align:center;padding:16px 0;">
      <span class="metrics-value">${esc(d.value)}</span><span class="metrics-unit">${esc(d.unit ?? '')}</span>
      ${d.description ? `<div style="font-size:${theme.bodySize};color:${theme.textSub};margin-top:12px;">${esc(d.description)}</div>` : ''}
    </div>`
  } else if (type === 'wireframe') {
    content = renderWireframe(wireframeAreas, data)
  } else if (type === 'matrix') {
    const d = safeObj(data) as { xLabel?: string; yLabel?: string; items?: { x: number; y: number; label: string }[] }
    const items = (Array.isArray(d.items) ? d.items : []).map(item =>
      `<div style="position:absolute;left:${item.x}%;bottom:${item.y}%;transform:translate(-50%,50%);background:${theme.accent};color:#fff;padding:3px 7px;border-radius:3px;font-size:10px;white-space:nowrap;">${esc(item.label)}</div>`
    ).join('')
    content = `<div style="position:relative;height:200px;border-left:2px solid ${theme.textSub};border-bottom:2px solid ${theme.textSub};margin:12px 24px 24px 24px;">
      ${d.yLabel ? `<div style="position:absolute;top:-18px;left:50%;transform:translateX(-50%);font-size:10px;color:${theme.textSub};">${esc(d.yLabel)}</div>` : ''}
      ${d.xLabel ? `<div style="position:absolute;bottom:-18px;right:0;font-size:10px;color:${theme.textSub};">${esc(d.xLabel)}</div>` : ''}
      ${items}
    </div>`
  }

  return `<div style="margin-top:10px;">${content}${caption ? `<div style="font-size:10px;color:${theme.textSub};margin-top:6px;text-align:center;">${esc(caption)}</div>` : ''}</div>`
}

function slideNum(n: number): string {
  return `<div class="slide-number">${n}</div>`
}

function renderSlide(slide: Slide, theme: Theme, width: number, height: number): string {
  const baseStyle = `width:${width}px;height:${height}px;`
  const num = slideNum(slide.slideNumber)

  switch (slide.type) {
    case 'cover':
      return `<div class="slide" style="${baseStyle}">
  <div class="cover-content">
    <div class="accent-bar"></div>
    <div class="cover-title">${esc(slide.headline)}</div>
    ${slide.subheadline ? `<div class="cover-sub">${esc(slide.subheadline)}</div>` : ''}
    ${toBodyArr(slide.body).map(b => `<p style="font-size:${theme.bodySize};color:${theme.textSub};margin-top:8px;">${esc(b)}</p>`).join('')}
  </div>
  ${num}
</div>`

    case 'chapter-title':
      return `<div class="slide" style="${baseStyle}">
  <div class="chapter-title-content">
    <div class="chapter-label">Chapter</div>
    <div class="chapter-title-text">${esc(slide.headline)}</div>
    ${slide.subheadline ? `<div class="subheadline" style="margin-top:12px;">${esc(slide.subheadline)}</div>` : ''}
  </div>
  ${num}
</div>`

    case 'text-only':
      return `<div class="slide" style="${baseStyle}">
  <div class="accent-bar"></div>
  <div class="headline">${esc(slide.headline)}</div>
  ${slide.subheadline ? `<div class="subheadline">${esc(slide.subheadline)}</div>` : ''}
  <div class="body-text">
    ${toBodyArr(slide.body).map(b => `<p>${esc(b)}</p>`).join('')}
  </div>
  ${num}
</div>`

    case 'text-visual-split':
      return `<div class="slide" style="${baseStyle}">
  <div class="headline">${esc(slide.headline)}</div>
  <div class="split">
    <div class="split-left">
      ${slide.subheadline ? `<div class="subheadline">${esc(slide.subheadline)}</div>` : ''}
      <div class="body-text">
        ${toBodyArr(slide.body).map(b => `<p>${esc(b)}</p>`).join('')}
      </div>
    </div>
    <div class="split-right">
      ${renderVisual(slide, theme)}
    </div>
  </div>
  ${num}
</div>`

    case 'wireframe-detail':
      return `<div class="slide" style="${baseStyle}">
  <div class="headline">${esc(slide.headline)}</div>
  <div class="split">
    <div class="split-left">
      ${renderWireframe(slide.visual?.wireframeAreas, slide.visual?.data)}
    </div>
    <div class="split-right">
      <div class="blocks">
        ${(slide.blocks ?? []).map(b => `
        <div class="block">
          <div class="block-title">${esc(b.title)}</div>
          <div class="block-content">${esc(b.content)}</div>
        </div>`).join('')}
      </div>
    </div>
  </div>
  ${num}
</div>`

    case 'comparison-table':
      return `<div class="slide" style="${baseStyle}">
  <div class="accent-bar"></div>
  <div class="headline">${esc(slide.headline)}</div>
  ${slide.subheadline ? `<div class="subheadline">${esc(slide.subheadline)}</div>` : ''}
  <div style="margin-top:12px;flex:1;overflow:auto;">
    ${renderVisual(slide, theme)}
  </div>
  ${num}
</div>`

    case 'flow-diagram':
      return `<div class="slide" style="${baseStyle}">
  <div class="accent-bar"></div>
  <div class="headline">${esc(slide.headline)}</div>
  ${slide.subheadline ? `<div class="subheadline">${esc(slide.subheadline)}</div>` : ''}
  <div style="margin-top:12px;flex:1;">
    ${renderVisual(slide, theme)}
  </div>
  ${num}
</div>`

    case 'visual-full':
    case 'matrix-2x2':
      return `<div class="slide" style="${baseStyle}">
  <div class="headline">${esc(slide.headline)}</div>
  ${slide.subheadline ? `<div class="subheadline">${esc(slide.subheadline)}</div>` : ''}
  <div style="flex:1;display:flex;align-items:center;justify-content:center;">
    ${renderVisual(slide, theme)}
  </div>
  ${num}
</div>`

    case 'metrics-hero': {
      const d = slide.visual?.type === 'number'
        ? (slide.visual.data as { value?: string; unit?: string; description?: string })
        : null
      return `<div class="slide" style="${baseStyle}">
  <div style="display:flex;flex-direction:column;justify-content:center;align-items:center;height:100%;text-align:center;">
    <div class="headline" style="text-align:center;margin-bottom:20px;">${esc(slide.headline)}</div>
    ${d ? `
    <div>
      <span class="metrics-value">${esc(d.value)}</span><span class="metrics-unit">${esc(d.unit ?? '')}</span>
    </div>
    ${d.description ? `<div style="font-size:${theme.bodySize};color:${theme.textSub};margin-top:16px;">${esc(d.description)}</div>` : ''}
    ` : renderVisual(slide, theme)}
    ${toBodyArr(slide.body).map(b => `<p style="font-size:${theme.bodySize};color:${theme.textSub};margin-top:10px;">${esc(b)}</p>`).join('')}
  </div>
  ${num}
</div>`
    }

    case 'quote':
      return `<div class="slide" style="${baseStyle}">
  <div style="display:flex;flex-direction:column;justify-content:center;height:100%;max-width:800px;margin:0 auto;">
    <div class="quote-mark">"</div>
    <div class="quote-text">${esc(slide.headline)}</div>
    ${slide.subheadline ? `<div style="font-size:${theme.bodySize};color:${theme.textSub};margin-top:18px;">— ${esc(slide.subheadline)}</div>` : ''}
    ${toBodyArr(slide.body).map(b => `<p style="font-size:${theme.bodySize};color:${theme.textSub};margin-top:10px;">${esc(b)}</p>`).join('')}
  </div>
  ${num}
</div>`

    default:
      return `<div class="slide" style="${baseStyle}">
  <div class="accent-bar"></div>
  <div class="headline">${esc(slide.headline)}</div>
  ${slide.subheadline ? `<div class="subheadline">${esc(slide.subheadline)}</div>` : ''}
  <div class="body-text">
    ${toBodyArr(slide.body).map(b => `<p>${esc(b)}</p>`).join('')}
  </div>
  ${num}
</div>`
  }
}
