import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function createFirstVersion(
  projectId: string,
  config: { primaryAgent: string; subAgents: string[]; label?: string }
) {
  return prisma.proposalVersion.create({
    data: {
      projectId,
      versionNumber: 1,
      label: config.label ?? '初回提案',
      primaryAgent: config.primaryAgent,
      subAgents: JSON.stringify(config.subAgents),
      status: 'DRAFT',
    },
  })
}

export async function createNextVersion(
  parentVersionId: string,
  options: {
    changeReason: string
    label?: string
    agentsToRerun: string[]
    cdNotes?: Record<string, string>
    newPrimaryAgent?: string
    newSubAgents?: string[]
  }
) {
  const parent = await prisma.proposalVersion.findUnique({
    where: { id: parentVersionId },
    include: { executions: { include: { results: true } } },
  })
  if (!parent) throw new Error('Parent version not found')

  const maxVersion = await prisma.proposalVersion.findFirst({
    where: { projectId: parent.projectId },
    orderBy: { versionNumber: 'desc' },
  })

  const newVersion = await prisma.proposalVersion.create({
    data: {
      projectId: parent.projectId,
      versionNumber: (maxVersion?.versionNumber ?? 0) + 1,
      label: options.label,
      changeReason: options.changeReason,
      parentVersionId,
      primaryAgent: options.newPrimaryAgent ?? parent.primaryAgent,
      subAgents: options.newSubAgents
        ? JSON.stringify(options.newSubAgents)
        : parent.subAgents,
      cdNotes: options.cdNotes ? JSON.stringify(options.cdNotes) : null,
      status: 'DRAFT',
    },
  })

  const agentOrder = ['AG-01', 'AG-02', 'AG-03', 'AG-04', 'AG-05', 'AG-06', 'AG-07']
  const firstRerunIndex = Math.min(
    ...options.agentsToRerun.map(a => agentOrder.indexOf(a)).filter(i => i >= 0)
  )

  for (let i = 0; i < agentOrder.length; i++) {
    const agentId = agentOrder[i]
    const shouldRerun = i >= firstRerunIndex

    if (!shouldRerun) {
      const prevExecution = parent.executions.find(e => e.agentId === agentId && e.status === 'COMPLETED')
      if (prevExecution) {
        const inherited = await prisma.execution.create({
          data: {
            versionId: newVersion.id,
            agentId,
            mode: 'SPOT',
            status: 'COMPLETED',
            isInherited: true,
            inheritedFromVersionId: parentVersionId,
            completedAt: new Date(),
          },
        })
        for (const result of prevExecution.results) {
          await prisma.agentResult.create({
            data: {
              executionId: inherited.id,
              agentId: result.agentId,
              outputJson: result.outputJson,
              editedJson: result.editedJson,
              approvedAt: result.approvedAt,
            },
          })
        }
      }
    }
  }

  return newVersion
}

export async function getVersionHistory(projectId: string) {
  return prisma.proposalVersion.findMany({
    where: { projectId },
    orderBy: { versionNumber: 'asc' },
    select: {
      id: true,
      versionNumber: true,
      label: true,
      status: true,
      changeReason: true,
      createdAt: true,
      completedAt: true,
    },
  })
}

export async function getOrCreateActiveVersion(
  projectId: string,
  config: { primaryAgent: string; subAgents: string[] }
) {
  const existing = await prisma.proposalVersion.findFirst({
    where: { projectId, status: { in: ['DRAFT', 'RUNNING', 'CHECKPOINT'] } },
    orderBy: { versionNumber: 'desc' },
  })
  if (existing) return existing
  return createFirstVersion(projectId, config)
}
