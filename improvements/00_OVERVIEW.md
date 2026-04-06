# Web提案書エージェント改善案

## 現状の課題診断

リポジトリを分析した結果、以下の**構造的な問題**が見つかりました。

---

## 致命的な問題：ツールが実際に使えていない

### 問題の発見

`src/lib/anthropic-client.ts` を確認すると：

```typescript
const res = await anthropic.messages.create({
  model: getModel(modelType),
  max_tokens: maxTokens ?? defaultMax,
  system,
  messages: [{ role: 'user', content: user }],
  // ← toolsパラメータがない
})
```

**プロンプトで「web_searchを使え」と書いても、API呼び出し時にtoolsが渡されていないため、実際には使用できない。**

これが「情報の精度が低い」「情報量が足りない」の根本原因です。LLMの知識のみで分析している状態。

---

## 課題マップ

| 課題カテゴリ | 現状 | 根本原因 | 影響 |
|---|---|---|---|
| 情報精度・検証 | web_searchプロンプトはあるが機能していない | API呼び出しでtools未設定 | 全ての分析がLLM知識ベース依存 |
| ターゲット逆算 | ペルソナ・ジャーニーが推定のみ | 実データ連携なし＆検証プロセスなし | 提案の根拠が薄い |
| UI/UX・技術面 | ヒューリスティック評価のプロンプトはある | ブラウザ操作ツールがない | 実際のサイト評価ができていない |

---

## 改善ドキュメント一覧

| ファイル | 内容 | 優先度 |
|---|---|---|
| `01_ARCHITECTURE_FIX.md` | アーキテクチャ修正（ツール有効化） | **最優先** |
| `02_RESEARCH_ENHANCEMENT.md` | リサーチ・ファクトチェック強化 | 高 |
| `03_TARGET_DESIGN.md` | ターゲット逆算設計の強化 | 高 |
| `04_UIUX_TECH_ANALYSIS.md` | UI/UX・技術面分析の強化 | 高 |
| `05_NEW_PROMPTS.md` | 新規・改善プロンプト一覧 | 中 |
| `06_IMPLEMENTATION_STEPS.md` | 実装ステップ（Claude Code向け） | 中 |

---

## 改善の優先順位

### Phase 0: 致命的問題の修正（これなしに他は意味がない）
1. `anthropic-client.ts` にツール（web_search）を追加
2. エージェントがツールを使えるようにbaseAgentを修正

### Phase 1: 情報収集・検証の強化
1. AG-01-RESEARCH のweb_search回数拡張と検索戦略改善
2. AG-05-FACTCHECK にweb_search検証機能を追加
3. マルチパスファクトチェックの導入

### Phase 2: ターゲット設計の強化
1. ペルソナ検証プロセスの追加
2. ジャーニーの根拠付け強化
3. decisionCriteria の検索検証

### Phase 3: UI/UX・技術分析の強化
1. PageSpeed Insights API 連携
2. ブラウザ操作ツール（Claude in Chrome）連携
3. アクセシビリティ自動チェック追加

---

## 次のアクション

Claude Codeに投げる際は、以下の順序で実装してください：

1. まず `01_ARCHITECTURE_FIX.md` を読んで `anthropic-client.ts` を修正
2. 次に `02_RESEARCH_ENHANCEMENT.md` でリサーチエージェントを強化
3. その後、他のドキュメントを順次実装

**重要：Phase 0を完了しないと、他のプロンプト改善は効果がありません。**
