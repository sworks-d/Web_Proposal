# 04: UI/UX・技術面分析の強化

## 現状の問題

### 根本的な問題
- プロンプトには「サイトを実際に操作する」と書いてあるが、**ブラウザ操作ツールがない**
- PageSpeed Insightsの計測も「手動で確認せよ」と書いてあるだけで**API連携がない**
- 結果として、LLMの知識ベースでの「想像」になっている

### 具体的な問題

| 分析項目 | 現状 | あるべき姿 |
|---|---|---|
| ヒューリスティック評価 | LLMが想像 | 実際にサイトを操作して確認 |
| パフォーマンス計測 | プロンプトに「計測せよ」と書くだけ | PageSpeed Insights APIで自動計測 |
| アクセシビリティ | 一般論のチェック | Lighthouse/axeで自動計測 |
| SEOチェック | 一般論のチェック | 実際のmetaタグ・構造を取得 |

---

## 改善方針

### Tier 1: 外部APIの直接連携（すぐ実装可能）
- PageSpeed Insights API
- 追加コストなし、すぐ実装可能

### Tier 2: MCPサーバー連携（中期）
- Claude in Chrome（ブラウザ操作）
- 実際のサイト操作とスクリーンショット取得

### Tier 3: 追加ツール連携（長期）
- aXe DevTools API（アクセシビリティ）
- SimilarWeb API（トラフィック分析）

---

## 改善1: PageSpeed Insights API連携

### 新規ファイル: `src/lib/pagespeed-client.ts`

```typescript
const PSI_API_KEY = process.env.GOOGLE_PAGESPEED_API_KEY

interface PageSpeedResult {
  performanceScore: number
  accessibilityScore: number
  bestPracticesScore: number
  seoScore: number
  
  coreWebVitals: {
    lcp: { value: number; rating: 'good' | 'needs-improvement' | 'poor' }
    inp: { value: number; rating: 'good' | 'needs-improvement' | 'poor' }
    cls: { value: number; rating: 'good' | 'needs-improvement' | 'poor' }
  }
  
  opportunities: Array<{
    title: string
    description: string
    savings: string // "Potential savings of X KB"
  }>
  
  diagnostics: Array<{
    title: string
    description: string
    displayValue: string
  }>
}

export async function measurePageSpeed(url: string, strategy: 'mobile' | 'desktop' = 'mobile'): Promise<PageSpeedResult> {
  const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=${strategy}&key=${PSI_API_KEY}&category=performance&category=accessibility&category=seo&category=best-practices`
  
  const response = await fetch(apiUrl)
  const data = await response.json()
  
  const lighthouse = data.lighthouseResult
  const categories = lighthouse.categories
  const audits = lighthouse.audits
  
  return {
    performanceScore: Math.round(categories.performance.score * 100),
    accessibilityScore: Math.round(categories.accessibility.score * 100),
    bestPracticesScore: Math.round(categories['best-practices'].score * 100),
    seoScore: Math.round(categories.seo.score * 100),
    
    coreWebVitals: {
      lcp: {
        value: audits['largest-contentful-paint'].numericValue,
        rating: getCWVRating('lcp', audits['largest-contentful-paint'].numericValue)
      },
      inp: {
        value: audits['interaction-to-next-paint']?.numericValue || 0,
        rating: getCWVRating('inp', audits['interaction-to-next-paint']?.numericValue || 0)
      },
      cls: {
        value: audits['cumulative-layout-shift'].numericValue,
        rating: getCWVRating('cls', audits['cumulative-layout-shift'].numericValue)
      }
    },
    
    opportunities: extractOpportunities(audits),
    diagnostics: extractDiagnostics(audits)
  }
}

function getCWVRating(metric: 'lcp' | 'inp' | 'cls', value: number): 'good' | 'needs-improvement' | 'poor' {
  const thresholds = {
    lcp: { good: 2500, poor: 4000 },
    inp: { good: 200, poor: 500 },
    cls: { good: 0.1, poor: 0.25 }
  }
  
  const t = thresholds[metric]
  if (value <= t.good) return 'good'
  if (value <= t.poor) return 'needs-improvement'
  return 'poor'
}
```

### AG-03-CURRENTへの組み込み

```typescript
// ag-03-current.ts の修正

import { measurePageSpeed } from '@/lib/pagespeed-client'

export class Ag03CurrentAgent extends BaseAgent {
  // ...
  
  async execute(input: AgentInput): Promise<AgentOutput> {
    // Step 1: URLを取得
    const targetUrl = input.projectContext.clientWebsite
    
    // Step 2: PageSpeed計測（実データ取得）
    const psiResult = await measurePageSpeed(targetUrl, 'mobile')
    
    // Step 3: 計測結果をコンテキストに追加
    const enrichedInput = {
      ...input,
      toolData: {
        pageSpeedInsights: psiResult
      }
    }
    
    // Step 4: LLMで分析
    const prompt = this.getPrompt(input.projectContext, psiResult)
    // ...
  }
}
```

### プロンプトの修正

```markdown
# AG-03-CURRENT 現状サイト多角的分析（改善版）

