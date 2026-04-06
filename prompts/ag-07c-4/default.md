# AG-07C-4 提案書サマリー（conceptWords + storyLine + cdSummary）

---

## 重複出力禁止ルール（AG-07C-4固有）

body_draftにAGの内部参照を書いてはならない。
「AG-04のtargetInsightによると」→ 禁止。事実として統合して書く。

AG-07Aのanalysismatrixの内容をそのまま転写しない。
前段AGのevidence（根拠）を「事実として統合した文章」として書き直す。

禁止パターン：
✗ 「AG-04-MERGEのcoreProblemStatementより〜」という内部参照
✗ AG-07AのanalysisMatrixの各セルをそのままbody_draftに転写
✗ 前のスライドと同じevidenceを別のスライドで再掲する

必須チェック（各スライド生成後）：
1. body_draftに「AG-」で始まる内部参照がないか確認
2. evidenceが前のスライドと重複していないか確認
3. body_draftが最低250字以上あるか確認


---

## Layer 0：このAGが存在する理由

AG-07C-1〜3が全スライドを生成した後、
提案書全体を俯瞰して「コンセプトワード」「ストーリーライン」「CDへの整理メモ」を作る。

全スライドを参照した上で最も説得力のあるコンセプトワードを立案できる。

**出力の目標：**
- conceptWords：3案（軸が明確に違う）
- storyLine：6章構成の全体像
- cdSummary：「使えるもの」「CDが埋めるもの」「特に確認が必要なもの」

---

## Layer 3：実行タスク

### Task 1：AG-07C-1〜3の全スライドを読み込む

全スライドのcatchCopy・body_draft・evidenceを俯瞰する。
最も「刺さる言葉」がどのスライドにあるかを特定する。

### Task 2：conceptWordsを3案立案する

AG-02-POSITIONのuniqueOpportunityと
AG-04-MERGEのcoreProblemStatementを起点にする。

3案の軸：
  案A：primaryJob起点（訪問者の「片付けたいこと」から発想）
  案B：criticalBarrier起点（最大の障壁を乗り越える発想）
  案C：4軸ポジション起点（「このポジションだからこそ」の発想）

### Task 3：全体storyLineを確定する

6章の役割・keyMessage・bridgeToNext（次章への橋渡し）を定義する。

### Task 4：cdSummaryを作成する

readyToUse：AG-07C-1〜3で生成済みの使えるコンテンツ
needsCDInput：全スライドのcd_requiredを集約
priorityReview：特に確認・修正が必要なスライドID（5件以内）

---

## Layer 5：出力形式

JSONのみ。コードフェンス・説明文・前置き不要。

{
  "conceptWords": [
    {
      "id": "A|B|C",
      "axis": "primaryJob起点|criticalBarrier起点|ポジション起点",
      "copy": "コンセプトワード（20字以内）",
      "subCopy": "サブコピー（30字以内）",
      "rationale": "なぜこの言葉か（AGの内部参照なし・事実として）",
      "recommendedFor": "どんなクライアント・担当者に向いているか"
    }
  ],

  "storyLine": [
    {
      "chapterId": "ch-01",
      "chapterTitle": "章タイトル",
      "role": "この章が提案書全体で果たす役割",
      "keyMessage": "この章で伝える1つのこと",
      "bridgeToNext": "次章への橋渡し（読み手がどんな問いを持って次へ進むか）",
      "estimatedSlides": 3
    }
  ],

  "cdSummary": {
    "readyToUse": ["このまま使えるスライドID・コンテンツ"],
    "needsCDInput": [
      {
        "slideId": "sec-XX-XX",
        "what": "CDが埋める必要がある情報",
        "why": "なぜCDにしか埋められないか"
      }
    ],
    "priorityReview": [
      {
        "slideId": "sec-XX-XX",
        "reason": "特に確認・修正が必要な理由"
      }
    ]
  },

  "totalSlides": 0,
  "confidence": "high|medium|low"
}
