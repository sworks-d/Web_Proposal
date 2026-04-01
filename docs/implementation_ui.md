# UI実装指示書 — デザインリニューアル

**前提：** Phase 1の機能実装は完了済み。このドキュメントはUIの全面リニューアル指示書です。
**参照デザイン：** `/mnt/user-data/outputs/ui-design/index.html`（承認済みデザイン）

---

## 0. 現状の問題点

**トップページ（/）:**
- デフォルトのNext.jsスタイル。背景白・中央フォーム
- 「このシステムが何か」がわからない

**プロジェクト詳細ページ（/projects/[id]）:**
- 背景が真っ黒で何も表示されていない状態が「待機中」か「バグ」か判断できない
- 「実行」「フルパイプライン実行」の2ボタンの役割が不明
- 「次に何をすべきか」が全くわからない

---

## 1. デザイントークン（globals.cssに設定）

```css
:root {
  --bg:    #FCFBEF;
  --bg2:   #F5F3E2;
  --ink:   #1C1C17;
  --ink2:  #4A4A3E;
  --ink3:  #8A8A78;
  --ink4:  #C4C4AC;
  --red:   #E63022;
  --line:  rgba(28,28,23,0.10);
  --line2: rgba(28,28,23,0.16);
  --dot-b: #4A9FD4;
  --dot-g: #8DC63F;
}

body {
  background: var(--bg);
  color: var(--ink);
  font-family: 'Manrope', 'Zen Kaku Gothic New', sans-serif;
}
```

**Google Fonts（layout.tsxのnext/font/google）:**
```typescript
import { Unbounded, Manrope, Sora, Raleway } from 'next/font/google'
// Unbounded: font-display (見出し・強調)
// Manrope: font-body (本文)
// Sora: font-caption (キャプション・補足)
// Raleway: font-italic (イタリック見出し)
```

---

## 2. 共通コンポーネント

### 2.1 Ticker（最上部の横スクロールバー）

```typescript
// src/components/layout/Ticker.tsx
// props: items: string[], activeItems?: string[]
// 黒背景・白テキスト・赤アクセント
// 実行中の案件情報をリアルタイムで流す
// 「AG-02 実行中 — プロジェクト名」「✋ チェックポイント① 待機中」等
```

### 2.2 NavBar

```typescript
// src/components/layout/NavBar.tsx
// 左: ロゴ（2×2グリッドマーク + "Web Proposal Agent"）
// 中央: 現在地のコンテキスト文字列
// 右: Cases / Settings リンク
// 背景: var(--bg) / 下ボーダー: 1px solid var(--line)
```

---

## 3. トップページ（/ → src/app/page.tsx）

### 3.1 レイアウト構造

```
Ticker
NavBar
  └ Hero（左: 大きなタイトル / 右: 説明文 + 統計 + 新規作成ボタン）
  └ 案件一覧セクション
      └ ProjectCard × N（3カラムグリッド）
```

### 3.2 Hero

```typescript
// 左カラム
<h1 style={{ fontFamily: 'Unbounded', fontSize: 'clamp(56px, 7.5vw, 112px)', fontWeight: 900 }}>
  WEB<br/>PRO<span style={{ color: 'var(--red)' }}>POS</span>
  <span style={{ color: 'var(--ink4)', fontWeight: 400 }}>AL</span><br/>AGENT
</h1>

// 右カラム
// 1. eyebrow（Raleway italic）: "多業種対応マルチエージェントシステム"
// 2. description（Sora 13.5px）: システムの説明文
// 3. stats bar（3分割ボーダーボックス）: AG数 / SUB数 / フェーズ数
// 4. 新規作成ボタン（黒背景・白文字・Unbounded）→ 新規プロジェクト作成モーダルを開く
```

### 3.3 ProjectCard

```typescript
interface ProjectCardProps {
  project: Project
  onClick: () => void
}

// ステータスに応じた上部アクセントライン（3px）
// run: var(--red) / wait: #E8C44A / done: なし

// ステータスバッジ（pill形状・border-radius:99px）
// run:  赤背景・白文字・点滅ドット・"実行中"
// wait: 黄背景・暗色文字・点滅ドット・"確認待ち" ← ユーザーアクション必要
// done: グレー背景・"完了"

// AGパイプライン進捗バー
// 7本の細いバー（height:2.5px）を横並び
// done: var(--ink) / run: var(--red) / pending: var(--line2)
// 右端に現在のAGと状態を小テキストで表示

// ステータスが "wait"（確認待ち）の場合
// カード全体に黄色のアクセントラインを表示
// クリックするとチェックポイントモーダルを開く
```

### 3.4 新規プロジェクト作成モーダル

**既存のフォームをモーダルに移動する。**

```typescript
// 既存フィールドはそのまま使用:
// - クライアント名（必須）
// - 案件タイトル（必須）
// - 業界タイプ（select）
// - 依頼内容（textarea）

// スタイル変更:
// - モーダル背景: rgba(252,251,239,0.88) + backdrop-filter:blur(5px)
// - モーダル本体: var(--bg) + 1px solid var(--line2)
// - フォームフィールド: シンプルなアンダーラインスタイル
// - 「作成する」ボタン: 黒背景・白文字・Unbounded・全幅
```

---

## 4. プロジェクト詳細ページ（/projects/[id]）

**これが最重要。現状の黒背景・ユーザー迷子問題を解決する。**

### 4.1 レイアウト構造

```
Ticker（このプロジェクトの状態を表示）
NavBar（← 全案件 / プロジェクト名）
  └ PipelineHeader（プロジェクト名 + ライブバッジ）
  └ PipelineBody（2カラム）
      ├ AgentRail（左 290px）
      └ OutputPanel（右 残り）
  └ PipelineFooter（フェーズ進捗 + 次へボタン）
```

### 4.2 AgentRail（左カラム）

**現状の左カラムが真っ黒で空欄なのを修正。**

```typescript
// 各AGアイテム：
// done:    白背景・チェックアイコン（黒背景）・opacity:0.7
// active:  var(--bg2)・左赤ライン2px・赤アイコン背景・点滅しない
// pending: opacity:0.35・クリック無効

// AG名とサブテキスト（状態説明）を表示
// done   → "完了"
// active → "実行中..." または "✋ あなたの操作が必要です"  ← 重要
// pending → "待機中"
```

### 4.3 OutputPanel（右カラム）

**現状の右半分が真っ黒なのを修正。初期状態を明確にする。**

```
┌─────────────────────────────────────────────────┐
│ AG-02 市場分析                    [再生成][編集]  │
│ 採用・リクルートサイト専門  [SUB-LIFE]            │
├─────────────────────────────────────────────────┤
│ 【実行前の状態】                                  │
│   ┌───────────────────────────────────────────┐ │
│   │  ▶ AG-01 インテークを実行してください     │ │
│   │                                           │ │
│   │  案件情報の整理・AG推奨・仮説設定を行います │ │
│   │  所要時間: 約10〜30秒                     │ │
│   │                                           │ │
│   │  [AG-01 を実行する →]                    │ │
│   └───────────────────────────────────────────┘ │
├─────────────────────────────────────────────────┤
│ 【実行中の状態】                                  │
│   分析中 ···                                     │
│   電力業界の採用市場を分析中。大手電力各社の...█  │
├─────────────────────────────────────────────────┤
│ 【完了セクション（折りたたみ）】                  │
│   ▸ AG-01 インテーク — 完了  [Confidence: med]   │
│     案件概要: ...                                │
└─────────────────────────────────────────────────┘
```

**初期状態（未実行）のUI：**
```typescript
// 何も実行していない場合
// 「真っ黒」ではなく、var(--bg2)背景に以下を表示
<div className="empty-state">
  <div className="empty-icon">▶</div>
  <h3>AG-01 インテークを実行してください</h3>
  <p>案件情報の整理・AG推奨・仮説設定を行います<br/>所要時間: 約10〜30秒</p>
  <button className="btn-execute-primary" onClick={runAG01}>
    AG-01 を実行する →
  </button>
</div>
```

### 4.4 ユーザーアクションエリア（最重要改善箇所）

**現状の問題：** 「実行」「追加指示入力」「フルパイプライン実行」の3UIが散らばっており役割不明。

**改善方針：** 状態に応じて表示を切り替え、「今あなたがすべきこと」を1つだけ明確に表示する。

```typescript
// 状態ごとのCTA表示

// State 1: 未実行
// → 「AG-01 を実行する」ボタン（大・黒・全幅）
// → サブテキスト「案件情報の整理・AG推奨・仮説設定を行います（約10〜30秒）」

// State 2: 実行中
// → 実行中インジケーター（赤点滅 + テキスト「AG-02 実行中...」）
// → 「キャンセル」ボタン（小・アウトライン）
// → ボタンは非活性化（実行中は操作不要であることを示す）

// State 3: チェックポイント待ち（✋ ユーザーアクション必要）
// → 黄色背景の通知バナー
//   「✋ あなたの操作が必要です」
//   「AG選択を確認して次のフェーズへ進んでください」
//   「[AG選択・確認を開く →]」ボタン（黄色背景・黒文字・大）

// State 4: エラー
// → 赤背景の通知バナー
//   「エラーが発生しました」
//   エラーメッセージ（具体的に）
//   「[再試行]」ボタン

// State 5: 完了
// → 完了バナー（緑アクセント）
//   「全フェーズ完了しました」
//   「[Markdownとしてエクスポート]」ボタン
```

