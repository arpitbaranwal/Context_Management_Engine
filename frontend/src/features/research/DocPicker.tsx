import { Plus } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Skeleton } from '../../components/ui/Feedback'
import { cn } from '../../lib/cn'
import { useDocuments } from '../../state/documents'
import { useSelection } from '../../state/selection'

/** Left panel: choose which documents are used as context. */
export function DocPicker({ onUpload }: { onUpload: () => void }) {
  const { documents, loading, error } = useDocuments()
  const { selected, toggle, set } = useSelection()
  const ready = documents.filter((d) => d.status === 'ready')
  const allOn = ready.length > 0 && ready.every((d) => selected.has(d.id))

  return (
    <div className="flex flex-col gap-4">
      <Button icon={<Plus aria-hidden className="size-4" />} onClick={onUpload} className="w-full">Upload</Button>

      {loading ? (
        <div role="status" aria-label="Loading documents" className="space-y-3"><Skeleton className="w-3/4" /><Skeleton className="w-2/3" /></div>
      ) : documents.length === 0 ? (
        <p className="text-[13.5px] text-muted">{error ?? 'No documents yet. Upload a document to start researching.'}</p>
      ) : (
        <fieldset>
          <legend className="sr-only">Documents to search</legend>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[13px] text-muted">{selected.size} of {ready.length} selected</span>
            <button type="button" onClick={() => set(allOn ? [] : ready.map((d) => d.id))} className="text-[13px] text-accent hover:underline">
              {allOn ? 'Clear' : 'Select all'}
            </button>
          </div>
          <ul className="-mx-2">
            {documents.map((d) => {
              const disabled = d.status !== 'ready'
              return (
                <li key={d.id}>
                  <label className={cn('flex cursor-pointer items-start gap-2.5 rounded-md px-2 py-2 hover:bg-sunken', disabled && 'cursor-not-allowed opacity-50 hover:bg-transparent')}>
                    <input type="checkbox" disabled={disabled} checked={selected.has(d.id)} onChange={() => toggle(d.id)} className="mt-1 size-4 shrink-0 accent-[var(--accent)]" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{d.name}</span>
                      <span className="block text-[13px] text-muted">{disabled ? (d.status === 'failed' ? 'Failed' : 'Processing…') : `${d.chunksCount} chunks`}</span>
                    </span>
                  </label>
                </li>
              )
            })}
          </ul>
        </fieldset>
      )}
    </div>
  )
}
