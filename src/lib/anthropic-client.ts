import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export type ModelType = 'fast' | 'quality' | 'premium'

export function getModel(type: ModelType = 'fast'): string {
  if (type === 'premium') return process.env.DEFAULT_MODEL_PREMIUM ?? 'claude-opus-4-6'
  if (type === 'quality') return process.env.DEFAULT_MODEL_QUALITY ?? 'claude-sonnet-4-6'
  return process.env.DEFAULT_MODEL_FAST ?? 'claude-haiku-4-5-20251001'
}

export interface ClaudeCallOptions {
  modelType?: ModelType
  maxTokens?: number
  enableWebSearch?: boolean
}

// 後方互換: positional (system, user, modelType, maxTokens) と
//           options object (system, user, { modelType, maxTokens }) の両形式に対応
export async function callClaude(
  system: string,
  user: string,
  modelTypeOrOptions: ModelType | ClaudeCallOptions = 'fast',
  maxTokensLegacy?: number
): Promise<string> {
  let modelType: ModelType
  let maxTokens: number | undefined

  let enableWebSearch = false
  if (typeof modelTypeOrOptions === 'string') {
    modelType = modelTypeOrOptions
    maxTokens = maxTokensLegacy
  } else {
    modelType = modelTypeOrOptions.modelType ?? 'fast'
    maxTokens = modelTypeOrOptions.maxTokens
    enableWebSearch = modelTypeOrOptions.enableWebSearch ?? false
  }

  const defaultMax = modelType === 'premium' ? 8192 : modelType === 'quality' ? 8192 : 4096
  const limit = maxTokens ?? defaultMax

  type Msg = { role: 'user' | 'assistant'; content: string }
  const messages: Msg[] = [{ role: 'user', content: user }]
  let fullText: string

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tools: any[] | undefined = enableWebSearch
    ? [{ type: 'web_search_20260209', name: 'web_search', max_uses: 10, allowed_callers: ['direct'] }]
    : undefined

  const stream = await anthropic.messages.stream({
    model: getModel(modelType),
    max_tokens: limit,
    system,
    messages,
    ...(tools ? { tools } : {}),
  })
  const res = await stream.finalMessage()
  fullText = res.content
    .filter(b => b.type === 'text')
    .map(b => (b as { type: 'text'; text: string }).text)
    .join('')

  return fullText
}

export default anthropic
