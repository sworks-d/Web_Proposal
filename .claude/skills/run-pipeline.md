# Skill: パイプライン実行

## Layer 1: Trigger

when:
  - ユーザーが「実行」「パイプラインを開始」「フルで流す」等を指示した時
  - 新規ProposalVersionが作成され初回実行が求められた時
  - バージョン更新で「AG-XXを再実行する」が指定された時

preconditions:
  - ProposalVersionが存在すること（versionId が確定していること）
  - ANTHROPIC_API_KEY が設定されていること
  - AG-01の場合：briefText が入力済みであること
  - AG-02以降の場合：前のAGの outputJson が存在すること

---

## Layer 2: Procedure

### 初回フルパイプライン実行

```
Step 1: ProposalVersionを作成する
  - versionNumber: 1
  - status: "DRAFT"
  - label: "初回提案"
  → versionId を取得して以降のステップで使用する

Step 2: AG-01を実行する
  INPUT: briefText, clientContext, 添付ファイル（あれば）
  TOOL: POST /api/executions { versionId, agentId: "AG-01" }
  WAIT: 完了まで最大60秒
  CHECK: outputJson が valid JSONであること
  ON_ERROR: エラーメッセージをUIに表示してStep 2を再試行する

Step 3: チェックポイント①を表示する
  SHOW: AG-01出力の primaryAGRecommendation と subAGRecommendations
  ACTION: CDが確認・修正して「この選択で実行」を押す
  SAVE: versionに primaryAgent, subAgents を保存する

Step 4: AG-02とAG-03を並列実行する
  PARALLEL:
    - POST /api/executions { versionId, agentId: "AG-02" }
    - POST /api/executions { versionId, agentId: "AG-03" }
  WAIT: 両方が COMPLETED になるまで待つ（最大120秒）
  CHECK: 両方の outputJson が valid JSONであること

Step 5: チェックポイント②を表示する
  SHOW: checkpoint-summary.tsを使って以下を生成する
    - 取れた情報（信頼度付き）
    - 取れなかった情報（ヒアリング項目一覧）
  ACTION: CDがヒアリング項目を入力してcdNotesに保存
  ACTION: CDが「このまま次へ」または「特定AGを再実行」を選択

Step 6: AG-04を実行する
  INPUT: AG-01〜03の outputJson + cdNotes
  TOOL: POST /api/executions { versionId, agentId: "AG-04" }
  WAIT: 最大90秒

Step 7: AG-05を実行する
  INPUT: AG-01〜04の全outputJson
  TOOL: POST /api/executions { versionId, agentId: "AG-05" }
  WAIT: 最大60秒
  GATE: overallQuality.score を確認する
    "fail" → チェックポイントで CDに報告・AG-05のcriticalBlockersを表示
    "conditional_pass" → CDに警告を表示してから続行確認
    "pass" → Step 8に進む

Step 8: チェックポイント③を表示する
  SHOW: AG-05の flaggedItems と requiresClientConfirmation
  SHOW: AG-06実行前の設計方針確認
  ACTION: CDが「AG-07の読み手種別SUB」を選択する（経営層/人事/マーケ等）

Step 9: AG-06を実行する
  INPUT: AG-01〜05の全outputJson + cdNotes
  TOOL: POST /api/executions { versionId, agentId: "AG-06" }
  WAIT: 最大90秒
  CHECK: slideOutlineのtotalSlides合計が20〜28の範囲内であること

Step 10: AG-07を実行する
  INPUT: AG-01〜06の全outputJson + audienceSub + cdNotes
  TOOL: POST /api/executions { versionId, agentId: "AG-07" }
  WAIT: 最大120秒

Step 11: スライド生成を実行する
  TOOL: POST /api/versions/{versionId}/slides
  → slide-generator.ts を呼び出して ProposalSlide を生成する

Step 12: 完了状態を設定する
  UPDATE: ProposalVersion.status = "COMPLETED"
  UPDATE: ProposalVersion.completedAt = now()
  SHOW: 目次・ページ構成パネル
```

### バージョン更新実行（差分更新）

```
Step 1: CreateUpdateModalでユーザーの選択を取得する
  - changeReason（必須）
  - label（任意）
  - agentsToRerun（再実行するAGのリスト）

Step 2: createNextVersion()を呼び出す
  - 再実行しないAGはisInherited=trueで前バージョンからコピー
  - 再実行するAGのExecutionは新規作成

Step 3: 依存関係チェックを行う
  再実行AGのindexより後のAGは全て再実行対象に追加する
  例: AG-03を再実行 → AG-04・05・06・07も再実行

Step 4: 通常のStep 4以降と同じフローで実行する
  （引き継ぎExecutionはスキップして新規Executionのみ実行）
```

---

## Layer 3: Verification

successCriteria:
  - 全AGのExecution.status が "COMPLETED" であること
  - AG-05.overallQuality.score が "pass" または "conditional_pass" であること
  - AG-07.totalSlides が 20〜25 の範囲内であること
  - ProposalSlide が生成されていること（slideNumber 1から連番）

errorHandling:
  APIError: |
    エラーメッセージをUIに赤バナーで表示する
    「再試行」ボタンを提供する（同じAGから再実行できる）
    5回以上失敗した場合は「手動で確認してください」とメッセージを出す
  TimeoutError: |
    90秒でタイムアウトした場合はエラーとして記録する
    そのAGの実行ログをUIに表示する
  JSONParseError: |
    outputJsonがparseできない場合は「出力形式エラー」として再実行を促す

outputValidation:
  - 全てのAG出力がvalid JSONであること
  - 必須フィールドが全て存在すること（スキーマ定義通り）
  - confidence フィールドが "high"|"medium"|"low" のいずれかであること
