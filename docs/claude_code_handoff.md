# Claude Code 引き継ぎ指示書

**リポジトリ:** https://github.com/sworks-d/Web_Proposal.git
**作業日:** 2026-03-31

---

## このリポジトリについて

WEB提案書作成のマルチエージェントシステムです。
クリエイティブディレクターが提案書を作るための前段資料・設計草案・提案書草案を
自動生成することが目的です。

---

## 実装の手順

**まずこれを読んでください：**

1. `docs/requirements.md` — システム全体の要件定義
2. `docs/implementation_phase1.md` — Phase 1の詳細実装指示書（★まずここから）
3. `docs/implementation_phase2.md` — Phase 2の詳細実装指示書

**Phase 1から始めてください。**
Phase 1のゴール：AG-01（インテーク）が単体で動作し、
チャットUIから結果をプレビューできる状態にする。

---

## 環境セットアップ

```bash
# 1. リポジトリをクローン
git clone https://github.com/sworks-d/Web_Proposal.git
cd Web_Proposal

# 2. 依存関係インストール
npm install

# 3. 環境変数を設定（.env.exampleをコピーして編集）
cp .env.example .env.local
# .env.local を編集してAPIキーを設定（人間が行う）

# 4. DB初期化
npx prisma generate
npx prisma db push

# 5. 開発サーバー起動
npm run dev
```

---

## 重要な設計上の制約

- **プロンプトはコードに書かない。** `prompts/` ディレクトリのMarkdownファイルを読み込む
- **プロンプトファイルは変更しない。** コードから読み取るだけ
- **ローカル動作のみ。** デプロイは不要
- **DBはSQLite（Prisma）。** サーバーDB不要

---

## プロンプトファイルの構造

```
prompts/
├── ag-01-intake/default.md        # インテーク
├── ag-02-recruit/default.md       # 採用サイト専門
├── ag-02-brand/default.md         # ブランドサイト専門
├── ag-02-ec/default.md            # ECサイト専門
├── ag-02-corp/default.md          # コーポレートサイト専門
├── ag-02-camp/default.md          # キャンペーン専門
├── ag-02-btob/default.md          # BtoBサイト専門
├── ag-02-general/default.md       # fallback
├── ag-02-sub-*/default.md         # 業種コンテキスト（14種）
├── ag-03-competitor/default.md    # 競合分析
├── ag-04-insight/default.md       # 課題構造化
├── ag-05-factcheck/default.md     # ファクトチェック
├── ag-06-draft/default.md         # 設計草案
├── ag-07-story/default.md         # 提案書草案・コピー
└── ag-07-visual/default.md        # 提案書ビジュアル素材
```

---

## Phase 1完了の定義

- [ ] `npm run dev` でエラーなく起動する
- [ ] トップページでプロジェクトを作成できる
- [ ] AG-01を実行できる
- [ ] チャット欄に実行ステータスがリアルタイムで表示される
- [ ] プレビュー欄にAG-01の出力が表示される
- [ ] セクションをインライン編集できる
- [ ] DBに結果が保存される

Phase 1が完了したら報告してください。Phase 2に進みます。
