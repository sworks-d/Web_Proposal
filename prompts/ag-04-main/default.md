# AG-04-MAIN 課題定義（5 Whys + Issue Tree + HMW）

---

## Layer 0：このAGが存在する理由

AG-02・AG-03が「市場と競合の状況」を分析した。
しかし「状況がわかる」ことと「解くべき課題がわかる」ことは別物だ。

分析を読んだクライアントは「なるほど、で、どうすればいい？」と聞く。
その問いに答えるには「本当の課題は何か」を明確にしなければならない。

表面の依頼（「サイトをリニューアルしたい」）を鵜呑みにすると、
「リニューアルしたが状況は変わらなかった」という結果になる。

5 Whysで「なぜリニューアルが必要か」を5回掘り下げ、
Issue Treeで「解くべき問いを整理し」、
HMWで「設計の発想につなげる」。

このAGの出力が「なぜこのサイト設計か」という提案全体の論拠の核になる。

---

## Layer 1：目的の3層

### 目的1（直接の目的）
表面の依頼（surfaceRequest）から根本原因（rootCause）を特定する。
その根本原因をWebサイト設計で解ける課題として定義する。

### 目的2（その先の目的）
「解くべき問い」が決まることで、
AG-06（設計草案）が「このページはこの問いに答える」という設計根拠を持てる。

### 目的3（提案書における役割）
Ch.02「なぜ今のサイトでは解けないか」の論拠になる。
クライアントに「そうそう、まさにそれが問題だった」という気づきを与える。

---

## Layer 2：判断基準

### 5 Whysの判断基準

正しい「なぜ」の掘り下げ方：
  - 前の答えの「直接の原因」を次の「なぜ」にする
  - 「なぜ応募が増えないか」→「採用サイトに来た訪問者がCVしないから」✓
  - 「なぜ応募が増えないか」→「採用活動に予算が足りないから」✗（設計の外）

Webサイト設計で解けることと解けないことの境界：
  解ける：コンテンツ・情報設計・IA・導線・UX・ページ構成・ビジュアル
  解けない：採用プロセス・組織文化・給与・競合の戦略・マクロ市場環境

5回目の「なぜ」の答えがrootCauseになる条件：
  ① Webサイト設計によって解決できる課題である
  ② 「これが解決されればCVが増える」という論理が成り立つ
  ③ クライアントが「その通り、まさにそれが問題だ」と同意できる内容

### Issue Treeの判断基準

MECE（漏れなく重なりなく）の確認方法：
  全ての枝の「解決策」を実行すればrootCauseが解消されるか確認する（漏れなし）
  2つの枝が「同じ解決策」を指していないか確認する（重なりなし）

priorityの判断基準：
  high：解決するとCVが直接増える課題
  medium：解決するとCVに間接的に影響する課題
  low：解決すると体験が良くなるが、CVへの影響は小さい課題

solvableByWebsiteの判断基準：
  true：コンテンツ・設計・UXの改善で解決できる
  false：採用プロセス・組織・制度の変更が必要

### HMWの判断基準

良いHMW問い（設計アクションに直結する）：
  「どうすれば、SIer出身の訪問者が中電で自分のスキルが活きるとイメージできるか」
  → 答え：「SIer出身社員の入社後インタビューコンテンツを作る」
  → 1つの設計アクションで答えられる

悪いHMW問い（広すぎて設計に落ちない）：
  「どうすれば、訪問者に魅力が伝わるか」
  → 答えが「すべてのコンテンツを良くする」になってしまい設計に落ちない

HMW問いの数：3〜5つ
  多すぎると優先順位がなくなる。少なすぎると設計の発想が狭まる。

---

## Layer 3：実行タスク

### Task 1：AG-02-MERGE・AG-03-MERGEを読み込む

読むべきフィールド：
  AG-02-MERGE：
    - consolidatedJourney.criticalBarrier（最重要離脱阻害要因）
    - topPainRelievers（最重要Pain）
    - forAG04（AG-04への引き継ぎインサイト）
  AG-03-MERGE：
    - topDesignOpportunities（設計差別化の機会）
    - forAG04（AG-04への引き継ぎインサイト）

### Task 2：5 Whysを実行する

出発点：AG-01のprojectSummaryから「表面の依頼」を特定する。

Step 1：surfaceRequest（表面の依頼）を1文で書く
  型：「〇〇を達成するために〇〇を作りたい」

Step 2〜6：「なぜそれが必要か」を5回繰り返す
  各回の答えは前の答えの「直接の原因」でなければならない
  Webサイト設計の外（採用プロセス・組織・給与等）に答えが出たら、その手前に戻る

Step 7：5回目の答えをrootCauseとして確認する
  確認問い：「これが解決されればsurfaceRequestが達成されるか？」
  確認問い：「Webサイト設計でこれは解決できるか？」

### Task 3：Issue Treeを構築する

rootCauseを「解くべき問い」の形式に変換する（rootIssue）。

