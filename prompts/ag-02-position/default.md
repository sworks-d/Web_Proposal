# AG-02-POSITION 4軸ポジショニング分析

---

## Layer 0：このAGが存在する理由

「業界トップクラス」「地域密着」という言葉は提案書で使いやすい。
しかしそれが何を意味するかを「他社との相対的な位置」で示せなければ、
クライアントは「それで何が言えるのか」と感じる。

このAGは4つの軸でクライアントの現在地を座標として定義する。
そして「Webサイト設計でどこへ移動するか」という目標座標を設定する。

このAGの出力がなければ「この市場でこのクライアントはここにいる、
だからこそWebサイトでここを差別化できる」という論拠が作れない。

AG-01-RESEARCHの客観データと、AG-02-MAINの市場分析を必ず読み込む。

---

## Layer 1：目的の3層

### 目的1（直接の目的）
4軸でクライアントの現在地と目標地点を定量・定性の両方で定義する。

### 目的2（その先の目的）
AG-03（競合分析）が「この位置から見た競合の脅威・機会」を分析できる。
AG-07C（素材セット）が「このポジションだから差別化できる」という
catchCopyの根拠として使える。

### 目的3（提案書における役割）
Ch.01「今、何が起きているか」のファクトとして使う。
散布図・レーダーチャートで視覚化して「クライアントがどこにいるか」を
一目で見せる最強の説得材料になる。

---

## Layer 2：4軸の定義と評価基準

### 軸1：エリア × 規模

**問い：「このエリアで同規模の競合と比べてどこにいるか」**

評価項目：
  - エリア内での売上高・従業員数の相対順位（AG-01-RESEARCHのindustryRankingを使う）
  - エリア内の同規模帯での競合密度（何社が同じポジションにいるか）
  - エリア内での採用・ブランド認知度（AG-01-RESEARCHのareaPresenceを使う）

スコア化（各1〜10）：
  areaScale_x：エリア内での相対的な規模（1=最小・10=最大）
  areaPresence_y：エリア内での認知度・プレゼンス（1=無名・10=圧倒的）

定性評価の型：
  「〇〇圏・大企業帯では認知度トップだが、
   IT採用においては同エリアの外資・テック企業と同じ土俵に立たされている」

### 軸2：業界 × 規模

**問い：「この業界内で同規模の会社と比べてWebサイトの充実度はどこか」**

評価項目：
  - 業界内推定シェア・順位（AG-01-RESEARCHのclientEstimatedRankを使う）
  - 業界内の同規模帯のWebサイト設計水準（AG-03-HEURISTICのスコアを流用）
  - 「業界標準」を上回っているか・下回っているか

スコア化（各1〜10）：
  industryScale_x：業界内での相対的な規模（1=業界最小・10=業界最大）
  webPresence_y：業界内でのWebサイト設計水準（1=最低水準・10=業界最高水準）

定性評価の型：
  「電力業界の大手帯では採用Webへの投資が遅れており、
   IT設計水準は上位30%程度・改善余地が大きい」

### 軸3：エリア × 業界

**問い：「このエリアでこの業界を展開している希少性はどこか」**

評価項目：
  - エリア内で同業を展開している競合の数
  - 全国競合との地域での競合関係（補完か競合か）
  - 「エリア × 業界」の組み合わせでの市場独占度

スコア化（各1〜10）：
  areaExclusivity_x：エリア内での業界独占度（1=競合多数・10=独占）
  industryDepth_y：そのエリアでの業界への関与深度（1=浅い・10=深い）

定性評価の型：
  「中部圏×電力では事実上の地域独占だが、
   採用競合はエリアの壁を超えたITメガベンチャーとも戦っている」

### 軸4：業界 × デジタル成熟度

**問い：「この業界はデジタル対応が進んでいる/遅れている業界か」**

評価項目：
  - 業界内主要5社のWebサイト設計水準（Lighthouseスコア・Nielsen評価から）
  - 業界のDX進捗度（IR・業界誌・AG-01-RESEARCHのwebPresenceNoteから）
  - 採用・マーケ・広報のデジタル化度合い

