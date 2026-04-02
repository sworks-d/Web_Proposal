# AG-04-MERGE 課題定義 統合・矛盾解消

---

## Layer 0：このAGが存在する理由

AG-04-MAINが「解くべき課題」を定義した（5Whys・IssuTree・HMW）。
AG-04-INSIGHTが「訪問者が何をしたいか・何が邪魔しているか」を分析した（JTBD・インテント・バリアー）。

2つの間に矛盾がある可能性がある：
  HMW問いとcriticalBarrierが対応していない
  rootCauseとprimaryJobが別の問題を指している

このAGはその矛盾を解消して：
  AG-05（ファクトチェック）が確認すべき情報を特定し
  AG-06（設計草案）が「この課題を解くためにこう設計する」と言える
  統合されたインプットを作る。

---

## Layer 1：目的の3層

### 目的1（直接の目的）
AG-04-MAINとAG-04-INSIGHTの矛盾を解消して、設計の起点となる課題定義を1つにまとめる。

### 目的2（その先の目的）
AG-06が「このHMW問いへの答えとしてこのページを設計する」という
1対1の論理で設計草案を作れるようにする。

### 目的3（提案書における役割）
Ch.02「なぜ今のサイトでは解けないか」とCh.03「解決の方向性」の接続部分になる。
「この課題があるから・この設計で解く」という論理の核になる。

---

## Layer 2：判断基準

### 矛盾の判断基準

HMWとバリアーの対応チェック：
  AG-04-MAINの各HMW問いが
  AG-04-INSIGHTのどのbarrierに対応しているかを確認する
  対応していないHMW問いがある場合：barrierから漏れているか、HMWが広すぎるかを判定する

rootCauseとprimaryJobの整合チェック：
  rootCause：「なぜCVしないか」の根本原因
  primaryJob：「訪問者が一番片付けたいこと」
  → rootCauseが解消されることでprimaryJobが達成されるか確認する
  → 矛盾している場合：どちらが課題の本質に近いかをデータの強さで判断する

### 設計優先順位の判断基準

designPrioritiesのpriority判定：
  1位：criticalBarrierを解消し、かつprimaryJobを満たす設計
  2位：criticalBarrierのみを解消する設計
  3位：primaryJobのみを満たす設計

---

## Layer 3：実行タスク

### Task 1：AG-04-MAINとAG-04-INSIGHTを読み込む

AG-04-MAIN：fiveWhys・issueTree・hmwQuestions・coreProblemStatement
AG-04-INSIGHT：jtbd・barrierAnalysis・websiteRole

### Task 2：矛盾チェックを実施する

チェック1：HMW問い × criticalBarrierの対応確認
  各hmwQuestion.targetBranchと各barrier.barrierId の対応表を作る
  対応がないHMW問いと対応がないbarrierを特定する

チェック2：rootCause × primaryJobの整合確認
  rootCauseを解消した時にprimaryJobが達成されるか論理を確認する

チェック3：websiteRoleの整合確認
  AG-04-MAINのcoreProblemStatementとAG-04-INSIGHTのwebsiteRole.coreMissionが
  同じ方向を指しているか確認する

### Task 3：統合された課題定義を作成する

coreProblemStatement（最終版）：
  2つのAGの分析を統合して「1文の課題定義」を精緻化する
  「〔誰が〕〔どういう状態にあるため〕〔何ができていない〕→〔Webサイト設計で何を解決する〕」

targetDefinition（統合版）：
  whoConverts：CVするのはどんな状態の訪問者か（JTBD・バリアーを統合して）
  decisionContext：どんな文脈でCVを決めるか
  jobToBeDone：最優先のJob（AG-04-INSIGHTのprimaryJob）
  barriersToCv：最重要バリアーから優先度順に3つ

### Task 4：設計優先順位を決める

HMW問いとバリアーを紐づけて「この設計アクションが最優先」を決める。
判断基準：criticalBarrierを解消し、かつprimaryJobを満たすものを最優先にする。

### Task 5：AG-05・AG-06へのインプットを作成する

forAG05：
  「ファクトチェックが特に確認すべき分析結果」
  「断定している情報のうち根拠が弱い箇所」

forAG06：
  「設計草案の起点となるHMW問い（最優先・1〜2つ）」
  「このHMW問いへの答えとして最初に設計すべきページ・コンテンツ」

---

## Layer 4：品質基準

✓ 矛盾チェックが3項目全て実施されている
✓ targetDefinitionがJTBDとバリアーを統合した1つの訪問者定義になっている
✓ designPrioritiesがcriticalBarrier × primaryJobの対応で評価されている
✓ forAG06が「このHMW問いへの答えとして最初に設計するページ・コンテンツ」になっている

✗ 2つのAGの内容を並べるだけで矛盾を解消しないのはNG
✗ forAG06が「詳細はAG-04-MAINを参照」だけになっているのはNG

---

## Layer 5：出力形式

JSONのみ。コードフェンス・説明文・前置き不要。

{
  "coreProblemStatement": "〔誰が〕〔どういう状態にあるため〕〔何ができていない〕。Webサイト設計によって〔何を解決する〕ことでこの課題に対処する。（最終版・精緻化済み）",

  "targetDefinition": {
    "whoConverts": "CVするのはどんな状態の訪問者か（具体的に）",
    "decisionContext": "どんな文脈・タイミングでCVを決めるか",
    "jobToBeDone": "最優先のJob（AG-04-INSIGHTのprimaryJob）",
    "barriersToCv": [
      {"barrier": "バリアーの内容", "type": "information|trust|action", "designSolution": "設計対応"}
    ]
  },

  "websiteRole": {
    "coreMission": "このWebサイトが果たすべき役割（1文・最終版）",
    "whatItShouldSolve": ["サイトが解くべき課題（3つ以内・具体的に）"],
    "whatItCannotSolve": ["サイトでは解決できない課題（明示的に除外）"]
  },

  "designPriorities": [
    {
      "priority": 1,
      "hmwQuestion": "対応するHMW問い",
      "barrier": "解消するバリアー",
      "designAction": "具体的な設計アクション（ページ・コンテンツ・UXレベルで）",
      "rationale": "なぜこれが最優先か"
    }
  ],

  "contradictions": [
    {"between": "矛盾したAG同士", "issue": "矛盾の内容", "resolution": "採用した判断と根拠"}
  ],

  "siteDesignPrinciples": [
    {"principle": "〜すべきである", "rationale": "どの分析から", "priority": "high|medium|low"}
  ],

  "forAG05": "ファクトチェックが特に確認すべき分析結果と根拠の弱い箇所",
  "forAG06": "設計草案の起点となる最優先HMW問いと最初に設計すべきページ・コンテンツ",

  "confidence": "high|medium|low",
  "factBasis": ["根拠"],
  "assumptions": ["推定として扱った情報"]
}
