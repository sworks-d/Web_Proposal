import { AgentOutput } from '@/agents/types'

export interface GotInfoItem {
  confidence: 'high' | 'medium' | 'low'
  title: string
  summary: string
  source: string
}

export interface MissingInfoItem {
  item: string
  reason: string
  confirmMethod: string
}

export interface CheckpointSummary {
  gotInfo: GotInfoItem[]
  missingInfo: MissingInfoItem[]
}

export function buildCheckpointSummary(outputs: AgentOutput[]): CheckpointSummary {
  const gotInfo: GotInfoItem[] = []
  const missingInfo: MissingInfoItem[] = []

  for (const output of outputs) {
    const raw = output as unknown as Record<string, unknown>

    // High confidence: factBasis
    const factBasis = raw.factBasis as string[] | undefined
    if (Array.isArray(factBasis)) {
      for (const fact of factBasis) {
        gotInfo.push({ confidence: 'high', title: String(fact), summary: '', source: output.agentId })
      }
    }

    // Medium confidence: assumptions
    const assumptions = output.metadata?.assumptions ?? []
    for (const assumption of assumptions) {
      gotInfo.push({ confidence: 'medium', title: String(assumption), summary: '', source: output.agentId })
    }

    // Extract key info from sections (use metadata confidence for all)
    const conf = output.metadata?.confidence ?? 'medium'
    for (const section of output.sections ?? []) {
      if (!factBasis?.includes(section.title) && !assumptions.includes(section.title)) {
        gotInfo.push({
          confidence: conf as 'high' | 'medium' | 'low',
          title: section.title,
          summary: section.content?.slice(0, 120) ?? '',
          source: output.agentId,
        })
      }
    }

    // Missing info: requiresClientConfirmation (AG-05 output)
    const requiresClientConfirmation = raw.requiresClientConfirmation as Array<{
      item: string; reason: string; impactIfUnconfirmed: string
    }> | undefined
    if (Array.isArray(requiresClientConfirmation)) {
      for (const item of requiresClientConfirmation) {
        missingInfo.push({
          item: item.item,
          reason: item.reason,
          confirmMethod: item.impactIfUnconfirmed,
        })
      }
    }

    // Missing info: missingInfo field
    const missing = raw.missingInfo as string[] | undefined
    if (Array.isArray(missing)) {
      for (const mi of missing) {
        missingInfo.push({ item: String(mi), reason: '', confirmMethod: '' })
      }
    }
  }

  // Deduplicate gotInfo by title
  const seenTitles = new Set<string>()
  const dedupedGot = gotInfo.filter(item => {
    if (seenTitles.has(item.title)) return false
    seenTitles.add(item.title)
    return true
  })

  return { gotInfo: dedupedGot, missingInfo }
}
