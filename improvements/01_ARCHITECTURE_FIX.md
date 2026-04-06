# 01: アーキテクチャ修正（ツール有効化）

## 最優先で対応すべき問題

現在の `anthropic-client.ts` は**ツールを一切使用できない**状態です。
これを修正しないと、プロンプトでいくら「web_searchを使え」と書いても動作しません。

---

## 修正対象: `src/lib/anthropic-client.ts`

### 現状のコード

```typescript
export async function callClaude(
  system: string,
  user: string,
  modelType: ModelType = 'fast',
  maxTokens?: number
): Promise<string> {
  const defaultMax = modelType === 'quality' ? 8192 : 4096
  const res = await anthropic.messages.create({
    model: getModel(modelType),
    max_tokens: maxTokens ?? defaultMax,
    system,
    messages: [{ role: 'user', content: user }],
  })
  const block = res.content[0]
  if (block.type !== 'text') throw new Error('Unexpected response type')
  return block.text
}
```

### 修正後のコード

```typescript
import Anthropic from '@anthropic-ai/sdk'
import type { Tool, ToolResultBlockParam, MessageParam } from '@anthropic-ai/sdk/resources/messages'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export type ModelType = 'fast' | 'quality'

// ツール定義
const WEB_SEARCH_TOOL: Tool = {
  type: 'web_search_20250305',
  name: 'web_search',
  // 追加設定があれば記載
}

// 将来的にClaude in Chrome等を追加する場合のMCPサーバー設定
// const MCP_SERVERS = [
//   { type: 'url', url: 'chrome-mcp-server-url', name: 'chrome-mcp' }
// ]

export function getModel(type: ModelType = 'fast'): string {
  return type === 'quality'
    ? (process.env.DEFAULT_MODEL_QUALITY ?? 'claude-sonnet-4-6')
    : (process.env.DEFAULT_MODEL_FAST ?? 'claude-haiku-4-5-20251001')
}

export interface ClaudeCallOptions {
  modelType?: ModelType
  maxTokens?: number
  enableWebSearch?: boolean
  enableMCP?: boolean
}

export async function callClaude(
  system: string,
  user: string,
  options: ClaudeCallOptions = {}
): Promise<string> {
  const { 
    modelType = 'fast', 
    maxTokens, 
    enableWebSearch = false,
    enableMCP = false 
  } = options
  
  const defaultMax = modelType === 'quality' ? 8192 : 4096
  const tools: Tool[] = []
  
  if (enableWebSearch) {
    tools.push(WEB_SEARCH_TOOL)
  }
  
  // MCP連携は将来実装
  // if (enableMCP) { ... }
  
  const messages: MessageParam[] = [{ role: 'user', content: user }]
  
  // ツール使用を含むマルチターン処理
  let fullResponse = ''
  let continueLoop = true
  
  while (continueLoop) {
    const res = await anthropic.messages.create({
      model: getModel(modelType),
      max_tokens: maxTokens ?? defaultMax,
      system,
      messages,
      tools: tools.length > 0 ? tools : undefined,
    })
    
    // ストップ理由の確認
    if (res.stop_reason === 'end_turn') {
      // 通常終了
      for (const block of res.content) {
        if (block.type === 'text') {
          fullResponse += block.text
        }
      }
      continueLoop = false
    } else if (res.stop_reason === 'tool_use') {
      // ツール使用のケース
      const assistantMessage: MessageParam = { role: 'assistant', content: res.content }
      messages.push(assistantMessage)
      
      // ツール結果を収集
      const toolResults: ToolResultBlockParam[] = []
      
      for (const block of res.content) {
        if (block.type === 'tool_use') {
          // web_searchはAnthropic側で自動処理されるが、
          // 明示的に結果を受け取る場合はここで処理
          // 通常はAnthropic APIが自動でtool_resultを返す
          
          // このコードでは、Anthropic APIのweb_search_20250305タイプは
          // APIが自動的に検索を実行して結果を返すので、
          // 明示的なtool_result送信は不要
        }
        if (block.type === 'text') {
          fullResponse += block.text
        }
      }
      
      // web_search_20250305はAPIが自動処理するため、
      // tool_resultを手動で送る必要がない
      // ただし他のカスタムツールを追加する場合は必要
      
      continueLoop = false // web_searchは自動処理のため終了
    } else {
      // その他の終了理由
      for (const block of res.content) {
        if (block.type === 'text') {
          fullResponse += block.text
        }
      }
      continueLoop = false
    }
  }
  
  return fullResponse
}

// 後方互換性のための旧シグネチャサポート（非推奨、段階的に移行）
export async function callClaudeLegacy(
  system: string,
  user: string,
  modelType: ModelType = 'fast',
  maxTokens?: number
): Promise<string> {
  return callClaude(system, user, { modelType, maxTokens, enableWebSearch: false })
}

export default anthropic
```

