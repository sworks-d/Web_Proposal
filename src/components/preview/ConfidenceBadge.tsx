import { ConfidenceLevel } from '@/agents/types'

interface ConfidenceBadgeProps {
  level: ConfidenceLevel
}

const config: Record<ConfidenceLevel, { label: string; className: string }> = {
  high: { label: '信頼度: 高', className: 'bg-green-100 text-green-800' },
  medium: { label: '信頼度: 中', className: 'bg-yellow-100 text-yellow-800' },
  low: { label: '信頼度: 低（要確認）', className: 'bg-red-100 text-red-800' },
}

export default function ConfidenceBadge({ level }: ConfidenceBadgeProps) {
  const { label, className } = config[level]
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${className}`}>
      {label}
    </span>
  )
}
