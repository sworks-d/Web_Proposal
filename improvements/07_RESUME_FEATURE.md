# 07: 実行再開（Resume）機能

## 背景

現状の問題：
- エージェントが途中で失敗/タイムアウトすると**最初からやり直し**
- 10分かかる処理が途中で止まると、その時間が全て無駄
- ブラウザを閉じると進捗が失われる

---

## 設計方針

### 1. チェックポイント方式

各エージェント完了時に状態をDBに保存。再開時は完了済みをスキップ。

```
AG-01 ✅ 完了（DB保存済み）
AG-02 ✅ 完了（DB保存済み）
AG-03 ❌ 失敗 ← ここから再開
AG-04 ⏸️ 未実行
AG-05 ⏸️ 未実行
AG-06 ⏸️ 未実行
```

### 2. 状態管理

```typescript
enum AgentStatus {
  PENDING = 'pending',      // 未実行
  RUNNING = 'running',      // 実行中
  COMPLETED = 'completed',  // 完了
  FAILED = 'failed',        // 失敗
  SKIPPED = 'skipped'       // スキップ
}
```

---

## DB スキーマ修正

### 現状

```prisma
model AgentResult {
  id          String    @id @default(cuid())
  executionId String
  execution   Execution @relation(fields: [executionId], references: [id])
  agentId     String
  outputJson  String
  editedJson  String?
  approvedAt  DateTime?
  createdAt   DateTime  @default(now())
}
```

### 修正後

```prisma
model AgentResult {
  id          String      @id @default(cuid())
  executionId String
  execution   Execution   @relation(fields: [executionId], references: [id])
  agentId     String
  status      AgentStatus @default(PENDING)  // 追加
  outputJson  String?                         // nullable に変更
  editedJson  String?
  errorMessage String?                        // 追加：失敗時のエラー
  startedAt   DateTime?                       // 追加
  completedAt DateTime?                       // 追加
  approvedAt  DateTime?
  createdAt   DateTime    @default(now())
  
  @@unique([executionId, agentId])           // 追加：重複防止
}

enum AgentStatus {
  PENDING
  RUNNING
  COMPLETED
  FAILED
  SKIPPED
}
```

---

## オーケストレーター修正

### 実行フロー

```typescript
// src/orchestrator/orchestrator.ts

async function executeFullPipeline(executionId: string): Promise<void> {
  const agents = ['AG-01', 'AG-02', 'AG-03', 'AG-04', 'AG-05', 'AG-06']
  
  for (const agentId of agents) {
    // 既存の結果を確認
    const existing = await getAgentResult(executionId, agentId)
    
    // 完了済みならスキップ
    if (existing?.status === 'COMPLETED') {
      console.log(`${agentId}: スキップ（完了済み）`)
      continue
    }
    
    // 実行
    await executeAgent(executionId, agentId)
  }
}

async function executeAgent(executionId: string, agentId: string): Promise<void> {
  // 開始を記録
  await updateAgentStatus(executionId, agentId, {
    status: 'RUNNING',
    startedAt: new Date()
  })
  
  try {
    // エージェント実行
    const result = await runAgent(agentId, executionId)
    
    // 成功を記録
    await updateAgentStatus(executionId, agentId, {
      status: 'COMPLETED',
      outputJson: JSON.stringify(result),
      completedAt: new Date()
    })
    
  } catch (error) {
    // 失敗を記録
    await updateAgentStatus(executionId, agentId, {
      status: 'FAILED',
      errorMessage: error.message,
      completedAt: new Date()
    })
    
    throw error // 上位で処理
  }
}
```

### 再開API

```typescript
// src/app/api/executions/[id]/resume/route.ts

export async function POST(req: Request, { params }) {
  const executionId = params.id
  
  // 失敗したエージェントを特定
  const failedAgent = await getFirstFailedAgent(executionId)
  
  if (!failedAgent) {
    return Response.json({ message: 'No failed agent to resume' })
  }
  
  // 失敗したエージェントをPENDINGに戻す
  await updateAgentStatus(executionId, failedAgent.agentId, {
    status: 'PENDING',
    errorMessage: null
  })
  
  // パイプライン再開
  await executeFullPipeline(executionId)
  
  return Response.json({ message: 'Resumed', fromAgent: failedAgent.agentId })
}
```

---

## UI側の対応

### 実行状態の表示

```tsx
// components/execution-progress.tsx

function ExecutionProgress({ executionId }) {
  const { data: agents } = useAgentStatuses(executionId)
  
  return (
    <div className="space-y-2">
      {agents.map(agent => (
        <div key={agent.id} className="flex items-center gap-3">
          <StatusIcon status={agent.status} />
          <span>{agent.agentId}</span>
          {agent.status === 'RUNNING' && <Spinner />}
          {agent.status === 'COMPLETED' && (
            <span className="text-sm text-gray-500">
              {formatDuration(agent.startedAt, agent.completedAt)}
            </span>
          )}
          {agent.status === 'FAILED' && (
            <span className="text-sm text-red-500">
              {agent.errorMessage}
            </span>
          )}
        </div>
      ))}
    </div>
  )
}

function StatusIcon({ status }) {
  switch (status) {
    case 'COMPLETED': return <CheckCircle className="text-green-500" />
    case 'RUNNING': return <Loader className="text-blue-500 animate-spin" />
    case 'FAILED': return <XCircle className="text-red-500" />
    case 'PENDING': return <Circle className="text-gray-300" />
    case 'SKIPPED': return <MinusCircle className="text-gray-400" />
  }
}
```

### 再開ボタン

```tsx
// components/execution-controls.tsx

function ExecutionControls({ executionId, status }) {
  const resume = useResume(executionId)
  const restart = useRestart(executionId)
  
  if (status === 'FAILED') {
    return (
      <div className="flex gap-2">
        <Button onClick={resume} variant="primary">
          失敗箇所から再開
        </Button>
        <Button onClick={restart} variant="secondary">
          最初からやり直す
        </Button>
      </div>
    )
  }
  
  return null
}
```

---

## タイムアウト設定

### エージェント単位のタイムアウト

```typescript
const AGENT_TIMEOUTS: Record<string, number> = {
  'AG-01': 120_000,  // 2分
  'AG-02': 180_000,  // 3分
  'AG-03': 180_000,  // 3分
  'AG-04': 120_000,  // 2分
  'AG-05': 120_000,  // 2分
  'AG-06': 180_000,  // 3分
}

async function runAgentWithTimeout(agentId: string, ...args): Promise<Result> {
  const timeout = AGENT_TIMEOUTS[agentId] || 120_000
  
  return Promise.race([
    runAgent(agentId, ...args),
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error(`Timeout: ${agentId} exceeded ${timeout/1000}s`)), timeout)
    )
  ])
}
```

---

## 進捗の永続化

### ブラウザを閉じても状態を維持

DBに状態が保存されているので：
1. ブラウザを閉じる
2. 再度開く
3. 実行一覧から該当プロジェクトを選択
4. 「再開」ボタンで続きから実行

---

## 実装チェックリスト

- [ ] Prismaスキーマ修正（AgentStatus追加、フィールド追加）
- [ ] `prisma migrate dev` 実行
- [ ] オーケストレーターに再開ロジック追加
- [ ] `/api/executions/[id]/resume` API追加
- [ ] `/api/executions/[id]/restart` API追加
- [ ] UI: 実行状態表示コンポーネント
- [ ] UI: 再開/やり直しボタン
- [ ] タイムアウト設定追加
- [ ] エラー時のリトライロジック（オプション）
