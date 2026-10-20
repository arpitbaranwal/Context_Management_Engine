import { useState } from 'react'
import { ArrowLeft, ChevronDown, Trash2 } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { EmptyState, Notice, Skeleton, StatusMark } from '../components/ui/Feedback'
import { Overlay } from '../components/ui/Overlay'
import { cn } from '../lib/cn'
import { formatBytes, formatMs, pad2 } from '../lib/format'
import { Link, navigate } from '../lib/router'
import { useDocuments } from '../state/documents'
import type { Chunk } from '../api/types'

const PAGE = 20

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[13px] text-muted">{label}</dt>
      <dd className="font-serif text-xl">{value}</dd>
    </div>
  )
}

function ChunkRow({ chunk, index }: { chunk: Chunk; index: number }) {
  const [open, setOpen] = useState(false)
  return (
    <li>
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-sunken/60">
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap gap-x-3 text-[13px]">
            <span className="font-medium">Chunk {pad2(index + 1)}</span>
            {chunk.page != null && <span className="text-muted">Page {chunk.page}</span>}
            <span className="text-muted">{chunk.text.length.toLocaleString()} characters</span>
          </p>
          <p className={cn('mt-1 text-[14px] text-muted', !open && 'line-clamp-2')}>{chunk.text}</p>
          {open && <p className="mt-2 text-[12.5px] text-muted">Chunk ID {chunk.id}</p>}
        </div>
        <ChevronDown aria-hidden className={cn('mt-1 size-4 shrink-0 text-muted transition-transform', open && 'rotate-180')} />
      </button>
    </li>
  )
}

export default function DocumentDetailPage({ id }: { id: string }) {
  const { documents, loading, remove } = useDocuments()
  const doc = documents.find((d) => d.id === id)
  const [shown, setShown] = useState(PAGE)
  const [confirm, setConfirm] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const back = (
    <Link to="/documents" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
      <ArrowLeft aria-hidden className="size-4" />Documents
    </Link>
  )

  if (!doc) {
    return (
      <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-10 sm:px-6">
        {back}
        {loading ? <div role="status" aria-label="Loading document" className="space-y-3"><Skeleton className="h-8 w-1/2" /><Skeleton className="w-1/4" /></div>
          : <div className="rounded-xl border border-line bg-surface"><EmptyState title="Document not found." body="It may have been removed." /></div>}
      </div>
    )
  }

  const confirmRemove = async () => {
    setBusy(true)
    setErr(null)
    try {
      await remove(doc.id)
      navigate('/documents')
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not remove the document.')
      setBusy(false)
    }
  }

  const preview = doc.chunks[0]?.text

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-10 sm:px-6">
      {back}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="break-words font-serif text-[30px] leading-tight tracking-[-0.015em]">{doc.name}</h1>
          <div className="mt-1.5 flex items-center gap-2 text-sm"><span className="text-muted">Status</span><StatusMark status={doc.status} /></div>
        </div>
        <Button variant="danger" icon={<Trash2 aria-hidden className="size-4" />} onClick={() => setConfirm(true)}>Remove</Button>
      </header>

      {doc.status === 'failed' && <Notice>{doc.error ?? 'This document could not be processed.'}</Notice>}

      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 rounded-xl border border-line bg-surface px-5 py-4 sm:grid-cols-4">
        <Meta label="Pages" value={doc.pagesCount != null ? String(doc.pagesCount) : '—'} />
        <Meta label="Chunks" value={String(doc.chunksCount)} />
        <Meta label="Size" value={formatBytes(doc.size)} />
        <Meta label="Processing time" value={formatMs(doc.processingMs)} />
      </dl>

      <section aria-labelledby="extracted">
        <h2 id="extracted" className="mb-3 font-serif text-xl">Extracted content</h2>
        <div className="rounded-xl border border-line bg-surface px-5 py-4">
          {doc.extractedChars != null && <p className="text-[13px] text-muted">{doc.extractedChars.toLocaleString()} characters extracted</p>}
          {preview ? <p className="mt-2 line-clamp-4 font-serif text-[16px] leading-relaxed">{preview}</p> : <p className="text-muted">No text was extracted.</p>}
        </div>
      </section>

      <section aria-labelledby="chunks">
        <h2 id="chunks" className="mb-3 font-serif text-xl">Chunks</h2>
        {doc.chunks.length === 0 ? (
          <p className="rounded-xl border border-line bg-surface px-4 py-6 text-muted">No chunks to show for this document.</p>
        ) : (
          <>
            <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
              {doc.chunks.slice(0, shown).map((c, i) => <ChunkRow key={c.id} chunk={c} index={i} />)}
            </ul>
            {shown < doc.chunks.length && (
              <div className="mt-3 flex justify-center"><Button onClick={() => setShown(shown + PAGE)}>Show more ({doc.chunks.length - shown} left)</Button></div>
            )}
          </>
        )}
      </section>

      <Overlay open={confirm} onClose={() => !busy && setConfirm(false)} title="Remove document?"
        footer={<><Button onClick={() => setConfirm(false)} disabled={busy}>Cancel</Button><Button variant="primary" loading={busy} onClick={() => void confirmRemove()}>Remove</Button></>}>
        <p>{doc.name} will be removed from your workspace and from the search index.</p>
        {err && <div className="mt-3"><Notice>{err}</Notice></div>}
      </Overlay>
    </div>
  )
}
