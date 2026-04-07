import { AgentId, AgentInput, AgentOutput, ProjectContext } from './types'
import { callClaude, ModelType } from '@/lib/anthropic-client'
import { safeParseJson } from '@/lib/json-cleaner'

const AG_MAX_TOKENS: Record<string, number> = {
  // AG-01系
  'AG-01':          4096,
  'AG-01-RESEARCH': 8192,
  'AG-01-MERGE':    4096,
  // AG-02系（16384 → 8192に削減）
  'AG-02':          8192,
  'AG-02-STP':      8192,
  'AG-02-JOURNEY':  8192,
  'AG-02-VPC':      8192,
  'AG-02-MERGE':    8192,
  'AG-02-POSITION': 8192,
  'AG-02-VALIDATE': 4096,
  // AG-03系
  'AG-03':          8192,
  'AG-03-DATA':     8192,
  'AG-03-GAP':      8192,
  'AG-03-HEURISTIC':  8192,
  'AG-03-HEURISTIC2': 8192,
  'AG-03-MERGE':    8192,
  // AG-04系
  'AG-04':          4096,  // UNIFIED用
  'AG-04-MAIN':     8192,
  'AG-04-INSIGHT':  8192,
  'AG-04-MERGE':    4096,
  // AG-05以降
  'AG-05':          4096,
  'AG-06':          8192,
  'AG-07':          8192,
  'AG-07A':         8192,
  'AG-07B':         8192,
  'AG-07C':         8192,
  'AG-07C-1':       8192,
  'AG-07C-2':       8192,
  'AG-07C-3':       8192,
  'AG-07C-4':       8192,
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
    const ctx = input.projectContext
    const caseTypeLabel =
      ctx.caseType === 'A' ? '新規サイト制作' :
      ctx.caseType === 'B' ? 'リニューアル' :
      ctx.caseType === 'C' ? '改善・運用' : '未設定'
    const lines = [
      '## 案件情報',
      `クライアント名: ${ctx.clientName}`,
      `業種: ${ctx.clientIndustry ?? '未設定'}`,
      `業界タイプ: ${ctx.industryType}`,
      `案件種別: ${caseTypeLabel}`,
    ]
    if (ctx.siteUrl) {
      lines.push(`現在のサイトURL: ${ctx.siteUrl}`)
    }
    lines.push(`\n依頼内容:\n${ctx.briefText}`)
    if (ctx.knownConstraints) {
      lines.push(`\n制約条件:\n${ctx.knownConstraints}`)
    }
    if (ctx.cdNotes) {
      const note = ctx.cdNotes[this.id]
      if (note) {
        lines.push(`\n## CDからの補足情報（${this.id}向け）\n${note}`)
      }
    }
    if (input.previousOutputs.length > 0) {
      lines.push('\n## 前エージェントの出力サマリー')
      // エージェントごとに適切な上限を設定（重要な前段AGは多く渡す）
      const limits: Record<string, number> = {
        'AG-01':           3000,
        'AG-01-RESEARCH':  2000,
        'AG-01-MERGE':     4000,
        'AG-02':           4000,
        'AG-02-JOURNEY':   3000,
        'AG-02-STP':       3000,
        'AG-02-VPC':       3000,
        'AG-02-POSITION':  3000,
        'AG-02-MERGE':     5000,
        'AG-03':           3000,
        'AG-03-DATA':      3000,
        'AG-03-GAP':       3000,
        'AG-03-HEURISTIC': 3000,
        'AG-03-HEURISTIC2':3000,
        'AG-03-MERGE':     5000,
        'AG-04':           4000,
        'AG-04-INSIGHT':   4000,
        'AG-04-MERGE':     5000,
        'AG-05':           3000,
      }
      for (const prev of input.previousOutputs) {
        const limit = limits[prev.agentId] ?? 2000
        let remaining = limit
        lines.push(`\n### ${prev.agentId}`)
        for (const s of prev.sections) {
          if (remaining <= 0) break
          const chunk = s.content.slice(0, remaining)
          lines.push(`**${s.title}**\n${chunk}`)
          remaining -= chunk.length
        }
      }
    }
    // 差し戻し指示（最優先）
    if (input.rerunInstruction) {
      lines.push('\n' + '═'.repeat(50))
      lines.push('⚠️ 再実行指示（最優先で対応してください）')
      lines.push('═'.repeat(50))
      lines.push(input.rerunInstruction)
      lines.push('═'.repeat(50))
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
    try {
      const raw = await callClaude(system, user, this.modelType, maxTokens)
      const parsed = safeParseJson(raw)
      if (parsed === null) {
        console.error(`[${this.id}] callSection パース失敗:`, raw.slice(0, 500))
        return { _parseError: true, _rawText: raw }
      }
      return parsed as Record<string, unknown>
    } catch (err) {
      console.error(`[${this.id}] callSection エラー:`, err)
      return { _callError: true, _errorMessage: String(err) }
    }
  }

  protected parseJSON<T>(text: string): T {
    // 1. コードフェンス除去
    let cleaned = text
      .replace(/^\s*```json\s*/m, '')
      .replace(/^\s*```\s*/m, '')
      .replace(/\s*```\s*$/m, '')
      .trim()

    // 2. JSONの開始位置を探す
    const jsonStart = cleaned.search(/[\[{]/)
    if (jsonStart === -1) {
      throw new Error('JSON not found in response')
    }
    cleaned = cleaned.slice(jsonStart)

    // 3. JSONの終了位置を探す
    const lastBrace = cleaned.lastIndexOf('}')
    const lastBracket = cleaned.lastIndexOf(']')
    const jsonEnd = Math.max(lastBrace, lastBracket)
    if (jsonEnd > 0) {
      cleaned = cleaned.slice(0, jsonEnd + 1)
    }

    // 4. そのままパース
    try {
      return JSON.parse(cleaned) as T
    } catch (e) {
      // 5. 閉じカッコ補完を試みる
      const openBraces = (cleaned.match(/{/g) || []).length
      const closeBraces = (cleaned.match(/}/g) || []).length
      const openBrackets = (cleaned.match(/\[/g) || []).length
      const closeBrackets = (cleaned.match(/]/g) || []).length

      let repaired = cleaned
      for (let i = 0; i < openBrackets - closeBrackets; i++) {
        repaired += ']'
      }
      for (let i = 0; i < openBraces - closeBraces; i++) {
        repaired += '}'
      }

      try {
        return JSON.parse(repaired) as T
      } catch {
        // 6. それでも失敗したら元のエラーを投げる
        throw e
      }
    }
  }
}
