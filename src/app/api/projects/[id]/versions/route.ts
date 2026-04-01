import { NextRequest, NextResponse } from 'next/server'
import { createFirstVersion, createNextVersion, getVersionHistory } from '@/lib/version-manager'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const versions = await getVersionHistory(id)
  return NextResponse.json(versions)
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await req.json()

  if (body.type === 'new') {
    const version = await createFirstVersion(id, {
      primaryAgent: body.primaryAgent ?? 'ag-02-general',
      subAgents: body.subAgents ?? [],
      label: body.label,
    })
    return NextResponse.json(version)
  }

  if (body.type === 'update') {
    const version = await createNextVersion(body.parentVersionId, {
      changeReason: body.changeReason,
      label: body.label,
      agentsToRerun: body.agentsToRerun ?? [],
      cdNotes: body.cdNotes,
      newPrimaryAgent: body.newPrimaryAgent,
      newSubAgents: body.newSubAgents,
    })
    return NextResponse.json(version)
  }

  return NextResponse.json({ error: 'type must be "new" or "update"' }, { status: 400 })
}