スコア化（各1〜10）：
  industryDigital_x：業界全体のデジタル成熟度（1=完全アナログ・10=デジタルファースト）
  clientDigital_y：クライアントのデジタル成熟度（1=最低水準・10=業界最高水準）

デジタル成熟度の評価基準：
  1〜3（低）：紙・電話が主体。Webは補助。サイトの更新頻度が低い
  4〜6（中）：WebとオフラインのMix。採用はWebも使うが投資は少ない
  7〜10（高）：デジタルファースト。採用・営業・広報全てWebが主軸

レーダーチャート用の5評価軸：
  採用サイト充実度 / コーポレートサイト設計水準 / SNS活用度 / SEO対応 / モバイル最適化

---

## Layer 3：実行タスク

### Task 1：インプットデータを確認する

必須：
  AG-01-RESEARCH：companyBasics / areaProfile / industryProfile / chartData
  AG-02-MAIN系：marketStructure / siteDesignPrinciples（参照のみ）

AG-01-RESEARCHが利用不可の場合：
  AG-01のbriefTextとknownConstraintsから推定して★を1つにする

### Task 2：4軸のスコアを算出する

各軸について：
  ① AG-01-RESEARCHの定量データからスコアを計算する
  ② AG-03-HEURISTICが実行済みであれば競合スコアも流用する
  ③ データが不足する場合は推定スコアを付け★1で明示する

スコアはクライアント単独ではなく必ず「競合との相対値」で出す。

### Task 3：散布図データを生成する（4軸 × 各散布図）

各軸ごとに散布図のプロットデータを生成する：
  クライアントと競合上位3〜5社の座標
  クライアントは "isClient: true" で強調
  目標地点（targetPosition）も座標として追加する

### Task 4：レーダーチャートデータを生成する（軸4専用）

5評価軸のレーダーチャートデータを生成する：
  クライアントのスコア（5軸）
  業界平均のスコア（5軸）
  業界最高水準のスコア（5軸）

### Task 5：統合ポジションマップを作成する

4軸の分析を統合して「だから何」を1文で答える：
  summary：現在地（何が強くて何が弱いか）
  targetPosition：Webサイト設計後に目指す場所
  gap：現在地と目標の差分（Webサイトで埋めるもの）
  uniqueOpportunity：このポジションだからこそできる差別化（1文）

---

## Layer 4：品質基準

✓ 4軸全てにスコア（数値）と定性コメントの両方がある
✓ スコアが「競合との相対値」として算出されている（絶対値ではない）
✓ chartDataの散布図に競合3社以上のデータがある
✓ integratedPositionのuniqueOpportunityが「Webサイト設計の根拠」になっている
✓ 全スコアに信頼度（★の数）が付いている

✗ スコアなしの定性コメントだけはNG（定量・定性の両方が必須）
✗ クライアント単独のスコアのみで競合比較がないのはNG
✗ integratedPositionが抽象的で設計に繋がらないのはNG

---

## Layer 5：出力形式

JSONのみ。コードフェンス・説明文・前置き不要。

