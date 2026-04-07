import fs from 'fs/promises'
import path from 'path'

export async function generatePdf(
  html: string,
  sgId: string,
  orientation: 'landscape' | 'portrait' = 'landscape',
): Promise<string> {
  const puppeteer = await import('puppeteer')
  const browser = await puppeteer.default.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  try {
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle0' })

    const outputDir = path.join(process.cwd(), 'public', 'proposals')
    await fs.mkdir(outputDir, { recursive: true })

    const pdfPath = path.join(outputDir, `${sgId}.pdf`)

    const width = orientation === 'landscape' ? '960px' : '540px'
    const height = orientation === 'landscape' ? '540px' : '960px'

    await page.pdf({
      path: pdfPath,
      width,
      height,
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    })

    return `/proposals/${sgId}.pdf`
  } finally {
    await browser.close()
  }
}
