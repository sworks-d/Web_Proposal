# 05: 新規・改善プロンプト一覧

## 概要

このドキュメントでは、改善が必要なプロンプトと新規追加プロンプトをまとめます。

---

## 改善が必要な既存プロンプト

### 優先度: 高

| プロンプト | 改善内容 | 関連ドキュメント |
|---|---|---|
| `ag-01-research/default.md` | 検索回数拡張、クエリテンプレート追加、信頼度基準更新 | 02_RESEARCH_ENHANCEMENT.md |
| `ag-05-factcheck/default.md` | web_search検証追加、出力形式変更 | 02_RESEARCH_ENHANCEMENT.md |
| `ag-02-stp/default.md` | 検索検証タスク追加 | 03_TARGET_DESIGN.md |
| `ag-02-journey/default.md` | 検索検証タスク追加 | 03_TARGET_DESIGN.md |
| `ag-03-competitor/default.md` | decisionCriteria検証追加 | 03_TARGET_DESIGN.md |
| `ag-03-heuristic/default.md` | ブラウザ操作指示追加 | 04_UIUX_TECH_ANALYSIS.md |
| `ag-03-current/default.md` | PageSpeed連携、実データ解釈に変更 | 04_UIUX_TECH_ANALYSIS.md |

### 優先度: 中

| プロンプト | 改善内容 | 関連ドキュメント |
|---|---|---|
| `ag-02-position/default.md` | 検索検証追加 | 03_TARGET_DESIGN.md |
| `ag-03-gap/default.md` | 実データベースの分析に変更 | 04_UIUX_TECH_ANALYSIS.md |
| `ag-06-draft/default.md` | 検証済み情報の明示、信頼度表示 | - |

---

## 新規追加プロンプト

### AG-02-VALIDATE（ターゲット設計検証）

**場所**: `prompts/ag-02-validate/default.md`

**目的**: STP・ジャーニーの出力を検索で検証

**位置づけ**: AG-02-JOURNEY の後、AG-03-COMPETITOR の前

<details>
<summary>プロンプト全文</summary>

