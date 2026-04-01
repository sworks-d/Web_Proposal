import { AgentOutput } from '@/agents/types'
import SectionCard from './SectionCard'

interface StoryPreviewPanelProps {
  output: AgentOutput | null
  executionId: string
  onSectionEdit: (sectionId: string, newContent: string) => void
}

export default function StoryPreviewPanel({ output, executionId, onSectionEdit }: StoryPreviewPanelProps) {
  if (!output) return null

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-gray-800">AG-07 提案書草案</h2>
        <a
          href={`/api/executions/${executionId}/export`}
          download
          className="text-sm px-3 py-1.5 bg-gray-800 text-white rounded hover:bg-gray-700"
        >
          Markdownとしてエクスポート
        </a>
      </div>
      {output.sections.map(section => (
        <SectionCard
          key={section.id}
          section={section}
          confidence={output.metadata.confidence}
          onEdit={onSectionEdit}
        />
      ))}
    </div>
  )
}
