import { PrismaClient } from '@prisma/client'
import { AgentInput, AgentOutput, AgentId, PipelineConfig } from '@/agents/types'
import { IntakeAgent } from '@/agents/ag-01-intake'
import { Ag02BaseAgent } from '@/agents/ag-02-base'
import { Ag02RecruitAgent } from '@/agents/ag-02-recruit'
import { Ag02BrandAgent } from '@/agents/ag-02-brand'
import { Ag02EcAgent } from '@/agents/ag-02-ec'
import { Ag02CorpAgent } from '@/agents/ag-02-corp'
import { Ag02CampAgent } from '@/agents/ag-02-camp'
import { Ag02BtobAgent } from '@/agents/ag-02-btob'
import { Ag02GeneralAgent } from '@/agents/ag-02-general'
import { Ag03CompetitorAgent } from '@/agents/ag-03-competitor'
import { Ag04InsightAgent } from '@/agents/ag-04-insight'
import { Ag05FactcheckAgent } from '@/agents/ag-05-factcheck'
import { Ag06DraftAgent } from '@/agents/ag-06-draft'
import { Ag07StoryAgent } from '@/agents/ag-07-story'

const prisma = new PrismaClient()

function createAg02Agent(primaryId: string): Ag02BaseAgent {
  const map: Record<string, () => Ag02BaseAgent> = {
    'ag-02-recruit': () => new Ag02RecruitAgent(),
    'ag-02-brand':   () => new Ag02BrandAgent(),
    'ag-02-ec':      () => new Ag02EcAgent(),
    'ag-02-corp':    () => new Ag02CorpAgent(),
    'ag-02-camp':    () => new Ag02CampAgent(),
    'ag-02-btob':    () => new Ag02BtobAgent(),
    'ag-02-general': () => new Ag02GeneralAgent(),
  }
  const factory = map[primaryId]
  return factory ? factory() : new Ag02GeneralAgent()
}

export async function runAgentStep(
  versionId: string,
  agentId: AgentId,
  input: AgentInput,
  config: PipelineConfig
): Promise<AgentOutput> {
  const execution = await prisma.execution.create({
    data: { versionId, agentId, mode: 'FULL', status: 'RUNNING' },
  })

  let agent
  switch (agentId) {
    case 'AG-01': agent = new IntakeAgent(); break
    case 'AG-02': {
      const ag02 = createAg02Agent(config.primaryAgent)
      ag02.setSubAgents(config.subAgents)
      agent = ag02
      break
    }
    case 'AG-03': agent = new Ag03CompetitorAgent(); break
    case 'AG-04': agent = new Ag04InsightAgent(); break
    case 'AG-05': agent = new Ag05FactcheckAgent(); break
    case 'AG-06': agent = new Ag06DraftAgent(); break
    case 'AG-07': agent = new Ag07StoryAgent(); break
    default: throw new Error(`Unknown agent: ${agentId}`)
  }

  const output = await agent.execute(input)

  await prisma.agentResult.create({
    data: { executionId: execution.id, agentId, outputJson: JSON.stringify(output) },
  })
  await prisma.execution.update({
    where: { id: execution.id },
    data: { status: 'COMPLETED', completedAt: new Date() },
  })

  return output
}

export async function setVersionStatus(versionId: string, status: string) {
  await prisma.proposalVersion.update({
    where: { id: versionId },
    data: {
      status,
      completedAt: status === 'COMPLETED' ? new Date() : undefined,
    },
  })
}

export async function getVersionOutputs(versionId: string): Promise<Record<string, AgentOutput>> {
  const executions = await prisma.execution.findMany({
    where: { versionId, status: 'COMPLETED' },
    include: { results: true },
    orderBy: { startedAt: 'asc' },
  })

  const outputs: Record<string, AgentOutput> = {}
  for (const exec of executions) {
    const result = exec.results[0]
    if (result) {
      outputs[exec.agentId] = JSON.parse(result.editedJson ?? result.outputJson)
    }
  }
  return outputs
}
