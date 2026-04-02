import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export type ModelType = 'fast' | 'quality'

export function getModel(type: ModelType = 'fast'): string {
  return type === 'quality'
    ? (process.env.DEFAULT_MODEL_QUALITY ?? 'claude-sonnet-4-6')
    : (process.env.DEFAULT_MODEL_FAST ?? 'claude-haiku-4-5-20251001')
}

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

export default anthropic
