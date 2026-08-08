import type { ReactNode } from 'react'

export function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold text-slate-800">{title}</h2>
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">{children}</div>
    </section>
  )
}