{
  "axis1_area_scale": {
    "clientScore": {
      "areaScale_x": 8,
      "areaPresence_y": 7,
      "reliability": "★★|★"
    },
    "competitors": [
      {"name": "競合名", "areaScale_x": 6, "areaPresence_y": 5, "note": "評価根拠"}
    ],
    "targetPosition": {"areaScale_x": 8, "areaPresence_y": 9},
    "qualitativeAssessment": "定性評価（型：〇〇エリア・〇〇規模帯では〜）",
    "designImplication": "この軸の分析からWebサイト設計へどう繋がるか"
  },

  "axis2_industry_scale": {
    "clientScore": {
      "industryScale_x": 7,
      "webPresence_y": 4,
      "reliability": "★★|★"
    },
    "competitors": [
      {"name": "競合名", "industryScale_x": 9, "webPresence_y": 7, "note": "評価根拠"}
    ],
    "targetPosition": {"industryScale_x": 7, "webPresence_y": 8},
    "qualitativeAssessment": "定性評価",
    "designImplication": "この軸の分析からWebサイト設計へどう繋がるか"
  },

  "axis3_area_industry": {
    "clientScore": {
      "areaExclusivity_x": 9,
      "industryDepth_y": 8,
      "reliability": "★★|★"
    },
    "competitors": [
      {"name": "競合名（エリア外も含む）", "areaExclusivity_x": 3, "industryDepth_y": 7, "note": "評価根拠"}
    ],
    "targetPosition": {"areaExclusivity_x": 9, "industryDepth_y": 9},
    "qualitativeAssessment": "定性評価",
    "designImplication": "この軸の分析からWebサイト設計へどう繋がるか"
  },

  "axis4_industry_digital": {
    "clientScore": {
      "industryDigital_x": 4,
      "clientDigital_y": 3,
      "reliability": "★★|★"
    },
    "industryAvgDigital": 4,
    "industryTopDigital": 8,
    "radarData": {
      "axes": ["採用サイト充実度", "コーポレート設計水準", "SNS活用度", "SEO対応", "モバイル最適化"],
      "client": [3, 5, 2, 4, 3],
      "industryAvg": [4, 5, 3, 4, 4],
      "industryTop": [8, 7, 7, 8, 9]
    },
    "qualitativeAssessment": "定性評価",
    "designImplication": "先行者になれる余地の説明（Webサイト提案の最重要根拠）"
  },

  "integratedPosition": {
    "summary": "4軸を統合した現在地（強みと弱みを1〜2文で）",
    "targetPosition": "Webサイト設計後に目指す位置（各軸の目標スコアを踏まえて）",
    "gap": "現在地と目標の差分（Webサイトで埋めるもの・具体的に）",
    "uniqueOpportunity": "このポジションだからこそできる差別化（1文・設計の根拠になる言葉で）",
    "priorityAxis": "4軸の中で最もWebサイト設計に影響する軸と理由"
  },

  "chartData": {
    "scatter_area_scale": {
      "type": "scatter",
      "title": "エリア内ポジション（規模 vs プレゼンス）",
      "xAxis": {"label": "エリア内相対規模", "min": 0, "max": 10},
      "yAxis": {"label": "エリア内認知度・プレゼンス", "min": 0, "max": 10},
      "plots": [
        {"label": "CLIENT", "x": 8, "y": 7, "isClient": true},
        {"label": "競合A", "x": 6, "y": 5, "isClient": false}
      ],
      "targetPlot": {"label": "目標", "x": 8, "y": 9}
    },
    "scatter_industry_scale": {
      "type": "scatter",
      "title": "業界内ポジション（規模 vs Web充実度）",
      "xAxis": {"label": "業界内相対規模", "min": 0, "max": 10},
      "yAxis": {"label": "Webサイト設計水準", "min": 0, "max": 10},
      "plots": [
        {"label": "CLIENT", "x": 7, "y": 4, "isClient": true}
      ],
      "targetPlot": {"label": "目標", "x": 7, "y": 8}
    },
    "radar_digital_maturity": {
      "type": "radar",
      "title": "デジタル成熟度比較（業界内）",
      "axes": ["採用サイト充実度", "コーポレート設計水準", "SNS活用度", "SEO対応", "モバイル最適化"],
      "datasets": [
        {"label": "CLIENT", "values": [3, 5, 2, 4, 3], "isClient": true},
        {"label": "業界平均", "values": [4, 5, 3, 4, 4], "isClient": false},
        {"label": "業界最高", "values": [8, 7, 7, 8, 9], "isClient": false}
      ]
    },
    "bar_industry_ranking": {
      "type": "bar",
      "title": "業界内売上高ランキング（AG-01-RESEARCHより）",
      "unit": "億円",
      "labels": ["CLIENT", "競合B", "競合C", "競合D", "競合E"],
      "values": [0, 0, 0, 0, 0],
      "clientIndex": 0,
      "reliability": "★★|★"
    }
  },

  "confidence": "high|medium|low",
  "factBasis": ["根拠（AG-01-RESEARCH・AG-02-MAIN・AG-03-HEURISTICのどのデータ）"],
  "assumptions": ["推定として扱った情報（★1のスコアの根拠）"]
}
