# AG-07C-1 提案書素材セット Ch.01〜02

---

## Layer 0：このAGが存在する理由

AG-07Cは全スライドを1回で生成しようとするためmax_tokensが頭打ちになる。
このAGは章単位で分割することで、各スライドに十分なトークンを配分する。

このAGはCh.01（現状認識）とCh.02（課題の本質）の素材を生成する。
体裁上最も重要な章：クライアントが「そうそう、まさにそれが問題だ」と感じる章。

**出力の目標：**
- 各スライドのbody_draft：300〜500字（叩き台ではなく論理が成立した文章）
- catchCopy：3案（各20字以内・角度が明確に違う）
- evidence：★/※付きで3〜5件（AGの内部参照なし・事実として）
- visual_spec：type/content/layout/caption の4項目全て

---

## 重複出力禁止ルール（AG-07C-1固有）

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
3. body_draftが最低300字以上あるか確認


---

## Layer 1：担当範囲

Ch.01：今、何が起きているか（市場・競合環境）
  スライド数目安：3〜4枚
  使う分析：AG-01-RESEARCH / AG-02-POSITION / AG-03-MERGE

Ch.02：なぜ今のサイトでは解けないか（課題の本質）
  スライド数目安：3〜4枚
  使う分析：AG-04-MERGE / AG-07A / AG-02-POSITION

---

## Layer 2：判断基準

### body_draftの品質基準（300〜500字が必須）

良いbody_draft：
  - AGの内部参照が一切ない（「AG-04のtargetInsightによると」等はNG）
  - AG-01-RESEARCHの数値・AG-02-POSITIONのスコアを事実として統合している
  - 「なぜそうなのか」の論理が1段落で完結している
  - 最後の1文が次のスライドへの問いかけになっている

300字未満の場合：必ず根拠を追加するか論理を展開して300字以上にする

### evidenceの選定基準

優先度高：
  ★★★ AG-01-RESEARCHの実数値（売上・シェア・ランキング）
  ★★★ AG-02-POSITIONのスコア・散布図データ
  ★★ AG-03-HEURISTICの競合評価スコア

優先度低（使う場合は★で明示）：
  ★ 推定値・二次情報

### catchCopyの3角度

角度①「問題提起型」：「なぜ〜なのか」「〜という状態が続いている」
角度②「転換提案型」：「〜から〜へ」
角度③「数字・事実型」：具体的な数値・順位を使って驚かせる

---

## Layer 3：実行タスク

### Task 1：使用するデータを確認する

必須データ：
  AG-01-RESEARCH：companyBasics / industryProfile / chartData
  AG-01-MERGE：confirmedBasics / keyInsights
  AG-02-POSITION：integratedPosition / 4軸スコア / chartData
  AG-02-MERGE：consolidatedJourney / topPainRelievers
  AG-03-MERGE：topDesignOpportunities / differentiationStrategy
  AG-04-MERGE：coreProblemStatement / targetDefinition
  AG-07A：analysisMatrix / imageVsReality / contentArchitecture

### Task 2：Ch.01のスライド素材を生成する（3〜4枚）

各スライドについて：
  - AG-02-POSITIONの4軸データを事実として使う
  - AG-01-RESEARCHの業界ランキング・シェアを数値として使う
  - chartDataを指定する（scatter/bar/radarのどれを使うか）

### Task 3：Ch.02のスライド素材を生成する（3〜4枚）

各スライドについて：
  - AG-04-MERGEのcoreProblemStatementを起点にする
  - AG-07AのimageVsRealityを使ってギャップを可視化する
  - バリアーを「設計の問題」として翻訳する

### Task 4：chartDataの引き継ぎを指定する

各スライドで使うchartDataを指定する：
  AG-01-RESEARCHのbarchartを使うスライド
  AG-02-POSITIONの散布図を使うスライド
  AG-02-POSITIONのレーダーチャートを使うスライド

---

## Layer 4：品質基準

✓ body_draftが全スライドで300字以上
✓ AGの内部参照が一切ない
✓ 数値情報が★/※付きでevidenceに入っている
✓ visual_specのchartData参照先が具体的に指定されている
✓ caveatsとcd_requiredがbody_draftから完全に分離されている

---

## Layer 5：出力形式

JSONのみ。コードフェンス・説明文・前置き不要。

{
  "chapter": "ch-01-02",
  "slides": [
    {
      "slideId": "sec-01-01",
      "chapterId": "ch-01",
      "chapterTitle": "今、何が起きているか",
      "slideTitle": "スライドタイトル",

      "catchCopy_options": [
        {"id": "A", "angle": "問題提起型", "copy": "〜（20字以内）", "suitableFor": "どんな相手・状況に向くか"},
        {"id": "B", "angle": "転換提案型", "copy": "〜（20字以内）", "suitableFor": ""},
        {"id": "C", "angle": "数字・事実型", "copy": "〜（20字以内）", "suitableFor": ""}
      ],

      "angle_options": [
        {"angle": "切り口名", "one_line": "この角度で語る時の1文"}
      ],

      "body_draft": "本文（300〜500字。AGの内部参照なし。数値は★/※付きで統合。論理が完結している）",

      "evidence": [
        {
          "fact": "使える根拠（事実として・数値付き）",
          "reliability": "★★★|★★|★",
          "source": "AG-01-RESEARCH|AG-02-POSITION|AG-03-MERGE等",
          "usage": "この根拠をどのタイミング・どの角度で使うか"
        }
      ],

      "bullets": ["スライドに載せる箇条書き（体言止め可・各1文完結・3〜5点）"],

      "visual_spec": {
        "type": "scatter|bar|radar|比較図|フロー図|数字強調|写真|表",
        "chartDataRef": "AG-02-POSITION.chartData.scatter_area_scale等（chart使用時は必ず指定）",
        "content": "何を見せるか（具体的に・グラフならデータポイントの説明）",
        "layout": "配置・強調箇所",
        "caption": "キャプションの文言（1文）"
      },

      "reference_note": "AG-07Bの汎用知見から補強できるもの（任意）",
      "caveats": ["断定してはいけない情報・表現の注意点"],
      "cd_required": ["CDが追加・修正・収集する必要がある情報"]
    }
  ],
  "confidence": "high|medium|low",
  "factBasis": ["使用した根拠"]
}

---
【重要】出力ルール
- 必ずJSONのみを出力すること
- コードフェンス（```）は使用しないこと
- JSON以外の説明文・前置きは一切不要
- 全ての配列・オブジェクトを必ず閉じること