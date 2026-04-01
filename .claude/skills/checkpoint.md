# Skill: チェックポイント処理

## Layer 1: Trigger

when:
  - 各フェーズのAG実行が完了してチェックポイントに到達した時
  - ユーザーが「確認待ち」のプロジェクトカードをクリックした時
  - AG-05がoverallQuality.score="conditional_pass"を返した時

preconditions:
  - 対象フェーズの全AGがCOMPLETED状態であること
  - checkpoint-summary.ts が利用可能であること

---

## Layer 2: Procedure

### チェックポイント① （AG-01完了後）

```
Step 1: AG-01の出力を解析する
  READ: AG-01.primaryAGRecommendation
  READ: AG-01.subAGRecommendations
  READ: AG-01.confidence
  READ: AG-01.missingInfo

Step 2: CheckpointReviewコンポーネントを表示する
  TITLE: "✋ チェックポイント① — AG選択・確認"
  SECTION A: 推奨AG選択（変更可）
    - primaryAGRecommendationを選択済みで表示
    - 変更可能なラジオボタン形式
  SECTION B: SUB選択（変更可）
    - subAGRecommendationsをチェック済みで表示
    - 複数選択可能
  SECTION C: AG-01のmissingInfoをヒアリング項目として表示
    - 各項目に自由記入欄を設ける

Step 3: CDが選択・入力して「実行」を押す
  SAVE: ProposalVersion.primaryAgent = 選択されたAG
  SAVE: ProposalVersion.subAgents = 選択されたSUBs（JSON配列）
  SAVE: ProposalVersion.cdNotes = CDが入力したヒアリング情報（AGId別）
  NEXT: AG-02・AG-03の並列実行を開始する
```

### チェックポイント② （AG-02・03完了後）

```
Step 1: checkpoint-summary.tsを実行する
  INPUT: AG-02・AG-03のAgentResult[]
  OUTPUT: { gotInfo[], missingInfo[] }

Step 2: CheckpointReviewコンポーネントを表示する
  TITLE: "✋ チェックポイント② — 市場・競合分析の確認"
  SECTION A: 取れた情報（信頼度付き）
    - gotInfo を confidence レベルでグループ化して表示
    - [high]: 確認済みファクト（緑）
    - [medium]: 推定・仮説（黄）
    - [low]: 不確かな情報（グレー）
  SECTION B: 取れなかった情報 → ヒアリング項目
    - missingInfo の各項目を表示
    - 各項目に「CDが確認した内容を入力」フィールドを設ける
  SECTION C: 判断を選択する
    - ○ このまま次へ進む
    - ○ 特定のAGを再実行する（チェックボックスでAG選択）

Step 3: CDが判断・入力して「実行」を押す
  IF 再実行が選択された場合:
    RERUN: 選択されたAGを再実行する
    RETURN: Step 1に戻る（再実行後に再度チェックポイント②を表示）
  IF 次へ進むが選択された場合:
    SAVE: cdNotesに確認済み情報を保存する
    NEXT: AG-04の実行を開始する
```

### チェックポイント③ （AG-05完了後）

```
Step 1: AG-05の出力を解析する
  READ: AG-05.overallQuality
  READ: AG-05.flaggedItems
  READ: AG-05.requiresClientConfirmation
  READ: AG-05.regulatoryFlags

Step 2: スコアに応じて表示を分岐する
  "pass":
    - 簡潔な確認画面を表示（"品質確認 OK"）
    - AG-06の読み手種別SUBを選択させる
    - 「実行」で AG-06へ進む

  "conditional_pass":
    - 黄色バナーで警告を表示
    - flaggedItemsを severity 順に一覧表示
    - requiresClientConfirmation を入力フィールドと共に表示
    - 「この状態で進む（リスクを理解した上で）」ボタンを表示

  "fail":
    - 赤バナーで停止を表示
    - criticalBlockers を一覧表示
    - どのAGを再実行すべきかを明示する
    - 「AG-XXを再実行する」ボタンを各ブロッカーに対して提供

Step 3: CDが「この選択で実行する」を押す
  SAVE: cdNotesに確認済み情報を保存する
  SAVE: audienceSub の選択を ProposalVersion に保存する
  NEXT: AG-06の実行を開始する
```

### チェックポイント④ （AG-07完了後）

```
Step 1: AG-07の出力を解析する
  READ: AG-07.conceptWords（3案）
  READ: AG-07.tableOfContents
  READ: AG-07.totalSlides

Step 2: 完了画面を表示する
  SHOW: conceptWords 3案（CDが1案を選択する）
  SHOW: tableOfContents（全スライドの目次）
  SHOW: totalSlides（「全XX枚」）
  SHOW: エクスポートオプション
    - [Markdownで確認]
    - [スライドプレビュー（A4横）]
    - ⏳ [pptxとして出力]（Phase 3）

Step 3: CDがコンセプトワードを選択する
  SAVE: 選択されたconceptWordsのindexをProposalVersionに保存する
  UPDATE: ProposalVersion.status = "COMPLETED"
```

---

## Layer 3: Verification

successCriteria:
  - cdNotesが正常に保存されていること
  - 各チェックポイントでCDの選択が記録されていること
  - "fail"状態のままAG-06に進んでいないこと

errorHandling:
  cdNotesのJSON保存失敗: |
    「保存に失敗しました」をUIに表示し再試行を促す
    内容はテキストエリアに残してCDが再入力できるようにする

outputValidation:
  - チェックポイント通過後に ProposalVersion の status が更新されていること
  - cdNotes が valid JSON として保存されていること
