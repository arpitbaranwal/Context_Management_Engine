import { Skeleton, StatusMark } from '../../components/ui/Feedback'
import { Link } from '../../lib/router'
import { formatBytes, formatMs } from '../../lib/format'
import type { Document } from '../../api/types'

export const docMeta = (d: Document) =>
  [d.type.toUpperCase(), d.pagesCount != null ? `${d.pagesCount} ${d.pagesCount === 1 ? 'page' : 'pages'}` : null, formatBytes(d.size)].filter(Boolean).join(' · ')

const COLS = 'md:grid-cols-[minmax(0,1fr)_6.5rem_5.5rem_6.5rem_4rem]'

export function DocumentList({ documents }: { documents: Document[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-surface">
      <div aria-hidden className={`hidden gap-4 border-b border-line px-4 py-2 text-[12.5px] text-muted md:grid ${COLS}`}>
        <span>Name</span><span>Chunks</span><span>Time</span><span>Status</span><span />
      </div>
      <ul className="divide-y divide-line">
        {documents.map((d) => (
          <li key={d.id} className={`grid items-center gap-x-4 gap-y-1 px-4 py-3 ${COLS}`}>
            <div className="min-w-0">
              <Link to={`/documents/${encodeURIComponent(d.id)}`} className="block truncate font-medium hover:underline">{d.name}</Link>
              <p className="truncate text-[13px] text-muted">{docMeta(d)}</p>
            </div>
            <p className="text-[13.5px] md:text-sm"><span className="md:hidden text-muted">Chunks </span>{d.chunksCount}</p>
            <p className="text-[13.5px] md:text-sm"><span className="md:hidden text-muted">Time </span>{formatMs(d.processingMs)}</p>
            <StatusMark status={d.status} />
            <Link to={`/documents/${encodeURIComponent(d.id)}`} className="text-sm font-medium text-accent hover:underline md:text-right" aria-label={`Open ${d.name}`}>Open</Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function DocumentListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Loading documents" className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="space-y-2 px-4 py-4"><Skeleton className="w-1/3" /><Skeleton className="h-3 w-1/5" /></div>
      ))}
    </div>
  )
}
