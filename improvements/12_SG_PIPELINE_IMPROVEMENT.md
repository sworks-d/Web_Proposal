# 12: 提案書生成システム（全面再設計）

## 目標

**クライアントが「これでいこう」と即決する提案書を自動生成する。**

---

# Part 1: 提案書設計論

## 2つの軸: 種別 × 型

提案書は「種別」と「型」の掛け合わせで決まる。

### 種別（proposalVariant）: 何を出力するか

| 種別 | 説明 | 章構成 | 想定枚数 |
|---|---|---|---|
| **full** | 新規制作・フルリニューアル | 課題→分析→ターゲット→ジャーニー→コンセプト→設計→IA→コンテンツ→KPI | 25-40枚 |
| **strategy** | コンペ初期・方向性合意 | 課題→ターゲット→インサイト→コンセプト→実現イメージ | 15-25枚 |
| **analysis** | 現状分析・改善方向提示 | 現状分析→競合分析→ユーザー行動→課題構造→方向性 | 15-25枚 |
| **content** | コンテンツ追加・拡充 | コンテンツ課題→ターゲット×コンテンツ→戦略→サイトマップ→ページ設計 | 15-25枚 |
| **spot** | 部分改善・特定ページ | 問題点→課題優先順位→施策一覧→施策詳細→期待効果 | 10-20枚 |

**スポット型の使用例:**
- TOPページだけ改善したい
- CVフローだけ設計したい
- 特定のコンテンツだけ追加したい

### 型（narrativeType）: どう伝えるか

| 型 | 説明 | 向いている相手 |
|---|---|---|
| **insight** | 「本質」を突く | 課題が言語化されていない相手 |
| **data** | ファクトで説得 | 経営層・数字重視の相手 |
| **vision** | 大きな絵を描く | 経営者・決裁者 |
| **solution** | 実務的に解決 | 担当者・課題が明確な場合 |

### 種別 × 型 のデフォルト組み合わせ

| 種別 | デフォルト型 | 理由 |
|---|---|---|
| full | insight or vision | 大きな提案なので本質から |
| strategy | insight | コンペでは「本質」で差がつく |
| analysis | data | 分析なのでファクト重視 |
| content | solution | 課題が明確なので解決志向 |
| spot | solution | 部分改善なので実務的に |

---

## 提案書の目的

提案書は4つの心理変化を起こす:

1. **理解** — 現状と課題を正しく認識させる
2. **共感** — 「この人はわかっている」と思わせる
3. **納得** — 論理で「確かに」と思わせる
4. **決断** — 「これでいこう」と行動を起こさせる

---

## 提案書の「型」

### 型A: インサイト・ドリブン型

**最も強力。競合が言えない「本質」を突く。**

| 章 | 役割 | 読者の心理変化 |
|---|---|---|
| 1. あなたが感じている違和感 | hook / empathize | 「そう、それ」 |
| 2. その正体（インサイト） | insight | 「そうか、そこか」 |
| 3. だからこう変わるべき | convince | 「確かに」 |
| 4. 具体的にはこうする | visualize | 「なるほど」 |
| 5. 実現すると何が変わるか | excite / decide | 「やりたい」 |

**向いている案件**:
- 課題が言語化されていない
- クライアントが「何かが違う」と感じている
- 競合も気づいていない機会がある

**キーポイント**:
- 1章で「言われてみれば確かに」を引き出す
- 2章で「そこが本当の問題だったのか」と気づかせる
- インサイトの質が全てを決める

---

### 型B: データ・ドリブン型

**ファクトで説得。経営層・数字を重視する相手向け。**

| 章 | 役割 | 読者の心理変化 |
|---|---|---|
| 1. 市場・競合の現状 | inform | 「そうなのか」 |
| 2. あなたの現状との差 | alert | 「まずい」 |
| 3. 差を埋める方法 | convince | 「なるほど」 |
| 4. 実装計画 | reassure | 「できそう」 |
| 5. 期待効果（数値） | decide | 「やろう」 |

**向いている案件**:
- 経営層への説明が必要
- ROIを明確にする必要がある
- 競合との差が数値で示せる

**キーポイント**:
- 数字は「大きく見せる」「比較で見せる」
- グラフ・表を多用
- 「〇〇が△△%改善」の形式で結論

---

### 型C: ビジョン・ドリブン型

**大きな絵を描く。フルリニューアル・経営者向け。**

| 章 | 役割 | 読者の心理変化 |
|---|---|---|
| 1. 世の中はこう変わっている | alert | 「そうか」 |
| 2. あなたの業界もこう変わる | connect | 「うちも」 |
| 3. その中であなたはこうあるべき | inspire | 「そうありたい」 |
| 4. そのためのサイト設計 | visualize | 「これがそれか」 |
| 5. 未来の姿 | excite | 「見てみたい」 |

**向いている案件**:
- 経営者・決裁者への直接提案
- フルリニューアル
- ブランド再定義

