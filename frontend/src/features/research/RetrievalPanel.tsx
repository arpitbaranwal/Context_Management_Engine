import { Notice } from '../../components/ui/Feedback'
import { formatMs } from '../../lib/format'
import { cn } from '../../lib/cn'
import type { RetrievalCandidate, RetrievalDetails, TelemetryData } from '../../api/types'

const key = (c: RetrievalCandidate) => `${c.source}#${c.chunkId}`
const n = (v: number, d: number) => v.toFixed(d)

function MetricCard({
  label,
  value,
  subtext,
  badge,
}: {
  label: string
  value: string
  subtext?: string
  badge?: React.ReactNode
}) {
  return (
    <div className="rounded-lg border border-line bg-sunken/40 p-3">
      <div className="flex items-center justify-between text-[11.5px] text-muted">
        <span>{label}</span>
        {badge}
      </div>
      <div className="mt-1 text-[16px] font-semibold text-ink font-mono">{value}</div>
      {subtext && <div className="mt-0.5 text-[11px] text-muted truncate">{subtext}</div>}
    </div>
  )
}

export function RetrievalPanel({
  details,
  telemetry,
}: {
  details?: RetrievalDetails
  telemetry?: TelemetryData
}) {
  if (!details && !telemetry) {
    return <Notice tone="neutral">The backend did not return retrieval details for this answer.</Notice>
  }

  const decision = telemetry?.decision
  const retrieval = telemetry?.retrieval
  const workingMemory = telemetry?.workingMemory
  const isProceed = decision?.status === 'PROCEED'

  const bm25 = details?.bm25 ?? { candidates: [] }
  const faiss = details?.faiss ?? { candidates: [] }
  const context = details?.context ?? { chunks: [] }

  const order = [...context.chunks, ...bm25.candidates, ...faiss.candidates]
  const seen = new Set<string>()
  const rows = order.filter((c) => (seen.has(key(c)) ? false : (seen.add(key(c)), true)))
  const hasScore = bm25.candidates.some((c) => c.score != null)
  const hasDistance = faiss.candidates.some((c) => c.distance != null)
  const hasPage = rows.some((c) => c.page != null)

  const find = (list: RetrievalCandidate[], c: RetrievalCandidate) => {
    const i = list.findIndex((x) => key(x) === key(c))
    return i < 0 ? null : { rank: i + 1, c: list[i] }
  }

  const latency = retrieval?.latencyMs ?? details?.latencyMs

  return (
    <div className="space-y-4">
      {/* Metric Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <MetricCard
          label="Gate Status"
          value={decision?.status ?? 'PROCEED'}
          subtext={decision?.reason}
          badge={
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded px-1.5 py-px text-[10.5px] font-mono',
                isProceed ? 'bg-accent-soft text-accent' : 'bg-warn-soft text-warn'
              )}
            >
              <span className="size-1 rounded-full bg-current" />
              {isProceed ? 'Grounded' : 'Abstained'}
            </span>
          }
        />
        <MetricCard
          label="Confidence Score"
          value={decision?.confidenceScore != null ? decision.confidenceScore.toFixed(4) : 'N/A'}
          subtext="Hybrid RRF & Coverage"
        />
        <MetricCard
          label="Retrieval Latency"
          value={latency != null ? formatMs(latency) : '—'}
          subtext={`${context.chunks.length || rows.length} chunks analyzed`}
        />
      </div>

      {/* Working Memory Desk Telemetry */}
      {workingMemory && (
        <div className="rounded-lg border border-line bg-sunken/30 px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-3 text-[12.5px]">
          <div className="flex items-center gap-2">
            <span className="text-muted">Working Memory Desk:</span>
            <span className="font-mono text-ink font-medium">
              {workingMemory.usedTokens} / {workingMemory.maxTokens} words (
              {workingMemory.maxTokens > 0 ? Math.round((workingMemory.usedTokens / workingMemory.maxTokens) * 100) : 0}%)
            </span>
          </div>
          <div className="flex items-center gap-3 text-[11.5px] text-muted font-mono">
            <span>Active Slots: <strong className="text-ink">{workingMemory.activeSlotsCount}</strong></span>
            <span>Evictions: <strong className="text-ink">{workingMemory.evictionsCount}</strong></span>
          </div>
        </div>
      )}

      {/* Query Expansion (Dimension 3 Reflection) */}
      {retrieval?.expandedQuery && (
        <div className="rounded-lg border border-line bg-sunken/40 p-3 text-[12.5px] space-y-1.5">
          <div className="text-[11px] font-semibold text-accent uppercase tracking-wider">
            Dimension 3: Conversational Reflection
          </div>
          <div className="font-mono text-[12px] text-muted">
            <span className="text-ink font-medium">Expanded: </span>
            {retrieval.expandedQuery}
          </div>
          {retrieval.subQueries && retrieval.subQueries.length > 1 && (
            <div className="pt-1 text-[11.5px] text-muted">
              <span>Sub-queries: </span>
              <span className="text-ink/90 font-mono">
                {retrieval.subQueries.map((q, i) => `[${i + 1}] "${q}"`).join(' · ')}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Query Tokens */}
      {bm25.queryTokens && bm25.queryTokens.length > 0 && (
        <p className="text-[12.5px] text-muted">
          BM25 query terms: <span className="text-ink font-mono">{bm25.queryTokens.join(', ')}</span>
        </p>
      )}

      {/* Candidate Chunks Ranking Table */}
      {rows.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-line">
          <table className="w-full min-w-[28rem] text-left text-[13px]">
            <thead className="bg-sunken text-muted">
              <tr>
                <th scope="col" className="px-3 py-2 font-medium">Chunk</th>
                {hasPage && <th scope="col" className="px-3 py-2 font-medium">Page</th>}
                <th scope="col" className="px-3 py-2 font-medium">BM25{hasScore ? ' score' : ' rank'}</th>
                <th scope="col" className="px-3 py-2 font-medium">FAISS{hasDistance ? ' distance' : ' rank'}</th>
                <th scope="col" className="px-3 py-2 font-medium">In context</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((c) => {
                const b = find(bm25.candidates, c)
                const f = find(faiss.candidates, c)
                const inCtx = !!find(context.chunks, c)
                return (
                  <tr key={key(c)}>
                    <th scope="row" className="max-w-[14rem] px-3 py-2 font-normal">
                      <span className="block truncate">{c.source}</span>
                      <span className="text-muted">Chunk {c.chunkId}</span>
                    </th>
                    {hasPage && <td className="px-3 py-2">{c.page ?? '—'}</td>}
                    <td className="px-3 py-2">{b ? (hasScore && b.c.score != null ? `${n(b.c.score, 2)} (#${b.rank})` : `#${b.rank}`) : '—'}</td>
                    <td className="px-3 py-2">{f ? (hasDistance && f.c.distance != null ? `${n(f.c.distance, 3)} (#${f.rank})` : `#${f.rank}`) : '—'}</td>
                    <td className="px-3 py-2">
                      <span
                        className={cn(
                          'inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium font-mono',
                          inCtx ? 'bg-accent-soft text-accent' : 'text-muted'
                        )}
                      >
                        {inCtx ? 'Active' : 'Filtered'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
