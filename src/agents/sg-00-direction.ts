import { callClaude } from '@/lib/anthropic-client'
import { loadPrompt } from '@/lib/prompt-loader'
import { Sg00Output } from '@/lib/sg/types'

function parseJson<T>(raw: string): T {
  let cleaned = raw
    .replace(/^```json\s*/im, '')
    .replace(/^```\s*/im, '')
    .replace(/\s*```\s*$/m, '')
    .trim()

  const jsonStart = cleaned.search(/[{[]/)
  if (jsonStart > 0) cleaned = cleaned.slice(jsonStart)

  const lastClose = Math.max(cleaned.lastIndexOf('}'), cleaned.lastIndexOf(']'))
  if (lastClose >= 0 && lastClose < cleaned.length - 1) {
    cleaned = cleaned.slice(0, lastClose + 1)
  }

  try {
    return JSON.parse(cleaned) as T
  } catch {
    const openBraces = (cleaned.match(/{/g) ?? []).length
    const closeBraces = (cleaned.match(/}/g) ?? []).length
    const openBrackets = (cleaned.match(/\[/g) ?? []).length
    const closeBrackets = (cleaned.match(/]/g) ?? []).length

    let fixed = cleaned.replace(/[,:\s]+$/, '')
    for (let i = 0; i < openBrackets - closeBrackets; i++) fixed += ']'
    for (let i = 0; i < openBraces - closeBraces; i++) fixed += '}'

    try {
      return JSON.parse(fixed) as T
    } catch {
      throw new Error(`SG-00 JSON parse failed. Raw: ${raw.slice(0, 500)}`)
    }
  }
}

export async function runSg00Direction(
  agOutputs: Record<string, unknown>,
  clientName: string,
  briefText: string,
): Promise<Sg00Output> {
  const systemPrompt = loadPrompt('sg-00-direction')

  const agContext = Object.entries(agOutputs)
    .filter(([, v]) => v)
    .map(([k, v]) => `=== ${k} ===\n${JSON.stringify(v, null, 2).slice(0, 3000)}`)
    .join('\n\n')

  const userMessage = `クライアント: ${clientName}
案件概要: ${briefText}

## AG分析データ
${agContext || '（分析データなし）'}

JSONのみを返してください。`

  const raw = await callClaude(systemPrompt, userMessage, {
    modelType: 'premium',
    maxTokens: 4096,
    agentId: 'SG-00',
  })

  return parseJson<Sg00Output>(raw)
}
