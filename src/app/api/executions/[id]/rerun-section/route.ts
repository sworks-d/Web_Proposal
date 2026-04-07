import { NextRequest } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { runAgentStep, getVersionOutputs } from '@/lib/pipeline'
import { PipelineConfig, ProjectContext, AgentId } from '@/agents/types'

export const maxDuration = 600

const prisma = new PrismaClient()

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: versionId } = await params
  const { agentId, sectionId, instruction } = await req.json()

  if (!agentId || !instruction) {
    return Response.json({ error: 'agentId と instruction が必要です' }, { status: 400 })
  }

  const version = await prisma.proposalVersion.findUnique({
    where: { id: versionId },
    include: { project: { include: { client: true } } },
  })
  if (!version) return Response.json({ error: 'Not found' }, { status: 404 })

  const cdNotes = version.cdNotes
    ? (() => { try { return JSON.parse(version.cdNotes) } catch { return undefined } })()
    : undefined

  const projectContext: ProjectContext = {
    clientName: version.project.client.name,
    clientIndustry: version.project.client.industry ?? undefined,
    briefText: version.project.briefText,
    industryType: version.project.industryType,
    cdNotes,
    caseType: (version.project.caseType as 'A' | 'B' | 'C') ?? 'A',
    siteUrl: version.project.siteUrl ?? undefined,
  }

  const config: PipelineConfig = {
    mode: 'full',
    primaryAgent: version.primaryAgent as PipelineConfig['primaryAgent'],
    subAgents: (() => { try { return JSON.parse(version.subAgents) } catch { return [] } })(),
    secondaryAgent: version.secondaryAgent as PipelineConfig['secondaryAgent'] | undefined,
  }

  // 対象AGより前の出力をpreviousOutputsとして構築
  const prevOutputMap = await getVersionOutputs(versionId)
  const AGENT_ORDER: AgentId[] = [
    'AG-01', 'AG-01-RESEARCH', 'AG-01-MERGE',
    'AG-02', 'AG-02-STP', 'AG-02-JOURNEY', 'AG-02-VPC', 'AG-02-POSITION', 'AG-02-MERGE', 'AG-02-VALIDATE',
    'AG-03', 'AG-03-HEURISTIC', 'AG-03-HEURISTIC2', 'AG-03-GAP', 'AG-03-DATA', 'AG-03-MERGE',
    'AG-04', 'AG-04-MAIN', 'AG-04-INSIGHT', 'AG-04-MERGE',
    'AG-05', 'AG-06',
    'AG-07A', 'AG-07B', 'AG-07C-1', 'AG-07C-2', 'AG-07C-3', 'AG-07C-4',
  ]
  const targetIndex = AGENT_ORDER.indexOf(agentId as AgentId)
  const previousOutputs = AGENT_ORDER
    .slice(0, targetIndex >= 0 ? targetIndex : AGENT_ORDER.length)
    .filter(id => prevOutputMap[id])
    .map(id => prevOutputMap[id])

  const rerunInstruction = sectionId
    ? `【差し戻し指示】セクション「${sectionId}」について:\n${instruction}`
    : `【差し戻し指示】\n${instruction}`

  try {
    const result = await runAgentStep(
      versionId,
      agentId as AgentId,
      { projectContext, previousOutputs, rerunInstruction },
      config
    )
    return Response.json({ success: true, result })
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 })
  }
}
