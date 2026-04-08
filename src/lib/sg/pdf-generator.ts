import fs from 'fs/promises'
import path from 'path'
import { A4 } from './types'

export async function generatePdf(
  html: string,
  sgId: string,
  orientation: 'landscape' | 'portrait' = 'landscape',
): Promise<string> {
  const puppeteer = await import('puppeteer')
  const browser = await puppeteer.default.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security'],
  })

  try {
    const page = await browser.newPage()

    // chart.jsのcanvas初期化に必要なviewport設定
    const { width, height } = A4[orientation]
    await page.setViewport({ width, height })

    await page.setContent(html, { waitUntil: 'networkidle0' })

    // chart.jsレンダリング待機（最大3秒）
    await page.evaluate(() => new Promise<void>(resolve => {
      const check = () => {
        if ((window as Window & { chartsReady?: boolean }).chartsReady) {
          resolve()
        } else {
          setTimeout(check, 100)
        }
      }
      // chart.jsがない場合も正常に完了させる
      setTimeout(() => resolve(), 3000)
      check()
    }))

    const outputDir = path.join(process.cwd(), 'public', 'proposals')
    await fs.mkdir(outputDir, { recursive: true })

    const pdfPath = path.join(outputDir, `${sgId}.pdf`)

    await page.pdf({
      path: pdfPath,
      width: `${width}px`,
      height: `${height}px`,
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    })

    return `/proposals/${sgId}.pdf`
  } finally {
    await browser.close()
  }
}
