'use client'
import { useState } from 'react'
import { PrimaryAgentId, SubAgentId, AgentRecommendation, AgentSelection } from '@/agents/types'

const PRIMARY_OPTIONS: Array<{ value: PrimaryAgentId; label: string }> = [
  { value: 'ag-02-recruit', label: '採用・リクルート' },
  { value: 'ag-02-brand',   label: 'ブランド体験' },
  { value: 'ag-02-corp',    label: 'コーポレート' },
  { value: 'ag-02-ec',      label: 'EC・購買' },
  { value: 'ag-02-camp',    label: 'キャンペーン' },
  { value: 'ag-02-btob',    label: 'BtoB' },
  { value: 'ag-02-general', label: '汎用' },
]

const SUB_OPTIONS: Array<{ value: SubAgentId; label: string }> = [
  { value: 'ag-02-sub-beauty',    label: '美容・コスメ' },
  { value: 'ag-02-sub-food',      label: '食品・飲料' },
  { value: 'ag-02-sub-finance',   label: '金融・保険' },
  { value: 'ag-02-sub-health',    label: '医療・ヘルスケア' },
  { value: 'ag-02-sub-education', label: '教育' },
  { value: 'ag-02-sub-life',      label: 'くらし・住まい・環境' },
  { value: 'ag-02-sub-fashion',   label: 'ファッション' },
  { value: 'ag-02-sub-auto',      label: '自動車' },
  { value: 'ag-02-sub-tech',      label: 'PC・家電・通信' },
  { value: 'ag-02-sub-culture',   label: 'エンタメ・文化' },
  { value: 'ag-02-sub-sport',     label: 'スポーツ' },
  { value: 'ag-02-sub-travel',    label: '旅行・観光' },
  { value: 'ag-02-sub-gov',       label: '行政・公共' },
  { value: 'ag-02-sub-creative',  label: 'クリエイティブ・デザイン' },
]

interface AgentSelectorProps {
  recommendation: AgentRecommendation
  onConfirm: (selection: AgentSelection) => void
}

export default function AgentSelector({ recommendation, onConfirm }: AgentSelectorProps) {
  const [selectedPrimary, setSelectedPrimary] = useState<PrimaryAgentId>(recommendation.primary.agentId)
  const [selectedSub, setSelectedSub] = useState<SubAgentId[]>(
    recommendation.sub.map(s => s.agentId)
  )

  const toggleSub = (id: SubAgentId) => {
    setSelectedSub(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    )
  }

  const recommendedSubIds = recommendation.sub.map(s => s.agentId)

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="bg-blue-50 px-4 py-3 border-b">
        <h3 className="text-sm font-semibold text-blue-900">AGを選択してください</h3>
        <p className="text-xs text-blue-700 mt-1">{recommendation.primary.rationale}</p>
      </div>

      <div className="p-4 space-y-4">
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase mb-2">大分類（必須・1つ）</p>
          <div className="space-y-1.5">
            {PRIMARY_OPTIONS.map(opt => (
              <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="primary"
                  value={opt.value}
                  checked={selectedPrimary === opt.value}
                  onChange={() => setSelectedPrimary(opt.value)}
                  className="text-blue-600"
                />
                <span className="text-sm text-gray-800">{opt.label}</span>
                {opt.value === recommendation.primary.agentId && (
                  <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">推奨</span>
                )}
              </label>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-medium text-gray-500 uppercase mb-2">業種コンテキスト（任意・複数可）</p>
          <div className="grid grid-cols-2 gap-1">
            {SUB_OPTIONS.map(opt => (
              <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedSub.includes(opt.value)}
                  onChange={() => toggleSub(opt.value)}
                  className="text-blue-600"
                />
                <span className="text-xs text-gray-700">{opt.label}</span>
                {recommendedSubIds.includes(opt.value) && (
                  <span className="text-xs text-blue-500">★</span>
                )}
              </label>
            ))}
          </div>
        </div>

        <button
          onClick={() => onConfirm({ primary: selectedPrimary, sub: selectedSub })}
          className="w-full py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700"
        >
          この選択で実行する
        </button>
      </div>
    </div>
  )
}
