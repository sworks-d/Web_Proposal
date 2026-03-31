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