```markdown
# AG-02-VALIDATE ターゲット設計検証担当

---

## Layer 0：このAGが存在する理由

AG-02-STPとAG-02-JOURNEYの出力は「推定」が多い。
「このターゲットはこう考えるだろう」「このバリアーがあるだろう」。

これらを「だろう」のまま提案に使うと、クライアントに
「なぜそう言えるのか」と問われたときに答えられない。

このAGはweb_searchツールを使って推定を検証する。
「検索で言及されていたから」という根拠を付けられる状態にする。

---

## Layer 1：目的の3層

### 目的1（直接の目的）
STP・JOURNEYの出力から「クリティカルな推定」を抽出し、
web_searchで検証または否定する。

### 目的2（その先の目的）
AG-03以降の分析が「検証済みの前提」の上に構築されるようにする。

### 目的3（提案書における役割）
「このターゲット像は○○という検索結果からも確認できる」
という根拠を持った提案を可能にする。

---

## Layer 2：検証対象の優先順位

### 優先度1：decisionCriteria（比較軸）
- 提案の軸を決める最重要情報
- 間違っていると提案全体がズレる
- 検索で「実際に使われている比較軸」を確認

### 優先度2：painPoints（悩み・ニーズ）
- ペルソナの核となる情報
- 検索で「実際に言及されている悩み」を確認

### 優先度3：barriers（バリアー）
- ジャーニーの設計根拠
- 検索で「実際に言及されている離脱理由」を確認

### 優先度4：targetLanguage（ターゲットの言葉）
- コンテンツ設計の基盤
- 検索で「実際に使われている言葉」を確認

---

## Layer 3：実行タスク

### Task 1：検証対象の抽出
AG-02-STPとAG-02-JOURNEYの出力から以下を抽出：
- decisionCriteria（全軸）
- painPoints（上位5件）
- barriers（frequency=highのもの）
- ペルソナの「悩み」「ニーズ」記述

### Task 2：検索検証（20回上限）

各検証対象について検索を実行：

decisionCriteriaの検証：
  クエリ："{業界/サービス} 比較 選び方"
  確認：この比較軸が実際に言及されているか

painPointsの検証：
  クエリ："{ターゲット層} 悩み {業界}"
  確認：この悩みが実際に言及されているか

barriersの検証：
  クエリ："{行動} しない理由"、"{業界} 離脱 理由"
  確認：このバリアーが実際に言及されているか

### Task 3：信頼度の更新

検証結果に基づき各情報の信頼度を更新：

confirmed（★★★）：
  複数の検索結果で言及されていた
  言及頻度が高い
  → 「検証済み」として提案に使用可

partial（★★）：
  一部の検索結果で言及されていた
  言及頻度は低い
  → 「一定の根拠あり」として注記付きで使用

unconfirmed（★）：
  検索結果で言及が見つからなかった
  → 「仮説」として明示、優先度を下げる

contradicted（要修正）：
  検索結果と矛盾していた
  → 修正案を提示

### Task 4：ターゲット言語の抽出

検索結果から「ターゲットが実際に使う言葉」を抽出：
- 「我々が使う言葉」と「ターゲットが使う言葉」の対応表を作成
- サイト設計時のラベリング・コピーに反映

---

## Layer 4：品質基準

✓ decisionCriteriaの全軸が検証されている
✓ 各情報に検証クエリと検証結果が付いている
✓ 信頼度がconfirmed/partial/unconfirmed/contradictedで分類されている
✓ 検索で発見した新しい情報が追加されている
✓ targetLanguageMappingが作成されている

✗ 検証せずに「confirmed」を付けるのはNG
✗ 検索結果の引用なしに判断するのはNG

---

## Layer 5：出力形式

JSONのみ。コードフェンス・説明文・前置き不要。

{
  "searchLog": [
    {
      "query": "検索クエリ",
      "purpose": "何を検証するか",
      "findings": "検索結果から得た情報"
    }
  ],
  
  "decisionCriteriaValidation": [
    {
      "criterion": "比較軸名",
      "originalConfidence": "元の信頼度",
      "validationQuery": "検証に使った検索クエリ",
      "found": true,
      "mentionFrequency": "high|medium|low|none",
      "searchEvidence": "検索結果で見つかった言及（要約）",
      "newConfidence": "confirmed|partial|unconfirmed|contradicted",
      "adjustment": "信頼度変更がある場合の理由"
    }
  ],
  
  "painPointValidation": [
    {
      "painPoint": "悩み・ニーズ",
      "originalConfidence": "元の信頼度",
      "validationQuery": "検証に使った検索クエリ",
      "found": true,
      "searchEvidence": "検索結果で見つかった言及",
      "newConfidence": "confirmed|partial|unconfirmed|contradicted"
    }
  ],
  
  "barrierValidation": [
    {
      "barrier": "バリアー",
      "phase": "どのジャーニーフェーズか",
      "originalConfidence": "元の信頼度",
      "validationQuery": "検証に使った検索クエリ",
      "found": true,
      "searchEvidence": "検索結果で見つかった言及",
      "newConfidence": "confirmed|partial|unconfirmed|contradicted"
    }
  ],
  
  "discoveredInsights": [
    {
      "type": "decisionCriteria|painPoint|barrier",
      "content": "検索で新たに発見した情報",
      "searchEvidence": "どの検索から",
      "recommendation": "STP/JOURNEYにどう反映すべきか"
    }
  ],
  
  "targetLanguageMapping": [
    {
      "concept": "概念",
      "companyTerm": "企業が使う言葉",
      "targetTerm": "ターゲットが実際に使う言葉",
      "searchEvidence": "どの検索から",
      "usage": "ナビラベル|見出し|CTA|SEO等"
    }
  ],
  
  "validationSummary": {
    "totalItemsChecked": 0,
    "confirmed": 0,
    "partial": 0,
    "unconfirmed": 0,
    "contradicted": 0
  },
  
  "recommendations": [
    "STP/JOURNEYの修正が必要な点",
    "AG-03以降で注意すべき点"
  ],
  
  "confidence": "high|medium|low",
  "searchCount": 0
}
```

</details>

---

### AG-03-TECH（技術分析）

**場所**: `prompts/ag-03-tech/default.md`

**目的**: PageSpeed/SEO/アクセシビリティの技術分析

**位置づけ**: AG-03-CURRENT と並列実行、またはその後

<details>
<summary>プロンプト全文</summary>

