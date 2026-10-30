import { Plus, Check } from 'lucide-react'
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
  const totalChunks = ready.reduce((acc, d) => acc + d.chunksCount, 0)
  const allOn = ready.length > 0 && ready.every((d) => selected.has(d.id))

  return (
    <div className="flex flex-col gap-4">
      <Button
        variant="secondary"
        icon={<Plus aria-hidden className="size-4 text-accent" />}
        onClick={onUpload}
        className="w-full justify-center border-line-strong/70 hover:border-accent/50 text-ink shadow-xs"
      >
        Upload new PDF
      </Button>

      {loading ? (
        <div role="status" aria-label="Loading documents" className="space-y-3">
          <Skeleton className="w-full h-16 rounded-xl" />
          <Skeleton className="w-full h-16 rounded-xl" />
          <Skeleton className="w-full h-16 rounded-xl" />
        </div>
      ) : documents.length === 0 ? (
        <div className="rounded-xl border border-line/60 bg-sunken/40 p-4 text-center">
          <p className="text-[13px] text-muted leading-relaxed">
            {error ?? 'No indexed documents found. Upload a PDF to populate the hybrid retrieval corpus.'}
          </p>
        </div>
      ) : (
        <fieldset className="space-y-3">
          <legend className="sr-only">Corpus documents to search</legend>
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-muted">
              <strong className="text-ink font-semibold">{selected.size}</strong> of {ready.length} active
            </span>
            <button
              type="button"
              onClick={() => set(allOn ? [] : ready.map((d) => d.id))}
              className="text-accent hover:underline font-medium transition-colors"
            >
              {allOn ? 'Deselect all' : 'Select all'}
            </button>
          </div>

          <div className="space-y-2 max-h-[calc(100dvh-16rem)] overflow-y-auto pr-1">
            {documents.map((d) => {
              const disabled = d.status !== 'ready'
              const isSelected = selected.has(d.id)
              const sharePct = totalChunks > 0 ? (d.chunksCount / totalChunks) * 100 : 0

              return (
                <div
                  key={d.id}
                  onClick={() => !disabled && toggle(d.id)}
                  role="checkbox"
                  aria-checked={isSelected}
                  tabIndex={disabled ? -1 : 0}
                  onKeyDown={(e) => {
                    if (!disabled && (e.key === ' ' || e.key === 'Enter')) {
                      e.preventDefault()
                      toggle(d.id)
                    }
                  }}
                  className={cn(
                    'group relative flex flex-col gap-2 rounded-xl border p-3 cursor-pointer transition-all duration-200 select-none',
                    disabled && 'cursor-not-allowed opacity-50 hover:border-line/60',
                    isSelected && !disabled
                      ? 'border-accent/50 bg-accent-soft/15 shadow-[0_0_14px_rgba(45,212,191,0.08)]'
                      : 'border-line/70 bg-sunken/40 hover:bg-sunken/70 hover:border-line-strong'
                  )}
                >
                  {/* Top line: custom checkbox + doc name */}
                  <div className="flex items-start gap-2.5">
                    <div
                      className={cn(
                        'mt-0.5 flex size-4.5 shrink-0 items-center justify-center rounded-[5px] border transition-all',
                        isSelected && !disabled
                          ? 'border-accent bg-accent text-accent-ink shadow-[0_0_8px_rgba(45,212,191,0.5)]'
                          : 'border-line-strong bg-surface group-hover:border-muted'
                      )}
                    >
                      {isSelected && <Check className="size-3 stroke-[3]" />}
                    </div>

                    <div className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] font-medium text-ink group-hover:text-accent transition-colors">
                        {d.name}
                      </span>
                      <div className="mt-0.5 flex items-center justify-between text-[11px] font-mono text-muted">
                        <span>{disabled ? (d.status === 'failed' ? 'Failed' : 'Processing…') : `${d.chunksCount} chunks`}</span>
                        {!disabled && <span>{Math.round(sharePct)}% corpus</span>}
                      </div>
                    </div>
                  </div>

                  {/* Chunk Share Progress Bar */}
                  {!disabled && (
                    <div className="h-1 w-full overflow-hidden rounded-full bg-sunken/80 border border-line/30">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all duration-300',
                          isSelected ? 'bg-accent' : 'bg-muted/40'
                        )}
                        style={{ width: `${Math.max(sharePct, 4)}%` }}
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </fieldset>
      )}
    </div>
  )
}
