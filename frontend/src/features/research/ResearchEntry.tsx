import { useEffect, useState } from 'react'
import { ChevronDown, RotateCw } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Notice } from '../../components/ui/Feedback'
import { MarkdownRenderer } from '../../components/ui/MarkdownRenderer'
import { Tabs } from '../../components/ui/Tabs'
import { TransitionPanel } from '../../components/ui/TransitionPanel'
import { cn } from '../../lib/cn'
import { formatMs } from '../../lib/format'
import type { ResearchResponse, Source } from '../../api/types'
import { RetrievalPanel } from './RetrievalPanel'
import { HybridRetrievalLoader } from './HybridRetrievalLoader'

export interface Entry {
  id: string
  query: string
  documentNames: string[]
  status: 'loading' | 'done' | 'error'
  response?: ResearchResponse
  error?: string
  unreachable?: boolean
}

function AnswerTab({ r, onOpen }: { r: ResearchResponse; onOpen: (s: Source) => void }) {
  return (
    <div>
      <MarkdownRenderer
        content={r.answer}
        onCitationClick={(label) => {
          const src = r.sources.find((s) => s.label === label)
          if (src) onOpen(src)
        }}
      />
      {r.grounded === false && <div className="mt-4 max-w-[66ch]"><Notice tone="neutral">The selected documents don't appear to cover this question.</Notice></div>}
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
      <div role="tabpanel" aria-labelledby={`tab-${tab}`}>
        <TransitionPanel activeIndex={ids.indexOf(tab)}>
          <AnswerTab r={r} onOpen={onOpen} />
          <SourcesTab sources={r.sources} onOpen={onOpen} />
          <RetrievalPanel details={r.retrieval} telemetry={r.telemetry} />
        </TransitionPanel>
      </div>

      <div className="mt-6 border-t border-line/70 pt-3.5 flex items-center justify-between">
        <Tabs
          label="Answer views"
          value={tab}
          onChange={setTab}
          tabs={[
            { id: 'answer', label: 'Answer' },
            { id: 'sources', label: `Sources (${r.sources.length})` },
            { id: 'retrieval', label: 'Retrieval' },
          ]}
        />
        {r.sources.length > 0 && tab === 'answer' && (
          <span className="text-[12px] text-muted">
            {r.sources.length} grounded {r.sources.length === 1 ? 'source' : 'sources'}
          </span>
        )}
      </div>
    </div>
  )
}

interface Props {
  entry: Entry
  defaultOpen: boolean
  onOpenSource: (s: Source) => void
  onRetry: () => void
  onPause?: () => void
}

export function ResearchEntry({ entry, defaultOpen, onOpenSource, onRetry, onPause }: Props) {
  const [open, setOpen] = useState(defaultOpen)
  // When a newer question arrives, fold this one away.
  useEffect(() => { if (!defaultOpen) setOpen(false) }, [defaultOpen])
  const docs = entry.documentNames.length === 1 ? entry.documentNames[0] : `${entry.documentNames.length} documents`
  const time = entry.response?.latencyMs != null ? ` · ${formatMs(entry.response.latencyMs)}` : ''
  const isPaused = entry.error === 'Generation paused.'

  return (
    <article aria-busy={entry.status === 'loading'} className="border-t border-line pt-5">
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="flex w-full items-start justify-between gap-4 text-left">
        <span className="min-w-0">
          <span className="block font-sans text-[18px] font-semibold text-ink leading-snug tracking-[-0.01em]">{entry.query}</span>
          <span className="mt-1 block text-[12.5px] text-muted">{docs}{time}</span>
        </span>
        <ChevronDown aria-hidden className={cn('mt-2 size-4 shrink-0 text-muted transition-transform', open && 'rotate-180')} />
      </button>

      {open && entry.status === 'loading' && (
        <HybridRetrievalLoader onPause={onPause} />
      )}

      {open && entry.status === 'error' && (
        <div className="mt-4 max-w-[66ch]">
          <Notice tone={isPaused ? 'neutral' : 'danger'} action={<Button size="sm" icon={<RotateCw aria-hidden className="size-3.5" />} onClick={onRetry}>{isPaused ? 'Resume' : 'Retry'}</Button>}>
            <p className="font-medium">
              {isPaused
                ? 'Generation paused.'
                : (entry.unreachable ? 'Unable to connect to the research engine.' : 'Something went wrong while generating the answer.')}
            </p>
            {!entry.unreachable && entry.error && !isPaused && <p className="mt-0.5 opacity-90">{entry.error}</p>}
          </Notice>
        </div>
      )}

      {open && entry.status === 'done' && entry.response && <Body entry={entry} onOpen={onOpenSource} />}
    </article>
  )
}
