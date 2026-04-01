# AG-07分割 + 提案書改善 実装計画

作成日: 2026-04-02
優先度: 高

---

## 背景と課題

### 現状の問題

1. **AG-07の出力が浅い**
   - 1セクションあたりの body テキストが100〜150字程度
   - 16384 max_tokens を全セクション（12〜15セクション）で割り切ることになり、各セクションが薄くなる
   - conceptWords / storyLine / sections の全てを1エージェントに詰め込みすぎ

2. **提案書の表示に階層がない**
   - 章タイトル・キャッチコピー・本文・根拠・ビジュアル指示・編集注が同じスタイルで並んでいる
   - 重要度・役割が見た目でわからない

3. **Export が機能していない / PDFにしたい**

---

## Task 1: AG-07 を3つに分割

### 設計方針

| エージェント | 役割 | max_tokens | 出力内容 |
|---|---|---|---|
| AG-07a（Story Architect） | 構造設計 | 8192 | readerProfile + conceptWords（3案）+ storyLine（章タイトル・役割・橋渡し）のみ |
| AG-07b（Proposal Writer 前半） | 章1〜3の執筆 | 16384 | ch-01〜03 の各セクション完全版（body 300〜500字、visualSuggestion詳細、editorNote） |
| AG-07c（Proposal Writer 後半） | 章4〜6の執筆 | 16384 | ch-04〜06 の各セクション完全版 + 全体のtotalSlides・estimatedBudget |

### ファイル変更一覧

**新規作成:**
- `src/agents/ag-07a-structure.ts`
- `src/agents/ag-07b-writer.ts`
- `src/agents/ag-07c-writer.ts`
- `prompts/ag-07a-structure/default.md`
- `prompts/ag-07b-writer/default.md`
- `prompts/ag-07c-writer/default.md`

**変更:**
- `src/agents/types.ts` — AgentId に `'AG-07A' | 'AG-07B' | 'AG-07C'` を追加（AG-07は後方互換で残す）
- `src/lib/pipeline.ts` — runAgentStep の switch に AG-07A/B/C を追加、extractContextSections に AG-07A を追加
- `src/app/api/executions/[id]/resume/route.ts` — Phase 3 を AG-06 → AG-07A → AG-07B → AG-07C に変更
- `src/app/api/executions/pipeline/route.ts` — agentOrder に AG-07A/B/C を追加
- `src/components/pipeline/SideBar.tsx` または該当コンポーネント — AG リストに AG-07A/B/C を追加

### AG-07a プロンプト設計

**入力:** AG-01〜06の出力サマリー
**出力スキーマ（コンパクト）:**
```json
{
  "readerProfile": { "primaryReader": "", "webLiteracy": "medium", "primaryConcerns": [], "toneAndManner": "" },
  "conceptWords": [{ "copy": "", "subCopy": "", "rationale": "" }],
  "storyLine": [
    {
      "chapterId": "ch-01",
      "chapterTitle": "",
      "role": "",
      "bridgeFromPrev": null,
      "estimatedSections": 3,
      "keySlideData": ["このチャプターで使うべき主要データ・根拠（AG参照ではなく実際の内容）"]
    }
  ]
}
```

**制約:**
- `storyLine` は6章構成
- AG内部参照（AG-02の〜など）を `keySlideData` に実際の内容として転記する
- JSON全体 6000字以内

### AG-07b/c プロンプト設計

**入力:** AG-01〜06サマリー + AG-07aの出力全文
**役割:** 担当章のセクションを完全執筆
**出力スキーマ（セクション詳細）:**
```json
{
  "chapters": [
    {
      "chapterId": "ch-01",
      "chapterTitle": "",
      "sections": [
        {
          "sectionId": "sec-01-01",
          "sectionTitle": "",
          "catchCopy": "（20字以内、このスライドのキャッチ）",
          "body": "（300〜500字の完全な本文。AG参照は一切書かない。事実と推論として統合して書く）",
          "bullets": ["本文の要点を箇条書き3〜5点（スライドに載せる短い文）"],
          "visualSpec": "（デザイナーに渡せるレベルの具体的なビジュアル仕様。何を・どう・なぜこのビジュアルか）",
          "caveats": ["不確実な情報・要クライアント確認事項（本文とは分離）"],
          "slideType": "title|chart|copy|flow|comparison|cta"
        }
      ]
    }
  ]
}
```

**執筆ルール（プロンプトで明示）:**
- `body` は必ず300字以上で書く。「CDへ」の注記は `caveats` に移動し本文には書かない
- AG内部参照（AG-02の〜、AG-04の〜）は本文に書かない。内容として統合して書く
- `bullets` はスライドに載せる文章として完結させる（体言止め可）
- `visualSpec` は「比較図」という指示だけでなく、何をどう並べるか・縦横何列か・キャプションは何かまで書く

---

## Task 2: パイプライン変更

### resume/route.ts の Phase 3