**キーポイント**:
- 1-2章で「変わらなければならない」という危機感
- 3章で「こうあるべき姿」のビジョン
- 5章で感情的に「ワクワク」させる

---

### 型D: 課題解決・ドリブン型

**実務的。課題が明確な場合・改善案件向け。**

| 章 | 役割 | 読者の心理変化 |
|---|---|---|
| 1. あなたの課題（ヒアリングから） | confirm | 「その通り」 |
| 2. 原因分析 | insight | 「そこか」 |
| 3. 解決策 | convince | 「それでいける」 |
| 4. 優先順位 | reassure | 「まずここから」 |
| 5. 実装計画 | decide | 「進めよう」 |

**向いている案件**:
- 課題が明確
- 改善案件
- 担当者レベルでの合意形成

**キーポイント**:
- 1章でヒアリング内容を正確に反映
- 4章で「全部やらなくていい」安心感
- 実現可能性を重視

---

## 各スライドの「役割」

スライドは「情報を載せる場所」ではない。
**「読者の心理状態を変える装置」**。

```typescript
interface SlideRole {
  purpose: 
    | 'hook'           // 引き込む（最初の一撃）
    | 'empathize'      // 共感させる（あなたの気持ちわかる）
    | 'alert'          // 危機感を与える（このままだとまずい）
    | 'insight'        // 気づきを与える（本当の問題はここ）
    | 'convince'       // 納得させる（だからこうなる）
    | 'visualize'      // 見せる（具体的にはこう）
    | 'excite'         // ワクワクさせる（こうなったら最高）
    | 'reassure'       // 安心させる（これならできる）
    | 'decide'         // 決断を促す（さあ、やろう）
  
  beforeState: string  // このスライドを見る前の心理
  afterState: string   // このスライドを見た後の心理
  antiPattern: string  // これをやると失敗する
}
```

### 役割ごとのアンチパターン

| 役割 | やってはいけないこと |
|---|---|
| `hook` | 一般論から入る、長い前置き |
| `empathize` | 説教する、上から目線 |
| `alert` | 脅しすぎる、不安を煽りすぎる |
| `insight` | 競合も言えることを言う、浅い |
| `convince` | 根拠なく「すべき」と言う |
| `visualize` | 説明だけで見せない |
| `excite` | 現実離れした夢を語る |
| `reassure` | 課題を矮小化する |
| `decide` | 決断を急かしすぎる |

---

## 緩急のデザイン

提案書は「映画」と同じ。全編クライマックスは疲れる。

```
感情強度
  10 ┃                    ★ climax
     ┃                   ╱ ╲
   8 ┃      ↗           ╱   ╲
     ┃     ╱           ╱     ╲
   6 ┃    ╱    pause  ╱       ╲
     ┃   ╱    ╲__╱   ╱         ╲
   4 ┃  ╱                       ╲____
     ┃ ╱ hook                        resolution
   2 ┃╱
     ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━→ ページ
       1  3  5  7  9  11 13 15 17 19 21 23 25
```

### 情報密度の設計

| フェーズ | 情報密度 | 理由 |
|---|---|---|
| hook（1-2p） | sparse | 引き込む、考えさせる |
| build-up（3-8p） | medium | 理解させる |
| climax（9-12p） | dense | 本題、詳細に |
| pause（13-15p） | sparse | 一息つかせる |
| resolution（16-20p） | medium→sparse | 着地させる |

---

# Part 2: AGの情報を「提案素材」に変換する

## AG出力 → 提案素材マッピング

AGの出力は「分析結果」。これを「提案書で使える形」に変換する。

### インサイト素材

| AGソース | 使い方 | 提案書での役割 |
|---|---|---|
| `AG-04-INSIGHT.coreInsight` | **最重要**。提案書の軸 | hook / climax |
| `AG-04-MAIN.tensions` | 葛藤・矛盾 | empathize |
| `AG-02-STP.targeting.tradeoff` | 選択の痛み | convince |
| `AG-03-GAP.topGapOpportunities` | 競合との差 | alert / convince |

### ファクト素材

| AGソース | 可視化方法 | 提案書での役割 |
|---|---|---|
| `AG-02-STP.segmentation` | セグメント比較表 | convince |
| `AG-02-STP.positioning` | 2軸マトリクス | visualize |
| `AG-03-GAP.contentInventory` | 競合比較表 | alert |
| `AG-03-COMPETITOR.competitors` | 競合カード群 | alert |
| `AG-02-JOURNEY.stages` | ジャーニーフロー図 | visualize |

### ビジュアル素材

| AGソース | 生成物 | 提案書での役割 |
|---|---|---|
| `AG-07C-1.iaStructure` | サイトマップSVG | visualize |
| `AG-07C-2.wireframes` | ワイヤーフレームSVG | visualize |
| `AG-07C-3.pageLayouts` | レイアウト図 | visualize |
| `AG-02-JOURNEY` | ユーザーフロー図 | visualize |

---

## 具体例: AG-02-STPの展開

### AG-02-STPの出力（抜粋）

