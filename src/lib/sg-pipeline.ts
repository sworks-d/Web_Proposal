import { PrismaClient } from '@prisma/client'
import { SgAgentId, SgInput, SgParams, SgFinalOutput } from '@/agents/sg-types'
import { Sg01Agent } from '@/agents/sg-01'
import { Sg02Agent } from '@/agents/sg-02'
import { Sg03Agent } from '@/agents/sg-03'
import { Sg04Agent } from '@/agents/sg-04'
import { Sg05Agent } from '@/agents/sg-05'
import { Sg06Agent } from '@/agents/sg-06'
import { safeParseJson } from '@/lib/json-cleaner'
import { startCostTracking, endCostTracking, BudgetExceededError } from '@/lib/cost-tracker'

const prisma = new PrismaClient()

export type SgProgressCallback = (step: SgAgentId, name: string) => void

export interface SgPipelineResult {
  finalOutput: SgFinalOutput
  allOutputs: Partial<Record<SgAgentId, unknown>>
}

// SgAgentId → DBカラム名のマップ
const OUTPUT_COLUMN: Record<SgAgentId, 'sg01Output' | 'sg02Output' | 'sg03Output' | 'sg04Output' | 'sg05Output' | 'sg06Output'> = {
  'SG-01': 'sg01Output',
  'SG-02': 'sg02Output',
  'SG-03': 'sg03Output',
  'SG-04': 'sg04Output',
  'SG-05': 'sg05Output',
  'SG-06': 'sg06Output',
}

export async function runSgPipeline(
  generationId: string,
  clientName: string,
  briefText: string,
  agOutputs: Record<string, unknown>,
  params: SgParams,
  onProgress?: SgProgressCallback,
): Promise<SgPipelineResult> {
  const generation = await prisma.sgGeneration.findUnique({ where: { id: generationId } })
  if (!generation) throw new Error(`SgGeneration ${generationId} not found`)

  // ── コスト追跡開始 ──
  const costTracker = startCostTracking('SG')

  // 既存の出力を復元（再開時）
  const sgOutputs: Partial<Record<SgAgentId, unknown>> = {}
  const cols = ['sg01Output', 'sg02Output', 'sg03Output', 'sg04Output', 'sg05Output', 'sg06Output'] as const
  const ids: SgAgentId[] = ['SG-01', 'SG-02', 'SG-03', 'SG-04', 'SG-05', 'SG-06']
  for (let i = 0; i < 6; i++) {
    const val = (generation as Record<string, unknown>)[cols[i]] as string | null
    if (val) {
      const parsed = safeParseJson(val)
      if (parsed) sgOutputs[ids[i]] = parsed
    }
  }

  const agents = [
    new Sg01Agent(),
    new Sg02Agent(),
    new Sg03Agent(),
    new Sg04Agent(),
    new Sg05Agent(),
    new Sg06Agent(),
  ]

  // 開始位置: 出力がまだ保存されていない最初のエージェント
  const startIndex = agents.findIndex(a => !sgOutputs[a.id])
  const startFrom = startIndex === -1 ? agents.length : startIndex

  for (let i = startFrom; i < agents.length; i++) {
    const agent = agents[i]

    onProgress?.(agent.id, agent.name)

    // 現在のステップをDBに記録
    await prisma.sgGeneration.update({
      where: { id: generationId },
      data: { currentStep: agent.id },
    })

    const input: SgInput = {
      clientName,
      briefText,
      params,
      agOutputs,
      sgOutputs,
    }

    try {
      const output = await agent.run(input)
      sgOutputs[agent.id] = output

      // 出力をDBに即時保存
      await prisma.sgGeneration.update({
        where: { id: generationId },
        data: { [OUTPUT_COLUMN[agent.id]]: JSON.stringify(output) },
      })
    } catch (err) {
      const costSummary = endCostTracking()
      const isBudgetError = err instanceof BudgetExceededError
      await prisma.sgGeneration.update({
        where: { id: generationId },
        data: {
          status: 'ERROR',
          errorMessage: (isBudgetError ? '[BUDGET超過] ' : '') +
            (err instanceof Error ? err.message : String(err)) +
            (costSummary ? ` (累計コスト: $${costSummary.totalCost.toFixed(2)})` : ''),
          completedAt: new Date(),
        },
      }).catch(() => {})
      throw err
    }
  }

  // ── コスト追跡終了 ──
  const costSummary = endCostTracking()

  await prisma.sgGeneration.update({
    where: { id: generationId },
    data: { status: 'COMPLETED', currentStep: null, completedAt: new Date() },
  })

  return {
    finalOutput: sgOutputs['SG-06'] as SgFinalOutput,
    allOutputs: sgOutputs,
  }
}
