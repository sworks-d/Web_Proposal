import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { AgentOutput } from '@/agents/types'

const prisma = new PrismaClient()

// id = versionId
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const version = await prisma.proposalVersion.findUnique({
    where: { id },
    include: {
      project: { include: { client: true } },
      executions: {
        where: { status: 'COMPLETED' },
        include: { results: true },
        orderBy: { startedAt: 'asc' },
      },
    },
  })
  if (!version) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const agentOrder = ['AG-01', 'AG-02', 'AG-03', 'AG-04', 'AG-05', 'AG-06', 'AG-07']
  const outputMap: Record<string, AgentOutput> = {}
  for (const exec of version.executions) {
    const result = exec.results[0]
    if (result) outputMap[exec.agentId] = JSON.parse(result.editedJson ?? result.outputJson)
  }
  const outputs = agentOrder.filter(id => outputMap[id]).map(id => outputMap[id])

  const md = buildMarkdown(
    version.project as unknown as Record<string, unknown>,
    version.label ?? `v${version.versionNumber}`,
    outputs
  )

  return new NextResponse(md, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Content-Disposition': `attachment; filename="proposal-v${version.versionNumber}-${id}.md"`,
    },
  })
}

function buildMarkdown(project: Record<string, unknown>, versionLabel: string, outputs: AgentOutput[]): string {
  const client = project.client as Record<string, string>
  const lines: string[] = [
    `# ${project.title as string}`,
    `**クライアント：** ${client.name}`,
    `**バージョン：** ${versionLabel}`,
    `**作成日：** ${new Date().toLocaleDateString('ja-JP')}`,
    '',
    '---',
    '',
  ]
  for (const output of outputs) {
    lines.push(`## ${output.agentId}`)
    lines.push('')
    for (const section of output.sections) {
      lines.push(`### ${section.title}`)
      lines.push('')
      lines.push(section.content)
      lines.push('')
    }
    if (output.metadata.assumptions.length > 0) {
      lines.push('**推測として扱った情報：**')
      for (const a of output.metadata.assumptions) lines.push(`- ${a}`)
      lines.push('')
    }
    lines.push('---')
    lines.push('')
  }
  return lines.join('\n')
}
