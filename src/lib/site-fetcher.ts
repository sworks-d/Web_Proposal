/**
 * 指定URLのHTMLを取得し、テキスト化して返す。
 * リニューアル案件（B/C）でサイト実データを Claude に渡すために使用。
 */

const FETCH_TIMEOUT_MS = 10000
const USER_AGENT = 'Mozilla/5.0 (compatible; WebProposalBot/1.0)'

export interface FetchedPage {
  url: string
  text: string      // タグ除去したテキスト（最大 8000 文字）
  title: string
  ok: boolean
  error?: string
}

/** HTML からタグ・スクリプト・スタイルを除去してテキストを抽出 */
function extractText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 8000)
}

/** <title> タグを抽出 */
function extractTitle(html: string): string {
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  return m ? m[1].trim() : ''
}

/** ナビゲーションから会社概要・サービスページらしき URL を探す */
export function findSubpageUrls(baseUrl: string, html: string): { about?: string; service?: string } {
  const base = new URL(baseUrl)
  const hrefs: string[] = []
  const linkRe = /href=["']([^"'#?]+)["']/gi
  let m: RegExpExecArray | null
  while ((m = linkRe.exec(html)) !== null) hrefs.push(m[1])

  const normalize = (href: string): string | null => {
    try {
      return new URL(href, base.origin).href
    } catch { return null }
  }

  const aboutPatterns = /会社概要|company|about|企業情報|corporate|会社情報/i
  const servicePatterns = /サービス|service|事業内容|business|商品|products|ソリューション/i

  let about: string | undefined
  let service: string | undefined

  for (const href of hrefs) {
    if (!about && aboutPatterns.test(href)) {
      const u = normalize(href)
      if (u && u.startsWith(base.origin)) about = u
    }
    if (!service && servicePatterns.test(href)) {
      const u = normalize(href)
      if (u && u.startsWith(base.origin)) service = u
    }
    if (about && service) break
  }

  return { about, service }
}

/** 1ページを取得してテキスト化 */
export async function fetchPage(url: string): Promise<FetchedPage> {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: controller.signal,
    })
    clearTimeout(timer)
    const html = await res.text()
    return {
      url,
      text: extractText(html),
      title: extractTitle(html),
      ok: true,
    }
  } catch (e) {
    return {
      url,
      text: '',
      title: '',
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    }
  }
}

/**
 * リニューアル案件向けのサイトデータ取得。
 * トップ → 会社概要 → サービスページ を並列取得して統合テキストを返す。
 */
export async function fetchSiteData(siteUrl: string): Promise<{
  combinedText: string
  pages: FetchedPage[]
  subpageUrls: { about?: string; service?: string }
}> {
  console.log(`[site-fetcher] トップページ取得: ${siteUrl}`)
  const top = await fetchPage(siteUrl)

  const subpageUrls = top.ok ? findSubpageUrls(siteUrl, top.text) : {}
  console.log(`[site-fetcher] サブページ検出: about=${subpageUrls.about ?? 'なし'}, service=${subpageUrls.service ?? 'なし'}`)

  const subFetches = await Promise.all([
    subpageUrls.about   ? fetchPage(subpageUrls.about)   : Promise.resolve(null),
    subpageUrls.service ? fetchPage(subpageUrls.service) : Promise.resolve(null),
  ])

  const pages = [top, ...subFetches.filter((p): p is FetchedPage => p !== null)]

  const combinedText = pages
    .filter(p => p.ok && p.text)
    .map(p => `## ${p.title || p.url}\n${p.text}`)
    .join('\n\n---\n\n')
    .slice(0, 20000)

  return { combinedText, pages, subpageUrls }
}