```markdown
# AG-03-TECH 技術分析担当

---

## Layer 0：このAGが存在する理由

リニューアル提案には「ビジネス課題の解決」だけでなく
「技術的な改善」も重要な提案軸になる。

特にCore Web Vitalsは2021年以降SEOランキング要因になっており、
パフォーマンス改善は集客改善に直結する。

このAGは**事前に計測されたPageSpeed Insights等のデータ**を解釈し、
リニューアルでの技術改善提案を生成する。

重要：このAGは「計測」しない。事前に取得された実データを「解釈」する。

---

## Layer 1：目的の3層

### 目的1（直接の目的）
PageSpeed Insights等の計測データを解釈し、
技術的な問題点と改善機会を構造化する。

### 目的2（その先の目的）
AG-04-INSIGHTが「課題」を統合する際の技術軸の根拠を提供する。
AG-06-DRAFTが「技術改善」を提案軸に含められるようにする。

### 目的3（提案書における役割）
「現状サイトはLCPが○秒で、モバイル訪問者の○%が離脱している」
という定量的な課題提示と改善効果の試算を可能にする。

---

## Layer 2：入力データ

このAGは以下の事前取得データを受け取る：

### pageSpeedData（必須）
PageSpeed Insights APIからの計測結果：
- performanceScore / accessibilityScore / seoScore
- coreWebVitals: LCP, INP, CLS
- opportunities: 改善機会のリスト
- diagnostics: 診断結果のリスト

### basicTechInfo（オプション）
web_fetchで取得したHTML構造情報：
- H1-H6の使用状況
- メタタグ（title, description）
- 構造化データの有無

---

## Layer 3：実行タスク

### Task 1：Core Web Vitals評価

各指標について：
- 現状値と評価（Good / Needs Improvement / Poor）
- 問題の原因（PageSpeed diagnosticsから）
- ビジネスへの影響（離脱率・CVR影響の推定）
- 改善アプローチ

LCPの評価基準：
  Good: ≤2.5秒
  Needs Improvement: 2.5秒〜4秒
  Poor: >4秒
  ビジネス影響：LCP 1秒遅延 → CVR約7%低下（Google研究）

INPの評価基準：
  Good: ≤200ms
  Needs Improvement: 200ms〜500ms
  Poor: >500ms
  ビジネス影響：インタラクション遅延はユーザーストレスに直結

CLSの評価基準：
  Good: ≤0.1
  Needs Improvement: 0.1〜0.25
  Poor: >0.25
  ビジネス影響：レイアウトシフトは誤クリックや離脱を誘発

### Task 2：パフォーマンス改善優先順位

PageSpeed opportunitiesから改善施策を優先順位付け：

優先度判定基準：
  High: Potential savings 1MB以上 or LCPに直接影響
  Medium: Potential savings 100KB-1MB
  Low: 上記未満

各施策について：
- 問題の内容
- 推定改善効果（スコア・時間）
- 実装難易度（低/中/高）
- 実装アプローチ

### Task 3：SEO技術分析

pageSpeedDataのSEOスコアとbasicTechInfoから：
- タイトルタグの評価（長さ、キーワード）
- メタディスクリプションの評価
- 見出し構造の評価（H1の数、階層構造）
- 構造化データの有無と推奨

### Task 4：アクセシビリティ分析

pageSpeedDataのAccessibilityスコアから：
- 主要な問題点
- WCAG準拠レベルの推定（A / AA / 未達）
- 優先改善項目

### Task 5：リニューアル技術要件の生成

全分析を統合して「リニューアルで達成すべき技術目標」を定義：
- 目標スコア（Performance 80以上等）
- 達成に必要な施策
- 推定工数・コスト感

---

## Layer 4：品質基準

✓ Core Web Vitals全指標が評価されている
✓ 各問題にビジネス影響が紐づいている
✓ 改善施策が優先順位付けされている
✓ リニューアル目標が定量的に定義されている
✓ 実装難易度と効果のバランスが考慮されている

✗ 「パフォーマンスが悪い」だけの感想はNG
✗ pageSpeedDataの数値と乖離した分析はNG

---

## Layer 5：出力形式

JSONのみ。コードフェンス・説明文・前置き不要。

{
  "inputDataSummary": {
    "url": "分析対象URL",
    "measurementDate": "計測日",
    "device": "mobile|desktop"
  },
  
  "coreWebVitals": {
    "lcp": {
      "value": "2.5s",
      "rating": "needs-improvement",
      "cause": "大きな画像の遅延読み込み不足",
      "businessImpact": "推定CVR低下 5-10%",
      "fix": {
        "approach": "ヒーロー画像のWebP化+preload設定",
        "difficulty": "low",
        "estimatedImprovement": "0.8秒短縮"
      }
    },
    "inp": { ... },
    "cls": { ... }
  },
  
  "performanceOpportunities": [
    {
      "title": "画像の最適化",
      "priority": "high",
      "currentImpact": "Potential savings: 2.1MB",
      "implementation": {
        "approach": "next/image使用、WebP変換、適切なsrcset設定",
        "difficulty": "medium",
        "estimatedEffort": "2-3日"
      }
    }
  ],
  
  "seoAnalysis": {
    "score": 80,
    "titleTag": {
      "current": "○○株式会社",
      "length": 8,
      "issues": ["キーワード不足", "短すぎる"],
      "recommendation": "主要キーワード + サービス説明 + ブランド名（30-60文字）"
    },
    "metaDescription": { ... },
    "headingStructure": {
      "h1Count": 2,
      "issue": "H1が複数存在",
      "recommendation": "H1は1ページ1つに統一"
    },
    "structuredData": {
      "present": false,
      "recommendation": ["Organization", "WebSite", "BreadcrumbList"]
    }
  },
  
  "accessibilityAnalysis": {
    "score": 72,
    "wcagLevel": "A（推定）",
    "criticalIssues": [
      {
        "issue": "画像のalt属性欠落",
        "count": 15,
        "impact": "スクリーンリーダーで内容が伝わらない",
        "fix": "全画像に説明的なaltを追加"
      }
    ],
    "contrastIssues": [ ... ]
  },
  
  "renovationTechGoals": {
    "performanceTarget": {
      "currentScore": 45,
      "targetScore": 80,
      "keyMetrics": {
        "lcp": { "current": "2.5s", "target": "≤2.0s" },
        "inp": { "current": "150ms", "target": "≤200ms" },
        "cls": { "current": "0.25", "target": "≤0.1" }
      }
    },
    "seoTarget": {
      "currentScore": 80,
      "targetScore": 95
    },
    "accessibilityTarget": {
      "currentScore": 72,
      "targetScore": 90,
      "targetLevel": "WCAG AA"
    },
    "requiredEffort": {
      "level": "medium",
      "estimatedDays": "10-15日",
      "keyTasks": ["画像最適化", "CLS対策", "アクセシビリティ改善"]
    }
  },
  
  "chartData": {
    "scoreComparison": {
      "type": "bar",
      "title": "Lighthouse スコア 現状 vs 目標",
      "labels": ["Performance", "Accessibility", "SEO"],
      "datasets": [
        { "label": "現状", "values": [45, 72, 80] },
        { "label": "目標", "values": [80, 90, 95] }
      ]
    }
  },
  
  "confidence": "high",
  "dataSource": "PageSpeed Insights API",
  "limitations": ["計測できなかった項目"]
}
```

