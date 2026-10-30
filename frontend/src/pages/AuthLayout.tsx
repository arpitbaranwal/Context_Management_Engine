import type { ReactNode } from 'react'
import { Binary, Cpu, ShieldCheck, Sparkles } from 'lucide-react'
import { isMock } from '../api'
import { Mark } from '../components/layout/Brand'
import { ThemeToggle } from '../components/layout/ThemeToggle'
import { cn } from '../lib/cn'

/** An animated three-step pipeline: document, context, answer. */
function PipelineMotif() {
  const steps = [
    { label: 'Document', highlight: false },
    { label: 'Context', highlight: false },
    { label: 'Answer', highlight: true },
  ]
  return (
    <ol aria-label="How it works" className="mt-8 flex items-center justify-center gap-2.5 text-[12px] text-muted select-none">
      {steps.map((s, i) => (
        <li key={s.label} className="flex items-center gap-2.5">
          <span className={cn(
            'flex items-center gap-1.5 transition-colors',
            s.highlight ? 'font-medium text-accent' : 'text-muted/80'
          )}>
            <span className={cn(
              'size-1.5 rounded-full',
              s.highlight ? 'bg-accent shadow-[0_0_8px_var(--color-accent)]' : 'bg-muted/40'
            )} />
            {s.label}
          </span>
          {i < steps.length - 1 && (
            <div aria-hidden className="relative h-[2px] w-8 overflow-hidden rounded-full bg-line-strong/60">
              <div
                className="absolute inset-y-0 w-3 rounded-full bg-gradient-to-r from-transparent via-accent to-transparent animate-pipeline-beam"
                style={{ animationDelay: `${i * 1.1}s` }}
              />
            </div>
          )}
        </li>
      ))}
    </ol>
  )
}

