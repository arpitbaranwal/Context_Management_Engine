import { useState } from 'react'
import { Plus, Search, Database, Cpu, Sparkles, ShieldCheck, Binary, ChevronRight } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { EmptyState, Notice } from '../components/ui/Feedback'
import { PageHeader } from '../components/ui/PageHeader'
import { DocumentList, DocumentListSkeleton } from '../features/documents/DocumentList'
import { UploadDialog } from '../features/upload/UploadDialog'
import { greeting, timeAgo } from '../lib/format'
import { Link, navigate } from '../lib/router'
import { useAuth } from '../state/auth'
import { useDocuments } from '../state/documents'
import { useHistory } from '../state/history'

const PALETTE = ['#2dd4bf', '#38bdf8', '#818cf8', '#a78bfa', '#f472b6', '#fb923c']

export default function DashboardPage() {
  const { user } = useAuth()
  const { documents, loading, error, refresh } = useDocuments()
  const { entries } = useHistory()
  const [uploading, setUploading] = useState(false)

  const chunks = documents.reduce((n, d) => n + d.chunksCount, 0)
  const ready = documents.filter((d) => d.status === 'ready').length
  const avgChunks = documents.length > 0 ? Math.round(chunks / documents.length) : 0
  const maxDoc = documents.reduce((prev, curr) => (curr.chunksCount > (prev?.chunksCount ?? 0) ? curr : prev), documents[0])

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-10 px-4 py-8 sm:px-6">
      <PageHeader
        title={`${greeting()}, ${user?.name.split(' ')[0] ?? ''}`}
        description="Unified Hybrid Retrieval, OS-RAM Working Memory Desk & Confidence-Gated Synthesis."
        actions={
          <>
            <Button
              variant="primary"
              icon={<Plus aria-hidden className="size-4" />}
              onClick={() => setUploading(true)}
            >
              Upload document
            </Button>
            <Button
              icon={<Search aria-hidden className="size-4" />}
              onClick={() => navigate('/research')}
            >
              Open Research Console
            </Button>
          </>
        }
      />

      {error && <Notice action={<Button size="sm" onClick={() => void refresh()}>Retry</Button>}>{error}</Notice>}

      {/* 3-Column Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* Card 1: Corpus Topology Card */}
        <div className="glass-card rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between group hover:border-line-strong transition-all">
          <div className="pointer-events-none absolute -right-16 -top-16 size-40 rounded-full bg-accent/10 blur-2xl group-hover:bg-accent/15 transition-all" />
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="flex size-9 items-center justify-center rounded-lg bg-accent-soft text-accent">
                <Database className="size-4" />
              </span>
              <span className="font-mono text-xs text-muted border border-line/60 rounded-md px-2 py-0.5 bg-sunken/60">
                {ready}/{documents.length} READY
              </span>
            </div>
            <div className="text-[12px] font-mono uppercase tracking-wider text-muted">
              Corpus Topology
            </div>
            <div className="mt-1 flex items-baseline gap-3">
              <span className="font-serif text-3xl text-ink font-normal">{documents.length}</span>
              <span className="text-sm text-muted">docs · <strong className="text-ink font-mono font-medium">{chunks}</strong> total chunks</span>
            </div>

            {/* Chunk Distribution Multi-Segment Bar */}
            <div className="mt-5 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-mono text-muted">
                <span>Distribution by document</span>
                <span>avg {avgChunks} chunks/doc</span>
              </div>
              <div className="h-2 w-full rounded-full bg-sunken/80 flex overflow-hidden p-0.5 gap-0.5 border border-line/40">
                {documents.length === 0 ? (
                  <div className="h-full w-full bg-sunken rounded-full" />
                ) : (
                  documents.map((d, i) => {
                    const pct = chunks > 0 ? (d.chunksCount / chunks) * 100 : 0
                    const color = PALETTE[i % PALETTE.length]
                    return (
                      <div
                        key={d.id}
                        title={`${d.name}: ${d.chunksCount} chunks (${Math.round(pct)}%)`}
                        className="h-full rounded-xs transition-all hover:opacity-80"
                        style={{ width: `${Math.max(pct, 3)}%`, backgroundColor: color }}
                      />
                    )
                  })
                )}
              </div>
            </div>
          </div>

          <div className="mt-5 pt-3.5 border-t border-line/60 flex items-center justify-between text-[11.5px] font-mono text-muted">
            <span>Largest Doc:</span>
            <span className="truncate max-w-[170px] text-ink font-medium" title={maxDoc?.name}>
              {maxDoc ? `${maxDoc.name} (${maxDoc.chunksCount})` : 'None'}
            </span>
          </div>
        </div>

        {/* Card 2: Hybrid Index Engine Card */}
        <div className="glass-card rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between group hover:border-line-strong transition-all">
          <div className="pointer-events-none absolute -right-16 -top-16 size-40 rounded-full bg-sky-500/10 blur-2xl group-hover:bg-sky-500/15 transition-all" />
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="flex size-9 items-center justify-center rounded-lg bg-sky-500/10 text-sky-400">
                <Binary className="size-4" />
              </span>
              <span className="font-mono text-xs text-sky-400 border border-sky-500/20 rounded-md px-2 py-0.5 bg-sky-500/5">
                HYBRID RRF
              </span>
            </div>
            <div className="text-[12px] font-mono uppercase tracking-wider text-muted">
              Retrieval Engine
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-serif text-3xl text-ink font-normal">Dual-Stage</span>
              <span className="text-sm text-muted">Lexical + Vector</span>
            </div>

            {/* Retrieval Pipelines Breakdown */}
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between rounded-lg bg-sunken/60 p-2 border border-line/40 text-[11.5px]">
                <div className="flex items-center gap-2">
                  <span className="size-1.5 rounded-full bg-accent" />
                  <span className="font-mono text-ink">BM25F Lexical</span>
                </div>
                <span className="text-muted font-mono text-[10.5px]">3x Header Boost</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-sunken/60 p-2 border border-line/40 text-[11.5px]">
                <div className="flex items-center gap-2">
                  <span className="size-1.5 rounded-full bg-sky-400" />
                  <span className="font-mono text-ink">FAISS Dense Index</span>
                </div>
                <span className="text-muted font-mono text-[10.5px]">384D Cosine</span>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-3.5 border-t border-line/60 flex items-center justify-between text-[11.5px] font-mono text-muted">
            <span>Fusion Formula:</span>
            <span className="text-accent font-semibold">RRF (k=60) Reciprocal</span>
          </div>
        </div>

        {/* Card 3: Memory & Gate Health Card */}
        <div className="glass-card rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between group hover:border-line-strong transition-all">
          <div className="pointer-events-none absolute -right-16 -top-16 size-40 rounded-full bg-emerald-500/10 blur-2xl group-hover:bg-emerald-500/15 transition-all" />
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="flex size-9 items-center justify-center rounded-lg bg-accent-soft text-accent">
                <Cpu className="size-4" />
              </span>
              <span className="flex items-center gap-1.5 font-mono text-xs text-accent border border-accent/25 rounded-md px-2 py-0.5 bg-accent-soft/50">
                <span className="size-1.5 rounded-full bg-accent animate-pulse" />
                ONLINE
              </span>
            </div>
            <div className="text-[12px] font-mono uppercase tracking-wider text-muted">
              OS Working Memory
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-serif text-3xl text-ink font-normal">2,000</span>
              <span className="text-sm text-muted">words budget / desk</span>
            </div>

            {/* Mini RAM Slots Preview */}
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-mono text-muted">
                <span>Memory Slot Allocations</span>
                <span className="text-accent font-medium">Auto-Pinning Active</span>
              </div>
              <div className="grid grid-cols-10 gap-1 p-1 rounded-md bg-sunken/80 border border-line/40">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-2 rounded-[2px] ${
                      i < 3
                        ? 'bg-[#5eead4] shadow-[0_0_6px_rgba(94,234,212,0.4)]'
                        : i < 5
                          ? 'bg-accent/70'
                          : 'bg-sunken border border-line/30'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="mt-5 pt-3.5 border-t border-line/60 flex items-center justify-between text-[11.5px] font-mono text-muted">
            <span>Reflective Gate:</span>
            <span className="text-accent flex items-center gap-1 font-semibold">
              <ShieldCheck className="size-3.5" /> Armed (&gt; 0.65)
            </span>
          </div>
        </div>
      </div>

      {/* Recent Documents Section */}
      <section aria-labelledby="recent-docs" className="space-y-4">
        <div className="flex items-baseline justify-between">
          <div>
            <h2 id="recent-docs" className="font-serif text-2xl text-ink">Recent documents</h2>
            <p className="text-[13px] text-muted">Active PDF corpus currently indexed in memory desk.</p>
          </div>
          <Link to="/documents" className="text-xs font-mono font-medium text-accent hover:underline flex items-center gap-1">
            View all ({documents.length}) <ChevronRight className="size-3.5" />
          </Link>
        </div>
        {loading ? (
          <DocumentListSkeleton />
        ) : documents.length === 0 ? (
          <div className="glass-card rounded-2xl border border-line p-8">
            <EmptyState
              title="No documents yet."
              body="Upload PDF documents to start querying with hybrid retrieval."
              action={
                <Button variant="primary" onClick={() => setUploading(true)}>
                  Upload document
                </Button>
              }
            />
          </div>
        ) : (
          <DocumentList documents={documents.slice(0, 4)} />
        )}
      </section>

      {/* Recent Questions Section */}
      <section aria-labelledby="recent-q" className="space-y-4">
        <div className="flex items-baseline justify-between">
          <div>
            <h2 id="recent-q" className="font-serif text-2xl text-ink">Recent questions</h2>
            <p className="text-[13px] text-muted">Queries executed across the working memory desk.</p>
          </div>
          {entries.length > 0 && (
            <Link to="/research" className="text-xs font-mono font-medium text-accent hover:underline flex items-center gap-1">
              Open Research <ChevronRight className="size-3.5" />
            </Link>
          )}
        </div>
        {entries.length === 0 ? (
          <div className="glass-card rounded-2xl border border-line p-6 text-center text-muted">
            <Sparkles className="size-6 text-accent/60 mx-auto mb-2" />
            <p className="text-sm">No research queries yet.</p>
            <p className="text-xs text-muted/80 mt-1">
              Ask your first question in the Research Command Center to view telemetry traces here.
            </p>
          </div>
        ) : (
          <div className="glass-card overflow-hidden rounded-xl border border-line divide-y divide-line/60">
            {entries.slice(0, 5).map((q) => (
              <button
                key={q.id}
                type="button"
                onClick={() => navigate('/research')}
                className="w-full text-left group flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 px-5 py-3.5 transition-all duration-200 hover:bg-sunken/60 hover:border-l-[3px] hover:border-l-accent"
              >
                <div className="min-w-0 flex-1 basis-64">
                  <p className="truncate font-medium text-ink group-hover:text-accent transition-colors text-sm">
                    {q.query}
                  </p>
                  <p className="truncate text-[12px] text-muted mt-0.5">
                    {q.documentNames.length === 1 ? q.documentNames[0] : `${q.documentNames.length} documents targeted`}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="rounded bg-sunken px-2 py-0.5 text-xs font-mono text-muted border border-line/40">
                    {timeAgo(q.at)}
                  </span>
                  <span className="text-xs font-mono text-accent opacity-0 group-hover:opacity-100 transition-opacity">
                    Inspect &rarr;
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      <UploadDialog open={uploading} onClose={() => setUploading(false)} />
    </div>
  )
}
