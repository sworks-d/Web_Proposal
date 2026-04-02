import { AgentId, AgentInput, AgentOutput, ProjectContext } from './types'
import { callClaude, ModelType } from '@/lib/anthropic-client'

const AG_MAX_TOKENS: Record<string, number> = {
  'AG-01': 4096,
  'AG-02': 16384,
  'AG-03': 16384,
  'AG-04': 16384,
  'AG-05': 16384,
  'AG-06': 16384,
  'AG-07': 16384,
}

export abstract class BaseAgent {
  abstract id: AgentId
  abstract name: string
  protected modelType: ModelType = 'fast'
  /** Claude APIの生レスポンステキスト（outputJson保存用） */
  lastRawText = ''

  abstract getPrompt(context: ProjectContext): string
  abstract parseOutput(raw: string): AgentOutput

  async execute(input: AgentInput): Promise<AgentOutput> {
    const system = this.getPrompt(input.projectContext)
    const user = this.buildUserMessage(input)
    const maxTokens = AG_MAX_TOKENS[this.id]
    this.lastRawText = await callClaude(system, user, this.modelType, maxTokens)
    return this.parseOutput(this.lastRawText)
  }

  protected buildUserMessage(input: AgentInput): string {
    const lines = [
      '## 案件情報',
      `クライアント名: ${input.projectContext.clientName}`,
      `業種: ${input.projectContext.clientIndustry ?? '未設定'}`,
      `業界タイプ: ${input.projectContext.industryType}`,
      `\n依頼内容:\n${input.projectContext.briefText}`,
    ]
    if (input.projectContext.knownConstraints) {
      lines.push(`\n制約条件:\n${input.projectContext.knownConstraints}`)
    }
    if (input.projectContext.cdNotes) {
      const note = input.projectContext.cdNotes[this.id]
      if (note) {
        lines.push(`\n## CDからの補足情報（${this.id}向け）\n${note}`)
      }
    }
    if (input.previousOutputs.length > 0) {
      lines.push('\n## 前エージェントの出力サマリー')
      for (const prev of input.previousOutputs) {
        lines.push(`\n### ${prev.agentId}`)
        for (const s of prev.sections.slice(0, 3)) {
          lines.push(`**${s.title}**\n${s.content.slice(0, 500)}`)
        }
      }
    }
    if (input.userInstruction) {
      lines.push(`\n## 追加指示\n${input.userInstruction}`)
    }
    return lines.join('\n')
  }

  protected parseJSON<T>(text: string): T {
    const cleaned = text
      .replace(/^```json\s*/m, '')
      .replace(/^```\s*/m, '')
      .replace(/```\s*$/m, '')
      .trim()
    return JSON.parse(cleaned) as T
  }
}
