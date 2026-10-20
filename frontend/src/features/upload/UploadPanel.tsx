import { useRef, useState, type DragEvent } from 'react'
import { Check, FileUp, X } from 'lucide-react'
import { ACCEPTED_EXTENSIONS, MAX_FILES_PER_BATCH } from '../../api/documents'
import { Button } from '../../components/ui/Button'
import { Notice, Spinner } from '../../components/ui/Feedback'
import { cn } from '../../lib/cn'
import { formatMs } from '../../lib/format'
import { useDocuments, type UploadItem } from '../../state/documents'

const accept = ACCEPTED_EXTENSIONS.map((e) => `.${e}`).join(',')
const label = ACCEPTED_EXTENSIONS.map((e) => (e === 'jpeg' ? '' : e.toUpperCase())).filter(Boolean).join(' · ')

function Steps({ item }: { item: UploadItem }) {
  const steps = [
    { id: 'uploading', text: 'Uploading' },
    { id: 'processing', text: 'Extracting, chunking, indexing' },
    { id: 'ready', text: 'Ready' },
  ]
  const idx = item.stage === 'failed' ? -1 : steps.findIndex((s) => s.id === item.stage)
  return (
    <ol className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px]">
      {steps.map((s, i) => {
        const done = i < idx || item.stage === 'ready'
        const current = i === idx && item.stage !== 'ready'
        return (
          <li key={s.id} aria-current={current ? 'step' : undefined} className={cn('flex items-center gap-2', done || current ? 'text-ink' : 'text-muted')}>
            <span className="flex items-center gap-1.5">
              {done ? <Check aria-hidden className="size-3.5 text-accent" strokeWidth={2.5} /> : current ? <Spinner className="size-3.5" /> : <span aria-hidden className="size-1.5 rounded-full bg-line-strong" />}
              {s.text}
              {s.id === 'uploading' && current && item.progress > 0 && <span className="text-muted">{Math.round(item.progress * 100)}%</span>}
            </span>
            {i < steps.length - 1 && <span aria-hidden className="h-px w-4 bg-line-strong" />}
          </li>
        )
      })}
    </ol>
  )
}

function Row({ item, onDismiss }: { item: UploadItem; onDismiss: () => void }) {
  const d = item.document
  return (
    <li className="rounded-control border border-line bg-surface px-3.5 py-3">
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 truncate text-sm font-medium">{item.fileName}</p>
        {(item.stage === 'ready' || item.stage === 'failed') && (
          <button type="button" onClick={onDismiss} aria-label={`Dismiss ${item.fileName}`} className="-m-1 rounded p-1 text-muted hover:text-ink"><X aria-hidden className="size-4" /></button>
        )}
      </div>
      {item.stage === 'failed' ? (
        <p role="alert" className="mt-1 text-[13px] text-danger">{item.error}</p>
      ) : (
        <Steps item={item} />
      )}
      {d && (
        <dl className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1 text-[13px]">
          {d.pagesCount != null && <div className="flex gap-1.5"><dt className="text-muted">Pages</dt><dd>{d.pagesCount}</dd></div>}
          <div className="flex gap-1.5"><dt className="text-muted">Chunks</dt><dd>{d.chunksCount}</dd></div>
          <div className="flex gap-1.5"><dt className="text-muted">Processing time</dt><dd>{formatMs(d.processingMs)}</dd></div>
        </dl>
      )}
    </li>
  )
}

export function UploadPanel({ compact = false }: { compact?: boolean }) {
  const { upload, uploads, dismissUpload } = useDocuments()
  const input = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)

  const take = (list: FileList | File[]) => {
    const all = Array.from(list)
    const ok = all.filter((f) => (ACCEPTED_EXTENSIONS as readonly string[]).includes(f.name.split('.').pop()?.toLowerCase() ?? ''))
    const msgs: string[] = []
    if (ok.length < all.length) msgs.push(`Only ${label} files are supported.`)
    if (ok.length > MAX_FILES_PER_BATCH) msgs.push(`Up to ${MAX_FILES_PER_BATCH} files at a time; the first ${MAX_FILES_PER_BATCH} were added.`)
    setProblem(msgs.join(' ') || null)
    if (ok.length) upload(ok.slice(0, MAX_FILES_PER_BATCH))
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setOver(false)
    take(e.dataTransfer.files)
  }

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setOver(true) }}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
        className={cn('rounded-xl border border-dashed text-center transition-colors', compact ? 'px-4 py-6' : 'px-6 py-10', over ? 'border-accent bg-accent-soft' : 'border-line-strong bg-surface')}
      >
        <FileUp aria-hidden className="mx-auto mb-3 size-6 text-muted" strokeWidth={1.5} />
        <p className="font-medium">Drop files here or browse</p>
        <p className="mt-0.5 text-[13px] text-muted">{label} · up to {MAX_FILES_PER_BATCH} files</p>
        <Button variant="secondary" className="mt-4" onClick={() => input.current?.click()}>Browse</Button>
        <input ref={input} type="file" multiple accept={accept} className="sr-only" aria-label="Choose files to upload" tabIndex={-1}
          onChange={(e) => { if (e.target.files) take(e.target.files); e.target.value = '' }} />
      </div>
      {problem && <div className="mt-3"><Notice tone="warn">{problem}</Notice></div>}
      {uploads.length > 0 && (
        <ul aria-live="polite" className="mt-4 space-y-2.5">
          {uploads.map((u) => <Row key={u.key} item={u} onDismiss={() => dismissUpload(u.key)} />)}
        </ul>
      )}
    </div>
  )
}