```json
{
  "segmentation": [
    {
      "segmentId": "seg-01",
      "name": "情報収集中の転職検討者",
      "visitState": "業界・会社を知らない。転職サイトから流入。",
      "contentNeeds": ["社員インタビュー", "会社説明動画"],
      "cvPotential": "low"
    },
    {
      "segmentId": "seg-02",
      "name": "比較検討中の転職活動者",
      "visitState": "3社程度を比較中。待遇・条件を調べている。",
      "contentNeeds": ["待遇比較表", "選考プロセス"],
      "cvPotential": "medium"
    },
    {
      "segmentId": "seg-03",
      "name": "意思決定直前の内定者",
      "visitState": "内定を持っている。最終判断をしようとしている。",
      "contentNeeds": ["FAQ", "不安解消コンテンツ", "面談予約"],
      "cvPotential": "high"
    }
  ],
  "targeting": {
    "primarySegment": "seg-03",
    "selectionLogic": "CVに最も近く、獲得単価が最も低い",
    "firstViewMust": ["面談予約CTA", "不安解消メッセージ", "社員の顔"]
  }
}
```

### 提案書での展開（スライド例）

**スライド8: セグメント比較（convince）**

```
┌─────────────────────────────────────────────────────┐
│ WHO WE TALK TO                                       │
│ 3つのターゲット、1つの優先順位                        │
├─────────────────────────────────────────────────────┤
│                                                      │
│  ┌─────────────────────────────────────────────────┐│
│  │             セグメント比較表                     ││
│  ├───────────┬─────────────┬─────────────┬────────┤│
│  │           │ 情報収集中   │ 比較検討中   │意思決定★││
│  ├───────────┼─────────────┼─────────────┼────────┤│
│  │ 状態      │ 業界を知らない│ 3社を比較中  │ 内定あり ││
│  │ 求めるもの │ 会社説明     │ 待遇比較    │ 不安解消 ││
│  │ CV確率    │ ●○○○○     │ ●●●○○    │ ●●●●● ││
│  └───────────┴─────────────┴─────────────┴────────┘│
│                                                      │
│  ▶ 最優先: 意思決定直前層                            │
│    CVに最も近く、獲得単価が最も低い。                 │
│    この層を逃さないFV設計が必要。                     │
│                                                      │
└─────────────────────────────────────────────────────┘
```

---

# Part 3: エージェント設計

## SG-01: 提案書設計（型の選択）

**モデル**: Sonnet
**役割**: 提案書の「型」を選択し、章構成を決定

### 入力
- AG全出力
- クライアント情報（業種、規模、フェーズ）
- パラメータ（種別、枚数、聴衆）

### 出力

```typescript
interface Sg01Output {
  // 型の選択
  proposalType: 'insight' | 'data' | 'vision' | 'solution'
  proposalTypeReason: string
  
  // 章構成
  chapters: {
    id: string
    title: string
    role: SlideRole['purpose']
    pageCount: number
    beforeState: string
    afterState: string
    keyMessage: string
    agSources: string[]
  }[]
  
  // 緩急設計
  pacing: {
    buildUp: string[]
    climax: string[]
    pause: string[]
  }
}
```

---

## SG-02: ナラティブ設計（Opus）— 最重要エージェント

**モデル**: Opus
**役割**: AGの「分析結果」を「クライアントを動かすインサイト」に変換する

### なぜOpusが必要か

AG-04-INSIGHTは「訪問者のJob分析」を出力する。これは正確だが、「提案書のインサイト」ではない。

**分析結果（AG出力）:**
「内定を持っている人は、不安解消コンテンツを探している」

**インサイト（提案書で必要）:**
「御社が本当に採用したい人材ほど、御社のサイトを見ていない。
 なぜなら、優秀な候補者は御社のサイトで答えが見つからず、口コミに流出している。
 御社のサイトは"採用する"ためではなく、"選ばれる"ために再設計すべき。」

この「変換」ができるのはOpusだけ。

### インサイト生成の3つの型

**型1: 逆説型**
「〇〇だと思っているが、実は△△」
- 例：「情報量が足りないのではなく、情報の出し方が間違っている」
- 例：「採用したい人ほど、御社のサイトを見ていない」

**型2: 構造化型**
「問題は〇〇ではなく、〇〇である」
- 例：「競合との差は"待遇"ではなく、"伝え方"」
- 例：「離脱の原因は"コンテンツ不足"ではなく、"導線設計"」

**型3: 再定義型**
「〇〇は△△という問いの立て方が間違っている。本当の問いは〇〇」
- 例：「"どう採用するか"ではなく、"どう選ばれるか"」
- 例：「"どう伝えるか"ではなく、"誰に伝えるか"」

### 出力