## 事前取得データ

以下のデータは実際の計測結果です（LLMで生成したものではありません）：

### PageSpeed Insights 計測結果
{{pageSpeedInsights}}

このデータは信頼度★★★（実計測）として扱ってください。

## 分析タスク

### axis3_performance の分析
事前取得データのPageSpeed結果を使用してください。
「計測する」のではなく「計測結果を解釈する」のがあなたの役割です。

解釈すべき点：
- 各スコアが業界標準と比べてどうか
- Core Web Vitalsの問題がビジネスにどう影響するか
- 優先すべき改善施策は何か
```

---

## 改善2: ブラウザ操作（Claude in Chrome）

### MCP連携の設計

```typescript
// src/lib/mcp-client.ts

const MCP_SERVERS = {
  chrome: {
    type: 'url',
    url: process.env.CHROME_MCP_URL,
    name: 'chrome-mcp'
  }
}

// anthropic-client.ts に追加
export async function callClaudeWithMCP(
  system: string,
  user: string,
  options: ClaudeCallOptions & { mcpServers?: string[] }
): Promise<string> {
  const mcpServerConfigs = options.mcpServers?.map(name => MCP_SERVERS[name]) || []
  
  const res = await anthropic.messages.create({
    model: getModel(options.modelType),
    max_tokens: options.maxTokens,
    system,
    messages: [{ role: 'user', content: user }],
    tools: options.enableWebSearch ? [WEB_SEARCH_TOOL] : [],
    mcp_servers: mcpServerConfigs.length > 0 ? mcpServerConfigs : undefined
  })
  // ...
}
```

### AG-03-HEURISTICへの適用

```markdown
# AG-03-HEURISTIC ヒューリスティック評価（改善版）

## ツール使用指示

このエージェントはClaude in Chrome（ブラウザ操作）を使用できます。

### 必ず実行すること

1. **対象サイトへのアクセス**
   ```
   navigate: {競合URL}
   ```

2. **スクリーンショットの取得**
   - トップページ
   - 主要なサブページ
   - CVページ

3. **実際の操作**
   - ナビゲーションのクリック
   - CVフローの実行（途中まで）
   - モバイル表示の確認

4. **要素の確認**
   - CTAボタンの位置・サイズ
   - フォームのフィールド数
   - 画像のalt属性

### 評価時の注意

「操作した結果○○だった」という形式で記載すること。
「○○だろう」という推測は使わない。
```

---

## 改善3: 技術分析の自動化

### 新規エージェント: AG-03-TECH

```markdown
# AG-03-TECH 技術分析担当

## Role
対象サイトの技術的な構成を分析し、
パフォーマンス・SEO・アクセシビリティの改善機会を特定する。

## 使用データ（事前取得）

### 1. PageSpeed Insights
- Performance / Accessibility / SEO / Best Practices スコア
- Core Web Vitals（LCP, INP, CLS）
- 具体的な改善機会（Opportunities）
- 診断結果（Diagnostics）

### 2. 基本技術情報（web_fetchで取得）
- HTMLの構造（H1-H6の使用状況）
- メタタグ（title, description, OGP）
- 構造化データ（JSON-LD）
- robots.txt / sitemap.xml

## Output