```typescript
} else if (phase === 3) {
  // AG-06
  ag06 = await runOrSkip(versionId, 'AG-06', ...)

  // AG-07A: 構造設計（軽量）
  ag07a = await runOrSkip(versionId, 'AG-07A', ...)

  // AG-07B: 前半執筆（重量）
  ag07b = await runOrSkip(versionId, 'AG-07B', ...)

  // AG-07C: 後半執筆（重量）
  ag07c = await runOrSkip(versionId, 'AG-07C', ...)

  await setVersionStatus(versionId, 'COMPLETED')
  send({ type: 'checkpoint', versionId, phase: 4, outputs: newOutputs })
  send({ type: 'pipeline_complete', versionId })
}
```

### agentOrder の更新

`['AG-01', 'AG-02', 'AG-03', 'AG-04', 'AG-05', 'AG-06', 'AG-07A', 'AG-07B', 'AG-07C']`

AG-07（旧）は下位互換のため AgentId に残すが、新規実行では使わない。

---

## Task 3: 提案書表示の改善

### 現状の問題

- `OutputPanel` で AG-07 のセクションが全て同じスタイルで並んでいる
- catchCopy / body / visualSpec / caveats の視覚的区別がない

### 改善内容

**新しい提案書ビュー（SlideView コンポーネント）:**

```
┌──────────────────────────────────┐
│ ch-01                            │  ← 章番号（薄グレー）
│ 今、採用市場で何が起きているか     │  ← chapterTitle（H2）
├──────────────────────────────────┤
│ ■ sec-01-01                      │  ← sectionId
│ 転職市場の地殻変動                │  ← sectionTitle（H3）
│                                  │
│ 「良い人材が来ない。それは、       │  ← catchCopy（大テキスト・目立つ色）
│  市場が変わったから。」           │
│                                  │
│ 数年前まで、電力会社の求人は…     │  ← body（通常テキスト・段落分け）
│ しかし今は違う。DX・エネルギー… │
│                                  │
│ ▸ 候補者への週複数通のスカウト    │  ← bullets（リスト）
│ ▸ 選ぶ基準は「安定」→「活きる」 │
│                                  │
│ 🎨 ビジュアル仕様                 │  ← visualSpec（折りたたみ可）
│ ⚠️ 確認事項                       │  ← caveats（黄色バッジ）
└──────────────────────────────────┘
```

**対応ファイル:**
- `src/components/proposal/ProposalSlideView.tsx` — 新コンポーネント作成
- `src/lib/output-renderer.ts` — renderAG07b / renderAG07c 追加
- `src/app/projects/[id]/page.tsx` — AG-07A/B/C 選択時に ProposalSlideView を表示

---

## Task 4: Export 改善

### 現状

- export route が `JSON.parse(result.outputJson)` で失敗している（rawText が JSON ではなく `AgentOutput` を期待している）
- ダウンロードが機能していない

### 修正

**即座に直すべき:**
- export route で `safeParseJson` を使う（現在は `JSON.parse` 直呼び）

**PDF出力（段階的対応）:**

Phase 1: Markdown → HTML 変換してブラウザで印刷
- `Content-Type: text/html` で返す
- `@media print` スタイルを埋め込む
- ブラウザの「PDFとして保存」で対応

Phase 2: サーバーサイドPDF生成（後日）
- `@react-pdf/renderer` または `puppeteer` を検討
- コスト・メンテナンス性を評価してから導入

---

## 実装順序

```
1. Task 4（Export バグ修正） ← 最短・独立・即効
2. Task 1（AG-07a プロンプト + エージェント実装）
3. Task 2（パイプライン組み込み）
4. Task 1（AG-07b/c プロンプト + エージェント実装）
5. Task 3（提案書表示改善）
```

---

## 未解決論点（実装前に確認が必要）

1. **AG-07b/c の入力設計:** AG-07aの出力（storyLine）を context として渡す。`extractContextSections` で AG-07A のどのフィールドを抽出するか
2. **既存 AG-07 との並存:** 旧バージョン（AG-07出力済み）のデータは UI でどう扱うか。renderAG07 は残す
3. **Phase 3 の実行時間:** AG-06 + AG-07A + AG-07B + AG-07C の4連続で合計 40〜60分かかる可能性。timeout 600s（10分）を超えるリスクがある → **Phase 3 を2つに分ける（AG-06 + AG-07A → CHECKPOINT、AG-07B + AG-07C → COMPLETED）を検討**
4. **storyLine の章数:** 現状6章。増やすことで総スライド数を増やせるが、07b/07c の分担境界も変わる

---

## 確認してほしい点

- Phase 3 を途中でチェックポイントにして AG-07A 確認後に 07B/C を走らせる設計にするか？（推奨）それとも Phase 3 全部流すか？
- ページ数の目安：現在 12〜15 スライド相当。何スライドくらいを目標にするか？（20〜30 スライドが実用的か）
