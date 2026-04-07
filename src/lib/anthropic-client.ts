import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export type ModelType = 'fast' | 'quality'

export function getModel(type: ModelType = 'fast'): string {
  return type === 'quality'
    ? (process.env.DEFAULT_MODEL_QUALITY ?? 'claude-sonnet-4-6')
    : (process.env.DEFAULT_MODEL_FAST ?? 'claude-haiku-4-5-20251001')
}

export interface ClaudeCallOptions {
  modelType?: ModelType
  maxTokens?: number
}

const CONTINUATION_PROMPT = '前回の続きをそのまま出力してください。前置き・説明・重複は不要です。'

// 後方互換: positional (system, user, modelType, maxTokens) と
//           options object (system, user, { modelType, maxTokens, enableWebSearch }) の両形式に対応
export async function callClaude(
  system: string,
  user: string,
  modelTypeOrOptions: ModelType | ClaudeCallOptions = 'fast',
  maxTokensLegacy?: number
): Promise<string> {
  let modelType: ModelType
  let maxTokens: number | undefined

  if (typeof modelTypeOrOptions === 'string') {
    modelType = modelTypeOrOptions
    maxTokens = maxTokensLegacy
  } else {
    modelType = modelTypeOrOptions.modelType ?? 'fast'
    maxTokens = modelTypeOrOptions.maxTokens
  }

  const defaultMax = modelType === 'quality' ? 8192 : 4096
  const limit = maxTokens ?? defaultMax

  type Msg = { role: 'user' | 'assistant'; content: string }
  const messages: Msg[] = [{ role: 'user', content: user }]
  let fullText = ''

  // ツールなし: max_tokens に達した場合は続きを要求（最大4ターン）
  for (let i = 0; i < 4; i++) {
    const res = await anthropic.messages.create({
      model: getModel(modelType),
      max_tokens: limit,
      system,
      messages,
    })
    const block = res.content.find(b => b.type === 'text')
    if (!block || block.type !== 'text') throw new Error('Unexpected response type')

    fullText += block.text

    if (res.stop_reason !== 'max_tokens') break

    messages.push({ role: 'assistant', content: block.text })
    messages.push({ role: 'user', content: CONTINUATION_PROMPT })
  }

  return fullText
}

export default anthropic
