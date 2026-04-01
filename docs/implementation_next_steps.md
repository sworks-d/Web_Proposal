# 次のステップ実装指示書

## 0. 現状確認（2026-04-01時点）

**動作確認済み:**
- ダッシュボード画面（FCFBEF背景・Ticker・NavBar・Hero・新規作成モーダル）

**要対応:**
- プロジェクト詳細ページがロードエラー
- DBマイグレーション未適用の可能性
- 以下のセクションが未実装

---

## 1. まず最初にやること（DBとルーティングの修正）

```bash
cd /Users/a05/Web_Proposal

# DBスキーマを最新にする
npx prisma db push --force-reset

# DBを再生成
npx prisma generate

# 既存プロジェクトが消えるのでテストデータを再投入
npm run dev
```

プロジェクト詳細ページのエラーを確認して修正する。
原因候補：
1. ProposalVersionへのスキーマ変更でProjectのrelationが変わった
2. `executions` → `versions` のリレーション変更に伴うAPI側の対応漏れ
3. src/app/projects/[id]/page.tsx でのデータ取得クエリの不整合

---

## 2. チェックポイント画面の再設計（最重要）

**現状:** AgentSelector（AG選択）のみ実装されている
**要変更:** .claude/skills/checkpoint.md の設計に従って全面改修

### 変更方針
AG選択はプロジェクト作成モーダルに移動する。
チェックポイント画面は「取れた情報・取れなかった情報の整理」に特化する。

### 2.1 プロジェクト作成モーダルにAG選択を追加

```typescript
// src/app/page.tsx の新規作成モーダルに追加

// Step 2として業種AG選択を追加
// 既存の「業界タイプ」selectを以下に置き換え：

// 大分類AG（ラジオ）
const PRIMARY_AGS = [
  { id: 'ag-02-recruit', label: '採用・リクルートサイト', desc: '採用ブランディング・人材獲得が目的' },
  { id: 'ag-02-corp',    label: 'コーポレートサイト',     desc: '企業情報・IR・信頼構築が目的' },
  { id: 'ag-02-brand',   label: 'ブランド・世界観サイト', desc: 'ブランド体験・感情訴求が目的' },
  { id: 'ag-02-ec',      label: 'EC・購買サイト',         desc: '商品販売・CVRが目的' },
  { id: 'ag-02-btob',    label: 'BtoB・法人向けサイト',   desc: 'リード獲得・商談化が目的' },
  { id: 'ag-02-camp',    label: 'キャンペーン・LP',        desc: '期間限定・単一目的のCV' },
  { id: 'ag-02-general', label: 'その他（汎用）',           desc: '上記に当てはまらない場合' },
]

// SUB選択（チェックボックス・業界コンテキスト）
const SUB_AGS = [
  { id: 'life',         label: 'くらし・エネルギー' },
  { id: 'beauty',       label: '美容・コスメ' },
  { id: 'food',         label: '飲食・食品' },
  { id: 'finance',      label: '金融・保険' },
  { id: 'health',       label: '医療・ヘルスケア' },
  { id: 'education',    label: '教育・学校' },
  { id: 'tech',         label: 'IT・テクノロジー' },
  { id: 'fashion',      label: 'ファッション' },
  { id: 'auto',         label: '自動車・モビリティ' },
  { id: 'construction', label: '建設・不動産' },
  { id: 'travel',       label: '旅行・観光' },
  { id: 'culture',      label: 'エンタメ・メディア' },
  { id: 'sport',        label: 'スポーツ' },
  { id: 'gov',          label: '官公庁・団体' },
  { id: 'creative',     label: '広告・デザイン' },
  { id: 'music',        label: '音楽' },
]
```

### 2.2 チェックポイントコンポーネントの全面改修

