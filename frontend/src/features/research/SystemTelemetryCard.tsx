import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Cpu, ShieldCheck, Activity, Clock, Layers, Sparkles } from 'lucide-react'
import { cn } from '../../lib/cn'
import type { TelemetryData, TelemetryWorkingMemory } from '../../api/types'

interface Props {
  workingMemory?: TelemetryWorkingMemory
  lastTelemetry?: TelemetryData | null
  className?: string
  collapsible?: boolean
  defaultOpen?: boolean
  onToggleCollapse?: () => void
}

function AnimatedNumber({
  value,
  decimals = 0,
  suffix = '',
}: {
  value: number
  decimals?: number
  suffix?: string
}) {
  const [display, setDisplay] = useState(value)
  const prevRef = useRef(value)

  useEffect(() => {
    const start = prevRef.current
    const end = value
    if (start === end) {
      setDisplay(end)
      return
    }

    const startTime = performance.now()
    const duration = 300 // 300ms smooth count-up

    let frameId: number
    const step = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(1, elapsed / duration)
      // Cubic ease-out
      const ease = 1 - Math.pow(1 - progress, 3)
      const current = start + (end - start) * ease
      setDisplay(current)

      if (progress < 1) {
        frameId = requestAnimationFrame(step)
      } else {
        prevRef.current = end
        setDisplay(end)
      }
    }

    frameId = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frameId)
  }, [value])

  return (
    <span>
      {display.toFixed(decimals)}
      {suffix}
    </span>
  )
}

