import { Skeleton, StatusMark } from '../../components/ui/Feedback'
import { Link } from '../../lib/router'
import { formatBytes, formatMs } from '../../lib/format'
import type { Document } from '../../api/types'
import { FileText } from 'lucide-react'

export const docMeta = (d: Document) =>
  [d.type.toUpperCase(), d.pagesCount != null ? `${d.pagesCount} ${d.pagesCount === 1 ? 'page' : 'pages'}` : null, formatBytes(d.size)].filter(Boolean).join(' · ')

const COLS = 'md:grid-cols-[minmax(0,1fr)_6.5rem_6rem_6.5rem_4rem]'

export function DocumentList({ documents }: { documents: Document[] }) {
  return (
    <div className="glass-card overflow-hidden rounded-xl border border-line">
      <div aria-hidden className={`hidden gap-4 border-b border-line/60 bg-sunken/40 px-5 py-2.5 text-[12px] font-mono uppercase tracking-wider text-muted md:grid ${COLS}`}>
        <span>Document</span><span>Chunks</span><span>Index Time</span><span>Status</span><span />
      </div>
      <ul className="divide-y divide-line/60">
        {documents.map((d) => (
          <li
            key={d.id}
            className={`group grid items-center gap-x-4 gap-y-1.5 px-5 py-3.5 transition-all duration-200 hover:bg-sunken/60 hover:border-l-[3px] hover:border-l-accent ${COLS}`}
          >
            <div className="flex items-start gap-3 min-w-0">
              <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-sunken border border-line/60 text-muted group-hover:text-accent group-hover:border-accent/40 transition-colors">
                <FileText className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <Link to={`/documents/${encodeURIComponent(d.id)}`} className="block truncate font-medium text-ink group-hover:text-accent transition-colors">
                  {d.name}
                </Link>
                <p className="truncate text-[12.5px] text-muted">{docMeta(d)}</p>
              </div>
            </div>
            <p className="text-[13px] font-mono text-ink">
              <span className="md:hidden text-muted font-sans text-xs">Chunks: </span>
              <span className="inline-block rounded bg-sunken px-2 py-0.5 border border-line/40">{d.chunksCount}</span>
            </p>
            <p className="text-[13px] font-mono text-muted">
              <span className="md:hidden text-muted font-sans text-xs">Time: </span>
              {formatMs(d.processingMs)}
            </p>
            <div>
              <StatusMark status={d.status} />
            </div>
            <Link
              to={`/documents/${encodeURIComponent(d.id)}`}
              className="text-xs font-mono font-medium text-accent hover:underline md:text-right"
              aria-label={`Open ${d.name}`}
            >
              Open &rarr;
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function DocumentListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Loading documents" className="glass-card divide-y divide-line/60 overflow-hidden rounded-xl border border-line">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="space-y-2 px-5 py-4">
          <Skeleton className="w-1/3 h-4" />
          <Skeleton className="h-3 w-1/5" />
        </div>
      ))}
    </div>
  )
}
