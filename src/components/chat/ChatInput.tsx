interface ChatInputProps {
  value: string
  onChange: (v: string) => void
  onSubmit: () => void
  isRunning: boolean
}

export default function ChatInput({ value, onChange, onSubmit, isRunning }: ChatInputProps) {
  return (
    <div className="border-t p-4 space-y-2 shrink-0">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">AG-01 インテーク担当</span>
        <button
          onClick={onSubmit}
          disabled={isRunning}
          className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
            isRunning
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {isRunning ? '実行中...' : '実行'}
        </button>
      </div>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={isRunning}
        rows={3}
        placeholder="追加指示があれば入力してください（任意）"
        className="w-full text-sm border rounded p-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-50"
      />
    </div>
  )
}