```typescript
interface Sg02Output {
  // インサイトの核
  coreInsight: {
    type: 'paradox' | 'structure' | 'reframe'
    statement: string      // インサイト本文（1-2文）
    evidence: string[]     // AGのどの分析がこれを支持するか
    implication: string    // だからサイト設計はこう変わる
  }
  
  // コア・ナラティブ
  coreNarrative: {
    hook: string           // 最初の一撃（相手の常識を揺さぶる）
    tension: string        // 緊張（このままだとどうなるか）
    insight: string        // 気づき（↑のcoreInsight.statementを展開）
    resolution: string     // 解決（だからこうする）
    vision: string         // 未来（実現すると何が変わるか）
  }
  
  // 各章のコピー
  chapterCopies: {
    chapterId: string
    headline: string       // 章見出し（動詞で終わる or 問いかけ）
    hookLine: string       // この章を開いた時の最初の一言
    keyPoint: string       // この章で絶対伝える1点
    transition: string     // 次の章への橋渡し
  }[]
  
  // クライアント固有の言語
  clientLanguage: {
    theirWord: string      // クライアントが使う言葉
    ourWord: string        // 一般的な言葉
    usage: string          // どこで使うか
  }[]
}
```

### プロンプト設計（全文）

```
あなたは提案書のナラティブ・デザイナーです。

## あなたの役割

AGの「分析結果」を「クライアントを動かすインサイト」に変換します。
分析結果は正確ですが、そのままでは提案書になりません。
「だから何？」「なぜそれが重要？」「それで何が変わる？」に答える必要があります。

## インサイト生成の3つの型

あなたは以下の3つの型のいずれかでインサイトを生成します。

【型1: 逆説型（paradox）】
「〇〇だと思っているが、実は△△」
クライアントの常識を覆す。最も強力だが、根拠が弱いと嘘になる。
例：
- 「御社の採用サイトは、採用したい人ほど見ていません」
- 「"安定"という言葉が、実は候補者を遠ざけています」
- 「情報量が多いほど、離脱率が上がっています」

【型2: 構造化型（structure）】
「問題は〇〇ではなく、〇〇である」
問題の本質を言語化する。論理的で受け入れやすい。
例：
- 「競合との差は待遇ではなく、伝え方です」
- 「離脱の原因はコンテンツ不足ではなく、導線設計です」
- 「応募が少ない理由は露出ではなく、選考の不透明さです」

【型3: 再定義型（reframe）】
「〇〇という問いの立て方が間違っている。本当の問いは△△」
問題設定自体を変える。視座を上げる効果がある。
例：
- 「"どう採用するか"ではなく、"どう選ばれるか"」
- 「"何を伝えるか"ではなく、"誰に・いつ伝えるか"」
- 「"サイトの改善"ではなく、"採用体験の再設計"」

## 絶対禁止

- 「〜を実現」「〜を強化」「〜を推進」などの抽象動詞
- 「最適化」「シナジー」「ソリューション」などのビジネス曖昧語
- 競合も言えること（= 会社名を入れ替えても成立する表現）
- 一般論（= 業界の誰に言っても成立する表現）
- 主語のない文（誰が・誰のために を常に明確に）

## 必須

- このクライアント固有の文脈で書く
- クライアントの言葉（業界用語・社内用語）を使う
- 「言われてみれば確かに」を引き出す具体性
- 1章1メッセージ
- インサイトの根拠をAGの分析結果から必ず引用する

## hookの書き方

hookは「相手の常識を揺さぶる一撃」。
読んだ瞬間に「え、そうなの？」「言われてみれば確かに」を引き出す。

良いhook:
- 「御社の採用サイトは、採用したい人ほど見ていません」
- 「"安定"という言葉が、実は優秀な候補者を遠ざけています」
- 「競合の中で、御社だけが〇〇を伝えていません」

悪いhook:
- 「採用サイトをリニューアルしましょう」（当たり前）
- 「Webサイトは重要です」（誰でも言える）
- 「採用市場は競争が激化しています」（一般論）

## insightの書き方

insightは「問題の構造」を言語化する。
「なるほど、そういうことか」という納得を引き出す。

良いinsight:
- 「問題は情報量ではありません。情報の"出し方"です」
- 「離脱の原因はコンテンツ不足ではなく、"最初の3秒"で何を見せるかです」
- 「御社のサイトは"採用する"ためではなく、"選ばれる"ために再設計すべきです」

悪いinsight:
- 「UXを改善すべきです」（抽象的）
- 「ユーザー目線が大切です」（一般論）
- 「コンテンツを充実させましょう」（解像度が低い）

## visionの書き方

visionは「実現した未来の姿」を描く。
「それを見たい」「そうなりたい」という欲望を引き出す。

良いvision:
- 「"ここで働きたい"と思った人だけが応募してくる採用サイト」
- 「人事部が追われるのではなく、選べる採用」
- 「内定辞退率が半分になる」

悪いvision:
- 「採用力が強化されます」（抽象的）
- 「ブランドイメージが向上します」（測れない）
- 「より良い採用が実現します」（具体性がない）
```

---

## SG-03: 心理設計（Opus）

**モデル**: Opus
**役割**: 読者の心理変化のシーケンスを設計