**追加指示入力エリアの改善：**
```typescript
// 現状: 常に表示されている謎のテキストエリア
// 改善: 折りたたみ式・ラベルを明確に

<details className="additional-instruction">
  <summary>追加指示を入力する（任意）</summary>
  <textarea placeholder="例: 競合はA社・B社に絞ってください / ターゲットは30代転職者に焦点を当ててください" />
</details>
```

### 4.5 フェーズ進捗フッター

```typescript
// 現状: 画面下部に「フルパイプライン実行（AG-01〜07）」の緑ボタンが単独
// 改善: フェーズ進捗トラック + 次へボタンのセット

// フェーズノード（5段階）
// 完了: 黒枠・黒文字
// 現在: 黒背景・白文字
// 未到達: グレー枠・グレー文字

// 「次のフェーズへ」ボタン
// 実行中: disabled（グレー）
// チェックポイント待ち: enabled + 黄色背景（「✋ 確認後に進む」）
// 通常待機: disabled

// 「フルパイプライン実行」は右上の小さいオプションとして残す
// メインのCTAとして前面に出さない
```

---

## 5. チェックポイントモーダル（新規コンポーネント）

```typescript
// src/components/checkpoint/CheckpointModal.tsx

// トリガー: ステータスが "waiting" のプロジェクトカードをクリック
//          または実行中画面でチェックポイントに到達した時

// 構造:
// Header: "✋ チェックポイント① AG選択・確認"（Raleway italic眉）
// Body:
//   大分類AG選択（ラジオボタン・1つ必須）
//     - AG-01の推奨を自動選択済みで表示
//     - 「推奨」バッジ（赤枠・赤文字）
//   SUB選択（チェックボックス・複数可）
//     - 2カラムグリッド
//     - AG-01の推奨を自動チェック済み
// Footer:
//   左: ヒントテキスト
//   右: 「この選択で実行する →」ボタン（黒背景）

// スタイル: overlay-CP に従う（FCFBEF背景・blur）
```

---

## 6. ステータス管理の見直し

現状の問題：ステータスが画面に反映されていない。

```typescript
// 以下のステータスを明示的にUIに反映する

type ProjectStatus =
  | 'idle'        // 未実行（AG-01 実行ボタンを表示）
  | 'running'     // 実行中（進捗表示・キャンセルボタン）
  | 'checkpoint'  // チェックポイント待ち（✋バナー・AG選択促進）
  | 'error'       // エラー（赤バナー・再試行）
  | 'completed'   // 完了（エクスポートボタン）

// Ticker に現在のステータスをリアルタイム反映
// AgentRailの各アイテムにステータスを反映
// OutputPanelの右半分をステータスで切り替え
```

---

## 7. カラー・スタイルの一括修正

```typescript
// 変更すべき箇所

// [削除] 黒背景（bg-black, bg-gray-900, bg-gray-800）
// [変更先] var(--bg) または var(--bg2)

// [削除] 青いボタン（bg-blue-500, bg-blue-600）
// [変更先]
//   - プライマリアクション: bg-[#1C1C17] text-[#FCFBEF]（黒背景・白文字）
//   - ✋アクション: bg-[#E8C44A] text-[#4A3800]（黄背景・暗色文字）
//   - 危険・エラー: bg-[#E63022] text-white（赤背景）
//   - セカンダリ: border border-[rgba(28,28,23,0.16)] text-[#4A4A3E]（アウトライン）

// [削除] 緑のボタン（bg-green-500）
// [変更先] プライマリボタンと統一

// フォントサイズ・ウェイトはTailwindクラスから上記デザイントークンに移行
```

---

## 8. 実装の優先順位

```
Priority 1（今すぐ）:
  - globals.css にデザイントークン設定
  - 黒背景を var(--bg) に変更
  - 青・緑ボタンを黒ボタンに変更
  - 未実行状態のEmpty Stateを実装

Priority 2（次に）:
  - Ticker コンポーネント実装
  - ProjectCard のステータス表示改善
  - OutputPanelの状態別表示切り替え

Priority 3（その後）:
  - CheckpointModal 実装
  - ユーザーアクションエリアの状態別表示
  - フェーズ進捗フッター

Priority 4（仕上げ）:
  - Google Fonts 導入
  - Hero セクション
  - アニメーション・マイクロインタラクション
```

---

## 9. 参照ファイル

- デザインHTML: `/mnt/user-data/outputs/ui-design/index.html`
- デザイントークン: 上記 Section 1 参照
- 3画面の動作: index.htmlのJSで確認可能（ダッシュボード / パイプライン / チェックポイント）

---

## 10. 承認済みデザインHTML（参照用）

以下のHTMLが承認済みのUIデザインです。
このHTMLをブラウザで開いて動作を確認しながら実装してください。
3画面（ダッシュボード / パイプライン実行 / チェックポイントモーダル）が含まれています。

