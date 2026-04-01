import { AgentId, AgentInput, AgentOutput, ProjectContext } from './types'
import { callClaude, ModelType } from '@/lib/anthropic-client'

export abstract class BaseAgent {
  abstract id: AgentId
  abstract name: string
  protected modelType: ModelType = 'fast'

  abstract getPrompt(context: ProjectContext): string
  abstract parseOutput(raw: string): AgentOutput

  async execute(input: AgentInput): Promise<AgentOutput> {
    const system = this.getPrompt(input.projectContext)
    const user = this.buildUserMessage(input)
    const raw = await callClaude(system, user, this.modelType)
    return this.parseOutput(raw)
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
