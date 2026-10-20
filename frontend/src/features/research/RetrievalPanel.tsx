import { Notice } from '../../components/ui/Feedback'
import { formatMs } from '../../lib/format'
import type { RetrievalCandidate, RetrievalDetails } from '../../api/types'

const key = (c: RetrievalCandidate) => `${c.source}#${c.chunkId}`
const n = (v: number, d: number) => v.toFixed(d)

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-6 border-b border-line py-2 last:border-0">
      <dt className="text-muted">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  )
}

/** Everything shown here comes from the backend response. Nothing is computed or invented. */
export function RetrievalPanel({ details }: { details?: RetrievalDetails }) {
  if (!details) return <Notice tone="neutral">The backend did not return retrieval details for this answer.</Notice>

  const { bm25, faiss, context } = details
  const count = (list: RetrievalCandidate[], unit: string) => (list.length ? `${list.length} ${unit}` : 'Not reported')

  // Union of every chunk mentioned, in context order first.
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

  return (
    <div className="space-y-6">
      <dl className="max-w-sm text-sm">
        <Summary label="BM25" value={count(bm25.candidates, 'candidates')} />
        <Summary label="FAISS" value={count(faiss.candidates, 'candidates')} />
        <Summary label="Context" value={count(context.chunks, 'chunks')} />
        {details.latencyMs != null && <Summary label="Retrieval time" value={formatMs(details.latencyMs)} />}
      </dl>

      {bm25.queryTokens && bm25.queryTokens.length > 0 && (
        <p className="text-[13px] text-muted">
          BM25 query terms: <span className="text-ink">{bm25.queryTokens.join(', ')}</span>
        </p>
      )}

      {rows.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-line">
          <table className="w-full min-w-[28rem] text-left text-[13px]">
            <caption className="sr-only">Chunks considered for this answer</caption>
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
                    <td className="px-3 py-2">{inCtx ? 'Yes' : 'No'}</td>
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
