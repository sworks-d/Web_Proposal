'use client'
import { useEffect, useRef } from 'react'

interface MermaidRendererProps {
  code: string
  title?: string
}

export function MermaidRenderer({ code, title }: MermaidRendererProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const render = async () => {
      const mermaid = (await import('mermaid')).default
      mermaid.initialize({ startOnLoad: false, theme: 'neutral' })
      if (ref.current) {
        const id = `mermaid-${Math.random().toString(36).slice(2)}`
        try {
          const { svg } = await mermaid.render(id, code)
          ref.current.innerHTML = svg
        } catch {
          ref.current.innerHTML = `<pre class="text-xs text-gray-500">${code}</pre>`
        }
      }
    }
    render()
  }, [code])

  return (
    <div>
      {title && <p className="text-sm text-gray-500 mb-2">{title}</p>}
      <div ref={ref} className="overflow-x-auto" />
    </div>
  )
}