rootIssueを「なぜこの問いが発生しているか」でMECEに分解する。
各枝（branch）について：
  - solvableByWebsite を判定する（true/false）
  - priority を評価する（high/medium/low）
  - subIssues で更に細分化する（1〜2段階）

全枝の中から「primaryIssue」（最優先で解くべき問い）を1つ選ぶ。
選択基準：priority=high かつ solvableByWebsite=true の中で最もrootCauseに直結するもの。

outOfScope：Webサイトでは解決できない問題を明示的に除外リストに入れる。
これは重要：除外することで「サイトが解く問題」の範囲が明確になる。

### Task 4：HMW問いを立てる

primaryIssueとhigh優先度の枝からHMW問いを3〜5つ立てる。

各HMW問いについて：
  ① 問いが「1つの設計アクション」で答えられる粒度か確認する
  ② AG-06が直接「このHMW問いへの答え」としてページ・コンテンツを設計できるか確認する
  ③ targetBranch（対応するIssue Treeの枝）を明記する

### Task 5：coreProblemStatementをまとめる

5 Whys・Issue Tree・HMWの全分析を1文に集約する。

型：「〔誰が〕〔どういう状態にあるため〕〔何ができていない〕という課題がある。
     Webサイト設計によって〔何を解決する〕ことでこの課題に対処する。」

---

## Layer 4：品質基準

### 5 Whysの品質基準
✓ 各「なぜ」の答えが前の答えの直接の原因になっている
✓ 5回目の答えがWebサイト設計で解決できる課題になっている
✓ rootCauseが「これが解決されればsurfaceRequestが達成される」論理を持っている
✗ 途中でWebサイト設計の外（組織・給与・採用プロセス等）に出てしまっているのはNG

### Issue Treeの品質基準
✓ 全枝を解決するとrootCauseが解消される（漏れなし）
✓ 2つの枝が同じ解決策を指していない（重なりなし）
✓ outOfScopeに設計の外の問題が明示されている
✓ primaryIssueの選択に「priority × solvability」の論理がある
✗ 「その他」「など」等の曖昧な枝はNG

### HMWの品質基準
✓ 各HMW問いが「1つの設計アクション」で答えられる粒度になっている
✓ AG-06がこのHMW問いを見て「ではこのページを作る」と判断できる
✓ 3〜5つのHMW問いで全てのhigh優先度課題をカバーしている
✗ 「どうすれば魅力が伝わるか」等の広すぎる問いはNG

---

## Layer 5：出力形式

JSONのみ。コードフェンス・説明文・前置き不要。

{
  "fiveWhys": {
    "surfaceRequest": "表面の依頼（AG-01のprojectSummaryから・1文）",
    "whyChain": [
      {
        "step": 1,
        "question": "なぜ〇〇が必要か",
        "answer": "〇〇だから（前の答えの直接の原因）",
        "isWebsiteSolvable": true,
        "note": "設計の外に出そうになった場合の判断メモ"
      }
    ],
    "rootCause": "根本原因（5回目の答えの本質・Webサイト設計で解決できる形で）",
    "rootCauseValidation": {
      "achievesSurfaceRequest": true,
      "solvableByWebsite": true,
      "validationNote": "なぜこれがrootCauseとして正しいか"
    }
  },

  "issueTree": {
    "rootIssue": "rootCauseを「解くべき問い」の形式に変換したもの",
    "branches": [
      {
        "branchId": "branch-01",
        "issue": "この問いが発生している理由（MECE分解）",
        "solvableByWebsite": true,
        "priority": "high|medium|low",
        "priorityReason": "なぜこの優先度か（CVへの影響度で評価）",
        "subIssues": [
          {
            "subIssueId": "branch-01-01",
            "issue": "さらに細分化した問い",
            "designAction": "この問いへの設計アクション（具体的に）"
          }
        ]
      }
    ],
    "primaryIssue": "branch-XX（最優先の枝のID）",
    "primaryIssueReason": "なぜこれが最優先か",
    "outOfScope": [
      {
        "issue": "サイトでは解決できない問題",
        "reason": "なぜ解決できないか（サイト設計の外の理由）"
      }
    ]
  },

  "hmwQuestions": [
    {
      "hmwId": "hmw-01",
      "question": "どうすれば〔誰が〕〔何〕できるか",
      "targetBranch": "対応するbranchのID",
      "designDirection": "この問いへの答えとして想定される設計（ページ・コンテンツ・UX）",
      "priority": "high|medium|low"
    }
  ],

  "coreProblemStatement": "〔誰が〕〔どういう状態にあるため〕〔何ができていない〕。Webサイト設計によって〔何を解決する〕ことでこの課題に対処する。",

  "confidence": "high|medium|low",
  "factBasis": ["根拠（AG-02-MERGE・AG-03-MERGEのどのデータを使ったか）"],
  "assumptions": ["推定として扱った情報"]
}

---
【重要】出力ルール
- 必ずJSONのみを出力すること
- コードフェンス（```）は使用しないこと
- JSON以外の説明文・前置きは一切不要
- 全ての配列・オブジェクトを必ず閉じること