### 出力

```typescript
interface Sg03Output {
  // スライドごとの感情設計
  emotionalArc: {
    slideNumber: number
    emotion: 'curiosity' | 'concern' | 'surprise' | 'understanding' | 'excitement' | 'confidence'
    intensity: number  // 1-10
    trigger: string
  }[]
  
  // 情報密度設計
  densityMap: {
    slideNumber: number
    density: 'sparse' | 'medium' | 'dense'
    contentType: 'text' | 'visual' | 'data' | 'mixed'
    reason: string
  }[]
  
  // 視覚的緩急
  visualPacing: {
    slideNumber: number
    visualWeight: 'light' | 'medium' | 'heavy'
    dominantElement: 'headline' | 'body' | 'diagram' | 'table' | 'number' | 'image'
  }[]
}
```

---

## SG-04: 本文生成（チャプター分割）

**モデル**: Sonnet
**役割**: AGの分析を「提案書のコンテンツ」に展開する

### 問題: AGの情報が提案書で使われていない

**現状の問題:**
- AG-02-STPに詳細なセグメント分析がある → 提案書では「3つのセグメント」と箇条書きで終わる
- AG-03-GAPに競合比較データがある → 提案書では「競合分析を行いました」で終わる
- AG-02-JOURNEYにジャーニー定義がある → 提案書では「ジャーニー設計」という章タイトルだけ

**解決策:**
SG-04に「AGのどのフィールドを・どのスライドで・どう展開するか」を明示的に指示する。

### AG→スライド展開マッピング

```typescript
const AG_TO_SLIDE_EXPANSION = {
  // ===== AG-02-STP =====
  'AG-02-STP.segmentation': {
    slideType: 'comparison-table',
    title: 'ターゲットセグメント',
    expansion: {
      // 比較表のカラム定義
      columns: [
        { key: 'name', label: 'セグメント' },
        { key: 'visitState', label: '訪問時の状態' },
        { key: 'contentNeeds[0]', label: '求めるコンテンツ' },
        { key: 'cvPotential', label: 'CV確率', format: 'dots' },
      ],
      // どの行を強調するか
      highlight: 'primarySegment',
      // 下部に追記するテキスト
      conclusion: 'targeting.selectionLogic',
    },
  },

  'AG-02-STP.positioning': {
    slideType: 'matrix-2x2',
    title: 'ポジショニング',
    expansion: {
      xAxis: 'positioning.axis1.name',
      yAxis: 'positioning.axis2.name',
      plots: [
        ...competitorPositions.map(c => ({
          x: c.axis1Score,
          y: c.axis2Score,
          label: c.name,
          type: 'competitor',
        })),
        {
          x: clientTargetPosition.axis1Score,
          y: clientTargetPosition.axis2Score,
          label: 'TARGET',
          type: 'target',
        },
      ],
      annotation: 'clientTargetPosition.designAction',
    },
  },

  // ===== AG-02-JOURNEY =====
  'AG-02-JOURNEY.stages': {
    slideType: 'flow-diagram',
    title: 'ユーザージャーニー',
    expansion: {
      // 水平フロー図として展開
      nodes: 'stages.map(s => ({ id: s.stageId, label: s.name, sublabel: s.keyAction }))',
      edges: 'auto-connect sequential',
      // 各ステージの下に touchpoints を表示
      annotations: 'stages.map(s => s.touchpoints)',
    },
  },

  // ===== AG-03-GAP =====
  'AG-03-GAP.contentInventory': {
    slideType: 'comparison-table',
    title: 'コンテンツギャップ',
    expansion: {
      columns: [
        { key: 'category', label: '領域' },
        { key: 'competitors[0].hasContent', label: '競合A', format: 'check' },
        { key: 'competitors[1].hasContent', label: '競合B', format: 'check' },
        { key: 'competitors[2].hasContent', label: '競合C', format: 'check' },
        { key: 'client.hasContent', label: '自社', format: 'check' },
      ],
      highlightGaps: true, // 競合にあって自社にないものを強調
      conclusion: 'topGapOpportunities[0].recommendation',
    },
  },

  'AG-03-GAP.topGapOpportunities': {
    slideType: 'quote', // 大きく強調
    title: null, // タイトルなし、インサイトそのものが主役
    expansion: {
      mainQuote: 'topGapOpportunities[0].opportunity',
      supporting: 'topGapOpportunities[0].evidence',
    },
  },

  // ===== AG-04-INSIGHT =====
  'AG-04-INSIGHT.jtbd.primaryJob': {
    slideType: 'text-visual-split',
    title: '訪問者が本当に求めていること',
    expansion: {
      leftText: {
        headline: 'primaryJob.job',
        body: 'primaryJob.contentToSatisfy',
      },
      rightVisual: {
        type: 'icon-text-list',
        items: [
          { icon: 'functional', text: 'functionalJobs[0].job' },
          { icon: 'social', text: 'socialJobs[0].job' },
          { icon: 'emotional', text: 'emotionalJobs[0].job' },
        ],
      },
    },
  },

  // ===== AG-07C（ワイヤーフレーム） =====
  'AG-07C-1.topPage': {
    slideType: 'wireframe-detail',
    title: 'グループTOPページ設計',
    expansion: {
      leftWireframe: {
        source: 'iaStructure.topPage',
        components: [
          { type: 'header', content: 'header' },
          { type: 'hero', content: 'firstView' },
          { type: 'cta-row', content: 'mainCtas' },
          // ...以下、ページ構造に応じて展開
        ],
      },
      rightBlocks: [
        { title: 'OBJECTIVES', content: 'topPage.objectives' },
        { title: 'COMPONENTS', content: 'topPage.keyComponents' },
        { title: 'CONVERSION', content: 'topPage.cvPoints' },
      ],
    },
  },

  'AG-07C-2.listPage': {
    slideType: 'wireframe-detail',
    title: '一覧ページ設計',
    expansion: {
      leftWireframe: { source: 'listPage.structure' },
      rightBlocks: [
        { title: 'OBJECTIVES', content: 'listPage.objectives' },
        { title: 'FILTERS', content: 'listPage.filterLogic' },
        { title: 'CARDS', content: 'listPage.cardElements' },
      ],
    },
  },

  'AG-07C-3.detailPage': {
    slideType: 'wireframe-detail',
    title: '詳細ページ設計',
    expansion: {
      leftWireframe: { source: 'detailPage.structure' },
      rightBlocks: [
        { title: 'OBJECTIVES', content: 'detailPage.objectives' },
        { title: 'CONTENT', content: 'detailPage.contentBlocks' },
        { title: 'CTA', content: 'detailPage.ctaStrategy' },
      ],
    },
  },
}
```