```typescript
// src/components/checkpoint/CheckpointPanel.tsx を以下の構成に改修

// チェックポイントのフェーズ別表示
// phase 1: AG-01完了後 → ヒアリング項目の確認のみ（AG選択はプロジェクト作成時済み）
// phase 2: AG-02・03完了後 → 取れた情報/取れなかった情報の整理
// phase 3: AG-05完了後 → 品質確認・読み手SUB選択
// phase 4: AG-07完了後 → コンセプトワード選択・完了

// 表示構造（phase 2の例）：
//
// ✋ チェックポイント② — 市場・競合分析の確認
// ─────────────────────────────────────
// ✅ 取れた情報（信頼度付き）
//   [high] 採用市場の競合構造（出典: AG-02）
//   [med]  ターゲット候補者層の仮説（推定）
//   [med]  競合サイト設計水準（直接確認済み）
// ─────────────────────────────────────
// ❓ 取れなかった情報 → ヒアリング項目
//   □ 中部電力の現状採用数・今期目標数
//     → [CDが確認した内容を入力: _______________]
//   □ グループ3社の採用優先順位
//     → [CDが確認した内容を入力: _______________]
// ─────────────────────────────────────
// 判断してください
//   ● このまま次へ進む
//   ○ 特定のAGを再実行する
//     □ AG-02 市場分析  □ AG-03 競合分析
// ─────────────────────────────────────
// [次のフェーズへ進む →]  [再実行して確認する]

// src/lib/checkpoint-summary.ts を使って
// 各AGのfactBasis・assumptions・requiresClientConfirmationから
// 取れた情報・取れなかった情報を自動生成する
```

### 2.3 CDメモのAG反映

```typescript
// src/agents/base-agent.ts の execute() に cdNotes 統合を追加

// ProposalVersion.cdNotesを読み込んで
// systemプロンプトの末尾に追加する処理を実装する
// （.claude/agents/各ファイルのLayer 3参照）
```

---

## 3. バージョン管理UI

```typescript
// src/components/version/VersionHistory.tsx を新規作成

// プロジェクト詳細ページの右上に「v1 ▾」のドロップダウン
// クリックでバージョン履歴一覧を表示
// 「このバージョンを更新する」ボタンでCreateUpdateModalを開く

// src/components/version/CreateUpdateModal.tsx を新規作成
// - 変更理由の入力（必須）
// - バージョン名（任意）
// - 再実行するAGの選択
// - 依存関係の自動チェック（AG-03再実行 → AG-04以降も再実行）
// （docs/implementation_version.md Section 5 参照）
```

---

## 4. フィードバック画面

```typescript
// src/components/feedback/FeedbackModal.tsx を新規作成
// docs/implementation_ui.md Section 11 参照
// 承認済みHTMLが同ファイルの末尾に埋め込み済み

// トリガー: ダウンロードボタンクリック時
// スキップ可能
// 送信後: /api/feedback に POST してMarkdownダウンロード開始

// DBスキーマ: ProposalFeedback モデルを prisma/schema.prisma に追加
// （docs/implementation_ui.md Section 11 のスキーマ参照）
```

---

## 5. AGフィードバック・プロンプト改善UI

```typescript
// src/components/agent/AgentFeedback.tsx を新規作成
// AG出力パネルの下部に常に表示

// src/app/api/agents/[agentId]/improve/route.ts を新規作成
// src/app/api/agents/[agentId]/apply/route.ts を新規作成
// （docs/implementation_agent_tuning.md Section 2 参照）
```

---

## 6. 実行中のAG出力参照（サイドバー改修）

```typescript
// src/app/projects/[id]/page.tsx のAgentRail部分を改修

// 完了済みAGをクリックするとOutputPanelにその出力を表示
// 実行中でも過去のAG出力を参照できる
// isInherited=trueの場合「v{N}から引き継ぎ」と表示
// （.claude/agents/market.md Layer 3 参照）
```

---

## 7. 実装の優先順位

```
Priority 1（動かす）:
  □ npx prisma db push でDBを最新化
  □ プロジェクト詳細ページのロードエラーを修正

Priority 2（UXの核心）:
  □ プロジェクト作成モーダルにAG選択を追加
  □ チェックポイント画面を取れた情報/取れなかった情報の整理に改修
  □ CDメモをAG実行に反映

Priority 3（機能完成）:
  □ バージョン管理UI
  □ フィードバック画面
  □ 実行中の過去AG参照

Priority 4（ブラッシュアップ）:
  □ AGフィードバック・プロンプト改善UI
  □ A4横スライドプレビューの仕上げ
```
