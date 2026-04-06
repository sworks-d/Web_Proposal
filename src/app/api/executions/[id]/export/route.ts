import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { safeParseJson } from '@/lib/json-cleaner'
import { renderAgentOutput, OutputSection } from '@/lib/output-renderer'

const prisma = new PrismaClient()

const AGENT_ORDER = [
  'AG-01',
  'AG-02', 'AG-02-STP', 'AG-02-JOURNEY', 'AG-02-VPC', 'AG-02-MERGE', 'AG-02-VALIDATE',
  'AG-03', 'AG-03-HEURISTIC', 'AG-03-HEURISTIC2', 'AG-03-GAP', 'AG-03-DATA', 'AG-03-MERGE',
  'AG-04-MAIN', 'AG-04', 'AG-04-MERGE',
  'AG-05', 'AG-06',
  'AG-07A', 'AG-07B', 'AG-07C',
]

const AG_LABELS: Record<string, string> = {
  'AG-01':            'インテーク担当',
  'AG-02':            '市場骨格分析',
  'AG-02-STP':        'STPセグメンテーション',
  'AG-02-JOURNEY':    'カスタマージャーニー',
  'AG-02-VPC':        'バリュープロポジション',
  'AG-02-MERGE':      '市場分析統合',
  'AG-02-VALIDATE':   'ターゲット設計検証',
  'AG-03':            '競合特定・ポジション',
  'AG-03-HEURISTIC':  'ヒューリスティック評価（上位2社）',
  'AG-03-HEURISTIC2': 'ヒューリスティック評価（残競合）',
  'AG-03-GAP':        'コンテンツギャップ',
  'AG-03-DATA':       'GA4・SC分析',
  'AG-03-MERGE':      '競合分析統合',
  'AG-04-MAIN':       '5Whys・HMW',
  'AG-04':            'インサイト・JTBD',
  'AG-04-MERGE':      '課題定義統合',
  'AG-05':            'ファクトチェック',
  'AG-06':            '設計草案',
  'AG-07A':           '設計根拠ライター',
  'AG-07B':           'リファレンス戦略',
  'AG-07C':           '提案書草案',
}

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

  // agentId → raw Claude JSON のマップを構築
  const outputMap: Record<string, any> = {}
  for (const exec of version.executions) {
    const result = exec.results[0]
    if (!result) continue
    const parsed = safeParseJson(result.editedJson ?? result.outputJson)
    if (parsed) outputMap[exec.agentId] = parsed
  }

  const project = version.project
  const client = project.client
  const versionLabel = version.label ?? `v${version.versionNumber}`

  const lines: string[] = [
    `# ${project.title}`,
    ``,
    `**クライアント：** ${client.name}`,
    `**業種：** ${client.industry ?? '未設定'}`,
    `**バージョン：** ${versionLabel}`,
    `**作成日：** ${new Date().toLocaleDateString('ja-JP')}`,
    ``,
    `---`,
    ``,
  ]

  for (const agentId of AGENT_ORDER) {
    const json = outputMap[agentId]
    if (!json) continue

    const label = AG_LABELS[agentId] ?? agentId
    lines.push(`## ${agentId} — ${label}`)
    lines.push(``)

    const sections: OutputSection[] = renderAgentOutput(agentId, json)

    for (const section of sections) {
      const confTag = section.confidence ? `　［信頼度: ${section.confidence}］` : ''
      lines.push(`### ${section.label}${confTag}`)
      lines.push(``)

      for (const item of section.items) {
        if (Array.isArray(item.content)) {
          for (const c of item.content) lines.push(`- ${c}`)
        } else if (item.type === 'warning') {
          lines.push(`> ⚠️ ${item.content}`)
          if (item.note) lines.push(`> ${item.note}`)
        } else if (item.type === 'principle') {
          lines.push(`**${item.content}**`)
          if (item.note) lines.push(item.note)
        } else {
          lines.push(String(item.content))
          if (item.note && item.note !== 'secondary') lines.push(`*${item.note}*`)
        }
        lines.push(``)
      }
    }

    if (Array.isArray(json.assumptions) && json.assumptions.length > 0) {
      lines.push(`**推測として扱った情報：**`)
      for (const a of json.assumptions) lines.push(`- ${a}`)
      lines.push(``)
    }

    lines.push(`---`)
    lines.push(``)
  }

  const md = lines.join('\n')
  return new NextResponse(md, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Content-Disposition': `attachment; filename="proposal-${versionLabel}-${id.slice(0, 8)}.md"`,
    },
  })
}
