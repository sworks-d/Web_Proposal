# WEB提案書エージェント 要件定義書

**バージョン:** 1.1
**作成日:** 2026-03-31
**ステータス:** 確定・Claude Code実装指示用

---

## 1. システム概要・目的

### 1.1 解くべき課題

WEB提案書作成における「前段資料・設計草案の生成」を自動化する。

完成した提案書を生成するのではなく、**クリエイティブディレクターが提案書を作るための判断材料**をファクトベース・構造化された形で整えることが目的。

### 1.2 アウトプットのイメージ

```
前段資料（ファクトベース）
├── 案件サマリー・不足情報リスト
├── 業界・市場ファクト
├── 競合分析結果
├── 課題定義（表層・構造・機会の3層）
├── ファクトチェック結果（信頼度付き）
└── 設計草案
    ├── 提案軸候補（複数・根拠付き）
    └── ページ構成骨子
```

人間（CD）がこれを受け取り、クリエイティブ展開・提案書制作に使う。

### 1.3 スコープ

| 対象 | 内容 |
|---|---|
| IN スコープ | ヒアリング整理 / 市場・業界分析 / 競合分析 / 課題構造化 / ファクトチェック / 設計草案生成 / ビジュアルイメージ生成（オプション） |
| OUT スコープ | 完成提案書の生成 / デザイン制作 / クライアントへの直接送付 / 見積・工数算出 |

### 1.4 ユーザー

クリエイティブディレクター（自分自身）。専門知識を持つ単一ユーザーが使う内部ツール。

---

## 2. 技術スタック

| レイヤー | 技術 |
|---|---|
| フロントエンド | Next.js（React）/ TypeScript |
| バックエンド | Node.js / TypeScript |
| ORM | Prisma |
| DB | SQLite（ローカル） |
| AIモデル | Anthropic Claude API（従量課金・モデル切替可能） |
| 画像生成 | DALL-E 3 API（オプション・切替可能設計） |
| 図解レンダリング | Recharts / Mermaid.js / カスタムSVGコンポーネント |
| バージョン管理 | Git（リポジトリ作成済み） |
| 稼働環境 | ローカルマシン（localhost） |

---

## 3. アーキテクチャ設計

### 3.1 全体構成

```
┌──────────────────────────────────────────────────┐
│  フロントエンド（Next.js）                          │
│  ┌──────────┐ ┌──────────────┐ ┌──────────────┐  │
│  │ チャットUI │ │ プレビューUI  │ │エクスポートUI │  │
│  │ 指示・制御 │ │インライン編集 │ │ MD/JSON/SVG  │  │
│  │ チェック  │ │セクション再生│ │              │  │
│  └──────────┘ └──────────────┘ └──────────────┘  │
└──────────────────────┬───────────────────────────┘
                       │ REST API / SSE（ストリーミング）
┌──────────────────────▼───────────────────────────┐
│  バックエンド（Node.js / TypeScript）               │
│                                                    │
│  OC-01: オーケストレーター                          │
│  ├── AG-01: インテーク担当                          │
│  ├── AG-02: 市場・業界分析担当                      │
│  ├── AG-03: 競合・ポジション分析担当                 │
│  ├── AG-04: 課題構造化担当                          │
│  ├── AG-05: ファクトチェック担当                     │
│  ├── AG-06: 設計草案担当                            │
│  └── AG-07: ビジュアルイメージ生成担当（オプション）  │
│                                                    │
│  エクスポートモジュール（MD / JSON / SVG）           │
│  Anthropic APIクライアント                          │
│  画像生成APIクライアント（インターフェース抽象化）     │
└──────────────────────┬───────────────────────────┘
                       │ Prisma ORM
┌──────────────────────▼───────────────────────────┐
│  SQLite                                            │
│  clients / projects / executions / agent_results   │
└──────────────────────┬───────────────────────────┘
                       │
┌──────────────────────▼───────────────────────────┐
│  /prompts/（Markdownファイル・Gitで管理）            │
│  ag-01-intake / ag-02-market（業界別）             │
│  ag-03-competitor / ag-04-insight                  │
│  ag-05-factcheck / ag-06-draft / ag-07-visual      │
└──────────────────────────────────────────────────┘
```

