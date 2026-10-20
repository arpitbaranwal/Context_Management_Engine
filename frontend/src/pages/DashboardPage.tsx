import { useState } from 'react'
import { Plus, Search } from 'lucide-react'
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

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex-1 px-5 py-4 first:pl-0 sm:first:pl-5 [&:not(:first-child)]:border-l [&:not(:first-child)]:border-line">
      <dd className="font-serif text-[28px] leading-none">{value}</dd>
      <dt className="mt-1.5 text-[13px] text-muted">{label}</dt>
    </div>
  )
}

export default function DashboardPage() {
  const { user } = useAuth()
  const { documents, loading, error, refresh } = useDocuments()
  const { entries } = useHistory()
  const [uploading, setUploading] = useState(false)

  const chunks = documents.reduce((n, d) => n + d.chunksCount, 0)
  const ready = documents.filter((d) => d.status === 'ready').length

  return (
    <div className="mx-auto w-full max-w-6xl space-y-10 px-4 py-10 sm:px-6">
      <PageHeader
        title={`${greeting()}, ${user?.name.split(' ')[0] ?? ''}`}
        description="Upload your documents and start researching."
        actions={
          <>
            <Button variant="primary" icon={<Plus aria-hidden className="size-4" />} onClick={() => setUploading(true)}>Upload document</Button>
            <Button icon={<Search aria-hidden className="size-4" />} onClick={() => navigate('/research')}>Start research</Button>
          </>
        }
      />

      {error && <Notice action={<Button size="sm" onClick={() => void refresh()}>Retry</Button>}>{error}</Notice>}

      <dl className="flex rounded-xl border border-line bg-surface">
        <Stat label="Documents" value={documents.length} />
        <Stat label="Chunks" value={chunks} />
        <Stat label="Ready" value={ready} />
      </dl>

      <section aria-labelledby="recent-docs">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 id="recent-docs" className="font-serif text-xl">Recent documents</h2>
          <Link to="/documents" className="text-sm text-accent hover:underline">View all</Link>
        </div>
        {loading ? <DocumentListSkeleton /> : documents.length === 0 ? (
          <div className="rounded-xl border border-line bg-surface">
            <EmptyState title="No documents yet." body="Upload a document to start researching." action={<Button variant="primary" onClick={() => setUploading(true)}>Upload document</Button>} />
          </div>
        ) : <DocumentList documents={documents.slice(0, 4)} />}
      </section>

      <section aria-labelledby="recent-q">
        <h2 id="recent-q" className="mb-3 font-serif text-xl">Recent questions</h2>
        {entries.length === 0 ? (
          <p className="rounded-xl border border-line bg-surface px-4 py-6 text-muted">No questions yet. Questions you ask in Research will appear here.</p>
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
            {entries.slice(0, 5).map((q) => (
              <li key={q.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 px-4 py-3">
                <p className="min-w-0 flex-1 basis-64 truncate font-medium">{q.query}</p>
                <p className="truncate text-[13px] text-muted">{q.documentNames.length === 1 ? q.documentNames[0] : `${q.documentNames.length} documents`}</p>
                <p className="w-20 text-right text-[13px] text-muted">{timeAgo(q.at)}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <UploadDialog open={uploading} onClose={() => setUploading(false)} />
    </div>
  )
}
