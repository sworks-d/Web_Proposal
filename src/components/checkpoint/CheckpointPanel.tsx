'use client'
import { AgentOutput, AgentRecommendation, AgentSelection } from '@/agents/types'
import AgentSelector from './AgentSelector'

const PHASE_LABELS: Record<number, string> = {
  1: 'フェーズ1完了：インテーク',
  2: 'フェーズ2完了：市場・競合分析',
  3: 'フェーズ3完了：課題構造化・ファクトチェック',
  4: '全フェーズ完了',
}

interface CheckpointPanelProps {
  phase: 1 | 2 | 3 | 4
  checkpointId: string
  outputs: AgentOutput[]
  recommendation?: AgentRecommendation
  onApprove: (selection?: AgentSelection) => void
}

export default function CheckpointPanel({
  phase, checkpointId: _checkpointId, outputs, recommendation, onApprove
}: CheckpointPanelProps) {
  return (
    <div className="border-t border-blue-200 bg-blue-50 p-4 space-y-4">
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
        <h3 className="text-sm font-semibold text-blue-900">{PHASE_LABELS[phase]}</h3>
      </div>

      {outputs.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-gray-500 font-medium">実行結果のサマリー</p>
          {outputs.flatMap(o => o.sections.slice(0, 2)).map(section => (
            <div key={section.id} className="bg-white border rounded p-3">
              <p className="text-xs font-medium text-gray-700">{section.title}</p>
              <p className="text-xs text-gray-500 mt-1 line-clamp-3">{section.content.slice(0, 200)}...</p>
            </div>
          ))}
        </div>
      )}

      {phase === 1 && recommendation ? (
        <AgentSelector
          recommendation={recommendation}
          onConfirm={(selection) => onApprove(selection)}
        />
      ) : phase < 4 ? (
        <button
          onClick={() => onApprove()}
          className="w-full py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700"
        >
          次のフェーズへ進む →
        </button>
      ) : (
        <p className="text-sm text-blue-800 font-medium text-center">全フェーズ完了。右側でエクスポートできます。</p>
      )}
    </div>
  )
}
