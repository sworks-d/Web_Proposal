import { NextRequest, NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import path from 'path'
import Anthropic from '@anthropic-ai/sdk'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { agentId } = await params
  const { feedback, currentOutput } = await req.json()

  let currentPrompt = ''
  try {
    const promptPath = path.join(process.cwd(), '.claude', 'agents', `${agentId}.md`)
    currentPrompt = readFileSync(promptPath, 'utf-8')
  } catch {
    // .claude/agents/ にない場合はフォールバック
    currentPrompt = `Agent: ${agentId} — プロンプトファイルが見つかりません`
  }

  const client = new Anthropic()
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4000,
    messages: [{
      role: 'user',
      content: `あなたはプロンプトエンジニアです。
以下のエージェントプロンプトを、CDのフィードバックに基づいて改善してください。

## 現在のプロンプト
${currentPrompt}

## CDのフィードバック
${feedback}

## 実際の出力（先頭2000字）
${JSON.stringify(currentOutput).slice(0, 2000)}

## 指示
1. フィードバックの本質的な問題を特定する
2. プロンプトのどこを・どう変えるべきかを説明する
3. 改善後のプロンプト全文を出力する

## 出力形式（JSONのみ・コードフェンス不要）
{"diagnosis":"何が問題だったか","changes":["変更点1","変更点2"],"improvedPrompt":"改善後のプロンプト全文"}`,
    }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : '{}'
  try {
    const result = JSON.parse(text)
    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: 'Parse failed', raw: text }, { status: 500 })
  }
}
