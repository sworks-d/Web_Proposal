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
  modelType: ModelType = 'fast'
): Promise<string> {
  const res = await anthropic.messages.create({
    model: getModel(modelType),
    max_tokens: 4096,
    system,
    messages: [{ role: 'user', content: user }],
  })
  const block = res.content[0]
  if (block.type !== 'text') throw new Error('Unexpected response type')
  return block.text
}

export default anthropic
