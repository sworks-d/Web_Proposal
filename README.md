# WEB提案書エージェント

WEB提案書作成のための前段資料・設計草案を自動生成するマルチエージェントシステム。

## 概要

クリエイティブディレクターが提案書を作るための判断材料を、ファクトベース・構造化された形で整えることが目的。

## エージェント構成

| AG | 役割 |
|---|---|
| AG-01 | インテーク担当 |
| AG-02 | 市場・業界分析担当 |
| AG-03 | 競合・ポジション分析担当 |
| AG-04 | 課題構造化担当 |
| AG-05 | ファクトチェック担当 |
| AG-06 | 設計草案担当 |
| AG-07 | ビジュアルイメージ生成担当（オプション） |

## 技術スタック

- **フロントエンド:** Next.js (App Router) / TypeScript / Tailwind CSS
- **バックエンド:** Node.js / TypeScript
- **DB:** SQLite (Prisma)
- **AI:** Anthropic Claude API
- **図解:** Recharts / Mermaid.js / カスタムSVG

## セットアップ

```bash
# 依存関係インストール
npm install

# 環境変数設定
cp .env.example .env.local
# .env.local を編集してAPIキーを設定

# DB初期化
npx prisma generate
npx prisma db push

# 開発サーバー起動
npm run dev
```

## 環境変数

`.env.local` に以下を設定：

```env
ANTHROPIC_API_KEY=your_key_here
DEFAULT_MODEL_FAST=claude-haiku-4-5-20251001
DEFAULT_MODEL_QUALITY=claude-sonnet-4-6
DATABASE_URL="file:./prisma/dev.db"
IMAGE_GEN_ENABLED=true
IMAGE_GEN_PROVIDER=dalle3
OPENAI_API_KEY=your_key_here
```

## ドキュメント

- [要件定義書](./docs/requirements.md)
- [実装指示書 Phase 1](./docs/implementation_phase1.md)

## 実装フェーズ

- **Phase 1:** 基盤構築・AG-01単体動作（現在）
- **Phase 2:** AG-02〜06・フルパイプライン
- **Phase 3:** 図解レンダリング・画像生成オプション
- **Phase 4:** pptxエクスポート・外部API連携
