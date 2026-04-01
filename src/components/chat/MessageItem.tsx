import { AgentId } from '@/agents/types'

export interface ChatMessage {
  id: string
  role: 'user' | 'agent' | 'system'
  content: string
  timestamp: Date
  agentId?: AgentId
}

interface MessageItemProps {
  message: ChatMessage
}

export default function MessageItem({ message }: MessageItemProps) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end mb-3">
        <div className="max-w-xs bg-blue-500 text-white rounded-lg px-4 py-2 text-sm">
          {message.content}
        </div>
      </div>
    )
  }

  if (message.role === 'system') {
    return (
      <div className="flex justify-center mb-2">
        <span className="text-xs text-gray-400">{message.content}</span>
      </div>
    )
  }

  return (
    <div className="flex gap-2 mb-3">
      {message.agentId && (
        <span className="shrink-0 text-xs font-mono bg-gray-200 text-gray-700 px-2 py-1 rounded h-fit mt-1">
          {message.agentId}
        </span>
      )}
      <div className="bg-gray-100 rounded-lg px-4 py-2 text-sm text-gray-800 max-w-sm whitespace-pre-wrap">
        {message.content}
      </div>
    </div>
  )
}
