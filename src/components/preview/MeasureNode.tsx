import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'

interface MeasureNodeProps {
  id: string
  onHeight: (id: string, heightPx: number) => void
  children: ReactNode
}

// Membungkus konten dan melaporkan tinggi aktual (termasuk margin) lewat ResizeObserver.
// Tinggi yang dilaporkan dipakai pagination, bukan estimasi.
export function MeasureNode({ id, onHeight, children }: MeasureNodeProps) {
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const measure = () => {
      const target = el.firstElementChild as HTMLElement | null
      const node = target ?? el
      const rect = node.getBoundingClientRect()
      const style = getComputedStyle(node)
      const marginTop = parseFloat(style.marginTop) || 0
      const marginBottom = parseFloat(style.marginBottom) || 0
      onHeight(id, rect.height + marginTop + marginBottom)
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [id, onHeight])

  return <div ref={ref}>{children}</div>
}
