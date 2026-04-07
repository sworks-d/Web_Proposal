import { NextRequest } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { generatePptxBuffer } from '@/lib/pptx-generator'
import { SgFinalOutput } from '@/agents/sg-types'

const prisma = new PrismaClient()

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: versionId } = await params

  const sg = await prisma.sgGeneration.findFirst({
    where: { versionId, status: 'COMPLETED' },
    orderBy: { startedAt: 'desc' },
  })

  if (!sg || !sg.sg06Output) {
    return new Response('No completed SG generation found', { status: 404 })
  }

  let output: SgFinalOutput
  try {
    output = JSON.parse(sg.sg06Output) as SgFinalOutput
  } catch {
    return new Response('Invalid SG output JSON', { status: 500 })
  }

  const buffer = await generatePptxBuffer(output)
  const filename = `proposal_${output.metadata.clientName}_${new Date().toISOString().slice(0, 10)}.pptx`

  return new Response(buffer as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
    },
  })
}