---

## 修正対象: `src/agents/base-agent.ts`

### 修正ポイント

エージェントごとに `enableWebSearch` フラグを設定できるようにする。

```typescript
import { AgentId, AgentInput, AgentOutput, ProjectContext } from './types'
import { callClaude, ModelType } from '@/lib/anthropic-client'

const AG_MAX_TOKENS: Record<string, number> = {
  // ... 既存の設定
}

// web_searchを使用するエージェント
const AG_USES_WEB_SEARCH: Set<string> = new Set([
  'AG-01-RESEARCH',
  'AG-02-POSITION',
  'AG-03-COMPETITOR',
  'AG-03-HEURISTIC',
  'AG-03-CURRENT',
  'AG-05-FACTCHECK', // ファクトチェックにも検索を追加
])

export abstract class BaseAgent {
  abstract id: AgentId
  abstract name: string
  protected modelType: ModelType = 'fast'
  lastRawText = ''

  abstract getPrompt(context: ProjectContext): string
  abstract parseOutput(raw: string): AgentOutput

  async execute(input: AgentInput): Promise<AgentOutput> {
    const system = this.getPrompt(input.projectContext)
    const user = this.buildUserMessage(input)
    const maxTokens = AG_MAX_TOKENS[this.id]
    const enableWebSearch = AG_USES_WEB_SEARCH.has(this.id)
    
    this.lastRawText = await callClaude(system, user, {
      modelType: this.modelType,
      maxTokens,
      enableWebSearch,
    })
    
    return this.parseOutput(this.lastRawText)
  }

  // ... 残りは既存のまま
}
```

---

## 確認すべき点

### 1. APIの料金

web_searchを有効にすると追加料金が発生します。
- 検索1回あたりの料金を確認
- AG-01-RESEARCH等で検索回数制限（現在15回）が妥当か再検討

### 2. 検索結果の形式

Anthropic APIのweb_search_20250305は、検索結果を自動的にコンテキストに含めます。
プロンプト側で「検索結果が返ってきたら...」という指示を調整する必要があるかもしれません。

### 3. 段階的な移行

1. まず `AG-01-RESEARCH` だけで動作確認
2. 問題なければ他のエージェントに展開
3. 検索回数・品質をモニタリング

---

## テスト方法

```typescript
// テストスクリプト
import { callClaude } from '@/lib/anthropic-client'

async function testWebSearch() {
  const result = await callClaude(
    'あなたは情報収集の専門家です。web_searchツールを使って情報を収集してください。',
    '株式会社トヨタ自動車の2024年度の売上高を調べてください。',
    { 
      modelType: 'fast', 
      enableWebSearch: true 
    }
  )
  console.log(result)
}

testWebSearch()
```

---

## 次のステップ

この修正が完了したら、`02_RESEARCH_ENHANCEMENT.md` に進んで、
リサーチエージェントのプロンプトを強化してください。
