/**
 * APIコスト追跡 & 安全装置
 *
 * パイプライン（AG / SG）単位でコスト上限を設け、超過時に即座に停止する。
 * $88事故の再発を防ぐ。
 */

// ── 料金表（2026-04 現在）──────────────────────────────────────
const PRICING: Record<string, { input: number; output: number }> = {
  'claude-opus-4-6':             { input: 5.0,  output: 25.0 },
  'claude-sonnet-4-6':           { input: 3.0,  output: 15.0 },
  'claude-haiku-4-5-20251001':   { input: 1.0,  output:  5.0 },
}
const WEB_SEARCH_COST = 0.01  // $0.01/回

// ── 予算上限（USD）──────────────────────────────────────────────
const DEFAULT_BUDGETS = {
  AG_PIPELINE: parseFloat(process.env.AG_BUDGET_LIMIT ?? '8.00'),   // AG全体
  SG_PIPELINE: parseFloat(process.env.SG_BUDGET_LIMIT ?? '5.00'),   // SG全体
  SINGLE_CALL: parseFloat(process.env.SINGLE_CALL_LIMIT ?? '1.50'), // 1回のAPI呼び出し
}

export type PipelineType = 'AG' | 'SG'

export interface CallUsage {
  model: string
  inputTokens: number
  outputTokens: number
  webSearchCount: number
  cost: number
  agentId: string
  timestamp: number
}

export class CostTracker {
  private calls: CallUsage[] = []
  private pipelineType: PipelineType
  private budgetLimit: number
  private singleCallLimit: number
  private _aborted = false
  private _abortReason = ''

  constructor(pipelineType: PipelineType) {
    this.pipelineType = pipelineType
    this.budgetLimit = pipelineType === 'AG'
      ? DEFAULT_BUDGETS.AG_PIPELINE
      : DEFAULT_BUDGETS.SG_PIPELINE
    this.singleCallLimit = DEFAULT_BUDGETS.SINGLE_CALL
  }

  get aborted(): boolean { return this._aborted }
  get abortReason(): string { return this._abortReason }

  /** 現在の累計コスト */
  get totalCost(): number {
    return this.calls.reduce((sum, c) => sum + c.cost, 0)
  }

  /** 残り予算 */
  get remaining(): number {
    return Math.max(0, this.budgetLimit - this.totalCost)
  }

  /** API呼び出し前の事前チェック — 予算超過なら例外 */
  preCheck(agentId: string, model: string, estimatedInputTokens: number): void {
    if (this._aborted) {
      throw new BudgetExceededError(
        `[BUDGET] パイプライン停止中: ${this._abortReason}`,
        this.pipelineType, this.totalCost, this.budgetLimit
      )
    }

    // 最低コスト見積もり（入力のみ）
    const pricing = PRICING[model]
    if (!pricing) return  // 不明モデルはチェックスキップ

    const minCost = (estimatedInputTokens / 1_000_000) * pricing.input
    if (this.totalCost + minCost > this.budgetLimit) {
      this._aborted = true
      this._abortReason = `${agentId} の入力だけで予算超過（累計$${this.totalCost.toFixed(2)} + 見積$${minCost.toFixed(2)} > 上限$${this.budgetLimit.toFixed(2)}）`
      throw new BudgetExceededError(
        `[BUDGET] ${this._abortReason}`,
        this.pipelineType, this.totalCost + minCost, this.budgetLimit
      )
    }
  }

