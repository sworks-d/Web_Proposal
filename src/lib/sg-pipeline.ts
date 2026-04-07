import { SgAgentId, SgInput, SgParams, SgFinalOutput } from '@/agents/sg-types'
import { Sg01Agent } from '@/agents/sg-01'
import { Sg02Agent } from '@/agents/sg-02'
import { Sg03Agent } from '@/agents/sg-03'
import { Sg04Agent } from '@/agents/sg-04'
import { Sg05Agent } from '@/agents/sg-05'
import { Sg06Agent } from '@/agents/sg-06'

export type SgProgressCallback = (step: SgAgentId, name: string) => void

export interface SgPipelineResult {
  finalOutput: SgFinalOutput
  allOutputs: Partial<Record<SgAgentId, unknown>>
}

export async function runSgPipeline(
  clientName: string,
  briefText: string,
  agOutputs: Record<string, unknown>,
  params: SgParams,
  onProgress?: SgProgressCallback,
): Promise<SgPipelineResult> {
  const agents = [
    new Sg01Agent(),
    new Sg02Agent(),
    new Sg03Agent(),
    new Sg04Agent(),
    new Sg05Agent(),
    new Sg06Agent(),
  ]

  const sgOutputs: Partial<Record<SgAgentId, unknown>> = {}

  for (const agent of agents) {
    onProgress?.(agent.id, agent.name)

    const input: SgInput = {
      clientName,
      briefText,
      params,
      agOutputs,
      sgOutputs,
    }

    const output = await agent.run(input)
    sgOutputs[agent.id] = output
  }

  return {
    finalOutput: sgOutputs['SG-06'] as SgFinalOutput,
    allOutputs: sgOutputs,
  }
}
