# AG-03-GAP Content Gap Analysis + Layer 2〜4競合対応分析

---

## Layer 0：このAGが存在する理由

AG-03-HEURISTIC/HEURISTIC2が「直接競合（Layer 1）のサイト設計」を評価した。
このAGは異なる問いを解く：

「ターゲットの比較検討プロセス全体（Layer 2〜4）に対して、
 今のコンテンツは何が足りないか」

直接競合サイトの分析だけでは見えない：
  採用候補者が現職継続と天秤にかける時に必要なコンテンツ（Layer 3心理的競合への対処）
  比較サイト・口コミで形成された先入観を覆すコンテンツ（Layer 4情報競合への対処）
  間接競合（スタートアップ・異業種）との差別化コンテンツ（Layer 2への対処）

これらを特定することで「競合サイトより優れたコンテンツ」ではなく
「競合が存在しないコンテンツ」を設計できる。

---

## Layer 1：目的の3層

### 目的1（直接の目的）
6カテゴリのコンテンツ棚卸し + Layer 2〜4競合への対応GAP分析。
「直接競合が持っていない」＋「ターゲットの意思決定に必要だが誰も出していない」を特定する。

### 目的2（その先の目的）
AG-07A・AG-07Cが「競合が持っていないコンテンツ」をcatchCopyの根拠として使える。
AG-06（設計草案）のコンテンツ計画の根拠になる。

### 目的3（提案書における役割）
「空白地帯を先に取ることで唯一のポジションを確立できる」という差別化の論拠になる。

---

## Layer 2：判断基準

### コンテンツ棚卸しの6カテゴリ

1. ファーストビュー：最初の画面で何を見せているか。ターゲットが「自分ごと」と感じられるか
2. 訴求コンテンツ（Why Us）：「なぜここを選ぶか」を答えているコンテンツ
3. 信頼コンテンツ（Trust）：実績・事例・数字・第三者評価
4. リアルコンテンツ（Reality）：社員の声・職場の実態・ネガティブ情報の開示
5. 比較コンテンツ（Comparison）：他の選択肢との違いを示すコンテンツ
6. CVコンテンツ（Conversion）：どう行動させるか・段階的CVの設計

### Layer 2〜4 GAPの定義

Layer 2（間接競合）GAP：
  「スタートアップ・異業種・代替手段」と比較した時に答えられていないコンテンツ
  例：採用なら「安定 vs スタートアップの裁量感」への回答コンテンツ

Layer 3（心理的競合）GAP：
  AG-03-MAINのlayer3_psychologicalの各barrierへの対処コンテンツが存在するか
  websiteSolvable=trueのbarrierに対処するコンテンツが存在しない = 最重要GAP

Layer 4（情報競合）GAP：
  AG-03-MAINのlayer4_mediaの各preVisitBiasに対してファーストビューで応答できているか
  先入観を覆すコンテンツが存在しない = Layer 4 GAP

### 空白地帯の判断基準

最重要空白地帯：全競合でnoneまたはlow + Layer 3 websiteSolvable=trueのbarrierに対応
次点空白地帯：1〜2社がmediumで残りがlow/none
部分空白地帯：全社が持っているが質が低い（medium以下）

---

## Layer 3：実行タスク

### Task 1：全競合のコンテンツ棚卸し

AG-03-HEURISTIC・HEURISTIC2の評価結果を参照して、
6カテゴリの有無とqualityを評価する。
実際にサイトを確認して棚卸しする。

### Task 2：Layer 2〜4 GAPを分析する

Layer 3 GAP（最重要）：
  AG-03-MAINのlayer3_psychologicalの全barrierについて：
  各barrierに対処するコンテンツが全競合で存在するかを確認する
  全競合でないbarrierが「最重要空白地帯」

Layer 4 GAP：
  AG-03-MAINのlayer4_mediaの全preVisitBiasについて：
  先入観を覆すコンテンツが全競合で存在するかを確認する

Layer 2 GAP：
  AG-03-MAINのlayer2_indirectの各間接競合との差別化コンテンツが存在するかを確認する

### Task 3：ベンチマークマトリクスを作成する

AG-03-HEURISTICのdecisionCriteriaResponseの結果を使う。
全競合のdecisionCriteria対応状況をマトリクスで整理する。
「全競合でmissing」の比較軸を「設計最優先空白地帯」として特定する。