```html
<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>WEB PROPOSAL AGENT</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Unbounded:wght@400;700;900&family=Manrope:wght@400;500;600&family=Zen+Kaku+Gothic+New:wght@300;400;700;900&family=Sora:wght@300;400&family=Raleway:ital,wght@0,300;0,400;1,300;1,400&display=swap" rel="stylesheet">
<style>
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --bg:      #FCFBEF;
  --bg2:     #F5F3E2;
  --ink:     #1C1C17;
  --ink2:    #4A4A3E;
  --ink3:    #8A8A78;
  --ink4:    #C4C4AC;
  --red:     #E63022;
  --red2:    rgba(230,48,34,0.07);
  --line:    rgba(28,28,23,0.1);
  --line2:   rgba(28,28,23,0.16);
  --dot-b:   #4A9FD4;
  --dot-g:   #8DC63F;
  --font-d:  'Unbounded', sans-serif;
  --font-b:  'Manrope', 'Zen Kaku Gothic New', sans-serif;
  --font-c:  'Sora', 'Zen Kaku Gothic New', sans-serif;
  --font-i:  'Raleway', sans-serif;
}

html, body {
  background: var(--bg);
  color: var(--ink);
  font-family: var(--font-b);
  min-height: 100vh;
  overflow-x: hidden;
}

/* ── TICKER ── */
.ticker {
  background: var(--ink);
  height: 28px;
  overflow: hidden;
  display: flex;
  align-items: center;
}
.ticker-track {
  display: flex;
  white-space: nowrap;
  animation: roll 30s linear infinite;
}
.ticker-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 0 28px;
  font-family: var(--font-d);
  font-size: 8.5px;
  font-weight: 700;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--bg);
}
.ticker-item.hot { color: var(--red); }
.t-sep { color: var(--ink3); }
@keyframes roll { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }

/* ── NAV ── */
nav {
  padding: 16px 44px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--line);
}
.logo {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  color: var(--ink);
  font-family: var(--font-d);
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.08em;
}
.logo-sq {
  width: 24px; height: 24px;
  background: var(--ink);
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2px;
  padding: 4px;
}
.logo-sq span { background: var(--bg); display: block; }
.nav-ctx {
  font-family: var(--font-c);
  font-size: 11px;
  color: var(--ink3);
  letter-spacing: 0.05em;
}
.nav-links { display: flex; gap: 24px; }
.nav-link {
  font-family: var(--font-d);
  font-size: 9px;
  font-weight: 400;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--ink3);
  text-decoration: none;
  transition: color 0.2s;
}
.nav-link:hover, .nav-link.on { color: var(--ink); }

/* ── SCREEN SYSTEM ── */
.scr { display: none; }
.scr.on { display: block; }
#s-dash { display: block; }

/* ══════════════════════
   DASHBOARD
══════════════════════ */
.hero {
  padding: 72px 44px 60px;
  border-bottom: 1px solid var(--line);
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 48px;
  align-items: end;
  position: relative;
}
/* organic dots */
.hero::before {
  content: '';
  position: absolute;
  right: 180px; top: 40px;
  width: 14px; height: 14px;
  border-radius: 50%;
  background: var(--dot-b);
  opacity: 0.7;
}
.hero::after {
  content: '';
  position: absolute;
  right: 120px; bottom: 80px;
  width: 9px; height: 9px;
  border-radius: 50%;
  background: var(--dot-g);
  opacity: 0.8;
}

.hero-title {
  font-family: var(--font-d);
  font-size: clamp(56px, 7.5vw, 112px);
  font-weight: 900;
  line-height: 0.86;
  letter-spacing: -0.03em;
  text-transform: uppercase;
  color: var(--ink);
}
.hero-title .r { color: var(--red); }
.hero-title .g { color: var(--ink4); font-weight: 400; }

.hero-right {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding-bottom: 6px;
}
.hero-eyebrow {
  font-family: var(--font-i);
  font-size: 11px;
  font-style: italic;
  color: var(--ink3);
  letter-spacing: 0.06em;
}
.hero-desc {
  font-family: var(--font-c);
  font-size: 13.5px;
  line-height: 1.8;
  color: var(--ink2);
}
.hero-nums {
  display: flex;
  gap: 0;
  border: 1px solid var(--line2);
}
.h-num {
  flex: 1;
  padding: 14px 18px;
  border-right: 1px solid var(--line2);
}
.h-num:last-child { border-right: none; }
.h-n {
  font-family: var(--font-d);
  font-size: 28px;
  font-weight: 900;
  color: var(--ink);
  line-height: 1;
  margin-bottom: 3px;
}
.h-l {
  font-family: var(--font-c);
  font-size: 9px;
  color: var(--ink3);
  letter-spacing: 0.08em;
}
.btn-new {
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  background: var(--ink);
  color: var(--bg);
  font-family: var(--font-d);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  padding: 13px 22px;
  border: none;
  cursor: pointer;
  transition: background 0.18s;
}
.btn-new:hover { background: var(--red); }
.btn-plus {
  width: 15px; height: 15px;
  border: 1.5px solid rgba(252,251,239,0.45);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  line-height: 1;
}

/* list header */
.list-hd {
  padding: 22px 44px 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.list-hd-label {
  font-family: var(--font-i);
  font-size: 12px;
  font-style: italic;
  color: var(--ink3);
  letter-spacing: 0.04em;
  display: flex;
  align-items: center;
  gap: 8px;
}
.list-hd-label::before {
  content: '';
  width: 7px; height: 7px;
  border-radius: 50%;
  background: var(--ink);
}
.list-hd-ct {
  font-family: var(--font-c);
  font-size: 11px;
  color: var(--ink4);
}

/* project cards */
.cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
}
.card {
  border-top: 1px solid var(--line);
  border-right: 1px solid var(--line);
  padding: 30px 36px 26px;
  position: relative;
  overflow: hidden;
  cursor: pointer;
  text-decoration: none;
  color: inherit;
  display: block;
  transition: background 0.14s;
}
.card:last-child { border-right: none; }
.card:hover { background: var(--bg2); }

/* top accent line */
.card-line {
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 3px;
}
.card-line.red { background: var(--red); }
.card-line.yellow { background: #E8C44A; }

.card-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 22px;
}
.card-no {
  font-family: var(--font-d);
  font-size: 9px;
  font-weight: 400;
  color: var(--ink4);
  letter-spacing: 0.1em;
}
.pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-family: var(--font-d);
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  padding: 4px 11px;
  border-radius: 99px;
}
.pill.run { background: var(--red); color: #fff; }
.pill.wait { background: #E8C44A; color: #4A3800; }
.pill.done { background: var(--line); color: var(--ink3); }
.pill-dot {
  width: 5px; height: 5px;
  border-radius: 50%;
  background: currentColor;
  opacity: 0.7;
}
.pill.run .pill-dot { animation: blink 1s ease-in-out infinite; }
@keyframes blink { 0%,100%{opacity:0.8} 50%{opacity:0.2} }

.card-client {
  font-family: var(--font-d);
  font-size: 19px;
  font-weight: 900;
  line-height: 1.1;
  letter-spacing: -0.02em;
  text-transform: uppercase;
  margin-bottom: 6px;
}
.card-type {
  font-family: var(--font-c);
  font-size: 11px;
  color: var(--ink3);
  line-height: 1.5;
  margin-bottom: 22px;
}

/* progress pips */
.pips {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 5px;
}
.pip {
  flex: 1;
  height: 2.5px;
  border-radius: 99px;
  background: var(--line2);
  transition: background 0.2s;
}
.pip.done { background: var(--ink); }
.pip.run  { background: var(--red); }
.pip-note {
  font-family: var(--font-c);
  font-size: 9.5px;
  color: var(--ink3);
  text-align: right;
  min-width: 68px;
}

.card-foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 18px;
}
.card-date {
  font-family: var(--font-c);
  font-size: 10px;
  color: var(--ink4);
}
.card-arr {
  font-size: 15px;
  color: var(--ink3);
  transition: transform 0.2s, color 0.2s;
}
.card:hover .card-arr { transform: translate(3px,-2px); color: var(--ink); }

/* ══════════════════════
   PIPELINE
══════════════════════ */
.pl-hd {
  padding: 16px 44px;
  border-bottom: 1px solid var(--line);
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.pl-bc {
  display: flex;
  align-items: center;
  gap: 9px;
  font-family: var(--font-d);
  font-size: 9px;
  letter-spacing: 0.15em;
  text-transform: uppercase;
}
.bc-back { color: var(--ink3); cursor: pointer; text-decoration: none; transition: color 0.15s; }
.bc-back:hover { color: var(--ink); }
.bc-sep { color: var(--ink4); }
.bc-now { color: var(--ink); }
.live-badge {
  display: flex;
  align-items: center;
  gap: 7px;
  font-family: var(--font-d);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.15em;
  color: var(--red);
}
.live-dot {
  width: 7px; height: 7px;
  border-radius: 50%;
  background: var(--red);
  animation: blink 1s ease-in-out infinite;
}

.pl-body {
  display: grid;
  grid-template-columns: 290px 1fr;
  min-height: calc(100vh - 88px);
}

/* RAIL */
.rail { border-right: 1px solid var(--line); }
.rail-hd {
  padding: 18px 22px 14px;
  border-bottom: 1px solid var(--line);
  font-family: var(--font-i);
  font-size: 11px;
  font-style: italic;
  color: var(--ink3);
}
.r-item {
  display: flex;
  align-items: center;
  gap: 13px;
  padding: 17px 22px;
  border-bottom: 1px solid var(--line);
  cursor: pointer;
  transition: background 0.12s;
  position: relative;
}
.r-item:hover { background: var(--bg2); }
.r-item.on { background: var(--bg2); }
.r-item.on::before {
  content: '';
  position: absolute;
  left: 0; top: 0; bottom: 0;
  width: 2px;
  background: var(--red);
}
.r-item.grey { opacity: 0.35; cursor: default; }

.r-ico {
  width: 32px; height: 32px;
  border: 1px solid var(--line2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-d);
  font-size: 9px;
  font-weight: 700;
  color: var(--ink3);
  flex-shrink: 0;
  border-radius: 2px;
}
.r-item.on   .r-ico { background: var(--red); border-color: var(--red); color: #fff; }
.r-item.done .r-ico { background: var(--ink); border-color: var(--ink); color: var(--bg); font-size: 12px; }

.r-info { flex: 1; min-width: 0; }
.r-id {
  font-family: var(--font-c);
  font-size: 9px;
  color: var(--ink3);
  letter-spacing: 0.07em;
  margin-bottom: 3px;
}
.r-name {
  font-size: 12px;
  font-weight: 600;
  color: var(--ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.r-st {
  font-family: var(--font-c);
  font-size: 10px;
  color: var(--ink3);
  margin-top: 2px;
}
.r-item.on .r-st { color: var(--red); }

/* OUTPUT */
.out { display: flex; flex-direction: column; }
.out-top {
  padding: 26px 40px 20px;
  border-bottom: 1px solid var(--line);
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}
.out-title {
  font-family: var(--font-d);
  font-size: 32px;
  font-weight: 900;
  letter-spacing: -0.025em;
  text-transform: uppercase;
  line-height: 1;
  color: var(--ink);
}
.out-sub {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-top: 8px;
  font-family: var(--font-c);
  font-size: 11.5px;
  color: var(--ink3);
}
.sub-chip {
  background: var(--bg2);
  border: 1px solid var(--line2);
  border-radius: 99px;
  padding: 2px 10px;
  font-size: 10px;
  color: var(--ink2);
}
.out-acts { display: flex; gap: 7px; padding-top: 4px; flex-shrink: 0; }
.btn-s {
  background: transparent;
  border: 1px solid var(--line2);
  color: var(--ink2);
  font-family: var(--font-d);
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  padding: 8px 14px;
  cursor: pointer;
  border-radius: 2px;
  transition: all 0.14s;
}
.btn-s:hover { border-color: var(--ink); color: var(--ink); }

/* THINKING */
.thinking {
  padding: 26px 40px;
  border-bottom: 1px solid var(--line);
  background: var(--bg2);
}
.th-hd {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 13px;
}
.th-label {
  font-family: var(--font-i);
  font-size: 11px;
  font-style: italic;
  color: var(--red);
  letter-spacing: 0.05em;
}
.th-dots { display: flex; gap: 4px; }
.th-dots span {
  width: 5px; height: 5px;
  border-radius: 50%;
  background: var(--red);
  opacity: 0.4;
  animation: td 1.4s ease-in-out infinite;
}
.th-dots span:nth-child(2) { animation-delay: 0.2s; }
.th-dots span:nth-child(3) { animation-delay: 0.4s; }
@keyframes td { 0%,80%,100%{opacity:0.3;transform:scale(1)} 40%{opacity:1;transform:scale(1.3)} }
.th-text {
  font-family: var(--font-c);
  font-size: 13px;
  line-height: 1.85;
  color: var(--ink2);
  font-style: italic;
  max-width: 580px;
}
.cursor {
  display: inline-block;
  width: 2px; height: 13px;
  background: var(--red);
  vertical-align: middle;
  margin-left: 1px;
  animation: cur 1s step-end infinite;
}
@keyframes cur { 0%,100%{opacity:1} 50%{opacity:0} }

/* output sections */
.out-secs { flex: 1; overflow-y: auto; }
.sec {
  padding: 22px 40px;
  border-bottom: 1px solid var(--line);
}
.sec-hd {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 13px;
  cursor: pointer;
}
.sec-ttl {
  display: flex;
  align-items: center;
  gap: 9px;
  font-family: var(--font-d);
  font-size: 9.5px;
  font-weight: 700;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: var(--ink);
}
.sec-badge {
  width: 17px; height: 17px;
  background: var(--ink);
  color: var(--bg);
  font-size: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 2px;
}
.conf-tag {
  font-family: var(--font-d);
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  padding: 3px 9px;
  border-radius: 99px;
  background: var(--bg2);
  border: 1px solid var(--line2);
  color: var(--ink3);
}
.sec-body {
  font-family: var(--font-c);
  font-size: 13px;
  line-height: 1.82;
  color: var(--ink2);
}
.sec-body strong { color: var(--ink); font-weight: 600; }

/* FOOTER */
.pl-ft {
  padding: 14px 40px;
  border-top: 1px solid var(--line);
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.phase-track { display: flex; gap: 0; }
.ph {
  padding: 7px 14px;
  font-family: var(--font-d);
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--ink3);
  border: 1px solid var(--line);
  margin-right: -1px;
  display: flex;
  align-items: center;
  gap: 6px;
}
.ph.done { color: var(--ink); border-color: var(--ink4); z-index: 1; }
.ph.cur { background: var(--ink); color: var(--bg); border-color: var(--ink); z-index: 2; }
.ph-n { font-size: 10px; }
.btn-next {
  background: var(--ink);
  color: var(--bg);
  font-family: var(--font-d);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  padding: 11px 22px;
  border: none;
  cursor: pointer;
  border-radius: 2px;
  transition: background 0.18s;
  display: flex;
  align-items: center;
  gap: 8px;
}
.btn-next:hover { background: var(--red); }
.btn-next:disabled {
  background: var(--bg2);
  border: 1px solid var(--line2);
  color: var(--ink4);
  cursor: not-allowed;
}

/* ══════════════════════
   CHECKPOINT OVERLAY
══════════════════════ */
.ov {
  position: fixed;
  inset: 0;
  background: rgba(252,251,239,0.86);
  backdrop-filter: blur(5px);
  z-index: 300;
  display: none;
  align-items: center;
  justify-content: center;
}
.ov.on { display: flex; }
.cp {
  width: 660px;
  max-height: 90vh;
  background: var(--bg);
  border: 1px solid var(--line2);
  box-shadow: 0 28px 72px rgba(28,28,23,0.11);
  overflow-y: auto;
  position: relative;
}
/* small decorative dots on modal */
.cp::before {
  content: '';
  position: absolute;
  top: -8px; right: 40px;
  width: 14px; height: 14px;
  border-radius: 50%;
  background: var(--dot-b);
  opacity: 0.6;
}
.cp::after {
  content: '';
  position: absolute;
  bottom: -6px; left: 56px;
  width: 9px; height: 9px;
  border-radius: 50%;
  background: var(--dot-g);
  opacity: 0.7;
}
.cp-hd {
  padding: 26px 30px 22px;
  border-bottom: 1px solid var(--line);
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}
.cp-eyebrow {
  font-family: var(--font-i);
  font-size: 11px;
  font-style: italic;
  color: var(--red);
  letter-spacing: 0.04em;
  margin-bottom: 7px;
  display: flex;
  align-items: center;
  gap: 6px;
}
.cp-title {
  font-family: var(--font-d);
  font-size: 24px;
  font-weight: 900;
  letter-spacing: -0.02em;
  text-transform: uppercase;
  color: var(--ink);
  line-height: 1;
}
.cp-x {
  background: none;
  border: none;
  font-size: 17px;
  color: var(--ink3);
  cursor: pointer;
  transition: color 0.14s;
}
.cp-x:hover { color: var(--ink); }

.cp-body { padding: 22px 30px; }
.cp-desc {
  font-family: var(--font-c);
  font-size: 13px;
  color: var(--ink3);
  line-height: 1.75;
  margin-bottom: 26px;
}
.fl {
  font-family: var(--font-d);
  font-size: 8.5px;
  font-weight: 700;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--ink3);
  margin-bottom: 11px;
  display: flex;
  align-items: center;
  gap: 7px;
}
.fl-req { font-weight: 400; color: var(--red); }
.ag-list { display: flex; flex-direction: column; gap: 6px; margin-bottom: 22px; }
.ag-row {
  display: flex;
  align-items: center;
  gap: 13px;
  padding: 13px 16px;
  border: 1px solid var(--line);
  cursor: pointer;
  transition: all 0.12s;
  user-select: none;
  border-radius: 2px;
}
.ag-row:hover { background: var(--bg2); border-color: var(--ink4); }
.ag-row.on { border-color: var(--red); background: var(--red2); }
.ag-radio {
  width: 15px; height: 15px;
  border: 1.5px solid var(--line2);
  border-radius: 50%;
  flex-shrink: 0;
  position: relative;
  transition: all 0.12s;
}
.ag-row.on .ag-radio { border-color: var(--red); background: var(--red); }
.ag-row.on .ag-radio::after {
  content: '';
  position: absolute;
  top: 2.5px; left: 2.5px;
  width: 8px; height: 8px;
  background: #fff;
  border-radius: 50%;
}
.ag-chk {
  width: 15px; height: 15px;
  border: 1.5px solid var(--line2);
  flex-shrink: 0;
  position: relative;
  transition: all 0.12s;
  border-radius: 2px;
}
.ag-row.on .ag-chk { border-color: var(--red); background: var(--red); }
.ag-row.on .ag-chk::after {
  content: '✓';
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 10px;
}
.ag-inf { flex: 1; }
.ag-id { font-family: var(--font-c); font-size: 9.5px; color: var(--ink3); margin-bottom: 3px; }
.ag-name { font-size: 13px; font-weight: 600; color: var(--ink); }
.ag-why { font-family: var(--font-c); font-size: 10.5px; color: var(--ink3); margin-top: 2px; }
.rec-pill {
  font-family: var(--font-d);
  font-size: 7.5px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--red);
  border: 1px solid var(--red);
  padding: 2px 8px;
  border-radius: 99px;
  white-space: nowrap;
  flex-shrink: 0;
}
.sub-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 22px; }

.cp-ft {
  padding: 16px 30px 22px;
  border-top: 1px solid var(--line);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
.cp-hint { font-family: var(--font-c); font-size: 11px; color: var(--ink3); line-height: 1.6; }
.btn-exec {
  background: var(--ink);
  color: var(--bg);
  font-family: var(--font-d);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  padding: 13px 26px;
  border: none;
  cursor: pointer;
  border-radius: 2px;
  transition: background 0.18s;
  white-space: nowrap;
}
.btn-exec:hover { background: var(--red); }
</style>
</head>
<body>

<!-- TICKER -->
<div class="ticker">
  <div class="ticker-track">
    <span class="ticker-item">WEB PROPOSAL AGENT <span class="t-sep">—</span></span>
    <span class="ticker-item hot">AG-02 実行中：市場・業界分析 <span class="t-sep">—</span></span>
    <span class="ticker-item">中部電力G キャリアサイト <span class="t-sep">—</span></span>
    <span class="ticker-item hot">✋ チェックポイント① 待機中 <span class="t-sep">—</span></span>
    <span class="ticker-item">PHASE 2 / 7 <span class="t-sep">—</span></span>
    <span class="ticker-item">WEB PROPOSAL AGENT <span class="t-sep">—</span></span>
    <span class="ticker-item hot">AG-02 実行中：市場・業界分析 <span class="t-sep">—</span></span>
    <span class="ticker-item">中部電力G キャリアサイト <span class="t-sep">—</span></span>
    <span class="ticker-item hot">✋ チェックポイント① 待機中 <span class="t-sep">—</span></span>
    <span class="ticker-item">PHASE 2 / 7 <span class="t-sep">—</span></span>
  </div>
</div>

<!-- NAV -->
<nav>
  <a href="#" class="logo" onclick="goDash();return false;">
    <div class="logo-sq"><span></span><span></span><span></span><span></span></div>
    Web Proposal Agent
  </a>
  <span class="nav-ctx" id="nav-ctx">全案件</span>
  <div class="nav-links">
    <a href="#" class="nav-link on">Cases</a>
    <a href="#" class="nav-link">Settings</a>
  </div>
</nav>

<!-- ═══ DASHBOARD ═══ -->
<div id="s-dash" class="scr on">

  <div class="hero">
    <div class="hero-title">
      WEB<br>PRO<span class="r">POS</span><span class="g">AL</span><br>AGENT
    </div>
    <div class="hero-right">
      <div class="hero-eyebrow">多業種対応マルチエージェントシステム</div>
      <p class="hero-desc">案件情報を入力するだけで、市場分析・競合調査・課題構造化・設計草案・提案書草案を自動生成。CDが提案書づくりに集中できる環境をつくります。</p>
      <div class="hero-nums">
        <div class="h-num"><div class="h-n">9</div><div class="h-l">業種AG</div></div>
        <div class="h-num"><div class="h-n">16</div><div class="h-l">業種SUB</div></div>
        <div class="h-num"><div class="h-n">7</div><div class="h-l">フェーズ</div></div>
      </div>
      <button class="btn-new" onclick="goPL()">
        <span class="btn-plus">+</span>新規案件を作成
      </button>
    </div>
  </div>

  <div class="list-hd">
    <span class="list-hd-label">進行中・完了案件</span>
    <span class="list-hd-ct">3件</span>
  </div>

  <div class="cards">

    <a class="card" href="#" onclick="goPL();return false;">
      <div class="card-line red"></div>
      <div class="card-top">
        <span class="card-no">001</span>
        <span class="pill run"><span class="pill-dot"></span>実行中</span>
      </div>
      <div class="card-client">中部電力<br>グループ</div>
      <div class="card-type">キャリア採用サイト統合リニューアル</div>
      <div class="pips">
        <div class="pip done"></div>
        <div class="pip run"></div>
        <div class="pip"></div>
        <div class="pip"></div>
        <div class="pip"></div>
        <div class="pip"></div>
        <div class="pip"></div>
        <span class="pip-note">AG-02 実行中</span>
      </div>
      <div class="card-foot">
        <span class="card-date">2026.03.31</span>
        <span class="card-arr">↗</span>
      </div>
    </a>

    <a class="card" href="#" onclick="goCP();return false;">
      <div class="card-line yellow"></div>
      <div class="card-top">
        <span class="card-no">002</span>
        <span class="pill wait"><span class="pill-dot"></span>確認待ち</span>
      </div>
      <div class="card-client">○○不動産<br>タワー</div>
      <div class="card-type">新築分譲マンション プロモーションサイト</div>
      <div class="pips">
        <div class="pip done"></div>
        <div class="pip"></div>
        <div class="pip"></div>
        <div class="pip"></div>
        <div class="pip"></div>
        <div class="pip"></div>
        <div class="pip"></div>
        <span class="pip-note">✋ AG選択待ち</span>
      </div>
      <div class="card-foot">
        <span class="card-date">2026.03.30</span>
        <span class="card-arr">↗</span>
      </div>
    </a>

    <a class="card" href="#">
      <div class="card-top">
        <span class="card-no">003</span>
        <span class="pill done">完了</span>
      </div>
      <div class="card-client">△△コスメ<br>ブランド</div>
      <div class="card-type">ブランドサイト リニューアル提案</div>
      <div class="pips">
        <div class="pip done"></div><div class="pip done"></div>
        <div class="pip done"></div><div class="pip done"></div>
        <div class="pip done"></div><div class="pip done"></div>
        <div class="pip done"></div>
        <span class="pip-note">全完了</span>
      </div>
      <div class="card-foot">
        <span class="card-date">2026.03.28</span>
        <span class="card-arr">↗</span>
      </div>
    </a>

  </div>
</div>

<!-- ═══ PIPELINE ═══ -->
<div id="s-pl" class="scr">
  <div class="pl-hd">
    <div class="pl-bc">
      <a href="#" class="bc-back" onclick="goDash();return false;">← 全案件</a>
      <span class="bc-sep">/</span>
      <span class="bc-now">中部電力G — キャリアサイト統合リニューアル</span>
    </div>
    <div class="live-badge"><span class="live-dot"></span>実行中</div>
  </div>

  <div class="pl-body">
    <div class="rail">
      <div class="rail-hd">エージェント進行状況</div>

      <div class="r-item done">
        <div class="r-ico">✓</div>
        <div class="r-info">
          <div class="r-id">AG-01</div>
          <div class="r-name">インテーク担当</div>
          <div class="r-st">完了</div>
        </div>
      </div>
      <div class="r-item on">
        <div class="r-ico">02</div>
        <div class="r-info">
          <div class="r-id">AG-02</div>
          <div class="r-name">市場・業界分析</div>
          <div class="r-st">分析実行中...</div>
        </div>
      </div>
      <div class="r-item grey">
        <div class="r-ico">03</div>
        <div class="r-info"><div class="r-id">AG-03</div><div class="r-name">競合・ポジション分析</div><div class="r-st">待機中</div></div>
      </div>
      <div class="r-item grey">
        <div class="r-ico">04</div>
        <div class="r-info"><div class="r-id">AG-04</div><div class="r-name">課題構造化</div><div class="r-st">待機中</div></div>
      </div>
      <div class="r-item grey">
        <div class="r-ico">05</div>
        <div class="r-info"><div class="r-id">AG-05</div><div class="r-name">ファクトチェック</div><div class="r-st">待機中</div></div>
      </div>
      <div class="r-item grey">
        <div class="r-ico">06</div>
        <div class="r-info"><div class="r-id">AG-06</div><div class="r-name">設計草案</div><div class="r-st">待機中</div></div>
      </div>
      <div class="r-item grey">
        <div class="r-ico">07</div>
        <div class="r-info"><div class="r-id">AG-07</div><div class="r-name">提案書草案</div><div class="r-st">待機中</div></div>
      </div>
    </div>

    <div class="out">
      <div class="out-top">
        <div>
          <div class="out-title">AG-02 市場分析</div>
          <div class="out-sub">
            採用・リクルートサイト専門
            <span class="sub-chip">SUB-LIFE</span>
          </div>
        </div>
        <div class="out-acts">
          <button class="btn-s">再生成</button>
          <button class="btn-s">編集</button>
        </div>
      </div>

      <div class="thinking">
        <div class="th-hd">
          <span class="th-label">分析中</span>
          <div class="th-dots"><span></span><span></span><span></span></div>
        </div>
        <div class="th-text">電力業界の採用市場を分析中。大手電力各社のキャリアサイトの設計水準、DX・脱炭素人材の需要変化、再エネ系スタートアップとの採用競争構造を整理しています。中部電力グループの3社体制（HD / PG / ミライズ）における統合設計の論点<span class="cursor"></span></div>
      </div>

      <div class="out-secs">
        <div class="sec">
          <div class="sec-hd">
            <div class="sec-ttl"><span class="sec-badge">01</span>AG-01 インテーク — 完了</div>
            <span class="conf-tag">Confidence: medium</span>
          </div>
          <div class="sec-body">
            <strong>案件概要：</strong> 中部電力グループ（HD・パワーグリッド・ミライズ）のキャリア採用サイトを統合リニューアル。グループ3社の採用を一元化し、DX・脱炭素人材を中心としたキャリア採用に特化したプラットフォームを構築する提案。<br><br>
            <strong>インプットパターン：</strong> B（オリエン資料あり）　<strong>推奨AG：</strong> ag-02-recruit + SUB-LIFE
          </div>
        </div>
      </div>

      <div class="pl-ft">
        <div class="phase-track">
          <div class="ph done"><span class="ph-n">1</span>インテーク</div>
          <div class="ph cur"><span class="ph-n">2</span>市場分析</div>
          <div class="ph"><span class="ph-n">3</span>競合分析</div>
          <div class="ph"><span class="ph-n">4</span>統合・FC</div>
          <div class="ph"><span class="ph-n">5</span>設計・草案</div>
        </div>
        <button class="btn-next" disabled>次のフェーズへ →</button>
      </div>
    </div>
  </div>
</div>

<!-- ═══ CHECKPOINT OVERLAY ═══ -->
<div class="ov" id="ov-cp">
  <div class="cp">
    <div class="cp-hd">
      <div>
        <div class="cp-eyebrow">✋ チェックポイント①</div>
        <div class="cp-title">AG選択・確認</div>
      </div>
      <button class="cp-x" onclick="closeCP()">✕</button>
    </div>
    <div class="cp-body">
      <p class="cp-desc">AG-01のインテーク結果をもとに、使用するエージェントを確認・選択してください。推奨は自動設定されています。</p>

      <div class="fl">大分類AG <span class="fl-req">必須 · 1つ</span></div>
      <div class="ag-list" id="prim">
        <label class="ag-row on">
          <input type="radio" name="p" style="display:none">
          <div class="ag-radio"></div>
          <div class="ag-inf">
            <div class="ag-id">AG-02-RECRUIT</div>
            <div class="ag-name">採用・リクルートサイト専門</div>
            <div class="ag-why">電力会社キャリアサイト案件のため</div>
          </div>
          <span class="rec-pill">推奨</span>
        </label>
        <label class="ag-row">
          <input type="radio" name="p" style="display:none">
          <div class="ag-radio"></div>
          <div class="ag-inf">
            <div class="ag-id">AG-02-CORP</div>
            <div class="ag-name">コーポレートサイト専門</div>
            <div class="ag-why">採用＋コーポレート統合の場合に選択</div>
          </div>
        </label>
      </div>

      <div class="fl">業種コンテキスト SUB <span style="color:var(--ink3);font-weight:400">任意 · 複数可</span></div>
      <div class="sub-grid">
        <label class="ag-row on" style="padding:11px 14px">
          <div class="ag-chk"></div>
          <div class="ag-inf"><div class="ag-id">SUB-LIFE</div><div class="ag-name">くらし・エネルギー</div></div>
          <span class="rec-pill">推奨</span>
        </label>
        <label class="ag-row" style="padding:11px 14px">
          <div class="ag-chk"></div>
          <div class="ag-inf"><div class="ag-id">SUB-TECH</div><div class="ag-name">テック・通信</div></div>
        </label>
        <label class="ag-row" style="padding:11px 14px">
          <div class="ag-chk"></div>
          <div class="ag-inf"><div class="ag-id">SUB-GOV</div><div class="ag-name">官公庁・特殊会社</div></div>
        </label>
        <label class="ag-row" style="padding:11px 14px">
          <div class="ag-chk"></div>
          <div class="ag-inf"><div class="ag-id">SUB-CONSTRUCTION</div><div class="ag-name">建設・設備工事</div></div>
        </label>
      </div>
    </div>
    <div class="cp-ft">
      <div class="cp-hint">この選択はAG-02〜07の全分析に影響します。<br>変更後は実行を押してください。</div>
      <button class="btn-exec" onclick="closeCP()">この選択で実行する →</button>
    </div>
  </div>
</div>

<script>
function goDash() {
  document.getElementById('s-dash').classList.add('on');
  document.getElementById('s-pl').classList.remove('on');
  document.getElementById('nav-ctx').textContent = '全案件';
}
function goPL() {
  document.getElementById('s-dash').classList.remove('on');
  document.getElementById('s-pl').classList.add('on');
  document.getElementById('nav-ctx').textContent = '中部電力G — キャリアサイト統合';
}
function goCP() {
  goPL();
  setTimeout(() => document.getElementById('ov-cp').classList.add('on'), 100);
}
function closeCP() {
  document.getElementById('ov-cp').classList.remove('on');
}

document.querySelectorAll('.ag-row').forEach(row => {
  row.addEventListener('click', () => {
    const isChk = !!row.querySelector('.ag-chk');
    if (isChk) {
      row.classList.toggle('on');
    } else {
      row.closest('.ag-list').querySelectorAll('.ag-row').forEach(r => r.classList.remove('on'));
      row.classList.add('on');
    }
  });
});
</script>
</body>
</html>
```

