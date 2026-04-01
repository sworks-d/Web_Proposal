# Skill: スライド生成・提案書出力

## Layer 1: Trigger

when:
  - AG-07が COMPLETED になった時（自動トリガー）
  - CDが「スライドを再生成する」をクリックした時
  - コンセプトワードが変更された時（影響スライドのみ再生成）

preconditions:
  - AG-07のAgentResultが存在すること
  - AG-07.totalSlides が 20〜25 の範囲内であること
  - ProposalVersion.status が "COMPLETED" であること

---

## Layer 2: Procedure

### スライド生成

```
Step 1: AG-07の出力を解析する
  READ: AG-07.conceptWords（選択済みindexのもの）
  READ: AG-07.storyLine
  READ: AG-07.sections
  READ: AG-07.tableOfContents
  READ: AG-07.totalSlides

Step 2: 既存スライドを削除する（再生成の場合）
  DELETE: ProposalSlide WHERE versionId = {versionId}

Step 3: スライドを順番に生成する
  FOR each entry in tableOfContents:
    MATCH: sections から sectionId で該当セクションを取得
    CREATE: ProposalSlide {
      versionId,
      slideNumber: entry.slideNumber,
      chapterId: entry.chapterId,
      sectionId: entry.sectionId,
      title: section.sectionTitle or entry.title,
      catchCopy: section.catchCopy or null,
      body: [section.essentiallyLine, "---", section.body].join("\n\n"),
      slideType: entry.slideType,
      layoutHint: slideTypeからlayoutHintを決定する（下記ルール参照）
    }

  layoutHint決定ルール:
    COVER       → "cover-full"
    TOC         → "toc"
    CHAPTER_TITLE → "chapter-title"
    CONTENT:
      section.visualSuggestion に "[数字強調]" を含む → "number-hero"
      section.visualSuggestion に "[比較表]" を含む   → "two-column"
      section.visualSuggestion に "[フロー図]" を含む  → "flow-diagram"
      その他                                          → "text-main"
    APPENDIX    → "appendix"

Step 4: 生成結果を確認する
  COUNT: 生成されたProposalSlideの件数
  VALIDATE: slideNumber が 1 から連番であること
  VALIDATE: COVER スライドが1件存在すること
  VALIDATE: TOC スライドが1件存在すること

Step 5: 目次・ページ構成パネルを更新する
  EMIT: "slides-generated" イベント
  UPDATE: UI の目次パネルを再描画する
```

### A4横スライドプレビュー

```
Step 1: スライド一覧を取得する
  READ: ProposalSlide WHERE versionId = {versionId} ORDER BY slideNumber

Step 2: SlidePreviewコンポーネントを描画する
  SIZE: width=1190px, height=842px（A4横の実寸・px換算）
  SCALE: 画面幅に応じてscaleを自動調整する（min: 0.4, max: 0.8）
  LAYOUT: layoutHint に応じてレイアウトコンポーネントを選択する
    "cover-full"    → CoverLayout
    "toc"           → TocLayout
    "chapter-title" → ChapterTitleLayout
    "number-hero"   → NumberHeroLayout
    "two-column"    → TwoColumnLayout
    "flow-diagram"  → FlowDiagramLayout（Mermaid.jsを使用）
    "text-main"     → TextMainLayout
    "appendix"      → AppendixLayout

Step 3: ナビゲーションを提供する
  SHOW: 前へ / 次へ ボタン
  SHOW: スライド番号（XX / YY）
  SHOW: 目次クリックで該当スライドにジャンプ
  SHOW: 各スライドに「編集」ボタン（catchCopy・bodyを直接編集可能）
```

### Markdownエクスポート

```
Step 1: 全スライドを取得する
  READ: ProposalSlide[] ORDER BY slideNumber

Step 2: Markdownとして整形する
  FORMAT:
    # {conceptWords.copy}
    ### {conceptWords.subCopy}
    ---
    FOR each slide:
      ## {slide.title}
      > {slide.catchCopy}

      {slide.body}
      ---

Step 3: ファイルとしてダウンロードする
  FILENAME: {clientName}_{projectTitle}_v{versionNumber}_{YYYYMMDD}.md
  ENCODING: UTF-8
  TRIGGER: ブラウザのファイルダウンロードを起動する
```

### スライドの個別編集

```
Step 1: 編集対象スライドを特定する
  READ: ProposalSlide WHERE slideNumber = {targetSlideNumber}

Step 2: インライン編集UIを表示する
  EDITABLE FIELDS:
    - title（スライドタイトル）
    - catchCopy（20字以内）
    - body（Markdown形式）

Step 3: 変更を保存する
  UPDATE: ProposalSlide の該当フィールド
  UPDATE: updatedAt = now()
  NOTE: 個別編集はDB直接更新。AGの出力は変更しない（editedJson相当）
```

---

## Layer 3: Verification

successCriteria:
  - ProposalSlide の件数が AG-07.totalSlides と一致すること
  - slideNumber が 1 から連番であること（欠番なし）
  - COVER・TOC がそれぞれ1件であること
  - 全スライドに title が存在すること（nullは不可）

errorHandling:
  slideCount不一致: |
    「スライド生成に不整合があります（期待: {expected}件 / 生成: {actual}件）」
    再生成ボタンを提供する
  layoutHint不明: |
    "text-main" にフォールバックする（エラーにしない）
  Markdownエクスポート失敗: |
    テキストエリアにMarkdownを表示してコピーできるようにする

outputValidation:
  - 全スライドのbodyが空でないこと（catchCopyはnull許容）
  - A4横比率（1190:842 ≒ 1.413:1）を維持したプレビューであること
  - スライド番号とtableOfContentsのslideNumberが一致すること
