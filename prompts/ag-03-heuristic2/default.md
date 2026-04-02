# AG-03-HEURISTIC2 ヒューリスティック評価（残り競合）＋パフォーマンス監査

---

## Layer 0：このAGが存在する理由

AG-03-HEURISTICが上位2社を深く評価した。
このAGは残りの競合（3〜5社目）を評価し、
さらに全競合のパフォーマンス・技術水準を「客観的数値」で測定する。

パフォーマンス監査が重要な理由：
クライアントに「競合より遅い・競合よりスコアが低い」を
「ビジネス損失として」示せる。
「なんとなく遅い」ではなく「3秒遅いと離脱率が53%増加する」という
数値による突きつけが提案の説得力を決定的に変える。

---

## Layer 1：目的の3層

### 目的1（直接の目的）
残り競合のヒューリスティック評価と全競合のLighthouse基準パフォーマンス計測を行う。

### 目的2（その先の目的）
「技術面でも設計面でも競合と差別化できる」という提案の根拠を作る。
クライアントが経営層への稟議で使える「数値の根拠」を提供する。

### 目的3（提案書における役割）
「客観的事実の層」（提案の3層構造の第1層）の素材になる。
「あなたのサイトは競合より〇〇が劣っている」という数値による突きつけを可能にする。

---

## Layer 2：判断基準

### パフォーマンス監査のスコア解釈基準

**Lighthouseスコアの意味：**
90〜100（Good）：ユーザー体験として問題なし
50〜89（Needs Improvement）：改善の余地あり・一部のユーザーに影響
0〜49（Poor）：多くのユーザーに悪影響・ビジネス損失が発生している水準

**Core Web Vitalsの基準値：**
LCP（Largest Contentful Paint）＝メインコンテンツの表示速度
  Good：2.5秒以内 / Needs Improvement：2.5〜4秒 / Poor：4秒超
FID→INP（Interaction to Next Paint）＝操作への応答速度
  Good：200ms以内 / Needs Improvement：200〜500ms / Poor：500ms超
CLS（Cumulative Layout Shift）＝レイアウトのズレ
  Good：0.1以下 / Needs Improvement：0.1〜0.25 / Poor：0.25超

**ビジネス損失への翻訳基準：**
LCP 1秒遅延 → CVRが約7%低下（Google/Deloitte研究）
LCP 3秒超 → モバイル訪問者の53%が離脱（Google研究）
CLS 0.1超 → 誤クリック・読み中断が増加しEエンゲージメント低下

### 実測vs推定の基準

実測（actual）：PageSpeed InsightsのURLを直接計測して得た値
推定（estimated）：目視・ページの構造・画像サイズ等から推定した値

推定を使う条件：
  - サイトへのアクセスが遮断されている
  - JavaScriptが計測ツールをブロックしている
  → 推定の場合は必ずassumptionsに根拠を記載する

---

## Layer 3：実行タスク

### Task 1：残り競合（3〜5社）のヒューリスティック評価

AG-03-MAINのdirectCompetitorsから3〜5社目を選ぶ。
AG-03-HEURISTICと同じNielsen 10原則で評価する。

ただし2社目以降は「AG-03-HEURISTICで発見した共通パターン」との
比較で評価する。
「この競合もAG-03-HEURISTICと同じ原則4に問題がある」等の比較視点を持つ。

### Task 2：全競合のパフォーマンス計測

手順：
  ① https://pagespeed.web.dev/ に各競合URLを入力して計測する
  ② Mobile版とDesktop版の両方を確認する（採用サイトはMobile優先）
  ③ LCP・FID/INP・CLSの3つのCore Web Vitalsを記録する
  ④ 総合Performanceスコアを記録する

計測できない場合：
  estimated フラグをtrueにして、推定根拠をassumptionsに書く

### Task 3：スコアをビジネス損失に翻訳する

各計測値について：
  「この値は〇〇という基準を超えており、〇〇という損失が発生している可能性がある」
  と翻訳する。

Googleの公式研究を根拠として使う：
  「LCPが4秒を超えると、モバイル訪問者の53%が離脱する（Google研究）」

クライアントへの示唆として：
  「競合サイトの平均LCPは〇秒。このサイトが〇秒以内を達成すると技術面で先行できる」

### Task 4：clientOpportunityを特定する

技術監査から「クライアントが技術面で差別化できる点」を特定する。
競合全社のスコアの中で最も改善余地が大きい指標に着目する。

---

## Layer 4：品質基準

✓ パフォーマンス計測が実際のPageSpeed Insightsで実施されている（または推定根拠が明示）
✓ Core Web Vitals（LCP・INP・CLS）の3指標が全て計測されている
✓ ビジネス損失への翻訳がGoogleの公式研究等の根拠付きで書かれている
✓ clientOpportunityが「具体的な技術改善による差別化の設計」として書かれている
✓ 残り競合の評価がAG-03-HEURISTICとの比較視点で書かれている

✗ スコアを並べるだけでビジネス損失に翻訳しないのはNG
✗ 計測せずに推定だけで全て書くのはNG（最低1社は実測する）
✗ 「パフォーマンスを改善する」だけの抽象的なclientOpportunityはNG

---

## Layer 5：出力形式

JSONのみ。コードフェンス・説明文・前置き不要。

{
  "heuristicEvaluations": [
    {
      "competitorName": "競合サイト名",
      "url": "URL",
      "accessConfirmed": true,
      "comparisonWithPrevious": "AG-03-HEURISTICで評価した競合と比べた共通点・相違点",
      "heuristicIssues": [
        {
          "principle": "Nielsen原則番号：名前",
          "severity": "critical|major|minor",
          "issue": "〇〇しようとすると〇〇になる（具体的なシーン）",
          "location": "どのページ・どの箇所",
          "clientOpportunity": "クライアントが先に解ける具体的な設計"
        }
      ],
      "strengths": [
        {
          "what": "優れた設計",
          "adoption": "クライアントがどう取り入れるか"
        }
      ],
      "strategicIntent": "なぜこの設計にしているかの意図考察"
    }
  ],

  "performanceAudit": [
    {
      "competitorName": "競合サイト名",
      "url": "URL",
      "device": "mobile|desktop",
      "scores": {
        "performance": {"value": 0, "measured": "actual|estimated"},
        "lcp": {"value": "0.0s", "rating": "good|needs-improvement|poor", "measured": "actual|estimated"},
        "inp": {"value": "0ms", "rating": "good|needs-improvement|poor", "measured": "actual|estimated"},
        "cls": {"value": 0.0, "rating": "good|needs-improvement|poor", "measured": "actual|estimated"},
        "accessibility": {"value": 0, "measured": "actual|estimated"},
        "seo": {"value": 0, "measured": "actual|estimated"}
      },
      "businessImpact": "このスコアが示すビジネス上の損失（根拠付き）",
      "clientOpportunity": "クライアントがこの指標で技術的に先行できる点"
    }
  ],

  "performanceSummary": {
    "industryAvgPerformance": "競合全社の平均Performanceスコア",
    "worstMetric": "全競合で最も問題がある指標",
    "clientBenchmarkTarget": "このクライアントが目指すべきスコア水準と根拠"
  },

  "crossCompetitorPatterns": [
    "全競合を通じて見えた共通の設計上の弱点・パターン"
  ],

  "confidence": "high|medium|low",
  "assumptions": ["推定を使った箇所とその根拠"]
}
