import { NextRequest, NextResponse } from 'next/server'
import { writeFileSync, copyFileSync, existsSync } from 'fs'
import { execSync } from 'child_process'
import path from 'path'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { agentId } = await params
  const { improvedPrompt, diagnosis, cdFeedback } = await req.json()

  const promptPath = path.join(process.cwd(), '.claude', 'agents', `${agentId}.md`)

  // バックアップ作成（ファイルが存在する場合のみ）
  if (existsSync(promptPath)) {
    const backupPath = promptPath.replace('.md', `.backup.${Date.now()}.md`)
    copyFileSync(promptPath, backupPath)
  }

  // 書き込み
  writeFileSync(promptPath, improvedPrompt, 'utf-8')

  // DBにバージョン記録
  const latest = await prisma.promptVersion.findFirst({
    where: { agentId, version: { gt: 0 } },
    orderBy: { version: 'desc' },
  })
  const nextVersion = (latest?.version ?? 0) + 1

  await prisma.promptVersion.create({
    data: {
      agentId,
      version: nextVersion,
      content: improvedPrompt,
      changeNote: diagnosis,
      cdFeedback: cdFeedback ?? null,
    },
  })

  // git push（失敗してもローカルは保存済みなのでエラーにしない）
  try {
    execSync(
      `cd ${process.cwd()} && git add .claude/agents/${agentId}.md && git commit -m "AG改善: ${agentId} v${nextVersion}" && git push origin main`,
      { timeout: 30000 }
    )
    return NextResponse.json({ success: true, message: 'GitHubにpushしました', version: nextVersion })
  } catch {
    return NextResponse.json({
      success: true,
      message: 'ローカルに保存しました（git push を手動で実行してください）',
      version: nextVersion,
    })
  }
}
