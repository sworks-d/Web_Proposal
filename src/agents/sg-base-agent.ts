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
    // Strip markdown code fences
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()
    try {
      return JSON.parse(cleaned)
    } catch {
      // Try to extract JSON object/array from text
      const m = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/)
      if (m) {
        try { return JSON.parse(m[1]) } catch { /* fall through */ }
      }
      throw new Error(`${this.id} JSON parse failed. Raw: ${raw.slice(0, 500)}`)
    }
  }

  protected formatAgOutputs(agOutputs: Record<string, unknown>, keys: string[]): string {
    return keys
      .filter(k => agOutputs[k])
      .map(k => `=== ${k} ===\n${JSON.stringify(agOutputs[k], null, 2).slice(0, 3000)}`)
      .join('\n\n')
  }
}