### 展開のルール

1. **比較表は必ず表として描画**
   - 箇条書きにしない
   - 強調すべきセルを色で示す

2. **ポジショニングは2軸マトリクスで描画**
   - 競合の位置をプロット
   - ターゲット位置を強調
   - 移動の方向を矢印で示す

3. **ジャーニーはフロー図で描画**
   - 水平の矢印で接続
   - 各ステージにタッチポイントを注釈

4. **ワイヤーフレームは実際に描画**
   - SVGで生成
   - 右側に3ブロックの説明

5. **インサイトは大きく、単独で**
   - 箇条書きに埋もれさせない
   - quote形式で強調

### 分割実行

25枚のスライドを1回で生成するのは無理。チャプターごとに分割。

```typescript
async run(input: SgInput): Promise<Sg04Output> {
  const chapters = input.sg01Output.chapters
  const allSlides: Slide[] = []
  
  for (const chapter of chapters) {
    const chapterSlides = await this.generateChapter(input, chapter)
    allSlides.push(...chapterSlides)
  }
  
  return { slides: allSlides }
}
```

### 出力（1スライド）

```typescript
interface Slide {
  slideNumber: number
  chapterId: string
  
  type: SlideType
  
  headline: string
  subheadline?: string
  body: string[] | null
  
  visual?: {
    type: 'wireframe' | 'flow' | 'table' | 'matrix' | 'chart' | 'number'
    data: unknown
    caption?: string
  }
  
  blocks?: {
    id: string
    title: string
    content: string
  }[]
  
  role: SlideRole['purpose']
  agSources: string[]
}
```

---

## SG-05: レイアウト設計

**モデル**: Haiku
**役割**: 各スライドのレイアウトを決定

### 出力

```typescript
interface Sg05Output {
  layouts: {
    slideNumber: number
    layout: LayoutType
    visualPosition: 'left' | 'right' | 'full' | 'background' | null
    textAlignment: 'left' | 'center'
    emphasis: 'headline' | 'body' | 'visual' | 'number' | 'balanced'
  }[]
}

type LayoutType =
  | 'cover'
  | 'chapter-title'
  | 'text-only'
  | 'text-visual-split'
  | 'visual-full'
  | 'wireframe-detail'
  | 'comparison-table'
  | 'flow-diagram'
  | 'matrix-2x2'
  | 'metrics-hero'
  | 'quote'
  | 'roadmap'
```

---

## SG-06: ビジュアル生成

**モデル**: Sonnet
**役割**: 表・グラフ・シンプルな図をHTML/SVGで生成

### 生成するもの

| タイプ | 方法 | 用途 |
|---|---|---|
| 比較表・一覧表 | HTML table | セグメント比較、競合比較、機能比較 |
| 棒グラフ | chart.js (bar) | 数値比較、推移 |
| 円グラフ | chart.js (pie/doughnut) | 構成比 |
| 線グラフ | chart.js (line) | トレンド、推移 |
| 2x2マトリクス | SVG | ポジショニング |
| フロー図（3-5ステップ） | SVG | ジャーニー、プロセス |

### 生成しないもの（プレースホルダー + 指示で出力）