### 3.2 実行モード

| モード | 内容 | 用途 |
|---|---|---|
| フルパイプライン | AG-01→02→03→04→05→06を順次実行 | 新規案件の一括分析 |
| スポット起動 | 任意の単一AGを指定して起動 | 部分的な分析・再実行 |
| オプション追加 | AG-07をフル完了後または単体で起動 | ビジュアルイメージが必要な時 |

---

## 4. エージェント定義

### 4.1 共通インターフェース

```typescript
interface Agent {
  id: AgentId
  name: string
  execute(input: AgentInput): Promise<AgentOutput>
  getPrompt(context: ProjectContext): string
}

interface AgentInput {
  projectContext: ProjectContext
  previousOutputs: AgentOutput[]      // 前エージェントの出力（要約版）
  userInstruction?: string
}

interface AgentOutput {
  agentId: AgentId
  sections: Section[]
  visualizations: Visualization[]
  metadata: OutputMetadata
}

interface Section {
  id: string
  title: string
  content: string                     // Markdown形式
  sectionType: SectionType
  isEditable: boolean
  canRegenerate: boolean
}

interface Visualization {
  id: string
  title: string
  vizType: 'chart' | 'mermaid' | 'matrix' | 'positioning'
  renderer: 'recharts' | 'mermaid' | 'custom-svg'
  data: Record<string, unknown>
  exportFormats: ('svg' | 'png' | 'json')[]
}

interface OutputMetadata {
  confidence: 'high' | 'medium' | 'low'
  factBasis: string[]
  assumptions: string[]
  missingInfo: string[]
}
```

### 4.2 AG-01：インテーク担当

| 項目 | 内容 |
|---|---|
| インプット | クライアント名 / 依頼テキスト / 既知の制約（予算・納期・担当者） |
| 処理 | クライアントDB照合 → 既存情報ロード → 不足情報特定 → ヒアリング項目生成 |
| アウトプット | 案件サマリー / 不足情報リスト / 追加ヒアリング項目 / 推奨AG構成 |
| 図解 | なし |

クライアント照合ロジック：既存クライアント→DB自動ロード、新規→追加入力を促しDB登録後に実行。

### 4.3 AG-02：市場・業界分析担当

| 項目 | 内容 |
|---|---|
| インプット | AG-01の出力 / 業界タイプ / クライアント情報 |
| 処理 | 業界タイプ判定 → プロンプトテンプレート選択 → 市場・Web市況分析 |
| アウトプット | 業界のWebトレンド / 主要プレイヤーの傾向 / ユーザー行動特性 |
| 図解 | 市場トレンドグラフ（Recharts）/ プレイヤーマップ（カスタムSVG） |

業界別プロンプトテンプレート：recruitment / btob / ec / corporate / campaign / general（fallback）

設計方針：業界専門性はプロンプト切り替えで担保。精度不足が確認された業界は独立AGに分割可能な構造にする。

### 4.4 AG-03：競合・ポジション分析担当

| 項目 | 内容 |
|---|---|
| インプット | AG-01の出力 / 競合サイトURL（複数）/ AG-02の市場分析結果 |
| 処理 | サイト構造・訴求・導線・UI・SEO・CVの統合評価 → ポジショニング分析 |
| アウトプット | 競合比較サマリー / 訴求軸の分布 / 差別化余地の特定 |
| 図解 | 競合比較表（Recharts）/ ポジショニングマップ（カスタムSVG）/ IA構造図（Mermaid） |

評価軸（6軸統合）：サイト構造・IA / 訴求軸・メッセージ / コンテンツ戦略 / UI/UX品質 / SEO・集客構造 / CV設計・導線

### 4.5 AG-04：課題構造化担当

| 項目 | 内容 |
|---|---|
| インプット | AG-01・02・03の全出力 |
| 処理 | 情報統合 → 要望と本質課題の分離 → 3層構造で課題定義 |
| アウトプット | 課題定義（3層）/ 優先順位付き課題リスト / 解決の方向性 |
| 図解 | 課題因果関係図（Mermaid）/ 優先度マトリクス（カスタムSVG） |

