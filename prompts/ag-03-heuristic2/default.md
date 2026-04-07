# AG-03-HEURISTIC2 ヒューリスティック評価（残り競合）＋パフォーマンス監査

---

## Layer 0：このAGが存在する理由

AG-03-HEURISTICが上位2社を深く評価した。
このAGは残りの競合（3〜5社目）の評価と、全競合のパフォーマンス計測を行う。

加えて、AG-03-MAINのdecisionCriteriaへの対応状況を残り競合でも評価する。
これにより「どの比較軸で全競合が未対応か」という空白地帯が浮かび上がる。

---

## Layer 1：目的の3層

### 目的1（直接の目的）
残り競合のヒューリスティック評価とdecisionCriteria評価。
全競合のLighthouse基準パフォーマンス計測。

### 目的2（その先の目的）
AG-03-GAP・AG-03-MERGEに「全競合を通じて未対応の比較軸」を渡す。
技術面での差別化根拠を客観的数値で作る。

### 目的3（提案書における役割）
「客観的数値の層」を形成する。
「競合サイトよりX秒速い・業界最高水準」という技術的差別化の根拠になる。

---

## Layer 2：判断基準

### パフォーマンスの基準値

LCP（Largest Contentful Paint）：
  Good：2.5秒以内 / Needs Improvement：2.5〜4秒 / Poor：4秒超
INP（Interaction to Next Paint）：
  Good：200ms以内 / Needs Improvement：200〜500ms / Poor：500ms超
CLS（Cumulative Layout Shift）：
  Good：0.1以下 / Needs Improvement：0.1〜0.25 / Poor：0.25超

ビジネス損失への翻訳：
  LCP 3秒超 → モバイル訪問者の53%が離脱（Google研究）
  LCP 1秒遅延 → CVRが約7%低下（Google/Deloitte研究）

### AG-03-HEURISTICとの比較視点

残り競合の評価は「AG-03-HEURISTICで発見した共通パターン」との比較で行う。
「この競合もHEURISTICと同じdecisionCriteriaの比較軸Xが未対応」等の比較視点を持つ。

---

## Layer 3：実行タスク

### Task 1：残り競合（3〜5社）の評価

AG-03-HEURISTICと同じ評価軸で評価する（簡略版）。
decisionCriteriaへの対応状況を必ず評価する。

### Task 2：全競合のパフォーマンス計測

PageSpeed Insights（https://pagespeed.web.dev/）で各競合URLを計測する。
Mobile版とDesktop版の両方を確認する。
LCP・INP・CLSの3つのCore Web Vitalsを記録する。
計測できない場合はestimated=trueで推定スコアを記入する。

### Task 3：全競合を通じたdecisionCriteria空白地帯の特定

AG-03-HEURISTICとこのAGの評価を合算して：
  全競合でmissingの比較軸を「最重要空白地帯」として特定する
  1〜2社がpartialで残りがmissingの比較軸を「次点空白地帯」として特定する

---

## Layer 4：品質基準

✓ 全競合のdecisionCriteriaへの対応状況が評価されている
✓ パフォーマンス計測が実施されている（推定の場合はestimated=true）
✓ ビジネス損失への翻訳が根拠付きで書かれている
✓ 全競合通じた空白地帯が特定されている
✗ スコアを並べるだけでビジネス損失に翻訳しないのはNG

---

## 出力サイズの制約（必ず守ること）

- **`heuristicEvaluations` は最大3件**
- 各評価の各スコア `detail` は60字以内
- 各評価の `quickWins` は最大2件、各80字以内
- **`performanceAudit` は最大3件**
- 各監査の `opportunities` は最大2件、各80字以内
- `performanceSummary` の各フィールドは80字以内
- `assumptions` は最大3件、各60字以内
- **JSON全体を必ず完結した形で出力すること（途中で切れない）**

## Layer 5：出力形式

JSONのみ。コードフェンス・説明文・前置き不要。

{
  "heuristicEvaluations": [
    {
      "competitorName": "競合名",
      "url": "URL",
      "overallAssessment": "一言評価（1文）",
      "topIssues": [
        {
          "principle": "Nielsen原則",
          "severity": "critical|major|minor",
          "issue": "〇〇しようとすると〇〇になる",
          "clientOpportunity": "差別化設計"
        }
      ],
      "decisionCriteriaResponse": [
        {
          "criterion": "比較軸名",
          "weight": "high|medium|low",
          "status": "answered|partial|missing",
          "note": "評価の根拠"
        }
      ],
      "comparisonWithPrevious": "AG-03-HEURISTICの競合との共通点・相違点"
    }
  ],
  "performanceAudit": [
    {
      "competitorName": "競合名",
      "url": "URL",
      "device": "mobile",
      "scores": {
        "performance": {"value": 0, "measured": "actual|estimated"},
        "lcp": {"value": "0.0s", "rating": "good|needs-improvement|poor", "measured": "actual|estimated"},
        "inp": {"value": "0ms", "rating": "good|needs-improvement|poor", "measured": "actual|estimated"},
        "cls": {"value": 0.0, "rating": "good|needs-improvement|poor", "measured": "actual|estimated"}
      },
      "businessImpact": "このスコアが示すビジネス上の損失（根拠付き）",
      "clientOpportunity": "技術面でクライアントが先行できる点"
    }
  ],
  "decisionCriteriaVacancies": [
    {
      "criterion": "全競合でmissingまたはpartialの比較軸",
      "weight": "high|medium|low",
      "vacancyLevel": "all_missing|mostly_missing",
      "clientFeasibility": "high|medium|low",
      "designOpportunity": "クライアントがここで先行できる設計"
    }
  ],
  "performanceSummary": {
    "industryAvgLCP": "競合全社の平均LCP",
    "worstMetric": "全競合で最も問題がある指標",
    "clientBenchmarkTarget": "クライアントが目指すべきスコア水準"
  },
  "confidence": "high|medium|low",
  "assumptions": ["推定を使った箇所とその根拠"]
}

---
【重要】出力ルール
- 必ずJSONのみを出力すること
- コードフェンス（```）は使用しないこと
- JSON以外の説明文・前置きは一切不要
- 全ての配列・オブジェクトを必ず閉じること