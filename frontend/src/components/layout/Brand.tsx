export function Mark({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <rect width="32" height="32" rx="7" fill="var(--accent)" />
      <path d="M9 11h14M9 16h14M9 21h8" stroke="var(--accent-ink)" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  )
}

export function Brand() {
  return (
    <span className="inline-flex items-center gap-2.5">
      <Mark />
      <span className="hidden font-serif text-[17px] font-medium tracking-[-0.01em] sm:inline">Context Management Engine</span>
    </span>
  )
}
