import { Slide, Theme, THEMES, ToneType } from './types'

export function renderSlides(
  slides: Slide[],
  tone: ToneType,
  orientation: 'landscape' | 'portrait',
): string {
  const theme = THEMES[tone]
  const width = orientation === 'landscape' ? 960 : 540
  const height = orientation === 'landscape' ? 540 : 960

  const slidesHtml = slides.map(slide => renderSlide(slide, theme, width, height)).join('\n')

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: ${theme.fontBody}; background: #888; }
    .slide {
      width: ${width}px;
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
    .slide + .slide { margin-top: 24px; }
    .headline {
      font-family: ${theme.fontTitle};
      font-size: ${theme.headingSize};
      font-weight: 700;
      line-height: 1.3;
      margin-bottom: 20px;
      color: ${theme.text};
    }
    .subheadline {
      font-size: calc(${theme.bodySize} * 1.1);
      color: ${theme.textSub};
      margin-bottom: 24px;
      line-height: 1.5;
    }
    .body-text {
      font-size: ${theme.bodySize};
      line-height: 1.85;
      color: ${theme.text};
    }
    .body-text p { margin-bottom: 12px; }
    .split {
      display: flex;
      gap: 40px;
      flex: 1;
      min-height: 0;
    }
    .split-left { flex: 1; display: flex; flex-direction: column; }
    .split-right { flex: 1; display: flex; flex-direction: column; justify-content: center; }
    .accent-bar {
      width: 48px;
      height: 4px;
      background: ${theme.accent};
      margin-bottom: 20px;
      border-radius: 2px;
    }
    .blocks { display: flex; flex-direction: column; gap: 12px; }
    .block {
      background: ${theme.bgAlt};
      padding: 14px 16px;
      border-radius: 8px;
      border-left: 3px solid ${theme.accent};
    }
    .block-title {
      font-weight: 700;
      font-size: 11px;
      color: ${theme.accent};
      text-transform: uppercase;
      letter-spacing: 0.08em;
      margin-bottom: 6px;
    }
    .block-content {
      font-size: calc(${theme.bodySize} * 0.9);
      color: ${theme.text};
      line-height: 1.6;
    }
    .slide-number {
      position: absolute;
      bottom: 20px;
      right: 28px;
      font-size: 11px;
      color: ${theme.textSub};
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
      margin-bottom: 24px;
    }
    .cover-sub {
      font-size: calc(${theme.bodySize} * 1.2);
      color: ${theme.textSub};
    }
    /* chapter-title */
    .chapter-title-content {
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      height: 100%;
      border-bottom: 2px solid ${theme.accent};
      padding-bottom: 32px;
    }
    .chapter-number {
      font-size: 13px;
      color: ${theme.accent};
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      margin-bottom: 12px;
    }
    .chapter-title-text {
      font-family: ${theme.fontTitle};
      font-size: calc(${theme.headingSize} * 1.2);
      font-weight: 700;
      color: ${theme.text};
      line-height: 1.25;
    }
    /* table */
    .data-table { width: 100%; border-collapse: collapse; font-size: calc(${theme.bodySize} * 0.9); }
    .data-table th {
      background: ${theme.accent};
      color: #fff;
      padding: 10px 12px;
      text-align: left;
      font-weight: 700;
      font-size: 12px;
    }
    .data-table td {
      padding: 9px 12px;
      border-bottom: 1px solid ${theme.bgAlt};
      color: ${theme.text};
    }
    .data-table tr:nth-child(even) td { background: ${theme.bgAlt}; }
    /* flow */
    .flow-steps { display: flex; flex-direction: column; gap: 8px; }
    .flow-step {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 14px;
      background: ${theme.bgAlt};
      border-radius: 6px;
    }
    .flow-step-num {
      width: 28px;
      height: 28px;
      background: ${theme.accent};
      color: #fff;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 700;
      flex-shrink: 0;
    }
    .flow-step-label { font-size: calc(${theme.bodySize} * 0.95); font-weight: 600; }
    .flow-step-sublabel { font-size: 12px; color: ${theme.textSub}; margin-top: 2px; }
    /* metrics-hero */
    .metrics-hero-content {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      height: 100%;
      text-align: center;
    }
    .metrics-value {
      font-family: ${theme.fontTitle};
      font-size: calc(${theme.titleSize} * 2);
      font-weight: 700;
      color: ${theme.accent};
      line-height: 1;
    }
    .metrics-unit {
      font-size: calc(${theme.titleSize} * 0.6);
      color: ${theme.textSub};
      margin-left: 8px;
    }
    .metrics-desc {
      font-size: calc(${theme.bodySize} * 1.1);
      color: ${theme.textSub};
      margin-top: 20px;
    }
    /* quote */
    .quote-content {
      display: flex;
      flex-direction: column;
      justify-content: center;
      height: 100%;
    }
    .quote-mark {
      font-size: 80px;
      color: ${theme.accent};
      line-height: 0.8;
      margin-bottom: 16px;
      font-family: Georgia, serif;
    }
    .quote-text {
      font-family: ${theme.fontTitle};
      font-size: calc(${theme.headingSize} * 0.9);
      font-style: italic;
      line-height: 1.5;
      color: ${theme.text};
    }
    /* wireframe */
    .wireframe-box {
      background: ${theme.bgAlt};
      border: 2px dashed ${theme.textSub};
      border-radius: 6px;
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .wireframe-area {
      position: absolute;
      border: 1px solid ${theme.textSub};
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: ${theme.bgAlt};
      font-size: 10px;
      color: ${theme.textSub};
      text-align: center;
      padding: 4px;
    }
    .wireframe-container {
      position: relative;
      flex: 1;
      min-height: 200px;
    }
  </style>
</head>
<body>
${slidesHtml}
</body>
</html>`
}

function esc(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function renderVisual(slide: Slide, theme: Theme): string {
  if (!slide.visual) return ''
  const { type, data, caption } = slide.visual

  let content = ''

  if (type === 'table') {
    const d = data as { headers: string[]; rows: string[][] }
    const headers = d.headers?.map(h => `<th>${esc(h)}</th>`).join('') ?? ''
    const rows = d.rows?.map(row =>
      `<tr>${row.map(cell => `<td>${esc(cell)}</td>`).join('')}</tr>`
    ).join('') ?? ''
    content = `<table class="data-table"><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table>`
  } else if (type === 'flow') {
    const d = data as { steps: { label: string; sublabel?: string }[] }
    const steps = (d.steps ?? []).map((s, i) =>
      `<div class="flow-step">
        <div class="flow-step-num">${i + 1}</div>
        <div>
          <div class="flow-step-label">${esc(s.label)}</div>
          ${s.sublabel ? `<div class="flow-step-sublabel">${esc(s.sublabel)}</div>` : ''}
        </div>
      </div>`
    ).join('')
    content = `<div class="flow-steps">${steps}</div>`
  } else if (type === 'number') {
    const d = data as { value: string; unit: string; description: string }
    content = `<div style="text-align:center;padding:20px 0;">
      <span class="metrics-value">${esc(d.value)}</span><span class="metrics-unit">${esc(d.unit ?? '')}</span>
      <div class="metrics-desc">${esc(d.description ?? '')}</div>
    </div>`
  } else if (type === 'wireframe') {
    const d = data as { areas: { id: string; label: string; x: number; y: number; w: number; h: number }[] }
    const areas = (d.areas ?? []).map(a =>
      `<div class="wireframe-area" style="left:${a.x}%;top:${a.y}%;width:${a.w}%;height:${a.h}%;">${esc(a.label)}</div>`
    ).join('')
    content = `<div class="wireframe-container">${areas}</div>`
  } else if (type === 'matrix') {
    const d = data as { xLabel: string; yLabel: string; items: { x: number; y: number; label: string }[] }
    const items = (d.items ?? []).map(item =>
      `<div style="position:absolute;left:${item.x}%;bottom:${item.y}%;transform:translate(-50%,50%);background:${theme.accent};color:#fff;padding:4px 8px;border-radius:4px;font-size:11px;white-space:nowrap;">${esc(item.label)}</div>`
    ).join('')
    content = `<div style="position:relative;height:200px;border-left:2px solid ${theme.textSub};border-bottom:2px solid ${theme.textSub};margin:16px;">
      <div style="position:absolute;top:-20px;left:50%;transform:translateX(-50%);font-size:11px;color:${theme.textSub};">${esc(d.yLabel ?? '')}</div>
      <div style="position:absolute;bottom:-20px;right:0;font-size:11px;color:${theme.textSub};">${esc(d.xLabel ?? '')}</div>
      ${items}
    </div>`
  }

  return `<div style="margin-top:12px;">${content}${caption ? `<div style="font-size:11px;color:${theme.textSub};margin-top:8px;">${esc(caption)}</div>` : ''}</div>`
}

function renderSlide(slide: Slide, theme: Theme, width: number, height: number): string {
  const num = `<div class="slide-number">${slide.slideNumber}</div>`

  switch (slide.type) {
    case 'cover':
      return `<div class="slide" style="width:${width}px;height:${height}px;">
  <div class="cover-content">
    <div class="accent-bar"></div>
    <div class="cover-title">${esc(slide.headline)}</div>
    ${slide.subheadline ? `<div class="cover-sub">${esc(slide.subheadline)}</div>` : ''}
    ${slide.body ? slide.body.map(b => `<p style="font-size:${theme.bodySize};color:${theme.textSub};margin-top:8px;">${esc(b)}</p>`).join('') : ''}
  </div>
  ${num}
</div>`

    case 'chapter-title':
      return `<div class="slide" style="width:${width}px;height:${height}px;">
  <div class="chapter-title-content">
    <div class="chapter-number">Chapter</div>
    <div class="chapter-title-text">${esc(slide.headline)}</div>
    ${slide.subheadline ? `<div class="subheadline" style="margin-top:16px;">${esc(slide.subheadline)}</div>` : ''}
  </div>
  ${num}
</div>`

    case 'text-only':
      return `<div class="slide" style="width:${width}px;height:${height}px;">
  <div class="accent-bar"></div>
  <div class="headline">${esc(slide.headline)}</div>
  ${slide.subheadline ? `<div class="subheadline">${esc(slide.subheadline)}</div>` : ''}
  <div class="body-text">
    ${(slide.body ?? []).map(b => `<p>${esc(b)}</p>`).join('')}
  </div>
  ${num}
</div>`

    case 'text-visual-split':
      return `<div class="slide" style="width:${width}px;height:${height}px;">
  <div class="headline">${esc(slide.headline)}</div>
  <div class="split">
    <div class="split-left">
      ${slide.subheadline ? `<div class="subheadline">${esc(slide.subheadline)}</div>` : ''}
      <div class="body-text">
        ${(slide.body ?? []).map(b => `<p>${esc(b)}</p>`).join('')}
      </div>
    </div>
    <div class="split-right">
      ${renderVisual(slide, theme)}
    </div>
  </div>
  ${num}
</div>`

    case 'wireframe-detail':
      return `<div class="slide" style="width:${width}px;height:${height}px;">
  <div class="headline">${esc(slide.headline)}</div>
  <div class="split">
    <div class="split-left">
      <div class="wireframe-box">
        ${renderVisual(slide, theme)}
      </div>
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
      return `<div class="slide" style="width:${width}px;height:${height}px;">
  <div class="accent-bar"></div>
  <div class="headline">${esc(slide.headline)}</div>
  ${slide.subheadline ? `<div class="subheadline">${esc(slide.subheadline)}</div>` : ''}
  <div style="margin-top:16px;">
    ${renderVisual(slide, theme)}
  </div>
  ${num}
</div>`

    case 'flow-diagram':
      return `<div class="slide" style="width:${width}px;height:${height}px;">
  <div class="accent-bar"></div>
  <div class="headline">${esc(slide.headline)}</div>
  ${slide.subheadline ? `<div class="subheadline">${esc(slide.subheadline)}</div>` : ''}
  <div style="margin-top:16px;flex:1;">
    ${renderVisual(slide, theme)}
  </div>
  ${num}
</div>`

    case 'metrics-hero':
      return `<div class="slide" style="width:${width}px;height:${height}px;">
  <div class="metrics-hero-content">
    <div class="headline" style="text-align:center;">${esc(slide.headline)}</div>
    ${renderVisual(slide, theme)}
    ${(slide.body ?? []).map(b => `<p style="font-size:${theme.bodySize};color:${theme.textSub};margin-top:12px;text-align:center;">${esc(b)}</p>`).join('')}
  </div>
  ${num}
</div>`

    case 'quote':
      return `<div class="slide" style="width:${width}px;height:${height}px;">
  <div class="quote-content">
    <div class="quote-mark">"</div>
    <div class="quote-text">${esc(slide.headline)}</div>
    ${slide.subheadline ? `<div style="font-size:${theme.bodySize};color:${theme.textSub};margin-top:20px;">— ${esc(slide.subheadline)}</div>` : ''}
  </div>
  ${num}
</div>`

    default:
      // text-only fallback
      return `<div class="slide" style="width:${width}px;height:${height}px;">
  <div class="accent-bar"></div>
  <div class="headline">${esc(slide.headline)}</div>
  ${slide.subheadline ? `<div class="subheadline">${esc(slide.subheadline)}</div>` : ''}
  <div class="body-text">
    ${(slide.body ?? []).map(b => `<p>${esc(b)}</p>`).join('')}
  </div>
  ${num}
</div>`
  }
}
