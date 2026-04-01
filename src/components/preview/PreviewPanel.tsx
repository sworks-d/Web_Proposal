import { AgentOutput } from '@/agents/types'
import SectionCard from './SectionCard'
import ConfidenceBadge from './ConfidenceBadge'

interface PreviewPanelProps {
  output: AgentOutput | null
  onSectionEdit: (sectionId: string, newContent: string) => void
}

export default function PreviewPanel({ output, onSectionEdit }: PreviewPanelProps) {
  if (!output) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
        AG-01を実行すると結果がここに表示されます
      </div>
    )
  }

  return (
    <div className="p-6">
      {output.sections.map(section => (
        <SectionCard
          key={section.id}
          section={section}
          confidence={output.metadata.confidence}
          onEdit={onSectionEdit}
        />
      ))}

      <div className="border rounded-lg p-4 bg-gray-50 text-sm space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-gray-600 font-medium">全体信頼度:</span>
          <ConfidenceBadge level={output.metadata.confidence} />
        </div>
        {output.metadata.factBasis.length > 0 && (
          <div>
            <p className="text-gray-600 font-medium mb-1">根拠情報:</p>
            <ul className="space-y-0.5">
              {output.metadata.factBasis.map((f, i) => (
                <li key={i} className="text-gray-500">・{f}</li>
              ))}
            </ul>
          </div>
        )}
        {output.metadata.assumptions.length > 0 && (
          <div>
            <p className="text-gray-600 font-medium mb-1">推測として扱った情報:</p>
            <ul className="space-y-0.5">
              {output.metadata.assumptions.map((a, i) => (
                <li key={i} className="text-gray-500">・{a}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
