import { useCallback, useEffect, useRef, useState } from 'react'
import { FileText } from 'lucide-react'
import { askQuestion } from '../api/research'
import { ApiError } from '../api/client'
import type { Source } from '../api/types'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/Feedback'
import { Overlay } from '../components/ui/Overlay'
import { DocPicker } from '../features/research/DocPicker'
import { Composer } from '../features/research/Composer'
import { ResearchEntry, type Entry } from '../features/research/ResearchEntry'
import { SourceDrawer } from '../features/research/SourceDrawer'
import { UploadDialog } from '../features/upload/UploadDialog'
import { useDocuments } from '../state/documents'
import { useHistory } from '../state/history'
import { useSelection } from '../state/selection'

export default function ResearchPage() {
  const { documents, loading } = useDocuments()
  const { selected, init } = useSelection()
  const { add } = useHistory()
  const [entries, setEntries] = useState<Entry[]>([])
  const [source, setSource] = useState<Source | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [uploadOpen, setUploadOpen] = useState(false)
  const reqs = useRef(new Map<string, string[]>())

  const ready = documents.filter((d) => d.status === 'ready')
  const chosen = ready.filter((d) => selected.has(d.id))
  const busy = entries.some((e) => e.status === 'loading')

  // Pre-select everything that is ready the first time documents arrive.
  useEffect(() => { init(ready.map((d) => d.id)) }, [ready.length]) // eslint-disable-line react-hooks/exhaustive-deps

  const run = useCallback(async (id: string, query: string, ids: string[]) => {
    setEntries((es) => es.map((e) => (e.id === id ? { ...e, status: 'loading', error: undefined, unreachable: false } : e)))
    try {
      const response = await askQuestion({ query, documentIds: ids })
      setEntries((es) => es.map((e) => (e.id === id ? { ...e, status: 'done', response } : e)))
    } catch (err) {
      const api = err instanceof ApiError ? err : null
      setEntries((es) => es.map((e) => (e.id === id ? { ...e, status: 'error', error: api?.message, unreachable: api?.unreachable } : e)))
    }
  }, [])

  const ask = (query: string) => {
    const id = crypto.randomUUID()
    const ids = chosen.map((d) => d.id)
    const names = chosen.map((d) => d.name)
    reqs.current.set(id, ids)
    setEntries((es) => [{ id, query, documentNames: names, status: 'loading' }, ...es])
    add({ id, query, documentNames: names, at: new Date().toISOString() })
    void run(id, query, ids)
  }

  const picker = <DocPicker onUpload={() => setUploadOpen(true)} />
  const noDocs = !loading && documents.length === 0
  const hint = chosen.length === 0 && !noDocs ? 'Select at least one document to ask a question.' : undefined

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1">
      <aside aria-label="Documents" className="sticky top-14 hidden h-[calc(100dvh-3.5rem)] w-72 shrink-0 overflow-y-auto border-r border-line py-8 pl-6 pr-5 lg:block">
        <h2 className="mb-4 font-serif text-lg">Documents</h2>
        {picker}
      </aside>

      <section aria-label="Research" className="min-w-0 flex-1 px-4 py-8 sm:px-8">
        <div className="mx-auto max-w-3xl">
          <div className="mb-5 flex items-end justify-between gap-3">
            <h1 className="font-serif text-[26px] leading-tight tracking-[-0.015em]">Ask a question about your documents</h1>
          </div>

          <div className="mb-5 lg:hidden">
            <Button icon={<FileText aria-hidden className="size-4" />} onClick={() => setPickerOpen(true)}>
              Documents{chosen.length ? ` (${chosen.length} selected)` : ''}
            </Button>
          </div>

          {noDocs ? (
            <div className="rounded-xl border border-line bg-surface">
              <EmptyState title="No documents yet." body="Upload a document to start researching." action={<Button variant="primary" onClick={() => setUploadOpen(true)}>Upload document</Button>} />
            </div>
          ) : (
            <Composer disabled={chosen.length === 0} busy={busy} hint={hint} onAsk={ask} />
          )}

          <div className="mt-8 space-y-6" aria-live="polite">
            {entries.map((e, i) => (
              <ResearchEntry key={e.id} entry={e} defaultOpen={i === 0} onOpenSource={setSource}
                onRetry={() => void run(e.id, e.query, reqs.current.get(e.id) ?? [])} />
            ))}
          </div>
        </div>
      </section>

      <Overlay open={pickerOpen} onClose={() => setPickerOpen(false)} placement="left" title="Documents" footer={<Button onClick={() => setPickerOpen(false)}>Done</Button>}>
        {picker}
      </Overlay>
      <SourceDrawer source={source} onClose={() => setSource(null)} />
      <UploadDialog open={uploadOpen} onClose={() => setUploadOpen(false)} />
    </div>
  )
}
