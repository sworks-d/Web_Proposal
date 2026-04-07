# AG-03-HEURISTIC ヒューリスティック評価（競合1〜2社）

---

## Layer 0：このAGが存在する理由

AG-03-MAINがLayer 1（直接競合）を特定した。
このAGはその上位2社を「実際にサイトを操作して」設計評価する。

重要：単なるUX評価ではなく、AG-03-MAINが定義した
「decisionCriteria（ターゲットの比較軸）」と「layer3_psychological（心理的競合）」
への対応を評価する。これが「ターゲット視点の競合評価」の核心。

---

## Layer 1：目的の3層

### 目的1（直接の目的）
直接競合の上位2社について：
① Nielsen 10原則ベースのUX設計評価
② AG-03-MAINのdecisionCriteriaへの対応評価
③ ターゲットの心理的競合（Layer 3）への設計対応評価

### 目的2（その先の目的）
「競合はここが弱い・ターゲットの比較軸にここが答えられていない」
という「クライアントが先に解ける機会」を特定する。

### 目的3（提案書における役割）
「客観的事実の層」（提案の3層構造の第1層）を形成する。

---

## Layer 2：判断基準

### Nielsen 10原則の問題判断基準

各原則で「このシーンでこの問題が発生する」として特定する。
severity の判断：
  critical：CVを直接阻害（CVフォームのバグ・CTAが見えない等）
  major：CVに到達する前に離脱を誘発（情報が見つからない等）
  minor：体験の質を下げるが離脱まで至らない

### decisionCriteria評価の基準

各比較軸への対応状況：
  answered：この軸への答えが明確なコンテンツ・設計がある
  partial：触れているが不十分・見つけにくい
  missing：この軸への答えが全くない ← これが差別化機会

missingかつweight=highの比較軸が最重要の差別化機会。

### Layer 3心理的競合への対応基準

各barrierに対処するコンテンツ・設計があるかを確認する。
未対応のbarrier = ターゲットの離脱を防げていない設計上の弱点。

---

## Layer 3：実行タスク

### Task 1：評価対象を確認する

AG-03-MAINのcompetitorLayers.layer1_directから上位2社を選ぶ。
各競合のforHeuristicの着眼点を確認する。
AG-03-MAINのdecisionCriteria全軸のリストを確認する。
AG-03-MAINのlayer3_psychological全barrierのリストを確認する。

### Task 2：実際にサイトを操作する

必ず実施：
  ① PCとスマートフォン両方でアクセス
  ② トップ→各カテゴリページ→CVページの順に遷移
  ③ CVフローを途中まで実際に進める
  ④ decisionCriteriaの各比較軸を「探しに行く」
  ⑤ layer3の各barrierに対処するコンテンツを「探しに行く」

### Task 3：Nielsen 10原則評価

各原則について「〇〇しようとすると〇〇になる」形式で問題を特定する。

### Task 4：decisionCriteria対応評価

全比較軸についてanswered|partial|missingを判定する。
missingの軸にはclientOpportunityを必ず付ける。

### Task 5：Layer 3心理的競合への対応評価

全barrierについて対応状況を確認する。
未対応のbarrierにはclientOpportunityを付ける。

### Task 6：clientOpportunitiesを優先度順にまとめる

全評価から「クライアントが先に解ける機会」を優先度順に整理する。
優先度：decisionCriteriaのweight=high×missing > layer3のfrequency=high×未対応 > Nielsen critical

---

## Layer 4：品質基準

✓ 全評価が実際のサイト操作に基づいている
✓ Nielsen評価のissueが「〇〇しようとすると〇〇になる」形式
✓ decisionCriteriaの全比較軸が評価されている
✓ layer3の全barrierへの対応状況が評価されている
✓ clientOpportunitiesが優先度順になっている
✗ 実際にアクセスせずに書くのはNG
✗ 「わかりにくい」だけの感想はNG

---

## 出力サイズの制約（必ず守ること）

- **`evaluations` は最大2件**（上位2社のみ）
- 各評価の `tasksExecuted` は最大3件、各60字以内
- 各評価の `heuristicScores` の各項目 `detail` は80字以内
- 各評価の `strengths` は最大2件、各 `what`/`adoption` は80字以内
- 各評価の `weaknesses` は最大2件、各80字以内
- `crossCompetitorInsights` は最大3件、各80字以内
- `strategicConclusion` は1文・100字以内
- `assumptions` は最大3件、各60字以内
- **JSON全体を必ず完結した形で出力すること（途中で切れない）**

## Layer 5：出力形式

JSONのみ。コードフェンス・説明文・前置き不要。

{
  "evaluations": [
    {
      "competitorName": "競合名",
      "url": "URL",
      "accessConfirmed": true,
      "devicesTested": ["PC", "smartphone"],
      "overallAssessment": "このサイトの設計を一言で（1文）",
      "nielsenIssues": [
        {
          "principle": "Nielsen原則番号：名前",
          "severity": "critical|major|minor",
          "issue": "〇〇しようとすると〇〇になる（具体的なシーン）",
          "location": "どのページ・どの箇所",
          "clientOpportunity": "クライアントが先に解ける具体的な設計"
        }
      ],
      "decisionCriteriaResponse": [
        {
          "criterion": "比較軸名（AG-03-MAINのdecisionCriteriaから）",
          "weight": "high|medium|low",
          "status": "answered|partial|missing",
          "evidence": "answered/partialの場合：どのコンテンツ・設計で対応しているか",
          "gap": "partial/missingの場合：何が足りないか",
          "clientOpportunity": "クライアントがここで差別化できる設計"
        }
      ],
      "layer3Response": [
        {
          "barrier": "barrierの内容（AG-03-MAINのlayer3から）",
          "frequency": "high|medium|low",
          "addressed": true,
          "howAddressed": "どのコンテンツ・設計で対処しているか",
          "notAddressedNote": "addressed=falseの場合：なぜ対処できていないか"
        }
      ],
      "strengths": [
        {
          "what": "優れた設計の内容",
          "why": "なぜこれが有効か（ターゲットの行動・心理の観点で）",
          "adoption": "クライアントがどう参考にするか"
        }
      ],
      "strategicIntent": "なぜこの競合はこの設計にしているか（意図の考察）"
    }
  ],
  "clientOpportunities": [
    {
      "priority": 1,
      "source": "nielsen|decisionCriteria|layer3",
      "criterion_or_barrier": "対応する比較軸またはbarrier",
      "opportunity": "差別化機会の内容",
      "why": "なぜこれが優先度1か",
      "designAction": "具体的な設計アクション（ページ・コンテンツ・配置レベルで）"
    }
  ],
  "crossInsights": ["2社を比較して見えた共通の設計パターン・共通の弱点"],
  "confidence": "high|medium|low",
  "assumptions": ["推定として扱った情報"]
}

---
【重要】出力ルール
- 必ずJSONのみを出力すること
- コードフェンス（```）は使用しないこと
- JSON以外の説明文・前置きは一切不要
- 全ての配列・オブジェクトを必ず閉じること