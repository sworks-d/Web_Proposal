# SG-06: ビジュアル生成

---

## Layer 0：このAGが存在する理由

SG-04がスライドの「本文」と「ビジュアル指示」を出力した。
このAGは、ビジュアル指示を実際のHTML/SVGに変換する。

---

## Layer 1：生成するもの

| タイプ | 出力形式 | ライブラリ |
|---|---|---|
| 比較表 | HTML `<table>` | なし |
| 棒グラフ | chart.js config | chart.js |
| 円グラフ | chart.js config | chart.js |
| 線グラフ | chart.js config | chart.js |
| 2x2マトリクス | SVG | なし |
| フロー図（3-5ステップ） | SVG | なし |

---

## Layer 2：生成しないもの

| タイプ | 代わりに |
|---|---|
| ワイヤーフレーム | プレースホルダーHTML（SG-04が出力済み） |
| 複雑な図解 | プレースホルダー |
| イラスト・写真 | なし |

---

## Layer 3：HTML表の生成

### 入力

```json
{
  "type": "table",
  "data": {
    "headers": ["コンテンツ", "競合A", "競合B", "自社"],
    "rows": [
      ["社員インタビュー", "10名", "8名", "3名"],
      ["職種別ページ", "15", "12", "5"]
    ],
    "highlight": { "column": 3, "color": "alert" }
  }
}
```

### 出力

```html
<table class="data-table">
  <thead>
    <tr>
      <th>コンテンツ</th>
      <th>競合A</th>
      <th>競合B</th>
      <th class="highlight-alert">自社</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>社員インタビュー</td>
      <td>10名</td>
      <td>8名</td>
      <td class="highlight-alert">3名</td>
    </tr>
    <tr>
      <td>職種別ページ</td>
      <td>15</td>
      <td>12</td>
      <td class="highlight-alert">5</td>
    </tr>
  </tbody>
</table>
```

---

## Layer 4：chart.js グラフの生成

### 棒グラフ

```json
{
  "type": "bar",
  "data": {
    "labels": ["競合A", "競合B", "競合C", "自社"],
    "datasets": [{
      "label": "コンテンツ充実度",
      "data": [85, 72, 68, 45],
      "backgroundColor": ["#999", "#999", "#999", "#0071E3"]
    }]
  },
  "options": {
    "plugins": { "legend": { "display": false } },
    "scales": { "y": { "beginAtZero": true, "max": 100 } }
  }
}
```

### 円グラフ

```json
{
  "type": "doughnut",
  "data": {
    "labels": ["情報収集中", "比較検討中", "意思決定直前"],
    "datasets": [{
      "data": [40, 35, 25],
      "backgroundColor": ["#E0E0E0", "#999", "#0071E3"]
    }]
  },
  "options": {
    "plugins": { "legend": { "position": "right" } }
  }
}
```

---

## Layer 5：2x2マトリクスの生成

### 入力

```json
{
  "type": "matrix",
  "data": {
    "xAxis": { "label": "待遇・条件", "low": "低", "high": "高" },
    "yAxis": { "label": "働きがい", "low": "低", "high": "高" },
    "plots": [
      { "name": "競合A", "x": 0.8, "y": 0.6, "type": "competitor" },
      { "name": "競合B", "x": 0.6, "y": 0.7, "type": "competitor" },
      { "name": "自社（現状）", "x": 0.4, "y": 0.5, "type": "current" },
      { "name": "自社（目標）", "x": 0.6, "y": 0.8, "type": "target" }
    ]
  }
}
```

### 出力

