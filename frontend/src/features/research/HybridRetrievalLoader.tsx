import { useEffect, useState } from 'react'
import { Binary, Layers, Network, Square } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Skeleton } from '../../components/ui/Feedback'

interface Props {
  onPause?: () => void
}

export function HybridRetrievalLoader({ onPause }: Props) {
  const [stage, setStage] = useState<'retrieving' | 'synthesizing'>('retrieving')

  // Smoothly transition from dual-stream retrieval to fusion synthesis after 1.8s
  useEffect(() => {
    const timer = setTimeout(() => {
      setStage('synthesizing')
    }, 1800)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="mt-5 space-y-4 rounded-xl border border-line-strong/80 bg-surface/90 p-4.5 shadow-sm backdrop-blur-sm">
      {/* Top Header / Status bar */}
      <div className="flex items-center justify-between gap-3 border-b border-line/60 pb-3">
        <div className="flex items-center gap-2.5">
          <span className="relative flex size-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
            <span className="relative inline-flex size-2.5 rounded-full bg-accent" />
          </span>
          <span className="text-[13.5px] font-medium text-ink">
            {stage === 'retrieving'
              ? 'Searching dual index streams & computing hybrid rankings…'
              : 'RRF candidates fused · Loading into Working Memory Desk & synthesizing answer…'}
          </span>
        </div>

        {onPause && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onPause}
            icon={<Square aria-hidden className="size-3 fill-current text-amber-400" />}
            className="h-7 text-xs border-amber-500/30 text-amber-300 hover:border-amber-500/60 hover:bg-amber-500/10"
          >
            Pause
          </Button>
        )}
      </div>

      {/* Dual-Stream Convergence Visualizer (BM25F + FAISS -> RRF) */}
      <div className="rounded-lg border border-line/60 bg-sunken/40 p-3.5">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_80px_1fr] items-center gap-2">
          {/* Stream 1 & 2 Left Block */}
          <div className="space-y-2.5">
            {/* Stream A: BM25F */}
            <div className="flex items-center justify-between rounded-md border border-line/50 bg-surface/80 px-2.5 py-1.5 shadow-xs">
              <div className="flex items-center gap-2 min-w-0">
                <span className="flex size-6 shrink-0 items-center justify-center rounded bg-accent-soft text-accent">
                  <Binary className="size-3.5" />
                </span>
                <div className="min-w-0">
                  <div className="text-[12px] font-semibold text-ink font-mono leading-tight">
                    BM25F Lexical
                  </div>
                  <div className="text-[11px] text-muted truncate">
                    Term frequency & saturation
                  </div>
                </div>
              </div>
              <span className="text-[10px] font-mono text-accent bg-accent-soft px-1.5 py-0.5 rounded font-medium shrink-0">
                Inverted Index
              </span>
            </div>

            {/* Stream B: FAISS */}
            <div className="flex items-center justify-between rounded-md border border-line/50 bg-surface/80 px-2.5 py-1.5 shadow-xs">
              <div className="flex items-center gap-2 min-w-0">
                <span className="flex size-6 shrink-0 items-center justify-center rounded bg-accent-soft text-accent">
                  <Layers className="size-3.5" />
                </span>
                <div className="min-w-0">
                  <div className="text-[12px] font-semibold text-ink font-mono leading-tight">
                    FAISS Dense (384D)
                  </div>
                  <div className="text-[11px] text-muted truncate">
                    Cosine semantic similarity
                  </div>
                </div>
              </div>
              <span className="text-[10px] font-mono text-accent bg-accent-soft px-1.5 py-0.5 rounded font-medium shrink-0">
                Vector Space
              </span>
            </div>
          </div>

          {/* Center Convergence SVG Conduit */}
          <div className="hidden md:flex flex-col items-center justify-center h-full px-1">
            <svg
              className="w-full h-16 overflow-visible"
              viewBox="0 0 80 64"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Conduit Track A (Top to Center) */}
              <path
                d="M 4 16 C 40 16, 40 32, 76 32"
                stroke="var(--color-line-strong)"
                strokeWidth="1.5"
                strokeDasharray="4 3"
              />
              <path
                d="M 4 16 C 40 16, 40 32, 76 32"
                stroke="var(--color-accent)"
                strokeWidth="2"
                className="animate-stream-path"
              />

              {/* Conduit Track B (Bottom to Center) */}
              <path
                d="M 4 48 C 40 48, 40 32, 76 32"
                stroke="var(--color-line-strong)"
                strokeWidth="1.5"
                strokeDasharray="4 3"
              />
              <path
                d="M 4 48 C 40 48, 40 32, 76 32"
                stroke="var(--color-accent)"
                strokeWidth="2"
                className="animate-stream-path"
                style={{ animationDelay: '0.6s' }}
              />

              {/* Center Convergence Pulser */}
              <circle cx="76" cy="32" r="3.5" fill="var(--color-accent)" />
            </svg>
          </div>

          {/* Right Stage: RRF Context Fusion */}
          <div className="flex flex-col justify-center">
            <div
              className={`relative overflow-hidden rounded-md border px-3 py-2 transition-all duration-300 shadow-xs ${
                stage === 'synthesizing'
                  ? 'border-accent bg-accent-soft/30 shadow-[0_0_12px_rgba(92,191,170,0.2)]'
                  : 'border-line/60 bg-surface/80'
              }`}
            >
              <div className="flex items-center justify-between gap-1 mb-0.5">
                <span className="flex items-center gap-1.5 text-[12.5px] font-semibold text-ink font-mono">
                  <Network className="size-3.5 text-accent" />
                  RRF Context Fusion
                </span>
                <span className="text-[10px] font-mono text-muted">k=60</span>
              </div>
              <div className="text-[11px] text-muted leading-tight">
                Reciprocal rank merging · Working Memory Desk allocation
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Answer Synthesis Placeholder Skeleton */}
      <div className="space-y-2 pt-1">
        <Skeleton className="h-3.5 w-full max-w-[68ch]" />
        <Skeleton className="h-3.5 w-11/12 max-w-[62ch]" />
        <Skeleton className="h-3.5 w-3/4 max-w-[48ch]" />
      </div>
    </div>
  )
}