課題の3層定義：表層課題（クライアントが認識）/ 構造課題（本質原因）/ 機会（解決後の可能性）

### 4.6 AG-05：ファクトチェック担当

| 項目 | 内容 |
|---|---|
| インプット | AG-01〜04の全出力 |
| 処理 | 推測の特定 / 根拠の確認 / エージェント間の矛盾検出 / 信頼度スコアリング |
| アウトプット | 信頼度評価済みの全出力 / 要確認事項リスト / 推測として明示すべき箇所 |
| 図解 | なし |

信頼度スコア：high（実データ基づく）/ medium（業界通例に基づく推定）/ low（仮説・推測・要確認）

### 4.7 AG-06：設計草案担当

| 項目 | 内容 |
|---|---|
| インプット | AG-04の課題定義 / AG-05のファクトチェック結果 |
| 処理 | 提案軸の候補生成（複数）→ 各軸の根拠付け → ページ構成骨子の生成 |
| アウトプット | 提案軸候補（2〜3案）/ 推奨軸と理由 / ページ構成骨子 / 各ページのコンテンツ要素リスト |
| 図解 | サイト構造図（Mermaid）/ ユーザー導線図（Mermaid） |

提案軸の出力フォーマット：軸の一文表現 / 根拠（課題定義との接続）/ 強み / リスク

### 4.8 AG-07：ビジュアルイメージ生成担当（オプション）

| 項目 | 内容 |
|---|---|
| インプット | AG-04の課題定義 / AG-06の提案軸 / ユーザーの追加指示（任意） |
| 処理 | 生成プロンプトの自動構築 → DALL-E 3 APIで複数バリエーション生成 |
| アウトプット | 参考イメージ（3〜4枚）/ 各画像の意図説明 / 使用した生成プロンプト |
| 位置づけ | 「参考イメージ」として前段資料に明示的に分離して追記 |

生成プロンプトを必ず出力に含める（透明性の担保）。APIクライアントはインターフェースで抽象化し、Stable Diffusionへの切り替えを可能にする。

---

## 5. オーケストレーター（OC-01）仕様

### 5.1 役割

実行モードの制御 / 業界タイプ判定とAG-02プロンプト選択 / エージェント間コンテキスト受け渡し / 人間チェックポイントの制御 / エラーハンドリングとリトライ

### 5.2 業界タイプ判定ロジック（ハイブリッド）

```
Step1: ルールベース判定（キーワードマッチ）
  "採用" "求人" "リクルート"          → recruitment
  "会社案内" "コーポレート"           → corporate
  "キャンペーン" "プロモーション" "LP" → campaign
  "EC" "通販" "ショップ"             → ec
  "BtoB" "法人" "サービス"           → btob

Step2: ルールで判定できない場合 → LLM判定

Step3: 複合案件（採用×コーポレート等）
  → プライマリ・セカンダリの2タイプを設定
  → プロンプトをマージして使用
```

### 5.3 人間チェックポイント

| タイミング | 確認内容 |
|---|---|
| AG-01完了後 | 案件サマリー・ヒアリング項目の確認 |
| AG-03完了後 | 競合・市場分析の確認（分析フェーズ完了） |
| AG-05完了後 | ファクトチェック結果・要確認事項の確認 |
| AG-06完了後 | 設計草案全体の確認・エクスポート判断 |

### 5.4 コンテキスト受け渡し設計

各エージェントの出力はJSONとしてDBに保存。次エージェントへは要約版をプロンプトに埋め込み、詳細はDB参照。コンテキスト肥大化によるトークン・コスト増を防ぐ。

---

## 6. データモデル（DBスキーマ）