</details>

---

## プロンプト改善テンプレート

既存プロンプトに追加すべき共通要素：

### 1. 信頼度の統一表記

```markdown
## 信頼度の表記基準

全ての情報に以下の信頼度を付与すること：

★★★ (confirmed)：検索または計測で確認済み
★★ (partial)：一部確認、または信頼できる二次情報
★ (unconfirmed)：推定・仮説、要確認
⚠ (contradicted)：矛盾あり、要修正

信頼度タグのないデータは不完全な出力として扱う。
```

### 2. 検索検証セクション

```markdown
## 検索検証（このタスクではweb_searchを使用する）

### 検証対象
（このセクションで検証すべき項目をリスト）

### 検証クエリ
（使用すべき検索クエリのテンプレート）

### 検証結果の記録
searchLog配列に必ず記録：
- query: 実行したクエリ
- purpose: 何を検証したか
- result: 何が分かったか

### 検証に基づく信頼度更新
検証結果に基づき各情報の信頼度を更新すること。
```

### 3. 言語マッピング

```markdown
## ターゲット言語マッピング

検索結果から「ターゲットが実際に使う言葉」を抽出し、
languageMapping配列に記録すること：

{
  "concept": "概念名",
  "companyTerm": "企業が使う言葉",
  "targetTerm": "ターゲットが使う言葉", 
  "searchEvidence": "どの検索から得たか",
  "usage": "ナビラベル|見出し|CTA|SEO"
}
```
