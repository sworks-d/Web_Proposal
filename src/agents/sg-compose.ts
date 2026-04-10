import { callClaude } from '@/lib/anthropic-client'
import { loadPrompt } from '@/lib/prompt-loader'
import { Sg01Output, Sg02Output, SgComposeOutput, ConceptDirection, ToneType } from '@/lib/sg/types'

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
      throw new Error(`SG-COMPOSE JSON parse failed. Raw: ${raw.slice(0, 500)}`)
    }
  }
}

export async function runSgCompose(
  agOutputs: Record<string, unknown>,
  sg01Output: Sg01Output,
  sg02Output: Sg02Output,
  selectedDirection: ConceptDirection,
  clientName: string,
  briefText: string,
  tone: ToneType,
  slideCount: number,
  audience: string,
  focusChapters?: string[],
): Promise<SgComposeOutput> {
  const systemPrompt = loadPrompt('sg-compose')

  const agContext = Object.entries(agOutputs)
    .filter(([, v]) => v)
    .map(([k, v]) => `=== ${k} ===\n${JSON.stringify(v, null, 2).slice(0, 2000)}`)
    .join('\n\n')

  const focusNote = focusChapters && focusChapters.length > 0
    ? `- 重点章: ${focusChapters.join('、')}`
    : ''

  const userMessage = `クライアント: ${clientName}
案件概要: ${briefText}

## ユーザー設定
- 想定スライド数: ${slideCount}枚
- トーン: ${tone}
- 聴衆: ${audience}
- orientation: landscape（A4横 1123×794px）
${focusNote}

## 選択されたコンセプト方向性（SG-00出力）
${JSON.stringify(selectedDirection, null, 2)}

## 章構成（SG-01出力）
${JSON.stringify(sg01Output, null, 2)}

## コピー・ヘッドライン（SG-02出力）
${JSON.stringify(sg02Output, null, 2)}

## AG分析データ
${agContext || '（分析データなし）'}

各ページのグリッド・コンポーネント・ブリッジテキストを含むSgComposeOutputをJSONで返してください。
JSONのみを返してください。`

  const raw = await callClaude(systemPrompt, userMessage, {
    modelType: 'premium',
    maxTokens: 16384,
    agentId: 'SG-COMPOSE',
  })

  return parseJson<SgComposeOutput>(raw)
}
