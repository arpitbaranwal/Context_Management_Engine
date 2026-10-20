import type { ReactNode } from 'react'
import { isMock } from '../api'
import { Mark } from '../components/layout/Brand'
import { ThemeToggle } from '../components/layout/ThemeToggle'

/** A quiet three-step motif: document, context, answer. */
function Motif() {
  const steps = ['Document', 'Context', 'Answer']
  return (
    <ol aria-label="How it works" className="mt-10 flex items-center justify-center gap-3 text-[13px] text-muted">
      {steps.map((s, i) => (
        <li key={s} className="flex items-center gap-3">
          <span className={i === 2 ? 'font-medium text-accent' : ''}>{s}</span>
          {i < steps.length - 1 && <span aria-hidden className="h-px w-8 bg-line-strong" />}
        </li>
      ))}
    </ol>
  )
}

export function AuthLayout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <div className="flex justify-end p-3">
        <ThemeToggle />
      </div>
      <main className="flex flex-1 items-center justify-center px-5 pb-16">
        <div className="w-full max-w-[22rem]">
          <div className="mb-8 text-center">
            <div className="mb-5 flex justify-center"><Mark size={36} /></div>
            <h1 className="font-serif text-[28px] leading-tight tracking-[-0.015em]">Context Management Engine</h1>
            <p className="mt-2 text-muted">Research across your documents with grounded AI.</p>
          </div>
          <h2 className="sr-only">{title}</h2>
          {children}
          <Motif />
          {isMock && <p className="mt-6 text-center text-xs text-muted">Demo mode: accounts are stored in this browser only.</p>}
        </div>
      </main>
    </div>
  )
}
