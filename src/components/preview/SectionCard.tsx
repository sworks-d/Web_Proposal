'use client'
import { useState } from 'react'
import { Section, ConfidenceLevel } from '@/agents/types'
import ConfidenceBadge from './ConfidenceBadge'

interface SectionCardProps {
  section: Section
  confidence: ConfidenceLevel
  onEdit: (sectionId: string, newContent: string) => void
}

function renderContent(content: string, sectionType: string) {
  if (sectionType === 'checklist') {
    const items = content.split('\n').filter(l => l.trim())
    return (
      <ul className="space-y-1">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
            <span className="mt-0.5 w-4 h-4 border border-gray-300 rounded shrink-0" />
            <span>{item.replace(/^-\s*/, '')}</span>
          </li>
        ))}
      </ul>
    )
  }
  return <p className="text-sm text-gray-700 whitespace-pre-wrap">{content}</p>
}

export default function SectionCard({ section, confidence, onEdit }: SectionCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(section.content)

  const handleEdit = () => {
    setEditValue(section.content)
    setIsEditing(true)
  }

  const handleSave = () => {
    onEdit(section.id, editValue)
    setIsEditing(false)
  }

  return (
    <div className="border rounded-lg overflow-hidden mb-4">
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b">
        <h3 className="text-sm font-semibold text-gray-800">{section.title}</h3>
        <div className="flex items-center gap-2">
          <ConfidenceBadge level={confidence} />
          {!isEditing && section.isEditable && (
            <button
              onClick={handleEdit}
              className="text-xs text-blue-600 hover:underline"
            >
              編集
            </button>
          )}
          {isEditing && (
            <>
              <button
                onClick={handleSave}
                className="text-xs text-green-600 hover:underline"
              >
                保存
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="text-xs text-gray-500 hover:underline"
              >
                キャンセル
              </button>
            </>
          )}
        </div>
      </div>
      <div className="px-4 py-3">
        {isEditing ? (
          <textarea
            value={editValue}
            onChange={e => setEditValue(e.target.value)}
            rows={8}
            className="w-full text-sm border rounded p-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        ) : (
          renderContent(section.content, section.sectionType)
        )}
      </div>
    </div>
  )
}
