# エージェント強化・チューニング機能 実装指示書

## 0. 設計の全体像

### 2層のチューニング構造

```
Layer 1: 案件レベル（一時的）
  CDが実行前・チェックポイントで入力
  → その案件のそのバージョンにだけ影響
  → DB: ProposalVersion.cdNotes に保存

Layer 2: AGレベル（永続的）
  CDがUIから「このAGのここを改善してほしい」と指示
  → AGが自分のプロンプトの改善案を生成
  → CDが確認してGitHubにpush
  → 以降の全案件に反映
```

### SUB構造の他AG展開

```
現在: AG-02 × SUB-業種（16種）
追加: AG-04 × SUB-PROBLEM-TYPE（課題種別）
      AG-07 × SUB-AUDIENCE（読み手種別）
      ※ AG-03・06は実案件を経てから判断
```

---

## 1. Layer 1：案件レベルの追加指示

### 1.1 実行前の追加指示（新規・既存）

```typescript
// src/components/pipeline/AdditionalInstruction.tsx

// 現状: 常に表示されている謎のテキストエリア（ラベルが不明）
// 改善: 各AGの実行前に「このAGへの追加指示」として表示

interface AdditionalInstructionProps {
  agentId: string
  agentName: string
  onSubmit: (instruction: string) => void
}

// 表示テキスト例:
// 「AG-03 競合分析への追加指示（任意）」
// placeholder: 「例: 競合はA社・B社に絞ってください
//                   東電のキャリアページのURLは https://... です
//                   ターゲットは30代転職者に焦点を当ててください」
```

### 1.2 AG実行時の追加指示の組み込み

```typescript
// src/agents/base-agent.ts の execute() を修正

async execute(input: AgentInput): Promise<AgentOutput> {
  const basePrompt = this.getPrompt(input.projectContext)

  // cdNotesがあれば末尾に追加
  const cdNote = input.cdNotes?.[this.id]
  const finalPrompt = cdNote
    ? `${basePrompt}\n\n---\n## CDからの追加指示・確認済み情報\n\n${cdNote}`
    : basePrompt

  // 以降は通常通り実行
  const response = await anthropic.messages.create({
    model: this.model,
    system: finalPrompt,
    messages: [{ role: 'user', content: this.buildUserMessage(input) }],
  })
  ...
}
```

---

## 2. Layer 2：AGブラッシュアップ機能

### 2.1 フィードバック収集UI

```typescript
// src/components/agent/AgentFeedback.tsx
// AG出力の下に常に表示する

// 表示:
// ┌─────────────────────────────────────────────────────┐
// │ この出力を改善する                                  │
// │                                                     │
// │ [薄い・物足りない] [視点が違う] [形式を変えたい]    │
// │ [その他: ___________________________________]        │
// │                                                     │
// │ 具体的に: ______________________________________    │
// │                                                     │
// │ [AG-03のプロンプトを改善する →]                    │
// └─────────────────────────────────────────────────────┘

interface AgentFeedbackProps {
  agentId: string
  agentName: string
  currentOutput: AgentResult
  onImprove: (feedback: string) => void
}
```

### 2.2 プロンプト改善API

CDのフィードバックを受けて、Claude自身が現在のプロンプトを改善する。

```typescript
// src/app/api/agents/[agentId]/improve/route.ts

