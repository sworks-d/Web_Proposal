# 06: AG-01 入力フロー再設計

## 背景

現状の設計では、リニューアル案件でも「クライアント名からweb_searchで情報収集」している。
これが処理時間7分超の原因。

**リニューアルならサイトURLがある。まずサイトを見ろ。**

---

## 新しい入力フロー

### 案件種別の判定

```typescript
type CaseType = 'A' | 'B' | 'C'
// A: 新規サイト制作
// B: フルリニューアル
// C: 部分改善・機能追加
```

### 入力項目

| 案件種別 | 必須入力 | 任意入力 |
|---|---|---|
| **A（新規）** | クライアント名、依頼テキスト | 参考サイトURL |
| **B/C（リニューアル・改善）** | **サイトURL**、依頼テキスト | 競合サイトURL |

---

## 情報取得フロー

### A（新規サイト）の場合

```
入力：クライアント名 + 依頼テキスト
    ↓
【web_search】会社基本情報（5回）
  - "{クライアント名} 会社概要 事業内容"
  - "{クライアント名} 本社 設立 従業員"
    ↓
【web_search】業界・市場情報（10回）
  - "{業界名} 市場規模 動向"
  - "{業界名} 主要企業 ランキング"
  - "{クライアント名} 競合 比較"
    ↓
【web_search】補足情報（5回）
  - 口コミ・評判
  - ニュース・プレスリリース
    ↓
合計：最大20回のweb_search
```

### B/C（リニューアル・改善）の場合

```
入力：サイトURL + 依頼テキスト
    ↓
【web_fetch】サイト本体から直接取得
  - トップページ → 会社名、キャッチコピー、主要サービス
  - 会社概要ページ → 所在地、設立、従業員数、事業内容
  - サービス/商品ページ → ラインナップ、特徴
  - 採用ページ（あれば）→ 採用メッセージ、募集職種
    ↓
【自動】PageSpeed Insights計測
  - モバイル/デスクトップ両方
  - Core Web Vitals取得
    ↓
【web_search】周辺情報リサーチ（10回以内）
  - "{会社名} 業界 ポジション"
  - "{業界名} 市場規模 トレンド"
  - "{会社名} 競合"
  - "{会社名} 口コミ 評判"（採用案件ならOpenWork等）
    ↓
合計：web_fetch数回 + web_search最大10回
処理時間：1-2分に短縮
```

---

## 実装詳細

### AG-01-INTAKE の修正

```typescript
// src/agents/ag-01-intake.ts

interface IntakeInput {
  caseType: 'A' | 'B' | 'C'
  clientName?: string      // A必須、B/Cは任意（サイトから取得可）
  siteUrl?: string         // B/C必須、Aは任意
  briefText: string        // 共通必須
  competitorUrls?: string[] // 任意
}

async function execute(input: IntakeInput): Promise<IntakeOutput> {
  if (input.caseType === 'A') {
    // 新規：web_searchで情報収集
    return await executeNewSiteFlow(input)
  } else {
    // リニューアル・改善：サイトURLから情報取得
    return await executeRenewalFlow(input)
  }
}
```

### 新規サイトフロー

```typescript
async function executeNewSiteFlow(input: IntakeInput): Promise<IntakeOutput> {
  // web_search: 会社基本情報（5回）
  const companyInfo = await searchCompanyInfo(input.clientName)
  
  // web_search: 業界情報（10回）
  const industryInfo = await searchIndustryInfo(companyInfo.industry)
  
  // web_search: 補足情報（5回）
  const supplementInfo = await searchSupplementInfo(input.clientName)
  
  return {
    caseType: 'A',
    companyInfo,
    industryInfo,
    supplementInfo,
    searchCount: 20
  }
}
```

### リニューアルフロー

```typescript
async function executeRenewalFlow(input: IntakeInput): Promise<IntakeOutput> {
  // Step 1: サイトから直接情報取得
  const siteData = await fetchSiteData(input.siteUrl)
  // - トップページ
  // - 会社概要ページ
  // - 主要サービスページ
  
  // Step 2: PageSpeed計測（並列実行）
  const pageSpeedData = await measurePageSpeed(input.siteUrl)
  
  // Step 3: 周辺情報リサーチ（10回以内）
  const peripheralInfo = await searchPeripheralInfo({
    companyName: siteData.companyName,
    industry: siteData.industry
  })
  
  return {
    caseType: input.caseType,
    siteData,
    pageSpeedData,
    peripheralInfo,
    searchCount: 10
  }
}
```

### web_fetch対象ページの自動検出

```typescript
async function fetchSiteData(siteUrl: string): Promise<SiteData> {
  // トップページを取得
  const topPage = await webFetch(siteUrl)
  
  // ナビゲーションからリンクを抽出
  const navLinks = extractNavLinks(topPage)
  
  // 会社概要ページを特定して取得
  const aboutUrl = findAboutPage(navLinks) // "会社概要", "about", "company"等
  const aboutPage = aboutUrl ? await webFetch(aboutUrl) : null
  
  // サービスページを特定して取得
  const serviceUrl = findServicePage(navLinks) // "サービス", "事業内容", "service"等
  const servicePage = serviceUrl ? await webFetch(serviceUrl) : null
  
  return {
    companyName: extractCompanyName(topPage, aboutPage),
    description: extractDescription(topPage),
    services: extractServices(servicePage),
    location: extractLocation(aboutPage),
    employees: extractEmployees(aboutPage),
    // ...
  }
}
```

---

## UI側の修正

### プロジェクト作成フォーム

```tsx
// 案件種別の選択
<Select name="caseType" required>
  <option value="A">新規サイト制作</option>
  <option value="B">フルリニューアル</option>
  <option value="C">部分改善・機能追加</option>
</Select>

// B/Cの場合のみ表示
{caseType !== 'A' && (
  <Input 
    name="siteUrl" 
    label="現状サイトURL" 
    required 
    placeholder="https://example.com"
  />
)}

// Aの場合のみ表示
{caseType === 'A' && (
  <Input 
    name="clientName" 
    label="クライアント名" 
    required 
  />
)}
```

---

## 期待される効果

| 指標 | 現状 | 改善後 |
|---|---|---|
| リニューアル案件の処理時間 | 7分以上 | 1-2分 |
| 情報精度（リニューアル） | web_search依存 | サイト実データ |
| API呼び出し回数（リニューアル） | 30回 | 10回程度 |
| コスト（リニューアル） | 高 | 1/3程度 |

---

## 実装チェックリスト

- [ ] IntakeInputの型定義を修正
- [ ] AG-01-INTAKEに案件種別分岐を追加
- [ ] executeRenewalFlow関数を実装
- [ ] fetchSiteData関数を実装（web_fetch使用）
- [ ] PageSpeed計測を並列実行
- [ ] 周辺情報リサーチを10回以内に制限
- [ ] UI側のフォームを修正
- [ ] プロンプトファイルを更新