---

## 11. 完了画面フィードバック設計

### 概要

AG-07完了後・ダウンロード前にアンケート画面を表示する。
フィードバックはDBに保存され、プロンプト自動ブラッシュアップの入力として使われる。

```
AG-07完了
  ↓
目次・スライドプレビュー画面
  ↓
「ダウンロード」クリック
  ↓
[フィードバック画面（2分以内）]← ここを新設
  ↓
Markdownダウンロード
```

### DBスキーマ追加

```prisma
model ProposalFeedback {
  id              String   @id @default(cuid())
  versionId       String
  version         ProposalVersion @relation(fields: [versionId], references: [id])
  overallScore    Int               // Q1: 1〜5
  weakestAgent    String            // Q2: "AG-02"|"AG-03"|"AG-04"|"AG-06"|"AG-07"|"none"
  competitorScore Int               // Q3: 1〜3
  targetScore     Int               // Q4: 1〜3
  storyUsability  String            // Q5: "that_usable"|"needs_edit"|"rebuild"
  bestChapter     String            // Q6: chapterId
  freeComment     String?           // Q7: 100字以内・任意
  submittedAt     DateTime @default(now())

  // 自動処理フラグ（フィードバック後に自動付与）
  autoFlagAgents  String   @default("[]") // 改善候補AGのJSON配列
  processed       Boolean  @default(false)
}
```

