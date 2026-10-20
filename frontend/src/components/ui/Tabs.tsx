import { useRef, type KeyboardEvent, type ReactNode } from 'react'
import { AnimatedBackground } from './AnimatedBackground'

export interface TabDef { id: string; label: ReactNode }

/** Segmented control built on AnimatedBackground. Arrow keys move between tabs. */
export function Tabs({ tabs, value, onChange, label }: { tabs: TabDef[]; value: string; onChange: (id: string) => void; label: string }) {
  const ref = useRef<HTMLDivElement>(null)

  const onKey = (e: KeyboardEvent) => {
    const i = tabs.findIndex((t) => t.id === value)
    const next = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : null
    if (next === null) return
    e.preventDefault()
    const t = tabs[(next + tabs.length) % tabs.length]
    onChange(t.id)
    requestAnimationFrame(() => ref.current?.querySelector<HTMLElement>(`[data-id="${t.id}"]`)?.focus())
  }

  return (
    <div ref={ref} role="tablist" aria-label={label} onKeyDown={onKey} className="inline-flex gap-0.5 rounded-control bg-sunken p-0.5">
      <AnimatedBackground value={value} onValueChange={onChange} className="rounded-[6px] bg-surface shadow-[0_0_0_1px_var(--line)]">
        {tabs.map((t) => (
          <button
            key={t.id}
            data-id={t.id}
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={value === t.id}
            tabIndex={value === t.id ? 0 : -1}
            type="button"
            className={`rounded-[6px] px-3 py-1 text-[13px] font-medium transition-colors ${value === t.id ? 'text-ink' : 'text-muted hover:text-ink'}`}
          >
            {t.label}
          </button>
        ))}
      </AnimatedBackground>
    </div>
  )
}
