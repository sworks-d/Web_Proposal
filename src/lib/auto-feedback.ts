// Auto-feedback stubs — full implementation pending
// These functions are called during the precision execution mode feedback pass

export interface FeedbackTarget {
  instruction: string
}

/**
 * Detect if an agent's output warrants automatic feedback/re-run.
 * Returns null if no feedback is needed.
 */
export function detectFeedbackTarget(
  _agentId: string,
  _outputJson: unknown,
): FeedbackTarget | null {
  return null
}

/**
 * Extract per-agent improvement instructions from an AG-05 fact-check output.
 * Returns a map of agentId → instruction string.
 */
export function extractAG05Targets(
  ag05Json: unknown,
): Map<string, string> {
  const result = new Map<string, string>()
  if (!ag05Json || typeof ag05Json !== 'object') return result

  const json = ag05Json as Record<string, unknown>
  const targets = json.targets ?? json.feedbackTargets
  if (!Array.isArray(targets)) return result

  for (const t of targets) {
    if (t && typeof t === 'object') {
      const obj = t as Record<string, unknown>
      if (typeof obj.agentId === 'string' && typeof obj.instruction === 'string') {
        result.set(obj.agentId, obj.instruction)
      }
    }
  }

  return result
}