| タイプ | 出力形式 |
|---|---|
| ワイヤーフレーム | グレーボックス + 「CDが作成: 〇〇」テキスト |
| 複雑な図解 | プレースホルダー + 指示テキスト |
| イラスト・写真 | プレースホルダーのみ |

### chart.js使用例

```html
<canvas id="chart-slide-8"></canvas>
<script>
new Chart(document.getElementById('chart-slide-8'), {
  type: 'bar',
  data: {
    labels: ['競合A', '競合B', '競合C', '自社'],
    datasets: [{
      label: 'コンテンツ充実度',
      data: [85, 72, 68, 45],
      backgroundColor: ['#999', '#999', '#999', '#0071E3']
    }]
  },
  options: {
    plugins: { legend: { display: false } },
    scales: { y: { beginAtZero: true, max: 100 } }
  }
});
</script>
```

### ワイヤーフレームのプレースホルダー例

```html
<div class="wireframe-placeholder">
  <div class="placeholder-box" style="background: #f0f0f0; height: 300px; display: flex; align-items: center; justify-content: center;">
    <div style="text-align: center; color: #666;">
      <div style="font-size: 14px; font-weight: bold;">TOPページ ワイヤーフレーム</div>
      <div style="font-size: 12px; margin-top: 8px;">
        CDが作成<br>
        ・FV: コピー + 2大CTA<br>
        ・職種検索モジュール<br>
        ・社員インタビュー3名
      </div>
    </div>
  </div>
</div>
```

---

# Part 4: デザインシステム

## スライドサイズ

**A4** を基準とする（16:9ではない）

| 向き | サイズ（mm） | ピクセル（@96dpi） |
|---|---|---|
| 横（landscape） | 297 × 210 | 1123 × 794 |
| 縦（portrait） | 210 × 297 | 794 × 1123 |

理由:
- 印刷して配布することが多い
- クライアントがPDFをそのまま使うことがある
- 16:9だとプリントアウト時に余白が出る

## トーン別テーマ

### Simple（Apple的）

```typescript
const SIMPLE_THEME = {
  bg: '#FFFFFF',
  bgAlt: '#F5F5F7',
  text: '#1D1D1F',
  textSub: '#6E6E73',
  accent: '#0071E3',
  
  fontTitle: '"SF Pro Display", "Helvetica Neue", sans-serif',
  fontBody: '"SF Pro Text", "Helvetica Neue", sans-serif',
  
  titleSize: '48px',
  headingSize: '32px',
  bodySize: '16px',
  
  pagePadding: '80px',
}
```

### Rich（FAS的）

```typescript
const RICH_THEME = {
  bg: '#1A1A1A',
  bgAlt: '#242424',
  text: '#F5F5F5',
  textSub: '#999999',
  accent: '#C9A86C',
  
  fontTitle: '"Georgia", serif',
  fontBody: '"Noto Sans JP", sans-serif',
  
  titleSize: '40px',
  headingSize: '28px',
  bodySize: '14px',
  
  pagePadding: '60px',
}
```

### Pop（東組採用的）

```typescript
const POP_THEME = {
  bg: '#FFFFFF',
  bgAlt: '#FFF8F0',
  text: '#333333',
  accent: '#FF6B35',
  accentSub: '#FFB800',
  
  fontTitle: '"Rounded Mplus 1c", sans-serif',
  fontBody: '"Noto Sans JP", sans-serif',
  
  titleSize: '44px',
  headingSize: '30px',
  bodySize: '15px',
  
  pagePadding: '48px',
}
```

---

# Part 5: 実装

## パイプライン

```
SG-01: 型選択・章構成
    ↓
SG-02: ナラティブ設計（Opus）
    ↓
SG-03: 心理設計（Opus）
    ↓
SG-04: 本文生成（チャプター分割）
    ↓
SG-05: レイアウト設計
    ↓
SG-06: ビジュアル生成
    ↓
HTMLスライドレンダラー
    ↓
Puppeteer → PDF
```

## DB設計

```prisma
model SgGeneration {
  id           String   @id @default(cuid())
  versionId    String
  version      ProposalVersion @relation(fields: [versionId], references: [id])
  
  proposalType String
  tone         String
  orientation  String
  slideCount   Int
  audience     String
  
  sg01Output   String?
  sg02Output   String?
  sg03Output   String?
  sg04Output   String?
  sg05Output   String?
  sg06Output   String?
  
  slidesJson   String?
  pdfPath      String?
  
  status       String   @default("RUNNING")
  currentStep  String?
  errorMessage String?
  startedAt    DateTime @default(now())
  completedAt  DateTime?
}
```

## 実装順序

1. prisma スキーマ修正 + db push
2. 型定義（SlideRole, LayoutType, Theme）
3. SG-01: 型選択・章構成
4. SG-02: ナラティブ設計（Opus）
5. SG-03: 心理設計（Opus）
6. SG-04: 本文生成（分割実行）
7. SG-05: レイアウト設計
8. SG-06: ビジュアル生成
9. HTMLスライドレンダラー（10種テンプレート）
10. Puppeteer PDF化
11. **提案書一覧ページ `/projects/[id]/proposals`**
12. 再開機能

