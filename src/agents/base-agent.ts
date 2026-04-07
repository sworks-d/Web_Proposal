import { AgentId, AgentInput, AgentOutput, ProjectContext } from './types'
import { callClaude, ModelType } from '@/lib/anthropic-client'
import { safeParseJson } from '@/lib/json-cleaner'

const AG_MAX_TOKENS: Record<string, number> = {
  'AG-01': 4096,
  'AG-01-RESEARCH': 8192,
  'AG-01-MERGE':    4096,
  // AG-02系
  'AG-02':          16384,
  'AG-02-STP':      16384,
  'AG-02-JOURNEY':  16384,
  'AG-02-VPC':      16384,
  'AG-02-MERGE':    16384,
  'AG-02-POSITION': 8192,
  'AG-02-VALIDATE': 8192,
  // AG-03系
  'AG-03':          16384,
  'AG-03-HEURISTIC':  16384,
  'AG-03-HEURISTIC2': 16384,
  'AG-03-GAP':        16384,
  'AG-03-DATA':       16384,
  'AG-03-MERGE':      16384,
  // AG-04系
  'AG-04':          16384,
  'AG-04-MAIN':     16384,
  'AG-04-INSIGHT':  16384,
  'AG-04-MERGE':    16384,
  // AG-05〜07
  'AG-05': 16384,
  'AG-06': 32768,
  'AG-07': 16384,
  'AG-07A': 16384,
  'AG-07B': 16384,
  'AG-07C': 16384,
  // AG-07C分割
  'AG-07C-1': 8192,
  'AG-07C-2': 8192,
  'AG-07C-3': 6144,
  'AG-07C-4': 4096,
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
    console.log(`[${this.id}] input tokens: ${system.length + user.length}`)
    this.lastRawText = await callClaude(system, user, {
      modelType: this.modelType,
      maxTokens,
    })
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
      let remaining = 500
      for (const prev of input.previousOutputs) {
        if (remaining <= 0) break
        lines.push(`\n### ${prev.agentId}`)
        for (const s of prev.sections.slice(0, 3)) {
          if (remaining <= 0) break
          const chunk = s.content.slice(0, remaining)
          lines.push(`**${s.title}**\n${chunk}`)
          remaining -= chunk.length
        }
      }
    }
    if (input.userInstruction) {
      lines.push(`\n## 追加指示\n${input.userInstruction}`)
    }
    return lines.join('\n')
  }

  /**
   * 出力が大きいAGで使う分割実行ヘルパー。
   * 各セクション指示で個別にClaudeを呼び出し、JSONをマージして返す。
   * sections を Promise.all で並列実行することも可能。
   */
  protected async callSection(
    input: AgentInput,
    sectionInstruction: string,
    maxTokens = 6000
  ): Promise<Record<string, unknown>> {
    const system = this.getPrompt(input.projectContext)
    const user = this.buildUserMessage(input) +
      `\n\n---\n【出力指示（このリクエスト専用）】\n${sectionInstruction}\n指定フィールドのみのJSONを出力すること。説明・前置き・コードフェンス不要。`
    const raw = await callClaude(system, user, this.modelType, maxTokens)
    return (safeParseJson(raw) as Record<string, unknown>) ?? {}
  }

  protected parseJSON<T>(text: string): T {
    const cleaned = text
      .replace(/^\s*```json\s*/m, '')
      .replace(/^\s*```\s*/m, '')
      .replace(/\s*```\s*$/m, '')
      .trim()
    return JSON.parse(cleaned) as T
  }
}