{
  "performanceAnalysis": {
    "coreWebVitals": {
      "lcp": { "value": "2.5s", "rating": "needs-improvement", "cause": "画像最適化不足", "fix": "WebP化+遅延読み込み" },
      "inp": { "value": "150ms", "rating": "good", "cause": null, "fix": null },
      "cls": { "value": "0.25", "rating": "poor", "cause": "広告の動的読み込み", "fix": "広告スペースの事前確保" }
    },
    "topOpportunities": [
      {
        "title": "画像最適化",
        "impact": "high",
        "estimatedSavings": "2.1MB",
        "implementation": "next/image使用、WebP変換、srcset設定"
      }
    ],
    "estimatedImprovement": {
      "currentScore": 45,
      "targetScore": 80,
      "requiredEffort": "中（2-3週間）"
    }
  },
  
  "seoAnalysis": {
    "titleTag": {
      "current": "株式会社○○｜トップページ",
      "issues": ["キーワード不足", "ブランド名が末尾に来るべき"],
      "recommendation": "主要キーワード + ブランド名（60文字以内）"
    },
    "headingStructure": {
      "h1Count": 2,
      "issue": "H1が複数存在",
      "recommendation": "H1は1つに統一"
    },
    "structuredData": {
      "present": false,
      "recommendation": "Organization, WebSite, BreadcrumbListを実装"
    }
  },
  
  "accessibilityAnalysis": {
    "score": 72,
    "criticalIssues": [
      {
        "issue": "画像のalt属性欠落",
        "count": 15,
        "impact": "スクリーンリーダーで画像の内容が伝わらない",
        "fix": "全画像に説明的なaltを追加"
      }
    ],
    "contrastIssues": [
      {
        "element": "サブナビゲーション",
        "currentRatio": "3.2:1",
        "requiredRatio": "4.5:1",
        "fix": "テキスト色を#333から#222に変更"
      }
    ]
  },
  
  "technologyStack": {
    "framework": "WordPress（推定）",
    "hosting": "AWS（推定）",
    "analytics": ["Google Analytics 4"],
    "tagManager": "Google Tag Manager",
    "cdnUsage": false,
    "recommendations": ["CDN導入でグローバル配信最適化"]
  },
  
  "renovationTechRequirements": [
    {
      "requirement": "Core Web Vitals 全指標 Good達成",
      "currentGap": "LCP 2.5s → 2.0s, CLS 0.25 → 0.1",
      "technicalApproach": "画像最適化、レイアウトシフト対策、CDN導入",
      "estimatedEffort": "中"
    }
  ]
}
```

---

## 改善4: 競合サイト自動スキャン

### バッチ処理の設計

複数の競合サイトを効率的に分析するためのバッチ処理。

```typescript
// src/lib/competitor-scanner.ts

interface CompetitorScanResult {
  url: string
  pageSpeed: PageSpeedResult
  basicInfo: {
    title: string
    description: string
    h1: string[]
    hasStructuredData: boolean
  }
  screenshots?: {
    desktop: string // base64
    mobile: string
  }
}

export async function scanCompetitors(urls: string[]): Promise<CompetitorScanResult[]> {
  const results: CompetitorScanResult[] = []
  
  for (const url of urls) {
    // PageSpeed計測
    const pageSpeed = await measurePageSpeed(url)
    
    // 基本情報取得（web_fetchで）
    const basicInfo = await fetchBasicInfo(url)
    
    // スクリーンショット（MCP経由、オプション）
    // const screenshots = await captureScreenshots(url)
    
    results.push({
      url,
      pageSpeed,
      basicInfo,
      // screenshots
    })
    
    // レート制限対策
    await sleep(1000)
  }
  
  return results
}
```

### パイプラインへの組み込み

```
AG-03-COMPETITOR（競合特定）
    ↓ 競合URLリストを出力
競合スキャンバッチ（PageSpeed + 基本情報取得）
    ↓ 実データを収集
AG-03-HEURISTIC（実データをもとに評価）
AG-03-TECH（実データをもとに技術分析）
    ↓
AG-03-MERGE（統合）
```

---

## 改善5: 分析結果の可視化強化

### 新しい図解タイプ

```json
{
  "visualizations": [
    {
      "id": "cwv-comparison",
      "title": "Core Web Vitals 競合比較",
      "vizType": "radar",
      "data": {
        "labels": ["LCP", "INP", "CLS"],
        "datasets": [
          { "label": "クライアント", "values": [2.5, 150, 0.25], "isClient": true },
          { "label": "競合A", "values": [1.8, 120, 0.08] },
          { "label": "競合B", "values": [3.2, 200, 0.15] }
        ]
      }
    },
    {
      "id": "lighthouse-bar",
      "title": "Lighthouse スコア比較",
      "vizType": "bar",
      "data": {
        "labels": ["クライアント", "競合A", "競合B", "業界平均"],
        "datasets": [
          { "label": "Performance", "values": [45, 72, 58, 60] },
          { "label": "Accessibility", "values": [72, 85, 78, 75] },
          { "label": "SEO", "values": [80, 92, 85, 82] }
        ]
      }
    }
  ]
}
```

---

## 実装チェックリスト

### Phase 1: PageSpeed Insights連携
- [ ] `pagespeed-client.ts` 新規作成
- [ ] 環境変数にAPIキー追加
- [ ] AG-03-CURRENTに組み込み
- [ ] AG-03-HEURISTICに組み込み

### Phase 2: AG-03-TECH新規作成
- [ ] プロンプトファイル作成
- [ ] エージェントファイル作成
- [ ] パイプラインに追加

### Phase 3: MCP連携（Claude in Chrome）
- [ ] MCP接続設定
- [ ] AG-03-HEURISTICにブラウザ操作追加
- [ ] スクリーンショット取得機能

### Phase 4: 競合バッチスキャン
- [ ] `competitor-scanner.ts` 新規作成
- [ ] オーケストレーターに組み込み
- [ ] 結果キャッシュ（DB保存）

### Phase 5: 可視化強化
- [ ] 新しい図解タイプのコンポーネント作成
- [ ] AG出力形式の更新
