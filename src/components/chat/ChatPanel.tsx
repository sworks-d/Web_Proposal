'use client'
import { useState } from 'react'
import { AgentOutput, SSEEvent } from '@/agents/types'
import MessageList from './MessageList'
import ChatInput from './ChatInput'
import { ChatMessage } from './MessageItem'

interface ChatPanelProps {
  projectId: string
  onComplete: (output: AgentOutput) => void
}

export default function ChatPanel({ projectId, onComplete }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [input, setInput] = useState('')

  const addMessage = (msg: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    setMessages(prev => [...prev, { ...msg, id: crypto.randomUUID(), timestamp: new Date() }])
  }

  const handleSubmit = async () => {
    if (isRunning) return

    if (input.trim()) {
      addMessage({ role: 'user', content: input.trim() })
    }

    setIsRunning(true)

    const res = await fetch('/api/executions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, agentId: 'AG-01', userInstruction: input.trim() || undefined }),
    })

    setInput('')

    const reader = res.body?.getReader()
    const decoder = new TextDecoder()

    if (!reader) {
      addMessage({ role: 'system', content: 'エラー: レスポンスを取得できませんでした' })
      setIsRunning(false)
      return
    }

    let buffer = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        try {
          const event: SSEEvent = JSON.parse(line.slice(6))
          if (event.type === 'status') {
            addMessage({ role: 'system', content: event.message })
          } else if (event.type === 'complete') {
            addMessage({ role: 'agent', content: '分析が完了しました。右側のプレビューをご確認ください。', agentId: 'AG-01' })
            onComplete(event.output)
          } else if (event.type === 'error') {
            addMessage({ role: 'system', content: `エラー: ${event.message}` })
          }
        } catch {
          // ignore parse errors
        }
      }
    }

    setIsRunning(false)
  }

  return (
    <div className="flex flex-col h-full">
      <MessageList messages={messages} />
      <ChatInput
        value={input}
        onChange={setInput}
        onSubmit={handleSubmit}
        isRunning={isRunning}
      />
    </div>
  )
}