---

# Part 7: 提案書一覧管理

## 想定ケース

1つのプロジェクト（version）に対して、複数の提案書を作成する:

| 提案書 | 種別 | 対象 | 聴衆 |
|---|---|---|---|
| 提案書A | full | 全体 | 担当者 |
| 提案書B | strategy | 全体 | 経営層 |
| 提案書C | spot | TOPページ改善 | 担当者 |
| 提案書D | spot | CVフロー改善 | 担当者 |

## DBスキーマ（追加フィールド）

```prisma
model SgGeneration {
  // ... 既存フィールド
  
  // 識別用
  name         String?   // 提案書名（例: "経営層向け戦略提案"）
  targetScope  String?   // スポット型の対象（例: "TOPページ", "CVフロー"）
}
```

## 一覧ページ UI

`/projects/[id]/proposals`

```
┌─────────────────────────────────────────────────────────────┐
│ 提案書一覧                                    [+ 新規作成]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 📄 フル提案（担当者向け）                           │   │
│  │    種別: full  |  25枚  |  simple  |  作成: 4/7    │   │
│  │    ステータス: ✅ 完了                              │   │
│  │    [PDF] [HTML] [編集] [複製]                       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 📄 戦略提案（経営層向け）                           │   │
│  │    種別: strategy  |  15枚  |  rich  |  作成: 4/7  │   │
│  │    ステータス: ⏳ 生成中（SG-02）                   │   │
│  │    [キャンセル]                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 📄 TOPページ改善提案                                │   │
│  │    種別: spot  |  対象: TOPページ  |  12枚         │   │
│  │    ステータス: ✅ 完了                              │   │
│  │    [PDF] [HTML] [編集] [複製]                       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 新規作成モーダル

```
┌─────────────────────────────────────────────────────────────┐
│ 新規提案書作成                                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  提案書名（任意）                                           │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 経営層向け戦略提案                                   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  種別 ─────────────────────────────────────────────────    │
│  ○ フル提案（25-40枚）— 新規制作・フルリニューアル        │
│  ○ 戦略提案（15-25枚）— コンペ初期・方向性合意            │
│  ○ 分析提案（15-25枚）— 現状分析・改善方向提示            │
│  ○ コンテンツ提案（15-25枚）— コンテンツ追加・拡充        │
│  ● スポット提案（10-20枚）— 部分改善・特定ページ          │
│                                                             │
│  ▼ スポット対象（種別がspotの場合のみ表示）                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ TOPページ                                    ▼      │   │
│  └─────────────────────────────────────────────────────┘   │
│  選択肢: TOPページ / 一覧ページ / 詳細ページ /              │
│          CVフロー / ナビゲーション / その他（自由入力）     │
│                                                             │
│  ▼ 詳細設定                                                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 型: ○ 自動  ○ insight  ○ data  ○ vision  ○ solution │   │
│  │ トーン: ○ Simple  ○ Rich  ○ Pop                    │   │
│  │ 向き: ○ 横  ○ 縦                                    │   │
│  │ 枚数: [====●========] 15枚                          │   │
│  │ 聴衆: ○ 経営層  ○ 担当者  ○ クリエイター            │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│                              [キャンセル] [作成開始]        │
└─────────────────────────────────────────────────────────────┘
```

## スポット型のAGソース制限

スポット型（spot）の場合、使用するAGソースを対象に絞る:

| 対象 | 使用するAGソース |
|---|---|
| TOPページ | AG-07C-1, AG-02-STP（FV設計に必要）, AG-04-INSIGHT |
| 一覧ページ | AG-07C-2, AG-02-JOURNEY |
| 詳細ページ | AG-07C-3, AG-02-JOURNEY |
| CVフロー | AG-07C-4, AG-04-INSIGHT（バリアー分析）|
| ナビゲーション | AG-07C-1（IA部分）, AG-02-JOURNEY |

これにより、スポット提案は該当部分に集中した内容になる。

---

# Part 6: 品質基準

## 提案書の品質チェックリスト

### ナラティブ
- [ ] hook で「え、そうなの？」が起きるか
- [ ] insight で「そこが本当の問題だったのか」が起きるか
- [ ] 全体を通して「一本の筋」があるか
- [ ] 競合が言えないことを言っているか

### 構成
- [ ] 各章の役割が明確か
- [ ] 緩急があるか
- [ ] 情報密度の濃淡があるか

### コピー
- [ ] 抽象動詞を使っていないか
- [ ] クライアント固有の文脈で書いているか
- [ ] 1スライド1メッセージになっているか

### ビジュアル
- [ ] 図解が実際に描画されているか
- [ ] ワイヤーフレームがあるか
- [ ] 比較表・マトリクスがあるか

### 全体
- [ ] 読み終わった後に「やりたい」と思えるか
- [ ] 次のアクションが明確か