export async function POST(req: NextRequest, { params }) {
  const { feedback, currentOutput } = await req.json()
  const agentId = params.agentId  // "ag-03-competitor" 等

  // 現在のプロンプトを読み込む
  const currentPrompt = loadPrompt(agentId)

  // Claude に改善案を生成させる
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4000,
    messages: [{
      role: 'user',
      content: `
あなたはプロンプトエンジニアです。
以下のエージェントプロンプトを、CDのフィードバックに基づいて改善してください。

## 現在のプロンプト
${currentPrompt}

## CDのフィードバック
${feedback}

## 実際の出力（改善が必要と判断された出力）
${JSON.stringify(JSON.parse(currentOutput), null, 2).slice(0, 2000)}

## 指示
1. フィードバックの本質的な問題を特定する
2. プロンプトのどこを・どう変えるべきかを説明する
3. 改善後のプロンプト全文を出力する

## 出力形式（JSON）
{
  "diagnosis": "何が問題だったか",
  "changes": ["変更点1", "変更点2"],
  "improvedPrompt": "改善後のプロンプト全文"
}
      `
    }],
  })

  const result = JSON.parse(
    response.content[0].type === 'text' ? response.content[0].text : '{}'
  )

  return NextResponse.json(result)
}
```

### 2.3 プロンプト改善確認UI

```typescript
// src/components/agent/PromptImproveModal.tsx

// 表示:
// ┌─────────────────────────────────────────────────────┐
// │ AG-03 プロンプト改善案                              │
// ├─────────────────────────────────────────────────────┤
// │ 診断: 競合分析の「戦略意図の読解」が表面的でした。  │
// │       サイト構造の説明で終わり、「なぜそう設計した  │
// │       か」まで踏み込めていませんでした。            │
// ├─────────────────────────────────────────────────────┤
// │ 変更点:                                             │
// │ ✎ Instructionsセクション2に「感想で終わらず戦略    │
// │   意図まで読む」の例示を追加                        │
// │ ✎ Constraintsに「〜が良い/悪い等の感想を禁止」追加 │
// ├─────────────────────────────────────────────────────┤
// │ 改善後のプロンプト                                  │
// │ [Before / After の差分表示]                         │
// ├─────────────────────────────────────────────────────┤
// │ [この改善を適用する →]  [キャンセル]               │
// │  ↓                                                  │
// │ GitHubにpushされ全案件に反映されます                │
// └─────────────────────────────────────────────────────┘

interface PromptImproveModalProps {
  agentId: string
  improvement: {
    diagnosis: string
    changes: string[]
    improvedPrompt: string
  }
  onApply: () => void
  onCancel: () => void
}
```

### 2.4 プロンプト適用API

```typescript
// src/app/api/agents/[agentId]/apply/route.ts

export async function POST(req: NextRequest, { params }) {
  const { improvedPrompt } = await req.json()
  const agentId = params.agentId

  const promptPath = path.join(
    process.cwd(), 'prompts', agentId, 'default.md'
  )

  // バックアップを作成
  const currentContent = fs.readFileSync(promptPath, 'utf-8')
  const backupPath = promptPath.replace(
    'default.md',
    `default.backup.${Date.now()}.md`
  )
  fs.writeFileSync(backupPath, currentContent)

  // 改善後のプロンプトを書き込む
  fs.writeFileSync(promptPath, improvedPrompt)

  // Git commit & push
  const { execSync } = require('child_process')
  try {
    execSync(`cd ${process.cwd()} && git add prompts/${agentId}/default.md && git commit -m "AG改善: ${agentId} — CDフィードバックによる改善" && git push origin main`)
    return NextResponse.json({ success: true, message: 'プロンプトを更新してGitHubにpushしました' })
  } catch (err) {
    // Git pushに失敗してもローカルには保存済み
    return NextResponse.json({ success: true, message: 'プロンプトをローカルに保存しました（push手動で行ってください）' })
  }
}
```

---

## 3. SUB構造の他AG展開

### 3.1 AG-04へのSUB追加（課題種別）

```
prompts/ag-04-sub-recruitment/default.md
→ 採用・人材確保を主課題とする案件固有のWhy-Why分析の視点

prompts/ag-04-sub-branding/default.md
→ ブランド認知・イメージ課題固有の構造化視点

prompts/ag-04-sub-dx/default.md
→ DX推進・デジタル変革課題固有の構造化視点
```

```typescript
// AG-04実行時のSUB組み込み
// AG-02と同じloadMarketPromptWithSub()の仕組みをそのまま流用