```svg
<svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
  <!-- 軸 -->
  <line x1="50" y1="350" x2="350" y2="350" stroke="#333" stroke-width="2"/>
  <line x1="50" y1="350" x2="50" y2="50" stroke="#333" stroke-width="2"/>
  
  <!-- 軸ラベル -->
  <text x="200" y="390" text-anchor="middle" font-size="14">待遇・条件</text>
  <text x="20" y="200" text-anchor="middle" font-size="14" transform="rotate(-90, 20, 200)">働きがい</text>
  
  <!-- グリッド -->
  <line x1="200" y1="50" x2="200" y2="350" stroke="#E0E0E0" stroke-dasharray="4"/>
  <line x1="50" y1="200" x2="350" y2="200" stroke="#E0E0E0" stroke-dasharray="4"/>
  
  <!-- プロット -->
  <circle cx="290" cy="170" r="8" fill="#999"/>
  <text x="290" y="155" text-anchor="middle" font-size="10">競合A</text>
  
  <circle cx="230" cy="140" r="8" fill="#999"/>
  <text x="230" y="125" text-anchor="middle" font-size="10">競合B</text>
  
  <circle cx="170" cy="200" r="10" fill="#FF6B35" stroke="#333" stroke-width="2"/>
  <text x="170" y="220" text-anchor="middle" font-size="10" font-weight="bold">自社（現状）</text>
  
  <circle cx="230" cy="110" r="10" fill="#0071E3"/>
  <text x="230" y="95" text-anchor="middle" font-size="10" font-weight="bold">自社（目標）</text>
  
  <!-- 矢印 -->
  <path d="M175,195 L220,120" stroke="#0071E3" stroke-width="2" fill="none" marker-end="url(#arrow)"/>
  <defs>
    <marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
      <path d="M0,0 L0,6 L9,3 z" fill="#0071E3"/>
    </marker>
  </defs>
</svg>
```

---

## Layer 6：フロー図の生成

### 入力

```json
{
  "type": "flow",
  "data": {
    "nodes": [
      { "id": "1", "label": "認知", "description": "転職サイトで発見" },
      { "id": "2", "label": "興味", "description": "採用サイト訪問" },
      { "id": "3", "label": "検討", "description": "競合と比較" },
      { "id": "4", "label": "決定", "description": "応募・面談予約" }
    ]
  }
}
```

### 出力

```svg
<svg viewBox="0 0 800 150" xmlns="http://www.w3.org/2000/svg">
  <!-- ノード1 -->
  <rect x="20" y="30" width="160" height="80" rx="8" fill="#F5F5F7" stroke="#E0E0E0"/>
  <text x="100" y="60" text-anchor="middle" font-size="16" font-weight="bold">認知</text>
  <text x="100" y="85" text-anchor="middle" font-size="11" fill="#666">転職サイトで発見</text>
  
  <!-- 矢印1 -->
  <path d="M180,70 L220,70" stroke="#999" stroke-width="2" marker-end="url(#arrow)"/>
  
  <!-- ノード2 -->
  <rect x="220" y="30" width="160" height="80" rx="8" fill="#F5F5F7" stroke="#E0E0E0"/>
  <text x="300" y="60" text-anchor="middle" font-size="16" font-weight="bold">興味</text>
  <text x="300" y="85" text-anchor="middle" font-size="11" fill="#666">採用サイト訪問</text>
  
  <!-- 矢印2 -->
  <path d="M380,70 L420,70" stroke="#999" stroke-width="2" marker-end="url(#arrow)"/>
  
  <!-- ノード3 -->
  <rect x="420" y="30" width="160" height="80" rx="8" fill="#F5F5F7" stroke="#E0E0E0"/>
  <text x="500" y="60" text-anchor="middle" font-size="16" font-weight="bold">検討</text>
  <text x="500" y="85" text-anchor="middle" font-size="11" fill="#666">競合と比較</text>
  
  <!-- 矢印3 -->
  <path d="M580,70 L620,70" stroke="#999" stroke-width="2" marker-end="url(#arrow)"/>
  
  <!-- ノード4（強調） -->
  <rect x="620" y="30" width="160" height="80" rx="8" fill="#0071E3"/>
  <text x="700" y="60" text-anchor="middle" font-size="16" font-weight="bold" fill="#FFF">決定</text>
  <text x="700" y="85" text-anchor="middle" font-size="11" fill="#FFF">応募・面談予約</text>
</svg>
```

---

## Layer 7：トーン別スタイル

| トーン | 背景 | アクセント | フォント |
|---|---|---|---|
| simple | #FFFFFF | #0071E3 | Helvetica |
| rich | #1A1A1A | #C9A86C | Georgia |
| pop | #FFFFFF | #FF6B35 | Rounded |

生成時にトーンに応じて色を変更する。

---

## Layer 8：出力形式

各スライドのビジュアルをHTML/SVG文字列で出力。

```json
{
  "slideNumber": 6,
  "visualHtml": "<table class=\"data-table\">...</table>"
}
```

または

```json
{
  "slideNumber": 8,
  "visualHtml": "<svg viewBox=\"0 0 400 400\">...</svg>"
}
```

chart.jsの場合は設定JSONを出力:

```json
{
  "slideNumber": 7,
  "chartConfig": { "type": "bar", "data": {...}, "options": {...} }
}
```