### API Routes

```typescript
// src/app/api/feedback/route.ts

// POST: フィードバック保存 + 自動フラグ処理
export async function POST(req: NextRequest) {
  const body = await req.json()

  // 自動フラグ処理：評価が低いAGを改善候補に
  const autoFlagAgents: string[] = []
  if (body.weakestAgent !== 'none') autoFlagAgents.push(body.weakestAgent)
  if (body.competitorScore <= 2) autoFlagAgents.push('ag-03-competitor')
  if (body.targetScore <= 2) autoFlagAgents.push('ag-04-insight')
  if (body.storyUsability === 'rebuild') autoFlagAgents.push('ag-07-story')

  const feedback = await prisma.proposalFeedback.create({
    data: {
      ...body,
      autoFlagAgents: JSON.stringify([...new Set(autoFlagAgents)]),
    },
  })

  // freeCommentがある場合はプロンプト改善の入力候補として保存
  if (body.freeComment && autoFlagAgents.length > 0) {
    // 最も弱かったAGのPromptVersionに改善候補コメントとして記録
    // （実際の適用はCDが判断・prompt-improve skillで処理）
    await prisma.promptVersion.create({
      data: {
        agentId: autoFlagAgents[0],
        version: -1, // pending改善案のフラグ
        content: '',
        changeNote: `フィードバック由来の改善候補: ${body.freeComment}`,
        cdFeedback: body.freeComment,
      },
    })
  }

  return NextResponse.json({ id: feedback.id })
}

// GET: 集計データの取得（Settings画面で表示）
export async function GET() {
  const feedbacks = await prisma.proposalFeedback.findMany({
    orderBy: { submittedAt: 'desc' },
    take: 50,
  })

  const summary = {
    avgOverallScore: average(feedbacks.map(f => f.overallScore)),
    avgCompetitorScore: average(feedbacks.map(f => f.competitorScore)),
    avgTargetScore: average(feedbacks.map(f => f.targetScore)),
    weakestAgentDistribution: countBy(feedbacks, 'weakestAgent'),
    storyUsabilityDistribution: countBy(feedbacks, 'storyUsability'),
    totalFeedbacks: feedbacks.length,
    recentFreeComments: feedbacks
      .filter(f => f.freeComment)
      .slice(0, 10)
      .map(f => ({ comment: f.freeComment, agentFlags: JSON.parse(f.autoFlagAgents) })),
  }

  return NextResponse.json(summary)
}
```