```prisma
model Client {
  id        String    @id @default(cuid())
  name      String    @unique
  industry  String?
  size      String?
  notes     String?
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  projects  Project[]
}

model Project {
  id           String        @id @default(cuid())
  clientId     String
  client       Client        @relation(fields: [clientId], references: [id])
  title        String
  briefText    String
  industryType String
  status       ProjectStatus @default(ACTIVE)
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt
  executions   Execution[]
}

model Execution {
  id          String          @id @default(cuid())
  projectId   String
  project     Project         @relation(fields: [projectId], references: [id])
  mode        ExecutionMode
  agentId     String?
  status      ExecutionStatus @default(RUNNING)
  startedAt   DateTime        @default(now())
  completedAt DateTime?
  results     AgentResult[]
}

model AgentResult {
  id          String    @id @default(cuid())
  executionId String
  execution   Execution @relation(fields: [executionId], references: [id])
  agentId     String
  outputJson  String
  editedJson  String?
  approvedAt  DateTime?
  createdAt   DateTime  @default(now())
}

enum ProjectStatus   { ACTIVE ARCHIVED }
enum ExecutionMode   { FULL SPOT }
enum ExecutionStatus { RUNNING WAITING_REVIEW COMPLETED ERROR }
```

---

## 7. UI要件

### 7.1 チャットUI

- チャット形式で指示・確認・差し戻しを行う
- エージェントの実行状況をSSEでリアルタイムストリーミング表示
- 人間チェックポイントでは確認メッセージ＋承認/差し戻しボタンを表示

### 7.2 プレビューUI

- エージェント出力をセクション単位で表示
- インライン編集：各セクションのテキストを直接編集可能
- セクション単位再生成：「このセクションだけ再生成」→ チャットUIで追加指示を受け付け
- 図解はプレビューUI内でリアルタイムレンダリング
- 信頼度スコアをバッジ表示（high / medium / low）
- 推測・要確認箇所をハイライト表示

### 7.3 エクスポート

| 形式 | 内容 | フェーズ |
|---|---|---|
| Markdown (.md) | 全セクション + Mermaid記法の図解 | 初期 |
| JSON (.json) | 構造化データ全体 | 初期 |
| SVG (.svg) | 図解の単体エクスポート | 初期 |
| PowerPoint (.pptx) | スライド形式 | 将来 |

---

## 8. 図解レンダリング設計

### 8.1 ライブラリ分担

| 図解タイプ | ライブラリ | エージェントの出力形式 |
|---|---|---|
| グラフ全般（棒・円・折れ線・レーダー） | Recharts | JSONデータ（data配列 + config） |
| フロー・IA・ガント・シーケンス | Mermaid.js | Mermaid記法テキスト |
| マトリクス・ポジショニングマップ | カスタムSVGコンポーネント | 座標データ + ラベルJSON |

### 8.2 設計原則

- エージェントは描画しない。データと図解タイプの指示だけを出力する
- 描画はフロントエンドのReactコンポーネントが担当
- 全図解はSVGとして出力可能な設計にする

---

## 9. APIコスト設計方針

```
通常のAG実行（インテーク・草案等）: claude-haiku-4-5-20251001
複雑な統合・課題構造化:            claude-sonnet-4-6
ファクトチェック:                   claude-sonnet-4-6
```

環境変数でモデルを切り替え可能にし、従量課金の調整を容易にする。承認済み結果はDBにキャッシュし不要な再実行を防ぐ。

```env
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
DEFAULT_MODEL_FAST=claude-haiku-4-5-20251001
DEFAULT_MODEL_QUALITY=claude-sonnet-4-6
IMAGE_GEN_ENABLED=true
IMAGE_GEN_PROVIDER=dalle3
```

---

## 10. プロンプト管理設計

```
/prompts/
├── ag-01-intake/default.md
├── ag-02-market/
│   ├── recruitment.md
│   ├── btob.md
│   ├── ec.md
│   ├── corporate.md
│   ├── campaign.md
│   └── general.md
├── ag-03-competitor/default.md
├── ag-04-insight/default.md
├── ag-05-factcheck/default.md
├── ag-06-draft/default.md
└── ag-07-visual/default.md
```

各ファイルの構造：Role / Input / Instructions / Output Format / Constraints

プロンプトはMarkdownで管理 → コード変更なしに改善可能 → Gitでバージョン管理。