/** Right Column Architecture Blueprint for Linear/Vercel Aesthetic */
function ArchitectureBlueprint() {
  return (
    <div className="hidden lg:flex flex-col justify-center">
      <div className="glass-card rounded-2xl p-7 border border-line-strong/70 relative overflow-hidden">
        {/* Glow corner ambient */}
        <div className="pointer-events-none absolute -right-20 -top-20 size-60 rounded-full bg-accent/10 blur-3xl" />
        
        {/* Blueprint Top Header */}
        <div className="flex items-center justify-between border-b border-line/60 pb-4 mb-6">
          <div className="flex items-center gap-2.5">
            <span className="flex size-7 items-center justify-center rounded-md bg-accent-soft text-accent">
              <Sparkles className="size-4" />
            </span>
            <div>
              <div className="text-[11px] font-mono uppercase tracking-wider text-accent font-semibold">
                Architecture Blueprint
              </div>
              <div className="text-[14.5px] font-semibold text-ink">
                3D Hybrid Retrieval & OS Working Memory
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-accent-soft/60 px-2.5 py-1 text-[11px] font-mono text-accent border border-accent/25">
            <span className="relative flex size-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-accent" />
            </span>
            <span>SYSTEM ACTIVE</span>
          </div>
        </div>

        {/* 3 Pipeline Stages */}
        <div className="space-y-4 relative">
          {/* Stage 1 */}
          <div className="relative rounded-xl border border-line/60 bg-sunken/50 p-4 transition-all hover:border-line-strong hover:bg-sunken/70">
            <div className="flex items-start gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-surface border border-line text-accent">
                <Binary className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-[12.5px] font-semibold text-ink font-mono">
                    01. Structural PDF & Dual Indexing
                  </span>
                  <span className="text-[10px] font-mono text-accent bg-accent-soft px-1.5 py-0.5 rounded">
                    RRF k=60
                  </span>
                </div>
                <p className="mt-1 text-[12px] text-muted leading-relaxed">
                  BM25F Lexical (3x header boost) + FAISS 384D Dense Vector embeddings fused via Reciprocal Rank Fusion.
                </p>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  <span className="rounded bg-surface/80 px-2 py-0.5 text-[10.5px] font-mono text-muted border border-line/40">BM25F Lexical</span>
                  <span className="rounded bg-surface/80 px-2 py-0.5 text-[10.5px] font-mono text-muted border border-line/40">FAISS All-MiniLM</span>
                  <span className="rounded bg-surface/80 px-2 py-0.5 text-[10.5px] font-mono text-accent border border-accent/20">Cosine 384D</span>
                </div>
              </div>
            </div>
          </div>

          {/* Animated Vertical Connector 1 */}
          <div className="relative flex justify-center py-0.5">
            <div className="h-4 w-[2px] bg-line-strong/60 overflow-hidden rounded-full relative">
              <div className="absolute inset-x-0 h-2 bg-gradient-to-b from-transparent via-accent to-transparent animate-vertical-beam" />
            </div>
          </div>

          {/* Stage 2 */}
          <div className="relative rounded-xl border border-accent/30 bg-accent-soft/10 p-4 shadow-[0_0_20px_rgba(45,212,191,0.06)]">
            <div className="flex items-start gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-surface border border-accent/40 text-accent">
                <Cpu className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-[12.5px] font-semibold text-ink font-mono">
                    02. OS-Style Working Memory Desk
                  </span>
                  <span className="text-[10px] font-mono text-accent bg-accent-soft px-1.5 py-0.5 rounded font-semibold">
                    2000 Word RAM
                  </span>
                </div>
                <p className="mt-1 text-[12px] text-muted leading-relaxed">
                  Hardware-inspired study desk preserving multi-turn context slots with intelligent utility retention and LRU eviction.
                </p>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  <span className="rounded bg-surface/80 px-2 py-0.5 text-[10.5px] font-mono text-accent border border-accent/30">Active Pinning</span>
                  <span className="rounded bg-surface/80 px-2 py-0.5 text-[10.5px] font-mono text-muted border border-line/40">Multi-Turn Retain</span>
                  <span className="rounded bg-surface/80 px-2 py-0.5 text-[10.5px] font-mono text-muted border border-line/40">Zero Collapse</span>
                </div>
              </div>
            </div>
          </div>

          {/* Animated Vertical Connector 2 */}
          <div className="relative flex justify-center py-0.5">
            <div className="h-4 w-[2px] bg-line-strong/60 overflow-hidden rounded-full relative">
              <div className="absolute inset-x-0 h-2 bg-gradient-to-b from-transparent via-accent to-transparent animate-vertical-beam" style={{ animationDelay: '1.2s' }} />
            </div>
          </div>

          {/* Stage 3 */}
          <div className="relative rounded-xl border border-line/60 bg-sunken/50 p-4 transition-all hover:border-line-strong hover:bg-sunken/70">
            <div className="flex items-start gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-surface border border-line text-accent">
                <ShieldCheck className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-[12.5px] font-semibold text-ink font-mono">
                    03. Reflective Confidence-Gated Synthesis
                  </span>
                  <span className="text-[10px] font-mono text-muted bg-sunken px-1.5 py-0.5 rounded border border-line">
                    Threshold &gt; 0.65
                  </span>
                </div>
                <p className="mt-1 text-[12px] text-muted leading-relaxed">
                  Reflective validator checks factual groundings before dispatching to Google Gemini with strictly verifiable citations.
                </p>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  <span className="rounded bg-surface/80 px-2 py-0.5 text-[10.5px] font-mono text-muted border border-line/40">Hallucination Guard</span>
                  <span className="rounded bg-surface/80 px-2 py-0.5 text-[10.5px] font-mono text-muted border border-line/40">Citation Mapping</span>
                  <span className="rounded bg-surface/80 px-2 py-0.5 text-[10.5px] font-mono text-accent border border-accent/20">PROCEED Gate</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Specs Bar */}
        <div className="mt-6 border-t border-line/60 pt-4 flex items-center justify-between text-[11px] font-mono text-muted">
          <span>Sub-second Retrieval Latency</span>
          <span className="text-accent font-semibold">100% Grounded</span>
        </div>
      </div>
    </div>
  )
}

export function AuthLayout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <div className="flex justify-end p-4">
        <ThemeToggle />
      </div>
      <main className="flex flex-1 items-center justify-center px-4 py-8 sm:px-6">
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-8 xl:gap-12 items-center">
          {/* Left Column: Auth Card */}
          <div className="glass-card rounded-2xl p-7 sm:p-9 border border-line-strong/80 shadow-2xl relative">
            <div className="mb-7 text-center">
              <div className="mb-4 flex justify-center">
                <Mark size={40} />
              </div>
              <h1 className="font-serif text-[28px] leading-tight tracking-[-0.015em] text-ink">
                Context Management Engine
              </h1>
              <p className="mt-2 text-[13.5px] text-muted leading-relaxed">
                Research across your documents with grounded AI and OS-style working memory.
              </p>
            </div>
            
            <h2 className="sr-only">{title}</h2>
            {children}
            <PipelineMotif />
            {isMock && (
              <p className="mt-6 text-center text-xs text-muted">
                Demo mode: accounts are stored in this browser only.
              </p>
            )}
          </div>

          {/* Right Column: Engine Architecture Blueprint */}
          <ArchitectureBlueprint />
        </div>
      </main>
    </div>
  )
}