### フィードバック画面コンポーネント（実装仕様）

```typescript
// src/components/feedback/FeedbackModal.tsx

// トリガー: ダウンロードボタンをクリックした時
// スキップ可能（「スキップしてダウンロード」ボタンあり）
// プログレスバー：7問中何問目かを表示

interface FeedbackModalProps {
  versionId: string
  chapters: { id: string; title: string }[]  // AG-07のstoryLine
  onComplete: () => void   // フィードバック送信後にダウンロード開始
  onSkip: () => void       // スキップしてダウンロード
}
```

### 承認済みフィードバック画面HTML

以下のHTMLが承認済みのフィードバック画面デザインです。
デザイントーン（FCFBEF背景・Unbounded・赤アクセント）を統一しています。

```html
<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>フィードバック</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Unbounded:wght@400;700;900&family=Manrope:wght@400;500;600&family=Zen+Kaku+Gothic+New:wght@300;400;700&family=Sora:wght@300;400&family=Raleway:ital,wght@1,300;1,400&display=swap" rel="stylesheet">
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#FCFBEF;--bg2:#F5F3E2;--ink:#1C1C17;--ink2:#4A4A3E;--ink3:#8A8A78;--ink4:#C4C4AC;
  --red:#E63022;--line:rgba(28,28,23,0.10);--line2:rgba(28,28,23,0.16);
  --fd:′Unbounded′,sans-serif;--fb:′Manrope′,′Zen Kaku Gothic New′,sans-serif;
  --fc:′Sora′,′Zen Kaku Gothic New′,sans-serif;--fi:′Raleway′,sans-serif;
}
html,body{background:var(--bg);color:var(--ink);font-family:'Manrope','Zen Kaku Gothic New',sans-serif;min-height:100vh}

/* ── OVERLAY ── */
.ov{position:fixed;inset:0;background:rgba(252,251,239,0.92);backdrop-filter:blur(6px);z-index:300;display:flex;align-items:center;justify-content:center;padding:20px}
.modal{width:100%;max-width:620px;background:var(--bg);border:1px solid var(--line2);box-shadow:0 24px 64px rgba(28,28,23,0.10);position:relative;overflow:hidden}

/* ── PROGRESS ── */
.prog-track{height:3px;background:var(--line);position:relative}
.prog-fill{height:100%;background:var(--red);transition:width 0.4s ease;width:14%}

/* ── HEADER ── */
.mhd{padding:24px 28px 18px;border-bottom:1px solid var(--line)}
.eyebrow{font-family:'Raleway',sans-serif;font-size:11px;font-style:italic;color:var(--red);letter-spacing:0.04em;margin-bottom:6px;display:flex;align-items:center;gap:7px}
.htitle{font-family:'Unbounded',sans-serif;font-size:20px;font-weight:900;letter-spacing:-0.02em;text-transform:uppercase;color:var(--ink);line-height:1}
.hdesc{font-family:'Sora','Zen Kaku Gothic New',sans-serif;font-size:12px;color:var(--ink3);margin-top:7px;line-height:1.6}
.prog-label{font-family:'Unbounded',sans-serif;font-size:9px;font-weight:400;letter-spacing:0.15em;text-transform:uppercase;color:var(--ink4);margin-top:10px}

/* ── BODY ── */
.mbody{padding:28px 28px 20px}
.step{display:none}
.step.on{display:block}

/* QUESTION LABEL */
.qlabel{font-family:'Raleway',sans-serif;font-size:11px;font-style:italic;color:var(--ink3);letter-spacing:0.04em;margin-bottom:6px}
.qtext{font-family:'Unbounded',sans-serif;font-size:15px;font-weight:700;color:var(--ink);line-height:1.3;letter-spacing:-0.01em;margin-bottom:20px}

/* STAR RATING */
.stars{display:flex;gap:6px;margin-bottom:8px}
.star{width:44px;height:44px;border:1px solid var(--line2);display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:20px;transition:all 0.12s;color:var(--ink4);user-select:none}
.star:hover,.star.on{border-color:var(--red);background:rgba(230,48,34,0.06);color:var(--red)}
.star-note{display:flex;justify-content:space-between;font-family:'Sora','Zen Kaku Gothic New',sans-serif;font-size:10px;color:var(--ink4)}

/* 3-POINT RATING */
.pts{display:flex;gap:6px;margin-bottom:4px}
.pt{flex:1;padding:12px 8px;border:1px solid var(--line2);text-align:center;cursor:pointer;transition:all 0.12s;user-select:none}
.pt:hover,.pt.on{border-color:var(--red);background:rgba(230,48,34,0.06)}
.pt-num{font-family:'Unbounded',sans-serif;font-size:18px;font-weight:900;color:var(--ink);line-height:1;margin-bottom:3px}
.pt.on .pt-num{color:var(--red)}
.pt-lab{font-family:'Sora','Zen Kaku Gothic New',sans-serif;font-size:10px;color:var(--ink3)}

/* CHOICE BUTTONS */
.choices{display:flex;flex-direction:column;gap:7px}
.choice{display:flex;align-items:flex-start;gap:13px;padding:13px 16px;border:1px solid var(--line);cursor:pointer;transition:all 0.12s;user-select:none}
.choice:hover{background:var(--bg2);border-color:var(--ink4)}
.choice.on{border-color:var(--red);background:rgba(230,48,34,0.06)}
.choice-radio{width:15px;height:15px;border:1.5px solid var(--line2);border-radius:50%;flex-shrink:0;margin-top:2px;position:relative;transition:all 0.12s}
.choice.on .choice-radio{border-color:var(--red);background:var(--red)}
.choice.on .choice-radio::after{content:'';position:absolute;top:2.5px;left:2.5px;width:8px;height:8px;background:#fff;border-radius:50%}
.choice-info{}
.choice-main{font-size:13px;font-weight:600;color:var(--ink)}
.choice-sub{font-family:'Sora','Zen Kaku Gothic New',sans-serif;font-size:11px;color:var(--ink3);margin-top:2px}

/* CHAPTER GRID */
.chapgrid{display:grid;grid-template-columns:1fr 1fr;gap:6px}
.chap{padding:11px 14px;border:1px solid var(--line);cursor:pointer;transition:all 0.12s;user-select:none}
.chap:hover{background:var(--bg2)}
.chap.on{border-color:var(--red);background:rgba(230,48,34,0.06)}
.chap-num{font-family:'Unbounded',sans-serif;font-size:9px;font-weight:700;color:var(--ink4);letter-spacing:0.1em;margin-bottom:4px}
.chap.on .chap-num{color:var(--red)}
.chap-title{font-size:12px;font-weight:600;color:var(--ink);line-height:1.3}

/* FREE TEXT */
.ftarea{width:100%;border:1px solid var(--line2);background:var(--bg2);padding:13px 16px;font-family:'Sora','Zen Kaku Gothic New',sans-serif;font-size:13px;color:var(--ink);resize:none;height:88px;outline:none;transition:border-color 0.15s}
.ftarea:focus{border-color:var(--ink4)}
.ftarea::placeholder{color:var(--ink4)}
.ftcount{font-family:'Sora','Zen Kaku Gothic New',sans-serif;font-size:10px;color:var(--ink4);text-align:right;margin-top:5px}

/* ── FOOTER ── */
.mft{padding:16px 28px 22px;border-top:1px solid var(--line);display:flex;align-items:center;justify-content:space-between;gap:12px}
.btn-skip{background:none;border:none;font-family:'Unbounded',sans-serif;font-size:8px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:var(--ink4);cursor:pointer;transition:color 0.15s;padding:0}
.btn-skip:hover{color:var(--ink3)}
.btn-row{display:flex;gap:8px;align-items:center}
.btn-back{background:transparent;border:1px solid var(--line2);color:var(--ink2);font-family:'Unbounded',sans-serif;font-size:8px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;padding:10px 18px;cursor:pointer;transition:all 0.14s}
.btn-back:hover{border-color:var(--ink);color:var(--ink)}
.btn-next{background:var(--ink);color:var(--bg);font-family:'Unbounded',sans-serif;font-size:9px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;padding:12px 24px;border:none;cursor:pointer;transition:background 0.15s;display:flex;align-items:center;gap:8px}
.btn-next:hover{background:var(--red)}
.btn-next:disabled{background:var(--line);color:var(--ink4);cursor:not-allowed}

/* ── COMPLETE ── */
.complete{padding:48px 28px;text-align:center;display:none}
.complete.on{display:block}
.comp-icon{font-size:36px;margin-bottom:16px}
.comp-title{font-family:'Unbounded',sans-serif;font-size:22px;font-weight:900;letter-spacing:-0.02em;color:var(--ink);margin-bottom:8px}
.comp-desc{font-family:'Sora','Zen Kaku Gothic New',sans-serif;font-size:13px;color:var(--ink3);line-height:1.7;margin-bottom:28px}
.comp-note{font-family:'Raleway',sans-serif;font-style:italic;font-size:12px;color:var(--ink4);margin-bottom:28px}
.btn-dl{display:inline-flex;align-items:center;gap:10px;background:var(--ink);color:var(--bg);font-family:'Unbounded',sans-serif;font-size:9px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;padding:14px 28px;border:none;cursor:pointer;transition:background 0.15s}
.btn-dl:hover{background:var(--red)}
</style>
</head>
<body>
<div class="ov">
<div class="modal">

  <!-- PROGRESS BAR -->
  <div class="prog-track"><div class="prog-fill" id="prog"></div></div>

  <!-- HEADER -->
  <div class="mhd">
    <div class="eyebrow">✦ フィードバック</div>
    <div class="htitle">提案書の品質について</div>
    <div class="hdesc">回答内容はAGのプロンプト改善に自動で反映されます。約90秒で完了します。</div>
    <div class="prog-label" id="prog-label">1 / 7</div>
  </div>

  <!-- ── STEP 1: 全体評価 ── -->
  <div class="mbody">
  <div class="step on" id="s1">
    <div class="qlabel">Q1 — 全体評価</div>
    <div class="qtext">今回の提案書草案の<br>完成度はどのくらいですか？</div>
    <div class="stars" id="stars">
      <div class="star" data-v="1">★</div>
      <div class="star" data-v="2">★</div>
      <div class="star" data-v="3">★</div>
      <div class="star" data-v="4">★</div>
      <div class="star" data-v="5">★</div>
    </div>
    <div class="star-note"><span>使えない</span><span>完璧</span></div>
  </div>

  <!-- ── STEP 2: 最も薄いフェーズ ── -->
  <div class="step" id="s2">
    <div class="qlabel">Q2 — 弱点特定</div>
    <div class="qtext">最も「薄い・物足りない」と<br>感じたのはどのフェーズですか？</div>
    <div class="choices" id="choices2">
      <div class="choice" data-v="ag-02-market">
        <div class="choice-radio"></div>
        <div class="choice-info">
          <div class="choice-main">AG-02 市場・業界分析</div>
          <div class="choice-sub">市場構造・ターゲット仮説の解像度が低かった</div>
        </div>
      </div>
      <div class="choice" data-v="ag-03-competitor">
        <div class="choice-radio"></div>
        <div class="choice-info">
          <div class="choice-main">AG-03 競合分析</div>
          <div class="choice-sub">競合の設計意図の読み解きが表面的だった</div>
        </div>
      </div>
      <div class="choice" data-v="ag-04-insight">
        <div class="choice-radio"></div>
        <div class="choice-info">
          <div class="choice-main">AG-04 課題構造化</div>
          <div class="choice-sub">本質課題の定義が浅かった・Why-Whyが弱かった</div>
        </div>
      </div>
      <div class="choice" data-v="ag-06-draft">
        <div class="choice-radio"></div>
        <div class="choice-info">
          <div class="choice-main">AG-06 設計草案</div>
          <div class="choice-sub">IA・導線・コンテンツ設計の根拠が弱かった</div>
        </div>
      </div>
      <div class="choice" data-v="ag-07-story">
        <div class="choice-radio"></div>
        <div class="choice-info">
          <div class="choice-main">AG-07 ストーリー・コピー</div>
          <div class="choice-sub">提案書の流れ・コンセプトワードが響かなかった</div>
        </div>
      </div>
      <div class="choice" data-v="none">
        <div class="choice-radio"></div>
        <div class="choice-info">
          <div class="choice-main">特になし・全体的に満足</div>
        </div>
      </div>
    </div>
  </div>

  <!-- ── STEP 3: 競合分析評価 ── -->
  <div class="step" id="s3">
    <div class="qlabel">Q3 — 競合分析の深度</div>
    <div class="qtext">競合サイトの「設計意図の読み解き」は<br>どの程度できていましたか？</div>
    <div class="pts" id="pts3">
      <div class="pt" data-v="1">
        <div class="pt-num">1</div>
        <div class="pt-lab">表面的<br>だった</div>
      </div>
      <div class="pt" data-v="2">
        <div class="pt-num">2</div>
        <div class="pt-lab">まあまあ<br>だった</div>
      </div>
      <div class="pt" data-v="3">
        <div class="pt-num">3</div>
        <div class="pt-lab">十分<br>だった</div>
      </div>
    </div>
  </div>

  <!-- ── STEP 4: ターゲット評価 ── -->
  <div class="step" id="s4">
    <div class="qlabel">Q4 — ターゲット設定の精度</div>
    <div class="qtext">「誰に・どんな状態で・何を伝えるか」の<br>ターゲット設定は適切でしたか？</div>
    <div class="pts" id="pts4">
      <div class="pt" data-v="1">
        <div class="pt-num">1</div>
        <div class="pt-lab">ズレが<br>あった</div>
      </div>
      <div class="pt" data-v="2">
        <div class="pt-num">2</div>
        <div class="pt-lab">概ね<br>合っていた</div>
      </div>
      <div class="pt" data-v="3">
        <div class="pt-num">3</div>
        <div class="pt-lab">ぴったり<br>だった</div>
      </div>
    </div>
  </div>

  <!-- ── STEP 5: ストーリー使用感 ── -->
  <div class="step" id="s5">
    <div class="qlabel">Q5 — ストーリー構成の使用感</div>
    <div class="qtext">今回の提案書の章構成・ストーリーラインは<br>実際の提案に使えそうですか？</div>
    <div class="choices" id="choices5">
      <div class="choice" data-v="that_usable">
        <div class="choice-radio"></div>
        <div class="choice-info">
          <div class="choice-main">このまま使える</div>
          <div class="choice-sub">構成・流れともに問題なし</div>
        </div>
      </div>
      <div class="choice" data-v="needs_edit">
        <div class="choice-radio"></div>
        <div class="choice-info">
          <div class="choice-main">一部修正すれば使える</div>
          <div class="choice-sub">章の順番・コピー等を調整すれば問題なし</div>
        </div>
      </div>
      <div class="choice" data-v="rebuild">
        <div class="choice-radio"></div>
        <div class="choice-info">
          <div class="choice-main">大幅に作り直しが必要</div>
          <div class="choice-sub">構成・方向性から見直す必要がある</div>
        </div>
      </div>
    </div>
  </div>

  <!-- ── STEP 6: 最良のパート ── -->
  <div class="step" id="s6">
    <div class="qlabel">Q6 — 最良のパート</div>
    <div class="qtext">提案書の中で一番<br>「よく書けていた」のはどこですか？</div>
    <div class="chapgrid" id="chapgrid">
      <div class="chap" data-v="ch-01"><div class="chap-num">Ch.1</div><div class="chap-title">現状認識の共有</div></div>
      <div class="chap" data-v="ch-02"><div class="chap-num">Ch.2</div><div class="chap-title">課題の本質定義</div></div>
      <div class="chap" data-v="ch-03"><div class="chap-num">Ch.3</div><div class="chap-title">解決の方向性</div></div>
      <div class="chap" data-v="ch-04"><div class="chap-num">Ch.4</div><div class="chap-title">具体的な提案内容</div></div>
      <div class="chap" data-v="ch-05"><div class="chap-num">Ch.5</div><div class="chap-title">期待効果</div></div>
      <div class="chap" data-v="ch-06"><div class="chap-num">Ch.6</div><div class="chap-title">進め方・スケジュール</div></div>
    </div>
  </div>

  <!-- ── STEP 7: フリーコメント ── -->
  <div class="step" id="s7">
    <div class="qlabel">Q7 — AGへの一言（任意）</div>
    <div class="qtext">AGへのフィードバックを<br>自由に書いてください</div>
    <textarea class="ftarea" id="freetext" maxlength="100" placeholder="例：「競合分析でサイトの導線まで評価してほしかった」「ターゲットを共働き世帯に絞りすぎた」等"></textarea>
    <div class="ftcount"><span id="ftcnt">0</span> / 100字</div>
  </div>

  <!-- ── COMPLETE ── -->
  <div class="complete" id="complete">
    <div class="comp-icon">✦</div>
    <div class="comp-title">ありがとうございます</div>
    <div class="comp-desc">フィードバックを受け取りました。<br>回答内容はAGのプロンプト改善に<br>自動で反映されます。</div>
    <div class="comp-note">改善が適用されるのは次回の実行からです</div>
    <button class="btn-dl" onclick="alert('ダウンロードを開始します')">
      <span>↓</span> Markdownをダウンロード
    </button>
  </div>
  </div>

  <!-- FOOTER -->
  <div class="mft" id="footer">
    <button class="btn-skip" id="btn-skip" onclick="skipAll()">スキップしてダウンロード</button>
    <div class="btn-row">
      <button class="btn-back" id="btn-back" onclick="prev()" style="display:none">← 戻る</button>
      <button class="btn-next" id="btn-next" onclick="next()" disabled>次へ →</button>
    </div>
  </div>

</div>
</div>

<script>
const TOTAL = 7
let cur = 1
const answers = {}

// 選択状態の管理
function getVal(step) {
  if (step === 1) return answers.overallScore
  if (step === 2) return answers.weakestAgent
  if (step === 3) return answers.competitorScore
  if (step === 4) return answers.targetScore
  if (step === 5) return answers.storyUsability
  if (step === 6) return answers.bestChapter
  if (step === 7) return answers.freeComment !== undefined ? 'ok' : undefined
}

// Q1: 星評価
document.querySelectorAll('.star').forEach(s => {
  s.addEventListener('click', () => {
    const v = parseInt(s.dataset.v)
    answers.overallScore = v
    document.querySelectorAll('.star').forEach((st, i) => {
      st.classList.toggle('on', i < v)
    })
    checkNext()
  })
})

// Q2・Q5: 単一選択
function bindSingle(groupId, key) {
  document.querySelectorAll(`#${groupId} .choice`).forEach(c => {
    c.addEventListener('click', () => {
      document.querySelectorAll(`#${groupId} .choice`).forEach(x => x.classList.remove('on'))
      c.classList.add('on')
      answers[key] = c.dataset.v
      checkNext()
    })
  })
}
bindSingle('choices2', 'weakestAgent')
bindSingle('choices5', 'storyUsability')