---

## 11. ディレクトリ構成

```
/
├── .env
├── .gitignore
├── README.md
├── package.json
├── prisma/
│   ├── schema.prisma
│   └── dev.db                         # .gitignore対象
├── prompts/                           # Gitで管理
├── src/
│   ├── agents/
│   │   ├── types.ts
│   │   ├── base-agent.ts
│   │   ├── ag-01-intake.ts
│   │   ├── ag-02-market.ts
│   │   ├── ag-03-competitor.ts
│   │   ├── ag-04-insight.ts
│   │   ├── ag-05-factcheck.ts
│   │   ├── ag-06-draft.ts
│   │   └── ag-07-visual.ts
│   ├── orchestrator/
│   │   ├── orchestrator.ts
│   │   └── industry-detector.ts
│   ├── export/
│   │   ├── markdown-exporter.ts
│   │   ├── json-exporter.ts
│   │   └── svg-exporter.ts
│   ├── api/
│   │   ├── projects/
│   │   ├── clients/
│   │   ├── executions/
│   │   └── export/
│   └── lib/
│       ├── anthropic-client.ts
│       ├── image-gen-client.ts
│       └── prompt-loader.ts
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── projects/[id]/page.tsx
│   └── clients/
└── components/
    ├── chat/
    ├── preview/
    │   ├── section-editor.tsx
    │   └── section-regenerate.tsx
    └── visualizations/
        ├── recharts-renderer.tsx
        ├── mermaid-renderer.tsx
        └── custom-svg-renderer.tsx
```

---

## 12. フェーズ別実装優先順位

### Phase 1：基盤構築

```
[ ] Prismaスキーマ・DB初期設定
[ ] Anthropic APIクライアント（モデル切替対応）
[ ] プロンプトローダー
[ ] AG-01単体動作確認
[ ] OC-01の基本制御（スポット起動のみ）
[ ] チャットUI（基本・SSEストリーミング）
[ ] AG結果のプレビュー表示（読み取り専用）
```

### Phase 2：コア機能完成

```
[ ] AG-02〜06の実装
[ ] フルパイプライン実行
[ ] 人間チェックポイント制御
[ ] インライン編集・セクション再生成
[ ] Markdown / JSONエクスポート
[ ] 図解レンダリング（Recharts・Mermaid）
[ ] 業界タイプ判定（ルールベース）
```

### Phase 3：高度機能

```
[ ] カスタムSVGレンダリング
[ ] AG-07（画像生成オプション）
[ ] SVGエクスポート
[ ] 業界タイプ判定のLLMハイブリッド
[ ] クライアントDB管理UI
```

### Phase 4：将来拡張

```
[ ] pptxエクスポート
[ ] Stable Diffusion切り替え
[ ] 外部データAPI連携（Serper等）
[ ] 過去案件の参照・比較機能
```

---

## 13. 未解決・実装前確認が必要な事項

| 項目 | 内容 | 優先度 |
|---|---|---|
| 競合URLの取得方法 | ユーザーが手動入力 or 自動検索（Serper API） | 高 |
| クライアント参考情報の仕様 | 過去提案実績・既存資料をAGに渡す設計（RAG検討） | 中 |
| AG-02の情報ソース | Web検索連携の有無・初期はLLM知識のみか | 中 |
| pptxの仕様詳細 | テンプレート・スライド構成の定義 | 低（将来） |

---

## 14. 検証計画

**検証案件:** 中部電力グループ キャリア採用サイト統合リニューアル提案

実装後、以下の順で動作を検証する：

```
1. AG-01：オリエン資料をインプットとして案件サマリー生成
2. AG-02：採用市場 × 電力インフラ業界の市場分析生成
3. AG-03：東電・関電・現中部電力サイトの競合分析生成
4. AG-04：課題構造化（3層）の精度確認
5. AG-05：ファクトチェックの検出精度確認
6. AG-06：提案軸候補・ページ構成骨子の品質確認
7. エクスポート：Markdown / JSONの出力確認
```

検証結果をもとにプロンプトをチューニングする。
