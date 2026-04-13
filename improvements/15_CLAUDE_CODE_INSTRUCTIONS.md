# Claude Code 実装指示書

## 概要

この文書は、Web提案システムの以下の実装タスクをまとめたものです。

| # | タスク | 優先度 | 難易度 |
|---|---|---|---|
| 1 | SG-04 max_tokensエラー修正 | **緊急** | 低 |
| 2 | AG-00 課題定義エージェント新規実装 | 高 | 中 |
| 3 | AG-00 UI実装 | 高 | 中 |
| 4 | DBスキーマ変更 | 高 | 低 |
| 5 | 既存フローへの組み込み | 高 | 中 |
| 6 | 後続AGへの引き継ぎ | 高 | 中 |

---

# タスク1: SG-04 max_tokensエラー修正（緊急）

## 問題

`SG-04:ch-05` で JSON パースエラーが発生。出力が途中で切れている。

```
SG-04:ch-05 JSON parse failed. Raw: ```json
{ "chapterId": "ch-05", "slides": [ { ... } ...
```

## 原因

`src/agents/sg-04.ts` の `maxTokens` が `4096` で、チャプターの出力が大きい場合に不足。

## 修正

**ファイル:** `src/agents/sg-04.ts`

```typescript
// 変更前
protected maxTokens = 4096  // 1チャプター分に絞る

// 変更後
protected maxTokens = 8192  // チャプターによっては大きくなるため余裕を持たせる
```

## 確認方法

1. プロジェクトでSG生成を実行
2. `SG-04:ch-05` がエラーなく完了することを確認
3. 全チャプターのスライドが正しく生成されることを確認

---

# タスク2: AG-00 課題定義エージェント実装

## 概要

AGパイプラインの最初に実行し、クライアントの「問題」から「課題」を導出するエージェント。

## 仕様

詳細は `improvements/14_AG00_ISSUE_DEFINITION.md` を参照。

## 作成ファイル

### 2-1. 型定義の追加

**ファイル:** `src/agents/types.ts` に追加

```typescript
// AG-00 出力型
export interface Ag00Problem {
  id: string
  text: string
  category: 'brand' | 'content' | 'ux' | 'target' | 'tech'
  isRoot: boolean
  causedBy?: string[]
  causes?: string[]
}

export interface Ag00Issue {
  id: string
  title: string
  description: string
  rootProblems: string[]
  impact: 'high' | 'medium' | 'low'
  impactReason: string
  difficulty: 'high' | 'medium' | 'low'
  difficultyReason: string
  solvingApproach: string
  agFocus: string[]
}

export interface Ag00Question {
  id: string
  question: string
  why: string
  example?: string
}

export interface Ag00Output {
  problems: Ag00Problem[]
  causalTree: {
    rootCauses: string[]
    symptoms: string[]
    chains: { from: string; to: string }[]
  }
  issues: Ag00Issue[]
  additionalQuestions: {
    issueId: string
    questions: Ag00Question[]
  }[]
  commonQuestions: Ag00Question[]
  recommendation: {
    priorityIssues: string[]
    reason: string
  }
}

// QA回答の状態
export type QuestionStatus = 'answered' | 'unknown' | 'not_needed'

export interface QuestionAnswer {
  questionId: string
  status: QuestionStatus
  answer?: string
}

// AG-00からAGパイプラインへの入力
export interface SelectedIssue {
  id: string
  title: string
  description: string
  agFocus: string[]
}

export interface AgPipelineInput {
  briefText: string
  clientInfo: Record<string, unknown>
  selectedIssues: SelectedIssue[]
  questionAnswers: QuestionAnswer[]
}
```

### 2-2. エージェントクラス

**ファイル:** `src/agents/ag-00-issue.ts`（新規作成）

```typescript
import { BaseAgent } from './base-agent'
import { Ag00Output } from './types'
import { loadPrompt } from '@/lib/prompt-loader'

export class Ag00IssueAgent extends BaseAgent {
  id = 'AG-00-ISSUE'
  name = '課題定義'
  modelType = 'quality' as const  // Sonnet
  maxTokens = 8192

  getSystemPrompt(): string {
    return loadPrompt('ag-00-issue/default.md')
  }

  buildUserMessage(input: { problems: string[]; briefText: string; clientInfo: Record<string, unknown> }): string {
    const { problems, briefText, clientInfo } = input

    const problemList = problems.map((p, i) => `${i + 1}. ${p}`).join('\n')

    return `## クライアント情報

企業名: ${clientInfo.companyName ?? '（未入力）'}
業界: ${clientInfo.industry ?? '（未入力）'}
URL: ${clientInfo.url ?? '（未入力）'}

## ヒアリング情報

${briefText}

## 入力された問題

${problemList}

---

上記の問題を分析し、課題候補を3〜5個生成してください。
JSON形式のみで出力してください。`
  }

  parseResponse(raw: string): Ag00Output {
    const jsonMatch = raw.match(/```json\s*([\s\S]*?)\s*```/) || raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('AG-00: JSON not found in response')
    }
    const jsonStr = jsonMatch[1] ?? jsonMatch[0]
    return JSON.parse(jsonStr) as Ag00Output
  }
}
```

### 2-3. API エンドポイント

**ファイル:** `src/app/api/ag-00/route.ts`（新規作成）

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { Ag00IssueAgent } from '@/agents/ag-00-issue'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { problems, briefText, clientInfo } = body

    if (!problems || !Array.isArray(problems) || problems.length === 0) {
      return NextResponse.json({ error: 'problems is required' }, { status: 400 })
    }

    const agent = new Ag00IssueAgent()
    const result = await agent.run({ problems, briefText: briefText ?? '', clientInfo: clientInfo ?? {} })

    return NextResponse.json(result)
  } catch (error) {
    console.error('AG-00 error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
```

### 2-4. プロンプトローダーの確認

**ファイル:** `src/lib/prompt-loader.ts`

既存の `loadPrompt` 関数が `prompts/` ディレクトリからMarkdownを読み込めることを確認。
なければ以下を作成：

```typescript
import fs from 'fs'
import path from 'path'

export function loadPrompt(relativePath: string): string {
  const fullPath = path.join(process.cwd(), 'prompts', relativePath)
  return fs.readFileSync(fullPath, 'utf-8')
}
```

---

# タスク3: AG-00 UI実装

## 概要

課題定義のためのUIを実装する。3ステップのフロー：

1. 問題入力
2. 課題選択 + QA回答
3. 分析開始

## 作成ファイル

### 3-1. コンポーネント

**ファイル:** `src/components/IssueDefinitionPanel.tsx`（新規作成）

```tsx
'use client'
import { useState } from 'react'
import { Ag00Output, Ag00Issue, QuestionAnswer, QuestionStatus } from '@/agents/types'

type Step = 'input' | 'select' | 'done'

interface Props {
  briefText: string
  clientInfo: Record<string, unknown>
  onComplete: (selectedIssues: Ag00Issue[], answers: QuestionAnswer[]) => void
  onCancel: () => void
}

export function IssueDefinitionPanel({ briefText, clientInfo, onComplete, onCancel }: Props) {
  const [step, setStep] = useState<Step>('input')
  const [problemText, setProblemText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ag00Output, setAg00Output] = useState<Ag00Output | null>(null)
  const [selectedIssueIds, setSelectedIssueIds] = useState<Set<string>>(new Set())
  const [answers, setAnswers] = useState<Record<string, { status: QuestionStatus; answer?: string }>>({})

  // 問題をパース（箇条書き or 改行区切り）
  function parseProblems(text: string): string[] {
    return text
      .split(/\n/)
      .map(line => line.replace(/^[\s・\-\*\d\.]+/, '').trim())
      .filter(line => line.length > 0)
  }

  // AG-00を実行
  async function handleAnalyze() {
    const problems = parseProblems(problemText)
    if (problems.length === 0) {
      setError('問題を1つ以上入力してください')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/ag-00', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problems, briefText, clientInfo }),
      })

      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      const data: Ag00Output = await res.json()
      setAg00Output(data)

      // 推奨課題をデフォルト選択
      setSelectedIssueIds(new Set(data.recommendation.priorityIssues))

      setStep('select')
    } catch (e) {
      setError(e instanceof Error ? e.message : '分析に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  // 課題の選択トグル
  function toggleIssue(issueId: string) {
    setSelectedIssueIds(prev => {
      const next = new Set(prev)
      if (next.has(issueId)) {
        next.delete(issueId)
      } else {
        next.add(issueId)
      }
      return next
    })
  }

  // QA回答の更新
  function updateAnswer(questionId: string, status: QuestionStatus, answer?: string) {
    setAnswers(prev => ({
      ...prev,
      [questionId]: { status, answer },
    }))
  }

  // 完了
  function handleComplete() {
    if (!ag00Output) return

    const selectedIssues = ag00Output.issues.filter(i => selectedIssueIds.has(i.id))
    const questionAnswers: QuestionAnswer[] = Object.entries(answers).map(([questionId, { status, answer }]) => ({
      questionId,
      status,
      answer,
    }))

    onComplete(selectedIssues, questionAnswers)
  }

  // インパクト・難易度の表示
  function renderLevel(level: 'high' | 'medium' | 'low') {
    const map = { high: '◉◉◉', medium: '◉◉○', low: '◉○○' }
    return map[level]
  }

  // ステップ1: 問題入力
  if (step === 'input') {
    return (
      <div className="issue-panel">
        <h2>STEP 1/2: 問題を入力</h2>
        <p>クライアントが感じている問題を入力してください（複数可・箇条書きOK）</p>

        <textarea
          value={problemText}
          onChange={e => setProblemText(e.target.value)}
          placeholder={`・採用サイトからの応募が少ない\n・知名度が低いと言われる\n・競合サイトと比べて古臭い`}
          rows={8}
          style={{ width: '100%', padding: '12px', fontSize: '14px' }}
        />

        {error && <div className="error">{error}</div>}

        <div className="actions">
          <button onClick={onCancel} disabled={loading}>キャンセル</button>
          <button onClick={handleAnalyze} disabled={loading || !problemText.trim()}>
            {loading ? '分析中...' : '課題を分析する →'}
          </button>
        </div>
      </div>
    )
  }

  // ステップ2: 課題選択 + QA
  if (step === 'select' && ag00Output) {
    return (
      <div className="issue-panel">
        <h2>STEP 2/2: 課題を選択</h2>
        <p>解決したい課題を選択してください。追加情報があると精度が上がります。</p>

        {ag00Output.issues.map(issue => {
          const isSelected = selectedIssueIds.has(issue.id)
          const questions = ag00Output.additionalQuestions.find(q => q.issueId === issue.id)?.questions ?? []

          return (
            <div key={issue.id} className={`issue-card ${isSelected ? 'selected' : ''}`}>
              <div className="issue-header" onClick={() => toggleIssue(issue.id)}>
                <input type="checkbox" checked={isSelected} readOnly />
                <div>
                  <strong>{issue.title}</strong>
                  <p>{issue.description}</p>
                  <div className="issue-meta">
                    インパクト: {renderLevel(issue.impact)} &nbsp;
                    難易度: {renderLevel(issue.difficulty)}
                  </div>
                </div>
              </div>

              {isSelected && questions.length > 0 && (
                <div className="issue-questions">
                  <div className="questions-header">▼ 追加情報（精度が上がります）</div>
                  {questions.map(q => {
                    const current = answers[q.id] ?? { status: 'answered' as QuestionStatus }
                    return (
                      <div key={q.id} className="question-item">
                        <div className="question-text">
                          <strong>Q. {q.question}</strong>
                          <span className="question-why">→ {q.why}</span>
                        </div>

                        {current.status === 'answered' && (
                          <textarea
                            placeholder={q.example ?? '回答を入力...'}
                            value={current.answer ?? ''}
                            onChange={e => updateAnswer(q.id, 'answered', e.target.value)}
                            rows={2}
                          />
                        )}

                        {current.status === 'unknown' && (
                          <div className="status-message">→ 御社の情報から推測します</div>
                        )}

                        {current.status === 'not_needed' && (
                          <div className="status-message">→ この観点は分析しません</div>
                        )}

                        <div className="question-actions">
                          {current.status !== 'answered' && (
                            <button onClick={() => updateAnswer(q.id, 'answered')}>回答する</button>
                          )}
                          {current.status !== 'unknown' && (
                            <button onClick={() => updateAnswer(q.id, 'unknown')}>わからない</button>
                          )}
                          {current.status !== 'not_needed' && (
                            <button onClick={() => updateAnswer(q.id, 'not_needed')}>不要</button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}

        {/* 共通質問 */}
        {ag00Output.commonQuestions.length > 0 && (
          <div className="common-questions">
            <h3>▼ 共通の質問（すべての課題に影響）</h3>
            {ag00Output.commonQuestions.map(q => {
              const current = answers[q.id] ?? { status: 'answered' as QuestionStatus }
              return (
                <div key={q.id} className="question-item">
                  <div className="question-text">
                    <strong>Q. {q.question}</strong>
                    <span className="question-why">→ {q.why}</span>
                  </div>

                  {current.status === 'answered' && (
                    <textarea
                      placeholder={q.example ?? '回答を入力...'}
                      value={current.answer ?? ''}
                      onChange={e => updateAnswer(q.id, 'answered', e.target.value)}
                      rows={2}
                    />
                  )}

                  <div className="question-actions">
                    {current.status !== 'answered' && (
                      <button onClick={() => updateAnswer(q.id, 'answered')}>回答する</button>
                    )}
                    {current.status !== 'unknown' && (
                      <button onClick={() => updateAnswer(q.id, 'unknown')}>わからない</button>
                    )}
                    {current.status !== 'not_needed' && (
                      <button onClick={() => updateAnswer(q.id, 'not_needed')}>不要</button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div className="actions">
          <button onClick={() => setStep('input')}>← 問題を修正</button>
          <button
            onClick={handleComplete}
            disabled={selectedIssueIds.size === 0}
          >
            この課題で分析開始 →
          </button>
        </div>
      </div>
    )
  }

  return null
}
```

### 3-2. スタイル

**ファイル:** `src/components/IssueDefinitionPanel.css`（新規作成）または既存のグローバルCSSに追加

```css
.issue-panel {
  padding: 32px;
  max-width: 720px;
  margin: 0 auto;
}

.issue-panel h2 {
  font-size: 18px;
  font-weight: 900;
  margin-bottom: 8px;
}

.issue-panel > p {
  color: var(--ink3);
  font-size: 13px;
  margin-bottom: 20px;
}

.issue-card {
  border: 1px solid var(--line);
  border-radius: 4px;
  margin-bottom: 16px;
  overflow: hidden;
}

.issue-card.selected {
  border-color: var(--ink);
}

.issue-header {
  display: flex;
  gap: 12px;
  padding: 16px;
  cursor: pointer;
}

.issue-header input[type="checkbox"] {
  margin-top: 4px;
}

.issue-meta {
  font-size: 11px;
  color: var(--ink3);
  margin-top: 8px;
}

.issue-questions {
  border-top: 1px solid var(--line);
  padding: 16px;
  background: var(--bg2);
}

.questions-header {
  font-size: 11px;
  font-weight: 700;
  color: var(--ink3);
  margin-bottom: 12px;
}

.question-item {
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--line);
}

.question-item:last-child {
  border-bottom: none;
  margin-bottom: 0;
  padding-bottom: 0;
}

.question-text strong {
  display: block;
  font-size: 13px;
  margin-bottom: 4px;
}

.question-why {
  font-size: 11px;
  color: var(--ink3);
}

.question-item textarea {
  width: 100%;
  margin-top: 8px;
  padding: 8px;
  font-size: 13px;
  border: 1px solid var(--line);
  border-radius: 3px;
}

.question-actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.question-actions button {
  font-size: 11px;
  padding: 4px 10px;
  border: 1px solid var(--line);
  border-radius: 3px;
  background: var(--bg);
  cursor: pointer;
}

.status-message {
  font-size: 12px;
  color: var(--ink3);
  padding: 8px 0;
}

.common-questions {
  margin-top: 24px;
  padding-top: 24px;
  border-top: 2px solid var(--line);
}

.common-questions h3 {
  font-size: 13px;
  font-weight: 700;
  margin-bottom: 16px;
}

.actions {
  display: flex;
  justify-content: space-between;
  margin-top: 24px;
}

.actions button {
  padding: 12px 24px;
  font-size: 13px;
  font-weight: 700;
  border-radius: 4px;
  cursor: pointer;
}

.actions button:last-child {
  background: var(--ink);
  color: #fff;
  border: none;
}

.actions button:first-child {
  background: var(--bg);
  border: 1px solid var(--line);
}

.error {
  color: var(--red);
  font-size: 13px;
  margin: 12px 0;
}
```

---

# 実装順序

1. **タスク1**: SG-04 max_tokens修正（5分）
2. **タスク2**: AG-00 バックエンド実装（30分）
   - 型定義追加
   - エージェントクラス作成
   - APIエンドポイント作成
3. **タスク3**: AG-00 UI実装（45分）
   - コンポーネント作成
   - スタイル追加
   - 既存フローへの組み込み

---

# テスト方法

## タスク1のテスト

```bash
# 開発サーバー起動
npm run dev

# 任意のプロジェクトでSG生成を実行
# SG-04:ch-05 がエラーなく完了することを確認
```

## タスク2のテスト

```bash
# APIを直接テスト
curl -X POST http://localhost:3000/api/ag-00 \
  -H "Content-Type: application/json" \
  -d '{
    "problems": ["採用サイトからの応募が少ない", "競合と比べて古臭い"],
    "briefText": "建設会社の採用サイトリニューアル",
    "clientInfo": { "companyName": "〇〇建設", "industry": "建設" }
  }'
```

## タスク3のテスト

1. 新規プロジェクト作成画面を開く
2. 問題入力 → 課題選択 → QA回答 のフローを確認
3. 選択した課題がAGパイプラインに渡されることを確認

---

# 関連ファイル

| ファイル | 説明 |
|---|---|
| `improvements/14_AG00_ISSUE_DEFINITION.md` | AG-00の詳細仕様 |
| `prompts/ag-00-issue/default.md` | AG-00のプロンプト |
| `docs/ARCHITECTURE_DIAGRAM.md` | システム全体構成図 |

---

# タスク4: DBスキーマ変更

## 概要

AG-00の出力と、選択された課題・QA回答を保存するためのフィールドを追加。

## 変更ファイル

**ファイル:** `prisma/schema.prisma`

`ProposalVersion`モデルに以下を追加：

```prisma
model ProposalVersion {
  // ... 既存フィールド ...

  // AG-00関連（新規追加）
  problemsInput     String?   // JSON: 入力された問題リスト
  ag00Output        String?   // JSON: AG-00の出力全体
  selectedIssues    String?   // JSON: 選択された課題のID配列
  questionAnswers   String?   // JSON: QA回答 [{ questionId, status, answer }]

  // ... 既存フィールド ...
}
```

## マイグレーション

```bash
npx prisma migrate dev --name add_ag00_fields
```

---

# タスク5: 既存フローへの組み込み

## 概要

プロジェクト作成フローを以下のように変更：

```
現在:
  プロジェクト作成 → ヒアリング入力 → AG実行

変更後:
  プロジェクト作成 → ヒアリング入力 → 問題入力 → AG-00 → 課題選択 → AG実行
```

## 変更ファイル

### 5-1. プロジェクト詳細ページ

**ファイル:** `src/app/projects/[id]/page.tsx`（または該当するページ）

AG実行ボタンの前に、課題定義フローを追加：

```tsx
import { IssueDefinitionPanel } from '@/components/IssueDefinitionPanel'

// 状態管理
const [showIssuePanel, setShowIssuePanel] = useState(false)
const [issuesReady, setIssuesReady] = useState(false)

// 課題定義完了時
async function handleIssueComplete(selectedIssues: Ag00Issue[], answers: QuestionAnswer[]) {
  // DBに保存
  await fetch(`/api/versions/${versionId}/issues`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ selectedIssues, questionAnswers: answers }),
  })
  
  setIssuesReady(true)
  setShowIssuePanel(false)
}

// UI
{!issuesReady && (
  <button onClick={() => setShowIssuePanel(true)}>
    課題を定義する
  </button>
)}

{showIssuePanel && (
  <IssueDefinitionPanel
    briefText={version.briefText}
    clientInfo={{ companyName: project.client.name, industry: project.client.industry }}
    onComplete={handleIssueComplete}
    onCancel={() => setShowIssuePanel(false)}
  />
)}

{issuesReady && (
  <button onClick={handleStartAG}>
    分析を開始する
  </button>
)}
```

### 5-2. 課題保存API

**ファイル:** `src/app/api/versions/[versionId]/issues/route.ts`（新規作成）

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  req: NextRequest,
  { params }: { params: { versionId: string } }
) {
  try {
    const { selectedIssues, questionAnswers } = await req.json()

    await prisma.proposalVersion.update({
      where: { id: params.versionId },
      data: {
        selectedIssues: JSON.stringify(selectedIssues),
        questionAnswers: JSON.stringify(questionAnswers),
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Save issues error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { versionId: string } }
) {
  try {
    const version = await prisma.proposalVersion.findUnique({
      where: { id: params.versionId },
      select: { selectedIssues: true, questionAnswers: true, ag00Output: true },
    })

    if (!version) {
      return NextResponse.json({ error: 'Version not found' }, { status: 404 })
    }

    return NextResponse.json({
      selectedIssues: version.selectedIssues ? JSON.parse(version.selectedIssues) : null,
      questionAnswers: version.questionAnswers ? JSON.parse(version.questionAnswers) : null,
      ag00Output: version.ag00Output ? JSON.parse(version.ag00Output) : null,
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
  }
}
```

---

# タスク6: 後続AGへの引き継ぎ

## 概要

選択された課題とQA回答を、後続AGのプロンプトに注入する。

## 変更ファイル

### 6-1. BaseAgentの変更

**ファイル:** `src/agents/base-agent.ts`

`buildUserMessage`メソッドに課題情報を追加：

```typescript
protected buildUserMessage(input: AgentInput): string {
  const ctx = input.projectContext
  
  // ... 既存のコード ...

  // AG-00から引き継いだ課題情報を追加
  if (ctx.selectedIssues && ctx.selectedIssues.length > 0) {
    lines.push('')
    lines.push('## 解決すべき課題')
    lines.push('')
    ctx.selectedIssues.forEach((issue, i) => {
      lines.push(`${i + 1}. ${issue.title}`)
      lines.push(`   ${issue.description}`)
    })
  }

  // QA回答（answered と unknown のみ）
  if (ctx.questionAnswers && ctx.questionAnswers.length > 0) {
    const answered = ctx.questionAnswers.filter(q => q.status === 'answered' && q.answer)
    const unknown = ctx.questionAnswers.filter(q => q.status === 'unknown')
    
    if (answered.length > 0 || unknown.length > 0) {
      lines.push('')
      lines.push('## 追加情報')
      lines.push('')
      
      answered.forEach(q => {
        lines.push(`- ${q.question}: ${q.answer}`)
      })
      
      if (unknown.length > 0) {
        lines.push('')
        lines.push('以下は情報がないため、推測してください（出力に「※推測」とマーク）:')
        unknown.forEach(q => {
          lines.push(`- ${q.question}`)
        })
      }
    }
  }

  // ... 既存のコード ...
}
```

### 6-2. ProjectContextの型定義変更

**ファイル:** `src/agents/types.ts`

`ProjectContext`に課題情報を追加：

```typescript
export interface ProjectContext {
  // ... 既存フィールド ...

  // AG-00から引き継ぎ
  selectedIssues?: {
    id: string
    title: string
    description: string
    agFocus: string[]
  }[]
  questionAnswers?: {
    questionId: string
    question?: string  // 表示用
    status: 'answered' | 'unknown' | 'not_needed'
    answer?: string
  }[]
}
```

### 6-3. AGパイプライン開始時の読み込み

**ファイル:** `src/app/api/versions/[versionId]/pipeline/route.ts`（または該当するAPI）

AGパイプライン開始時に課題情報を読み込んでcontextに追加：

```typescript
// DBから課題情報を取得
const version = await prisma.proposalVersion.findUnique({
  where: { id: versionId },
  include: { project: { include: { client: true } } },
})

// ProjectContextに課題情報を追加
const projectContext: ProjectContext = {
  // ... 既存のフィールド ...
  
  selectedIssues: version.selectedIssues 
    ? JSON.parse(version.selectedIssues) 
    : undefined,
  questionAnswers: version.questionAnswers 
    ? JSON.parse(version.questionAnswers) 
    : undefined,
}
```

---

# 実装チェックリスト

```
□ タスク1: SG-04 max_tokens修正
  □ src/agents/sg-04.ts の maxTokens を 8192 に変更

□ タスク2: AG-00 バックエンド
  □ src/agents/types.ts に型定義追加
  □ src/agents/ag-00-issue.ts 作成
  □ src/app/api/ag-00/route.ts 作成
  □ src/lib/prompt-loader.ts 確認/作成

□ タスク3: AG-00 UI
  □ src/components/IssueDefinitionPanel.tsx 作成
  □ スタイル追加

□ タスク4: DBスキーマ
  □ prisma/schema.prisma 変更
  □ npx prisma migrate dev 実行

□ タスク5: フロー組み込み
  □ プロジェクト詳細ページ変更
  □ src/app/api/versions/[versionId]/issues/route.ts 作成

□ タスク6: 後続AG引き継ぎ
  □ src/agents/types.ts の ProjectContext 変更
  □ src/agents/base-agent.ts の buildUserMessage 変更
  □ AGパイプライン開始時の読み込み追加
```

---

# 備考

- AG-00はSonnetモデルを使用（構造化タスクのため）
- QAの「わからない」は、AIが推測して仮説を立てる
- QAの「不要」は、その観点を分析から除外する
- 課題は複数選択可能
- 課題の編集機能はPhase 2で実装