// Q3・Q4: 3点評価
function bindPts(groupId, key) {
  document.querySelectorAll(`#${groupId} .pt`).forEach(p => {
    p.addEventListener('click', () => {
      document.querySelectorAll(`#${groupId} .pt`).forEach(x => x.classList.remove('on'))
      p.classList.add('on')
      answers[key] = parseInt(p.dataset.v)
      checkNext()
    })
  })
}
bindPts('pts3', 'competitorScore')
bindPts('pts4', 'targetScore')

// Q6: 章選択
document.querySelectorAll('#chapgrid .chap').forEach(c => {
  c.addEventListener('click', () => {
    document.querySelectorAll('#chapgrid .chap').forEach(x => x.classList.remove('on'))
    c.classList.add('on')
    answers.bestChapter = c.dataset.v
    checkNext()
  })
})

// Q7: フリーテキスト（任意なので常にnext可能）
const ft = document.getElementById('freetext')
ft.addEventListener('input', () => {
  const len = ft.value.length
  document.getElementById('ftcnt').textContent = len
  answers.freeComment = ft.value || undefined
})

function checkNext() {
  const v = getVal(cur)
  const btn = document.getElementById('btn-next')
  // Q7は任意なのでいつでも可
  btn.disabled = (cur < 7 && v === undefined)
  if (cur === 7) btn.disabled = false
}

