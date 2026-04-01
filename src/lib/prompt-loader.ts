import fs from 'fs'
import path from 'path'

export function loadPrompt(agentDir: string, variant = 'default'): string {
  const filePath = path.join(process.cwd(), 'prompts', agentDir, `${variant}.md`)
  if (!fs.existsSync(filePath)) {
    throw new Error(`Prompt not found: ${filePath}`)
  }
  return fs.readFileSync(filePath, 'utf-8')
}

export function loadMarketPrompt(industryType: string): string {
  const dir = path.join(process.cwd(), 'prompts', 'ag-02-market')
  const target = path.join(dir, `${industryType}.md`)
  const fallback = path.join(dir, 'general.md')
  if (fs.existsSync(target)) return fs.readFileSync(target, 'utf-8')
  if (fs.existsSync(fallback)) return fs.readFileSync(fallback, 'utf-8')
  throw new Error(`Market prompt not found: ${industryType}`)
}

export function loadSubPrompt(subId: string): string {
  const filePath = path.join(process.cwd(), 'prompts', subId, 'default.md')
  if (!fs.existsSync(filePath)) {
    console.warn(`Sub prompt not found: ${subId}, skipping`)
    return ''
  }
  return fs.readFileSync(filePath, 'utf-8')
}

export function loadMarketPromptWithSub(
  primaryId: string,
  subIds: string[]
): string {
  const primary = loadPrompt(primaryId)
  if (subIds.length === 0) return primary

  const subContexts = subIds
    .map(id => loadSubPrompt(id))
    .filter(Boolean)
    .join('\n\n---\n\n')

  if (!subContexts) return primary

  return `${primary}\n\n---\n\n# 業種コンテキスト（SUB）\n\n以下の業種コンテキストをこの分析に統合してください。\n\n${subContexts}`
}
