import { useEffect, useState } from 'react'
import { ChevronDown, RotateCw } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Notice, Skeleton, Spinner } from '../../components/ui/Feedback'
import { Tabs } from '../../components/ui/Tabs'
import { TransitionPanel } from '../../components/ui/TransitionPanel'
import { cn } from '../../lib/cn'
import { formatMs } from '../../lib/format'
import type { ResearchResponse, Source } from '../../api/types'
import { RetrievalPanel } from './RetrievalPanel'

export interface Entry {
  id: string
  query: string
  documentNames: string[]
  status: 'loading' | 'done' | 'error'
  response?: ResearchResponse
  error?: string
  unreachable?: boolean
}

const sourceMeta = (s: Source) => [s.documentName, s.page != null ? `Page ${s.page}` : null].filter(Boolean).join(' · ')

function AnswerTab({ r, onOpen }: { r: ResearchResponse; onOpen: (s: Source) => void }) {
  return (
    <div>
      <div className="prose-answer">
        {r.answer.split(/\n{2,}/).map((p, i) => <p key={i} className="whitespace-pre-wrap">{p}</p>)}
      </div>
      {r.grounded === false && <div className="mt-4 max-w-[66ch]"><Notice tone="neutral">The selected documents don't appear to cover this question.</Notice></div>}
      {r.sources.length > 0 && (
        <div className="mt-6 border-t border-line pt-4">
          <h3 className="mb-2 text-[13px] font-medium text-muted">Sources</h3>
          <ul className="flex flex-col gap-1">
            {r.sources.map((s) => (
              <li key={s.label}>
                <button type="button" onClick={() => onOpen(s)} className="group flex max-w-full items-baseline gap-2.5 rounded-md py-1 pr-2 text-left text-sm hover:text-accent">
                  <span className="shrink-0 rounded bg-accent-soft px-1.5 py-px text-xs font-medium text-accent">{s.label}</span>
                  <span className="truncate underline-offset-4 group-hover:underline">{sourceMeta(s)}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function SourcesTab({ sources, onOpen }: { sources: Source[]; onOpen: (s: Source) => void }) {
  if (!sources.length) return <p className="text-muted">No sources were returned for this answer.</p>
  return (
    <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line">
      {sources.map((s) => (
        <li key={s.label}>
          <button type="button" onClick={() => onOpen(s)} className="block w-full px-4 py-3 text-left hover:bg-sunken/60">
            <span className="flex items-baseline gap-2.5 text-sm">
              <span className="rounded bg-accent-soft px-1.5 py-px text-xs font-medium text-accent">{s.label}</span>
              <span className="min-w-0 truncate font-medium">{s.documentName}</span>
            </span>
            <span className="mt-0.5 block text-[13px] text-muted">{[s.page != null ? `Page ${s.page}` : null, `Chunk ${s.chunkId}`].filter(Boolean).join(' · ')}</span>
            <span className="mt-1.5 line-clamp-2 block text-[14px] text-muted">{s.text}</span>
          </button>
        </li>
      ))}
    </ul>
  )
}

function Body({ entry, onOpen }: { entry: Entry; onOpen: (s: Source) => void }) {
  const [tab, setTab] = useState('answer')
  const r = entry.response!
  const ids = ['answer', 'sources', 'retrieval']
  return (
    <div className="mt-4">
      <Tabs label="Answer views" value={tab} onChange={setTab}
        tabs={[{ id: 'answer', label: 'Answer' }, { id: 'sources', label: `Sources (${r.sources.length})` }, { id: 'retrieval', label: 'Retrieval' }]} />
      <div role="tabpanel" aria-labelledby={`tab-${tab}`} className="mt-5">
        <TransitionPanel activeIndex={ids.indexOf(tab)}>
          <AnswerTab r={r} onOpen={onOpen} />
          <SourcesTab sources={r.sources} onOpen={onOpen} />
          <RetrievalPanel details={r.retrieval} />
        </TransitionPanel>
      </div>
    </div>
  )
}

interface Props {
  entry: Entry
  defaultOpen: boolean
  onOpenSource: (s: Source) => void
  onRetry: () => void
}

export function ResearchEntry({ entry, defaultOpen, onOpenSource, onRetry }: Props) {
  const [open, setOpen] = useState(defaultOpen)
  // When a newer question arrives, fold this one away.
  useEffect(() => { if (!defaultOpen) setOpen(false) }, [defaultOpen])
  const docs = entry.documentNames.length === 1 ? entry.documentNames[0] : `${entry.documentNames.length} documents`
  const time = entry.response?.latencyMs != null ? ` · ${formatMs(entry.response.latencyMs)}` : ''

  return (
    <article aria-busy={entry.status === 'loading'} className="border-t border-line pt-5">
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="flex w-full items-start justify-between gap-4 text-left">
        <span className="min-w-0">
          <span className="block font-serif text-[22px] leading-snug tracking-[-0.01em]">{entry.query}</span>
          <span className="mt-0.5 block text-[13px] text-muted">{docs}{time}</span>
        </span>
        <ChevronDown aria-hidden className={cn('mt-2 size-4 shrink-0 text-muted transition-transform', open && 'rotate-180')} />
      </button>

      {open && entry.status === 'loading' && (
        <div role="status" className="mt-5 space-y-3">
          <p className="flex items-center gap-2 text-sm text-muted"><Spinner />Searching your documents and generating an answer…</p>
          <Skeleton className="h-4 w-full max-w-[66ch]" /><Skeleton className="h-4 w-11/12 max-w-[60ch]" /><Skeleton className="h-4 w-2/3 max-w-[44ch]" />
        </div>
      )}

      {open && entry.status === 'error' && (
        <div className="mt-4 max-w-[66ch]">
          <Notice action={<Button size="sm" icon={<RotateCw aria-hidden className="size-3.5" />} onClick={onRetry}>Retry</Button>}>
            <p className="font-medium">{entry.unreachable ? 'Unable to connect to the research engine.' : 'Something went wrong while generating the answer.'}</p>
            {!entry.unreachable && entry.error && <p className="mt-0.5 opacity-90">{entry.error}</p>}
          </Notice>
        </div>
      )}

      {open && entry.status === 'done' && entry.response && <Body entry={entry} onOpen={onOpenSource} />}
    </article>
  )
}