function updateUI() {
  // ステップ表示
  for (let i = 1; i <= 7; i++) {
    document.getElementById(`s${i}`).classList.toggle('on', i === cur)
  }
  // プログレス
  document.getElementById('prog').style.width = `${(cur / TOTAL) * 100}%`
  document.getElementById('prog-label').textContent = `${cur} / ${TOTAL}`
  // 戻るボタン
  document.getElementById('btn-back').style.display = cur > 1 ? '' : 'none'
  // 次へボタンのラベル
  const btn = document.getElementById('btn-next')
  btn.textContent = cur === TOTAL ? '送信してダウンロード →' : '次へ →'
  checkNext()
}

function next() {
  if (cur < TOTAL) {
    cur++
    updateUI()
  } else {
    submit()
  }
}

function prev() {
  if (cur > 1) { cur--; updateUI() }
}

function submit() {
  // API送信（実装時: fetch POST /api/feedback）
  console.log('送信:', answers)
  // 完了画面へ
  document.querySelector('.mbody').style.display = 'none'
  document.getElementById('footer').style.display = 'none'
  document.querySelector('.mhd').style.display = 'none'
  document.querySelector('.prog-track').style.display = 'none'
  document.getElementById('complete').classList.add('on')
}

function skipAll() {
  submit()
}

updateUI()
</script>
</body>
</html>

```
