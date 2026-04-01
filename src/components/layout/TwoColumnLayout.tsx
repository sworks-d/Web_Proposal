interface TwoColumnLayoutProps {
  projectTitle: string
  clientName: string
  left: React.ReactNode
  right: React.ReactNode
}

export default function TwoColumnLayout({ projectTitle, clientName, left, right }: TwoColumnLayoutProps) {
  return (
    <div className="flex flex-col h-screen">
      <header className="flex items-center gap-3 px-6 py-3 border-b bg-white shrink-0">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">{projectTitle}</h1>
          <p className="text-sm text-gray-500">{clientName}</p>
        </div>
      </header>
      <div className="flex flex-1 overflow-hidden">
        <div className="w-2/5 border-r overflow-y-auto flex flex-col">
          {left}
        </div>
        <div className="w-3/5 overflow-y-auto">
          {right}
        </div>
      </div>
    </div>
  )
}
