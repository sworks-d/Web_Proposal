# Skill: プロンプト改善

## Layer 1: Trigger

when:
  - CDが特定のAG出力に対して「この出力を改善する」をクリックした時
  - CDが「薄い・物足りない」「視点が違う」「形式を変えたい」を選択した時
  - CDが自由記述でフィードバックを入力した時

preconditions:
  - 改善対象のAgentResultが存在すること
  - 対象のプロンプトファイル（prompts/{agentId}/default.md）が存在すること
  - ANTHROPIC_API_KEY が設定されていること

---

## Layer 2: Procedure

### プロンプト改善案の生成

```
Step 1: 対象のプロンプトを読み込む
  READ: prompts/{agentId}/default.md
  VALIDATE: ファイルが存在すること・空でないこと

Step 2: CDのフィードバックを構造化する
  INPUT: feedbackCategory（"薄い"|"視点が違う"|"形式を変えたい"|"その他"）
  INPUT: feedbackText（CDの自由記述）
  COMBINE: category + text を診断の入力として使用する

Step 3: 改善案を生成するAPIを呼び出す
  CALL: POST /api/agents/{agentId}/improve
  PAYLOAD: {
    feedback: feedbackText,
    feedbackCategory: category,
    currentOutput: AgentResult.outputJson（先頭2000字）,
    currentPrompt: prompts/{agentId}/default.md の全文
  }
  MODEL: claude-sonnet-4-6
  WAIT: 最大60秒

Step 4: 改善案をパースする
  PARSE: response.content → {
    diagnosis: string,
    changes: string[],
    improvedPrompt: string
  }
  ON_PARSE_ERROR: 「改善案の生成に失敗しました」を表示して再試行を促す

Step 5: PromptImproveModalを表示する
  SHOW: diagnosis（何が問題だったか）
  SHOW: changes（変更点のリスト）
  SHOW: Before / After の差分表示
    - 変更前: 現在のプロンプト
    - 変更後: improvedPrompt
    - 差分はdiff形式で色分け表示する
  BUTTON: [この改善を適用する]
  BUTTON: [キャンセル]

Step 6: CDが「適用する」を選択した場合
  BACKUP: prompts/{agentId}/default.backup.{timestamp}.md を作成する
  WRITE: prompts/{agentId}/default.md に improvedPrompt を書き込む
  SAVE DB: PromptVersion レコードを作成する
    - agentId, version++, content, changeNote, cdFeedback
  GIT: git add prompts/{agentId}/default.md
       git commit -m "AG改善: {agentId} — {diagnosis前半50字}"
       git push origin main
  ON_GIT_ERROR: 「ローカルに保存しました（pushは手動で実行してください）」と表示
  SHOW: 「プロンプトを更新しました。次回のAG実行から反映されます」
```

### ロールバック（過去バージョンへの戻し）

```
Step 1: PromptVersionの一覧を取得する
  READ: DB から agentId でフィルタ・versionの降順で取得

Step 2: ロールバック先を選択させる
  SHOW: バージョン一覧（version番号・appliedAt・changeNote）

Step 3: 選択されたバージョンのcontentに戻す
  BACKUP: 現在のプロンプトをバックアップ
  WRITE: 選択バージョンの content を default.md に書き込む
  GIT: commit + push
```

---

## Layer 3: Verification

successCriteria:
  - improvedPrompt が valid Markdown であること
  - バックアップファイルが作成されていること
  - PromptVersion レコードが DB に保存されていること
  - Git commit が成功していること（またはローカル保存の旨を通知）

errorHandling:
  ファイル書き込みエラー: |
    「ファイルへの書き込みに失敗しました」を表示
    improvedPromptのテキストをコピーできるようにする
  Git pushエラー: |
    ローカルへの書き込みは成功している旨を伝える
    「git push origin main を手動で実行してください」と表示

outputValidation:
  - before と after の行数差が 20% を超える場合: 「大幅な変更です。確認してください」と警告
  - outputJson のスキーマ定義が削除されていないこと
  - hardLimits セクションが削除・緩和されていないこと