  /** API呼び出し後にコストを記録 + 超過チェック */
  record(
    agentId: string,
    model: string,
    inputTokens: number,
    outputTokens: number,
    webSearchCount: number = 0
  ): CallUsage {
    const pricing = PRICING[model] ?? { input: 3.0, output: 15.0 }  // fallback Sonnet

    const cost =
      (inputTokens / 1_000_000) * pricing.input +
      (outputTokens / 1_000_000) * pricing.output +
      webSearchCount * WEB_SEARCH_COST

    const usage: CallUsage = {
      model, inputTokens, outputTokens, webSearchCount,
      cost, agentId, timestamp: Date.now(),
    }
    this.calls.push(usage)

    // 単一呼び出しコストチェック
    if (cost > this.singleCallLimit) {
      console.warn(
        `[BUDGET] ⚠ ${agentId} 単一呼び出し $${cost.toFixed(2)} が上限 $${this.singleCallLimit.toFixed(2)} を超過`
      )
    }

    // パイプライン累計チェック
    if (this.totalCost > this.budgetLimit) {
      this._aborted = true
      this._abortReason = `累計コスト $${this.totalCost.toFixed(2)} が上限 $${this.budgetLimit.toFixed(2)} を超過（最後: ${agentId}）`
      console.error(`[BUDGET] 🛑 ${this._abortReason}`)
      throw new BudgetExceededError(
        `[BUDGET] ${this._abortReason}`,
        this.pipelineType, this.totalCost, this.budgetLimit
      )
    }

    console.log(
      `[COST] ${agentId} | ${model.split('-').slice(-2).join('-')} | ` +
      `in=${inputTokens} out=${outputTokens} search=${webSearchCount} | ` +
      `$${cost.toFixed(3)} | 累計=$${this.totalCost.toFixed(2)}/$${this.budgetLimit.toFixed(2)}`
    )

    return usage
  }

  /** パイプライン完了時のサマリー */
  summary(): {
    totalCost: number
    callCount: number
    breakdown: Record<string, { calls: number; cost: number; inputTokens: number; outputTokens: number }>
    webSearchTotal: number
  } {
    const breakdown: Record<string, { calls: number; cost: number; inputTokens: number; outputTokens: number }> = {}
    let webSearchTotal = 0

    for (const c of this.calls) {
      if (!breakdown[c.agentId]) {
        breakdown[c.agentId] = { calls: 0, cost: 0, inputTokens: 0, outputTokens: 0 }
      }
      breakdown[c.agentId].calls++
      breakdown[c.agentId].cost += c.cost
      breakdown[c.agentId].inputTokens += c.inputTokens
      breakdown[c.agentId].outputTokens += c.outputTokens
      webSearchTotal += c.webSearchCount
    }

    return {
      totalCost: this.totalCost,
      callCount: this.calls.length,
      breakdown,
      webSearchTotal,
    }
  }
}

// ── パイプライン単位のグローバルトラッカー ─────────────────────
let _currentTracker: CostTracker | null = null

/** パイプライン開始時に呼ぶ */
export function startCostTracking(pipelineType: PipelineType): CostTracker {
  _currentTracker = new CostTracker(pipelineType)
  return _currentTracker
}

/** 現在のトラッカーを取得（なければダミー） */
export function getCostTracker(): CostTracker | null {
  return _currentTracker
}

/** パイプライン終了時にリセット */
export function endCostTracking(): { totalCost: number; callCount: number } | null {
  if (!_currentTracker) return null
  const summary = _currentTracker.summary()
  console.log(`[COST] === パイプライン終了 === 合計: $${summary.totalCost.toFixed(2)} (${summary.callCount}回)`)
  for (const [agentId, data] of Object.entries(summary.breakdown)) {
    console.log(`  ${agentId}: $${data.cost.toFixed(3)} (${data.calls}回, in=${data.inputTokens}, out=${data.outputTokens})`)
  }
  if (summary.webSearchTotal > 0) {
    console.log(`  web_search合計: ${summary.webSearchTotal}回 ($${(summary.webSearchTotal * WEB_SEARCH_COST).toFixed(2)})`)
  }
  _currentTracker = null
  return { totalCost: summary.totalCost, callCount: summary.callCount }
}

// ── 予算超過エラー ───────────────────────────────────────────
export class BudgetExceededError extends Error {
  constructor(
    message: string,
    public pipelineType: PipelineType,
    public currentCost: number,
    public budgetLimit: number
  ) {
    super(message)
    this.name = 'BudgetExceededError'
  }
}
