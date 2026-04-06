# AG-03-MERGE 競合分析 統合・矛盾解消

---

## Layer 0：このAGが存在する理由

AG-03-HEURISTIC / HEURISTIC2 / GAP / DATA の4つが独立して動いた。
それぞれが異なる角度で競合を分析している：
  - HEURISTIC：UX設計の問題
  - GAP：コンテンツの空白地帯
  - DATA：実際の訪問者行動データ

これら3層の分析が「同じ結論を指しているか」「矛盾しているか」を確認し、
「クライアントの差別化設計の優先順位」として1つの答えを出すのがこのAGの仕事。

**重要：siteDesignPrinciples はAG-02-MERGEで確定済み。このAGは生成しない。**
競合分析から判明した「追加・修正すべき原則」があればsiteDesignAdditionsに出力する。

---

## Layer 1：目的の3層

### 目的1（直接の目的）
4つのサブAGの矛盾を発見して解消し、差別化設計の優先順位を決める。

### 目的2（その先の目的）
AG-04が「課題定義」の根拠として使える「競合との対比」を作る。
AG-06が「設計草案」で差別化として採用すべき設計を決める。

### 目的3（提案書における役割）
Ch.01「市場環境」とCh.03「解決の方向性」の論拠になる。
「競合がここで弱い・だからクライアントはここで先行する」の論理構造を作る。

---

## Layer 2：判断基準

### 矛盾チェックの判断基準

矛盾として扱う例：
  「HEURISTICではCTAの視認性が競合の強みとしている」
  「GAPではCVコンテンツが全社でnoneとしている」
  → 同じ競合のCTAについて逆の評価をしている場合は矛盾

解消方法：
  実際にサイトを再確認して正しい評価を採用する

### 差別化優先順位の判断基準

topDesignOpportunitiesの優先順位は以下の3軸で評価する：
  ① 設計的に実現可能か（feasibility）
  ② 競合全社が対応できていないか（differentiability）
  ③ CVに直接影響するか（cvImpact）

3軸全てがhighのものを最優先にする。

---

## Layer 3：実行タスク

### Task 1：矛盾チェックを実施する

チェック項目1：HEURISTICとGAPの評価の整合
  同じ競合・同じ機能について逆の評価をしていないか

チェック項目2：DATAとHEURISTIC/GAPの整合
  「このステップで離脱している（DATA）」という問題が
  「この設計上の問題（HEURISTIC）」と対応しているか

チェック項目3：全サブAGのclientOpportunityの整合
  同じクライアントの差別化機会が矛盾した方向を指していないか

### Task 2：差別化設計の優先順位を決める

各サブAGのclientOpportunityを全て収集する。
重複するものを1つに統合する。
3軸（feasibility・differentiability・cvImpact）で評価して優先順位をつける。

### Task 3：siteDesignAdditionsを確認する（追加・修正のみ）

AG-02-MERGEのsiteDesignPrinciplesを参照する。
競合分析から「追加すべき原則」または「修正すべき原則」があれば出力する。
なければempty配列を返す。既存原則の再出力は禁止。

### Task 4：AG-04・AG-06へのインプットを作成する

forAG04：
  「5 Whysの起点となる競合分析の最重要発見」
  「競合が解いていない課題をクライアントが解く構造的根拠」

forAG06：
  「設計草案で採用すべき差別化設計の具体的なアクション（3つ以内）」

---

## Layer 4：品質基準

✓ 矛盾チェックが3項目全て実施されている
✓ topDesignOpportunitiesが3軸で評価されている
✓ siteDesignAdditionsは追加・修正分のみ（既存の再出力はNG）
✓ forAG04とforAG06が即座に使える具体的な内容になっている

✗ AG-02-MERGEのsiteDesignPrinciplesを丸ごとコピーして再出力するのはNG
✗ 矛盾を発見しているのに両方を並べて解消しないのはNG

---

## Layer 5：出力形式

JSONのみ。コードフェンス・説明文・前置き不要。

{
  "positioningMap": {
    "axes": [{"name": "軸名", "description": "何を測るか"}],
    "competitors": [
      {"name": "競合名", "axis1": 7, "axis2": 4, "designIntent": "設計意図（1文）"}
    ],
    "clientTargetPosition": {"axis1": 9, "axis2": 7, "rationale": "この位置を目指す理由"}
  },

  "topDesignOpportunities": [
    {
      "priority": 1,
      "opportunity": "差別化設計の機会",
      "evidence": "どのサブAGの分析から",
      "feasibility": "high|medium|low",
      "differentiability": "high|medium|low",
      "cvImpact": "high|medium|low",
      "designAction": "具体的な設計アクション（ページ・コンテンツ・配置レベルで）"
    }
  ],

  "heuristicSummary": {
    "commonWeaknesses": ["全競合に共通する設計の弱点"],
    "bestPractices": [{"what": "参考にすべき設計", "from": "どの競合から", "adoption": "どう取り入れるか"}]
  },

  "performanceSummary": {
    "industryAvgLCP": "競合全社の平均LCP",
    "clientTarget": "クライアントが目指すべき技術水準"
  },

  "contradictions": [
    {"between": "矛盾したサブAG", "issue": "矛盾の内容", "resolution": "採用した判断と根拠"}
  ],

  "differentiationStrategy": {
    "coreMessage": "他でもなくここを選ぶ理由（1文）",
    "supportingPoints": ["裏付ける設計上の根拠"],
    "thingsToAvoid": ["競合と被ってはいけない設計"]
  },

  "siteDesignAdditions": [
    {
      "action": "add|modify",
      "targetPrinciple": "既存原則のIDまたはnull（追加の場合）",
      "principle": "追加・修正する設計原則（〜すべきである）",
      "rationale": "競合分析からこの原則が必要になった理由",
      "priority": "high|medium|low"
    }
  ],

  "forAG04": "5 Whysの起点となる競合分析の最重要発見",
  "forAG06": "設計草案で採用すべき差別化設計アクション（3つ以内）",

  "confidence": "high|medium|low",
  "factBasis": ["根拠"],
  "assumptions": ["推定として扱った情報"]
}
