# Claude Code エントリーポイント

## 実行すべきタスク

**指示書:** `improvements/15_CLAUDE_CODE_INSTRUCTIONS.md` を読んで実装してください。

## 概要

| # | タスク | 優先度 |
|---|---|---|
| 1 | SG-04 max_tokens修正（4096→8192） | **緊急** |
| 2 | AG-00 課題定義エージェント実装 | 高 |
| 3 | AG-00 UI実装 | 高 |

## 関連ファイル

- `improvements/15_CLAUDE_CODE_INSTRUCTIONS.md` — 実装指示書（これを読む）
- `improvements/14_AG00_ISSUE_DEFINITION.md` — AG-00の詳細仕様
- `prompts/ag-00-issue/default.md` — AG-00のプロンプト
- `docs/ARCHITECTURE_DIAGRAM.md` — システム全体構成図

## 最初にやること

```bash
# リポジトリのクローン
git clone https://github.com/sworks-d/Web_Proposal.git
cd Web_Proposal

# 依存関係インストール
npm install

# 指示書を確認
cat improvements/15_CLAUDE_CODE_INSTRUCTIONS.md
```