export class Ag04InsightAgent extends BaseAgent {
  private subIds: string[] = []

  setSubAgents(subIds: string[]) {
    this.subIds = subIds
  }

  getPrompt(context: ProjectContext): string {
    const primary = loadPrompt('ag-04-insight')
    if (this.subIds.length === 0) return primary

    const subContexts = this.subIds
      .map(id => loadSubPrompt(id))
      .filter(Boolean)
      .join('\n\n---\n\n')

    return `${primary}\n\n---\n\n# 課題種別コンテキスト\n\n${subContexts}`
  }
}
```

### 3.2 AG-07へのSUB追加（読み手種別）

```
prompts/ag-07-sub-executive/default.md
→ 経営層・役員向けのコピートーンと密度の調整
  「数字とリスクで語る・抽象から入る・時間を取らせない」

prompts/ag-07-sub-hr/default.md
→ 人事担当者向けのコピートーン
  「現場の課題から入る・比較材料を出す・承認しやすい材料」

prompts/ag-07-sub-marketing/default.md
→ マーケティング担当者向け
  「データと事例・競合比較・ROI訴求」
```

### 3.3 SUB選択UIの拡張

```typescript
// チェックポイントモーダルのSUB選択に追加

// フェーズ1チェックポイント（AG-01後）
// → AG-02のSUBを選択（現在の設計）

// フェーズ3チェックポイント（AG-04後）
// → AG-04のSUBを選択（課題種別）
//   「採用課題として掘り下げる」「ブランド課題として掘り下げる」等

// フェーズ4チェックポイント（AG-07前）
// → AG-07のSUBを選択（読み手種別）
//   「経営層向けに書く」「人事担当者向けに書く」等
```

---

## 4. プロンプトバージョン管理

AGプロンプトの変更履歴をDBで管理する。

```prisma
// schema.prisma に追加

model PromptVersion {
  id          String   @id @default(cuid())
  agentId     String   // "ag-03-competitor"
  version     Int      // 1, 2, 3...
  content     String   // プロンプト全文
  changeNote  String?  // 何を変えたか
  cdFeedback  String?  // CDのフィードバック原文
  appliedAt   DateTime @default(now())
}
```

```typescript
// プロンプト適用時にDBにも保存
await prisma.promptVersion.create({
  data: {
    agentId,
    version: (await getLatestVersion(agentId)) + 1,
    content: improvedPrompt,
    changeNote: improvement.diagnosis,
    cdFeedback: feedback,
  },
})
```

---

## 5. 実装優先順位

```
Priority 1（Layer 1・すぐ実装可能）:
  - AdditionalInstruction コンポーネントの改善
    （ラベルを明確化・AG別に表示・cdNotesへの保存）
  - base-agent.ts への cdNotes 組み込み

Priority 2（Layer 2・コア機能）:
  - AgentFeedback コンポーネント
  - /api/agents/[id]/improve エンドポイント
  - PromptImproveModal（Before/After差分表示）
  - /api/agents/[id]/apply エンドポイント

Priority 3（SUB拡張）:
  - AG-04のSUBプロンプト作成（課題種別・3種）
  - AG-07のSUBプロンプト作成（読み手種別・3種）
  - AG-04・07へのSUB組み込み実装

Priority 4（プロンプト管理）:
  - PromptVersion DBモデル追加
  - プロンプト変更履歴UI
  - 以前のバージョンへのロールバック機能
```

---

## 6. セキュリティ注意事項

```
- /api/agents/[id]/apply はローカル環境専用
  → 本番環境（将来）ではGitHub PR作成に変更する

- プロンプトの書き込み前に必ずバックアップを作成
  → prompts/{agentId}/default.backup.{timestamp}.md

- 適用前に必ずCDが差分を確認する
  → 自動適用は行わない・必ず人間の承認を経る

- Git pushに失敗してもローカルは更新済み
  → エラー時はメッセージで手動push を促す
```