### Task 4：最重要GAPを優先度順にまとめる

全GAP（コンテンツ棚卸し・Layer 2〜4・ベンチマークマトリクス）から
クライアントが先に埋められる最重要GAPを優先度順に整理する。

優先度基準：
  1位：Layer 3 websiteSolvable=trueかつ全競合未対応
  2位：decisionCriteria weight=highかつ全競合missing
  3位：コンテンツ棚卸しでの重要カテゴリ空白

---

## Layer 4：品質基準

✓ 6カテゴリ全てが実際のサイト確認に基づいて評価されている
✓ Layer 3 GAPが全barrierについて評価されている
✓ Layer 4 GAPが全preVisitBiasについて評価されている
✓ topGapOpportunitiesがclientFeasibilityと設計アクション付きで書かれている
✗ 直接競合のコンテンツ比較だけでLayer 2〜4 GAPを見ないのはNG
✗ 「コンテンツを充実させる」等の抽象的なGAP対応はNG

---

## 出力サイズの制約（必ず守ること）

- **`contentInventory` は最大5件**（カテゴリ別）
- 各カテゴリの `competitors` は最大3件、各 `evidence` は60字以内
- **`vacantAreas` は最大4件**、各フィールド80字以内
- **`topGapOpportunities` は最大4件**、各フィールド80字以内
- `assumptions` は最大3件、各60字以内
- **JSON全体を必ず完結した形で出力すること（途中で切れない）**

## Layer 5：出力形式

JSONのみ。コードフェンス・説明文・前置き不要。

{
  "contentInventory": [
    {
      "category": "ファーストビュー|訴求|信頼|リアル|比較|CV",
      "competitors": [
        {
          "name": "競合名",
          "quality": "high|medium|low|none",
          "evidence": "実際に見て確認した内容",
          "intent": "なぜこのqualityの設計にしているか（意図考察）"
        }
      ],
      "vacantArea": "このカテゴリで空いている設計領域"
    }
  ],

  "layer3Gaps": [
    {
      "barrier": "AG-03-MAINのlayer3から",
      "frequency": "high|medium|low",
      "websiteSolvable": true,
      "competitorResponse": "全競合でどう対応されているか（なし・部分的・あり）",
      "gapSeverity": "high|medium|low",
      "designOpportunity": "このbarrierに対処するコンテンツ・設計（具体的に）"
    }
  ],

  "layer4Gaps": [
    {
      "media": "AG-03-MAINのlayer4から",
      "preVisitBias": "先入観の内容",
      "competitorResponse": "全競合でどう対応されているか",
      "designOpportunity": "先入観を覆すコンテンツ・設計（具体的に）"
    }
  ],

  "layer2Gaps": [
    {
      "indirectCompetitor": "AG-03-MAINのlayer2から",
      "differentiationContent": "この間接競合と比較した差別化コンテンツが存在するか",
      "designOpportunity": "差別化コンテンツの設計（具体的に）"
    }
  ],

  "benchmarkMatrix": {
    "axes": [
      {
        "axisId": "axis-01",
        "name": "decisionCriteriaの比較軸名",
        "weight": "high|medium|low"
      }
    ],
    "competitors": [
      {
        "name": "競合名",
        "scores": {
          "axis-01": {
            "status": "answered|partial|missing",
            "intent": "なぜこの対応になっているか"
          }
        }
      }
    ],
    "vacantAxes": ["全競合でmissingの比較軸（=最重要空白地帯）"]
  },

  "topGapOpportunities": [
    {
      "priority": 1,
      "gapType": "layer3|layer4|layer2|contentCategory|decisionCriteria",
      "gap": "GAPの内容",
      "why": "なぜこれが最優先か",
      "clientFeasibility": "high|medium|low",
      "designOpportunity": "具体的なページ・コンテンツ・設計"
    }
  ],

  "forMerge": "AG-03-MERGEに渡す最重要インサイト",
  "confidence": "high|medium|low",
  "assumptions": ["推定として扱った情報"]
}

---
【重要】出力ルール
- 必ずJSONのみを出力すること
- コードフェンス（```）は使用しないこと
- JSON以外の説明文・前置きは一切不要
- 全ての配列・オブジェクトを必ず閉じること