export function SystemTelemetryCard({
  workingMemory,
  lastTelemetry,
  className,
  collapsible = true,
  defaultOpen = true,
  onToggleCollapse,
}: Props) {
  const [open, setOpen] = useState(defaultOpen)

  const used = workingMemory?.usedTokens ?? lastTelemetry?.workingMemory.usedTokens ?? 0
  const max = workingMemory?.maxTokens ?? lastTelemetry?.workingMemory.maxTokens ?? 2000
  const ratio = max > 0 ? Math.min(1.0, used / max) : 0
  const pct = Math.round(ratio * 100)
  const activeSlots = workingMemory?.activeSlotsCount ?? lastTelemetry?.workingMemory.activeSlotsCount ?? 0
  const evictions = workingMemory?.evictionsCount ?? lastTelemetry?.workingMemory.evictionsCount ?? 0

  const decision = lastTelemetry?.decision
  const retrieval = lastTelemetry?.retrieval
  const isProceed = decision?.status === 'PROCEED'
  const isHighLoad = pct > 85

  // 10-slot segmented OS-RAM memory desk representation
  const TOTAL_SLOTS = 10
  const allocatedSlots = Math.min(TOTAL_SLOTS, Math.max(used > 0 ? 1 : 0, Math.round(ratio * TOTAL_SLOTS)))
  const pinnedSlots = Math.min(allocatedSlots, Math.max(1, Math.min(3, activeSlots)))

  const confidence = decision?.confidenceScore ?? 0.85
  const confidencePct = Math.round(Math.min(1, Math.max(0, confidence)) * 100)

  return (
    <div className={cn('glass-card rounded-2xl border border-line-strong/80 text-[13px] overflow-hidden', className)}>
      {/* Top Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-line/60 bg-sunken/40">
        <div className="flex items-center gap-2">
          <span className="flex size-6 items-center justify-center rounded bg-accent-soft text-accent">
            <Cpu className="size-3.5" />
          </span>
          <span className="font-mono text-[12.5px] font-semibold text-ink uppercase tracking-wider">
            OS Working Memory Desk
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="relative flex size-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-accent" />
          </span>
          {collapsible && (
            <button
              type="button"
              onClick={() => {
                setOpen(!open)
                onToggleCollapse?.()
              }}
              aria-label={open ? 'Collapse inspector' : 'Expand inspector'}
              className="p-1 text-muted hover:text-ink rounded transition-colors"
            >
              <ChevronDown
                className={cn('size-4 transition-transform duration-200', open && 'rotate-180')}
              />
            </button>
          )}
        </div>
      </div>

      {open && (
        <div className="p-4 space-y-4">
          {/* Working Memory Usage — Segmented OS-RAM Bar */}
          <div className="rounded-xl border border-line/60 bg-sunken/40 p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-mono uppercase tracking-wider text-muted flex items-center gap-1.5">
                <Activity className="size-3.5 text-accent" />
                Working Memory Desk
              </span>
              {isHighLoad ? (
                <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                  High Load (&gt;85%)
                </span>
              ) : (
                <span className="text-[10px] font-mono text-accent bg-accent-soft px-1.5 py-0.5 rounded border border-accent/20">
                  Capacity: {max}w
                </span>
              )}
            </div>

            <div className="flex items-center justify-between text-[12px] font-mono">
              <span className="text-muted">{used} / {max} words</span>
              <span className={cn('font-semibold', isHighLoad ? 'text-amber-400' : 'text-accent')}>
                {pct}% allocated
              </span>
            </div>

            {/* Segmented OS-RAM Memory Desk Grid */}
            <div
              className={cn(
                'grid grid-cols-10 gap-1 p-1 rounded-md bg-surface/80 border border-line/60',
                isHighLoad && 'border-amber-500/40 animate-ram-pulse'
              )}
              aria-label="Working memory slot allocations"
            >
              {Array.from({ length: TOTAL_SLOTS }).map((_, i) => {
                const isAllocated = i < allocatedSlots
                const isPinned = isAllocated && i < pinnedSlots
                const wordsPerSlot = allocatedSlots > 0 ? Math.round(used / allocatedSlots) : 0

                let slotTooltip = `Slot #${i + 1}: Available`
                if (isPinned) {
                  slotTooltip = `Slot #${i + 1}: Pinned Context Desk Chunk (~${wordsPerSlot} words)`
                } else if (isAllocated) {
                  slotTooltip = `Slot #${i + 1}: Active Chunk (~${wordsPerSlot} words)`
                }

                return (
                  <div
                    key={i}
                    title={slotTooltip}
                    className={cn(
                      'h-3 rounded-[2px] transition-all duration-300 transform hover:scale-110 cursor-help',
                      isAllocated
                        ? isHighLoad
                          ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]'
                          : isPinned
                            ? 'bg-[#5eead4] shadow-[0_0_8px_rgba(94,234,212,0.65)] border border-[#2dd4bf]/70'
                            : 'bg-accent shadow-[0_0_6px_rgba(45,212,191,0.45)]'
                        : 'bg-sunken border border-line/40 hover:border-line-strong'
                    )}
                  />
                )
              })}
            </div>

            <div className="flex items-center justify-between text-[11px] font-mono text-muted pt-1">
              <span className="flex items-center gap-1">
                <span className="size-2 rounded-xs bg-[#5eead4]" /> Pinned: <strong className="text-ink">{pinnedSlots}</strong>
              </span>
              <span className="flex items-center gap-1">
                <span className="size-2 rounded-xs bg-accent" /> Active: <strong className="text-ink">{activeSlots}</strong>
              </span>
              <span>Evictions: <strong className="text-ink">{evictions}</strong></span>
            </div>
          </div>

          {/* Metric Cards Grid */}
          <div className="grid grid-cols-2 gap-2.5">
            {/* Gate Status Card */}
            <div className="rounded-xl border border-line/60 bg-sunken/40 p-3 flex flex-col justify-between">
              <span className="text-[11px] font-mono uppercase tracking-wider text-muted">Gate Status</span>
              <div className="mt-1.5 flex items-center gap-1.5">
                {isProceed ? (
                  <span className="relative flex size-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
                    <span className="relative inline-flex size-2 rounded-full bg-accent" />
                  </span>
                ) : (
                  <span className="size-2 rounded-full bg-warn" />
                )}
                <span
                  className={cn(
                    'text-[12px] font-mono font-bold',
                    isProceed ? 'text-accent' : 'text-warn'
                  )}
                >
                  {decision?.status ?? 'PROCEED'}
                </span>
              </div>
              <span className="text-[10px] text-muted truncate mt-1">
                {isProceed ? 'Zero Hallucination Gate' : 'Abstained'}
              </span>
            </div>

            {/* Retrieval Latency Card */}
            <div className="rounded-xl border border-line/60 bg-sunken/40 p-3 flex flex-col justify-between">
              <span className="text-[11px] font-mono uppercase tracking-wider text-muted">Latency</span>
              <div className="mt-1.5 font-mono text-[13.5px] font-bold text-ink flex items-center gap-1">
                <Clock className="size-3.5 text-accent" />
                <AnimatedNumber value={retrieval?.latencyMs ?? 16.4} decimals={1} suffix=" ms" />
              </div>
              <span className="text-[10px] text-muted truncate mt-1">Dual-stream RRF</span>
            </div>
          </div>

          {/* Confidence Score with Horizontal Threshold Meter */}
          <div className="rounded-xl border border-line/60 bg-sunken/40 p-3.5 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="uppercase tracking-wider text-muted flex items-center gap-1">
                <ShieldCheck className="size-3.5 text-accent" /> Confidence Score
              </span>
              <span className="font-bold text-ink text-[12px]">
                <AnimatedNumber value={confidence} decimals={4} />
              </span>
            </div>

            {/* Horizontal Threshold Meter Bar */}
            <div className="relative pt-1 pb-1.5">
              <div className="h-2 w-full rounded-full bg-surface border border-line/60 overflow-hidden relative">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-accent/70 to-accent transition-all duration-500"
                  style={{ width: `${confidencePct}%` }}
                />
              </div>
              {/* Threshold Pin Mark at 0.65 */}
              <div
                className="absolute top-0 bottom-0 w-[2px] bg-amber-400 z-10"
                style={{ left: '65%' }}
                title="Confidence Threshold: 0.65"
              />
            </div>

            <div className="flex items-center justify-between text-[10px] font-mono text-muted">
              <span>0.0</span>
              <span className="text-amber-400">Target &gt; 0.65</span>
              <span>1.0</span>
            </div>
          </div>

          {/* Multi-Turn Query Expansion Box */}
          {retrieval?.expandedQuery && (
            <div className="rounded-xl border border-line/60 bg-sunken/50 p-3 space-y-1">
              <div className="text-[10.5px] font-mono uppercase tracking-wider text-accent font-semibold flex items-center gap-1">
                <Sparkles className="size-3" /> Context-Expanded Query
              </div>
              <div className="text-[11.5px] font-mono text-ink/80 leading-relaxed max-h-20 overflow-y-auto">
                {retrieval.expandedQuery}
              </div>
            </div>
          )}

          {/* Active Corpus Targeted */}
          <div className="pt-2 border-t border-line/60 flex items-center justify-between text-[11px] font-mono text-muted">
            <span className="flex items-center gap-1">
              <Layers className="size-3 text-muted" /> Fusion Candidates:
            </span>
            <span className="text-ink font-semibold">
              {retrieval?.selectedChunksCount ?? 5} chunks fused
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

// Backward-compatible alias
export const WorkingMemoryDesk = SystemTelemetryCard
