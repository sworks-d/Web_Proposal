const PSI_API_KEY = process.env.GOOGLE_PAGESPEED_API_KEY

export interface CWVRating {
  value: number
  rating: 'good' | 'needs-improvement' | 'poor'
}

export interface PageSpeedResult {
  url: string
  strategy: 'mobile' | 'desktop'
  measuredAt: string
  performanceScore: number
  accessibilityScore: number
  bestPracticesScore: number
  seoScore: number
  coreWebVitals: {
    lcp: CWVRating
    inp: CWVRating
    cls: CWVRating
  }
  opportunities: Array<{
    id: string
    title: string
    description: string
    savings: string
  }>
  diagnostics: Array<{
    id: string
    title: string
    description: string
    displayValue: string
  }>
}

function getCWVRating(metric: 'lcp' | 'inp' | 'cls', value: number): CWVRating['rating'] {
  const thresholds = {
    lcp: { good: 2500, poor: 4000 },
    inp: { good: 200,  poor: 500  },
    cls: { good: 0.1,  poor: 0.25 },
  }
  const t = thresholds[metric]
  if (value <= t.good) return 'good'
  if (value <= t.poor) return 'needs-improvement'
  return 'poor'
}

export async function measurePageSpeed(
  url: string,
  strategy: 'mobile' | 'desktop' = 'mobile'
): Promise<PageSpeedResult> {
  if (!PSI_API_KEY) {
    throw new Error('GOOGLE_PAGESPEED_API_KEY が設定されていません')
  }

  const apiUrl =
    `https://www.googleapis.com/pagespeedonline/v5/runPagespeed` +
    `?url=${encodeURIComponent(url)}` +
    `&strategy=${strategy}` +
    `&key=${PSI_API_KEY}` +
    `&category=performance&category=accessibility&category=seo&category=best-practices`

  const response = await fetch(apiUrl)
  if (!response.ok) {
    throw new Error(`PageSpeed API error: ${response.status} ${response.statusText}`)
  }
  const data = await response.json() as Record<string, unknown>

  const lighthouse = data.lighthouseResult as Record<string, unknown>
  const categories = lighthouse.categories as Record<string, { score: number }>
  const audits = lighthouse.audits as Record<string, { numericValue?: number; displayValue?: string; description?: string; title?: string }>

  const lcpValue = audits['largest-contentful-paint']?.numericValue ?? 0
  const inpValue = audits['interaction-to-next-paint']?.numericValue ?? 0
  const clsValue = audits['cumulative-layout-shift']?.numericValue ?? 0

  const opportunityIds = [
    'render-blocking-resources', 'uses-optimized-images', 'uses-webp-images',
    'efficient-animated-content', 'unused-css-rules', 'unused-javascript',
    'uses-text-compression', 'uses-long-cache-ttl', 'total-byte-weight',
  ]
  const diagnosticIds = [
    'largest-contentful-paint-element', 'layout-shift-elements',
    'uses-rel-preload', 'critical-request-chains', 'dom-size',
  ]

  return {
    url,
    strategy,
    measuredAt: new Date().toISOString(),
    performanceScore:   Math.round((categories.performance?.score ?? 0) * 100),
    accessibilityScore: Math.round((categories.accessibility?.score ?? 0) * 100),
    bestPracticesScore: Math.round((categories['best-practices']?.score ?? 0) * 100),
    seoScore:           Math.round((categories.seo?.score ?? 0) * 100),
    coreWebVitals: {
      lcp: { value: lcpValue, rating: getCWVRating('lcp', lcpValue) },
      inp: { value: inpValue, rating: getCWVRating('inp', inpValue) },
      cls: { value: clsValue, rating: getCWVRating('cls', clsValue) },
    },
    opportunities: opportunityIds
      .filter(id => audits[id]?.numericValue !== undefined)
      .map(id => ({
        id,
        title: audits[id].title ?? id,
        description: audits[id].description ?? '',
        savings: audits[id].displayValue ?? '',
      })),
    diagnostics: diagnosticIds
      .filter(id => audits[id] !== undefined)
      .map(id => ({
        id,
        title: audits[id].title ?? id,
        description: audits[id].description ?? '',
        displayValue: audits[id].displayValue ?? '',
      })),
  }
}
