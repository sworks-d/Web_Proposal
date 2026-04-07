import { callClaude, ModelType } from '@/lib/anthropic-client'
import { SgAgentId, SgInput } from './sg-types'

export abstract class SgBaseAgent {
  abstract id: SgAgentId
  abstract name: string
  protected modelType: ModelType = 'quality'
  protected maxTokens = 8192

  abstract getSystemPrompt(): string
  abstract buildUserMessage(input: SgInput): string

  async run(input: SgInput): Promise<unknown> {
    const system = this.getSystemPrompt()
    const user = this.buildUserMessage(input)
    const raw = await callClaude(system, user, { modelType: this.modelType, maxTokens: this.maxTokens })
    return this.parseResponse(raw)
  }

  protected parseResponse(raw: string): unknown {
    // コードフェンス除去（複数行対応）
    let cleaned = raw
      .replace(/^```json\s*/im, '')
      .replace(/^```\s*/im, '')
      .replace(/\s*```\s*$/m, '')
      .trim()

    // JSON開始位置（{ or [）を探して前を捨てる
    const jsonStart = cleaned.search(/[{[]/)
    if (jsonStart > 0) cleaned = cleaned.slice(jsonStart)

    // 末尾のゴミを除去（JSONの外側のテキスト）
    const lastClose = Math.max(cleaned.lastIndexOf('}'), cleaned.lastIndexOf(']'))
    if (lastClose >= 0 && lastClose < cleaned.length - 1) {
      cleaned = cleaned.slice(0, lastClose + 1)
    }

    try {
      return JSON.parse(cleaned)
    } catch {
      // 途中で切れている場合: 閉じカッコを補完して再試行
      const openBraces   = (cleaned.match(/{/g)  ?? []).length
      const closeBraces  = (cleaned.match(/}/g)  ?? []).length
      const openBrackets = (cleaned.match(/\[/g) ?? []).length
      const closeBrackets= (cleaned.match(/]/g)  ?? []).length

      // 末尾の未閉じカンマ・コロンを除去
      let fixed = cleaned.replace(/[,:\s]+$/, '')

      // 配列・オブジェクトの深さに応じて閉じる
      for (let i = 0; i < openBrackets - closeBrackets; i++) fixed += ']'
      for (let i = 0; i < openBraces  - closeBraces;   i++) fixed += '}'

      try {
        return JSON.parse(fixed)
      } catch {
        // 最後の手段: 正規表現でJSON抽出
        const m = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/)
        if (m) {
          try { return JSON.parse(m[1]) } catch { /* fall through */ }
        }
        throw new Error(`${this.id} JSON parse failed. Raw: ${raw.slice(0, 500)}`)
      }
    }
  }

  protected formatAgOutputs(agOutputs: Record<string, unknown>, keys: string[]): string {
    return keys
      .filter(k => agOutputs[k])
      .map(k => `=== ${k} ===\n${JSON.stringify(agOutputs[k], null, 2).slice(0, 3000)}`)
      .join('\n\n')
  }
}
