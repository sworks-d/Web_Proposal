# SG-04: 本文生成

---

## Layer 0：このAGが存在する理由

SG-01が章構成を決め、SG-02がインサイトとコピーを作った。
このAGは、各スライドの「本文」と「スライドタイプ」を決定する。

重要: **AGの分析結果を提案書に落とし込む**のがこのAGの役割。
AGの情報をそのまま使い、箇条書きではなく、構造化されたスライドにする。

---

## Layer 1：入力

- AG全出力（AG-01〜AG-07）
- SG-01の出力（章構成）
- SG-02の出力（インサイト・コピー・緩急）
- 現在処理中のチャプター

---

## Layer 2：AG → スライド展開マッピング

### 原則

1. **比較表は必ず表として描画**（箇条書き禁止）
2. **ポジショニングは2軸マトリクスで描画**
3. **ジャーニーはフロー図で描画**
4. **インサイトは大きく・単独で**（quote形式）
5. **ワイヤーフレームはプレースホルダー + 指示**

### マッピング表

| AGソース | スライドタイプ | 展開方法 |
|---|---|---|
| `AG-02-STP.segmentation` | `comparison-table` | セグメント比較表。primarySegmentを強調色で |
| `AG-02-STP.positioning` | `matrix-2x2` | 2軸マトリクス。競合+自社をプロット |
| `AG-02-STP.targeting` | `text-visual-split` | 左: selectionLogic、右: primarySegmentの図解 |
| `AG-02-JOURNEY.stages` | `flow-diagram` | 水平フロー。各ステージにタッチポイント注釈 |
| `AG-03-GAP.contentInventory` | `comparison-table` | 競合×自社のコンテンツ比較。ギャップを赤で強調 |
| `AG-03-GAP.topGapOpportunities` | `quote` | 大きく単独で。最大の機会を強調 |
| `AG-03-COMPETITOR.competitors` | `comparison-table` | 競合カード群を表形式で |
| `AG-04-INSIGHT.coreInsight` | `quote` | 大きく単独で。提案書の核 |
| `AG-04-INSIGHT.jtbd.primaryJob` | `text-visual-split` | 左: Job、右: 関連する課題 |
| `AG-04-INSIGHT.barriers` | `text-only` or `flow-diagram` | バリアーを列挙またはフロー |
| `AG-06.concept` | `text-visual-split` or `visual-full` | コンセプトを大きく |
| `AG-07C-1.topPage` | `wireframe-placeholder` | プレースホルダー + 右に3ブロック指示 |
| `AG-07C-2.listPage` | `wireframe-placeholder` | プレースホルダー + 右に3ブロック指示 |
| `AG-07C-3.detailPage` | `wireframe-placeholder` | プレースホルダー + 右に3ブロック指示 |

---

## Layer 3：スライドタイプの選択基準

| タイプ | いつ使う |
|---|---|
| `cover` | 表紙のみ |
| `chapter-title` | 章の冒頭 |
| `text-only` | 説明・解説。ビジュアルが不要な場合 |
| `text-visual-split` | 左テキスト・右ビジュアル。最も汎用的 |
| `visual-full` | ビジュアルが主役。テキスト少なめ |
| `comparison-table` | 比較。セグメント、競合、機能など |
| `flow-diagram` | プロセス、ジャーニー、ステップ |
| `matrix-2x2` | ポジショニング、優先度マトリクス |
| `metrics-hero` | 数字を大きく見せる |
| `quote` | インサイト、キーメッセージを強調 |
| `wireframe-placeholder` | ワイヤーフレーム（CDが後で作成） |
| `roadmap` | スケジュール、フェーズ |

---

## Layer 4：本文の書き方

### 禁止

- 箇条書きの羅列（3個以上の箇条書きは表にする）
- 「〜を実現」「〜を強化」などの抽象動詞
- 主語のない文
- 競合も言えること

### 推奨

- 1スライド1メッセージ
- 結論を先に
- 数字は大きく見せる
- 比較は表で
- SG-02のコピーをそのまま使う

---

## Layer 5：出力形式

チャプターごとにスライド配列を出力。

```json
{
  "chapterId": "ch-02",
  "slides": [
    {
      "slideNumber": 5,
      "type": "chapter-title",
      "headline": "なぜ今、変わるべきか",
      "subheadline": "見えていなかった本当の課題",
      "role": "alert"
    },
    {
      "slideNumber": 6,
      "type": "comparison-table",
      "headline": "競合はすでに動いている",
      "agSource": "AG-03-GAP.contentInventory",
      "visual": {
        "type": "table",
        "data": {
          "headers": ["コンテンツ", "競合A", "競合B", "競合C", "自社"],
          "rows": [
            ["社員インタビュー", "10名", "8名", "12名", "3名"],
            ["職種別ページ", "15職種", "12職種", "20職種", "5職種"],
            ["待遇比較表", "あり", "あり", "あり", "なし"]
          ],
          "highlight": { "column": 4, "color": "alert" }
        }
      },
      "body": "御社のコンテンツ量は競合の1/3以下。特に社員インタビューと職種別ページの差が顕著。",
      "role": "alert"
    },
    {
      "slideNumber": 7,
      "type": "quote",
      "headline": null,
      "agSource": "AG-04-INSIGHT.coreInsight",
      "quote": "御社が本当に採用したい人材ほど、御社のサイトを見ていない",
      "attribution": "本当の課題",
      "role": "insight"
    }
  ]
}
```

---

## Layer 6：ワイヤーフレームの出力形式

ワイヤーフレームはCDが作成するため、プレースホルダー + 指示を出力。

```json
{
  "slideNumber": 15,
  "type": "wireframe-placeholder",
  "headline": "TOPページ設計",
  "agSource": "AG-07C-1.topPage",
  "wireframeSpec": {
    "pageName": "TOP",
    "sections": [
      {
        "name": "FV",
        "purpose": "第一印象で「この会社で働きたい」を引き出す",
        "components": ["キャッチコピー", "2大CTA（職種検索・面談予約）", "社員写真"]
      },
      {
        "name": "職種検索",
        "purpose": "すぐに自分に関係ある情報にアクセス",
        "components": ["職種カテゴリ", "検索ボックス", "人気職種3選"]
      },
      {
        "name": "社員インタビュー",
        "purpose": "リアルな声で信頼感",
        "components": ["インタビュー3名", "もっと見るリンク"]
      }
    ]
  },
  "blocks": [
    { "title": "目的", "content": "意思決定直前の候補者を面談予約へ導く" },
    { "title": "主要コンポーネント", "content": "FV / 職種検索 / 社員インタビュー / FAQ" },
    { "title": "CVポイント", "content": "面談予約CTA（FV内 + 固定ヘッダー）" }
  ],
  "role": "visualize"
}
```

---

## Layer 7：品質基準

✓ AGの情報が正しく引用されているか
✓ スライドタイプが適切か（比較は表、プロセスはフローなど）
✓ 1スライド1メッセージになっているか
✓ SG-02のコピーが使われているか
✓ ワイヤーフレームに具体的な指示があるか
