import { useCallback, useEffect, useRef, useState } from 'react'
import { FileText, Sparkles, Cpu, Layers, ArrowRight, PanelRightClose, PanelRightOpen } from 'lucide-react'
import { askQuestion, fetchTelemetry } from '../api/research'
import { ApiError } from '../api/client'
import type { Source, SystemTelemetry } from '../api/types'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/Feedback'
import { Overlay } from '../components/ui/Overlay'
import { DocPicker } from '../features/research/DocPicker'
import { Composer } from '../features/research/Composer'
import { ResearchEntry, type Entry } from '../features/research/ResearchEntry'
import { SourceDrawer } from '../features/research/SourceDrawer'
import { SystemTelemetryCard } from '../features/research/SystemTelemetryCard'
import { UploadDialog } from '../features/upload/UploadDialog'
import { useDocuments } from '../state/documents'
import { useHistory } from '../state/history'
import { useSelection } from '../state/selection'

const SUGGESTED_QUERIES = [
  {
    topic: 'Classification Thresholds',
    query: 'How does the choice of threshold in probabilistic classifiers affect precision and recall, and what strategies are used to select an appropriate threshold?',
  },
  {
    topic: 'Evaluation Metrics',
    query: 'In what situations might accuracy be a misleading metric for classification performance, and why?',
  },
  {
    topic: 'Confusion Matrix Architecture',
    query: 'Explain the 4 components of a confusion matrix with real-world examples.',
  },
]

export default function ResearchPage() {
  const { documents, loading } = useDocuments()
  const { selected, init } = useSelection()
  const { add } = useHistory()
  const [entries, setEntries] = useState<Entry[]>([])
  const entriesRef = useRef<Entry[]>([])
  entriesRef.current = entries
  const [source, setSource] = useState<Source | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [telemetryOpen, setTelemetryOpen] = useState(false)
  const [rightPanelVisible, setRightPanelVisible] = useState(true)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [systemTelemetry, setSystemTelemetry] = useState<SystemTelemetry | null>(null)
  const [prefillQuery, setPrefillQuery] = useState('')
  const reqs = useRef(new Map<string, string[]>())
  const abortControllers = useRef(new Map<string, AbortController>())

  const ready = documents.filter((d) => d.status === 'ready')
  const chosen = ready.filter((d) => selected.has(d.id))
  const busy = entries.some((e) => e.status === 'loading')

  // Pre-select everything that is ready the first time documents arrive.
  useEffect(() => { init(ready.map((d) => d.id)) }, [ready.length]) // eslint-disable-line react-hooks/exhaustive-deps

  // Populate sample response if requested via preview query
  useEffect(() => {
    const search = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
    if (search && search.get('sample') === 'true' && entries.length === 0) {
      setEntries([
        {
          id: 'demo-sample-1',
          query: 'Explain the 4 components of a confusion matrix with real-world examples.',
          documentNames: ['152 pages ml book.pdf', 'DSML.pdf', 'MachineLearningTomMitchell.pdf'],
          status: 'done',
          response: {
            answer: `A confusion matrix is a foundational diagnostic tool in machine learning used to evaluate the empirical performance of classification models by cross-tabulating ground-truth targets against model predictions across classes.\n\n### Core Structural Components\n\nIn a binary classification setting, the matrix maps outcomes across two decision dimensions, yielding four distinct operational quadrants:\n\n- **True Positives (TP):** Positive instances that the model correctly predicted as positive (e.g. correctly flagging a fraudulent financial transaction or detecting malicious traffic).\n- **True Negatives (TN):** Negative instances correctly identified as negative (e.g. verifying an authentic user login without false alarm).\n- **False Positives (FP):** Negative instances mistakenly classified as positive. In statistics, this is known as a **Type I error** or false alarm.\n- **False Negatives (FN):** Positive instances incorrectly classified as negative. In statistics, this represents a **Type II error** (a critical missed detection).\n\n### Real-Life Example: High-Security Facility vs. Retail Promotion\n\nTo appreciate the asymmetric utility of errors in production, consider how real-world risk envelopes determine error tolerance:\n\n1. **Biometric Security Defense Facility:** A False Positive (granting perimeter access to an unauthorized intruder) introduces catastrophic security risk, whereas a False Negative (prompting an authorized officer for secondary manual verification) is merely an inconvenience. Hence, security thresholds minimize False Positives at the expense of sensitivity.\n2. **Retail Promotional Campaign:** A False Positive (sending a 10% coupon to a customer unlikely to convert) incurs trivial marginal compute cost ($<\\$0.001$), while a False Negative (missing a high-value customer) loses substantial revenue. Commercial engines prioritize Recall over Precision.\n\n### Key Evaluation Metrics Derived from the Matrix\n\n$$\\text{TPR (Recall)} = \\frac{\\text{TP}}{\\text{TP} + \\text{FN}}, \\quad \\text{Precision} = \\frac{\\text{TP}}{\\text{TP} + \\text{FP}}, \\quad \\text{F}_1 = 2 \\cdot \\frac{\\text{Precision} \\cdot \\text{Recall}}{\\text{Precision} + \\text{Recall}}$$`,
            sources: [
              { label: 'S1', chunkId: 101, documentName: 'DSML.pdf', page: 274, text: 'The confusion matrix summarizes binary classification outcomes into True Positives (TP), False Positives (FP), True Negatives (TN), and False Negatives (FN).' },
              { label: 'S2', chunkId: 102, documentName: 'DSML.pdf', page: 275, text: 'Type I errors (false positives) versus Type II errors (false negatives) carry domain-specific loss penalties that require careful threshold calibration.' },
              { label: 'S3', chunkId: 201, documentName: 'MachineLearningTomMitchell.pdf', page: 82, text: 'Evaluating hypotheses using cross-tabulation matrices enables calculation of Precision, Recall, and the harmonic F1 measure.' },
            ],
            grounded: true,
            latencyMs: 7.2,
          },
        },
      ])
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Initial telemetry fetch
  useEffect(() => {
    void fetchTelemetry().then((t) => {
      if (t) setSystemTelemetry(t)
    })
  }, [documents.length])

  const pause = useCallback((id?: string) => {
    if (id) {
      abortControllers.current.get(id)?.abort()
      abortControllers.current.delete(id)
    } else {
      abortControllers.current.forEach((c) => c.abort())
      abortControllers.current.clear()
    }
  }, [])

  const run = useCallback(async (id: string, query: string, ids: string[]) => {
    abortControllers.current.get(id)?.abort()
    const controller = new AbortController()
    abortControllers.current.set(id, controller)

    const history = entriesRef.current
      .filter((e) => e.id !== id && e.status === 'done' && e.response?.answer)
      .slice(0, 10)
      .reverse()
      .flatMap((e) => [
        { role: 'user' as const, content: e.query },
        { role: 'assistant' as const, content: e.response!.answer },
      ])

    setEntries((es) => es.map((e) => (e.id === id ? { ...e, status: 'loading', error: undefined, unreachable: false } : e)))
    try {
      const response = await askQuestion({ query, documentIds: ids, history, signal: controller.signal })
      setEntries((es) => es.map((e) => (e.id === id ? { ...e, status: 'done', response } : e)))
      if (response.telemetry) {
        setSystemTelemetry({
          workingMemory: response.telemetry.workingMemory,
          lastTelemetry: response.telemetry,
        })
      }
    } catch (err) {
      const api = err instanceof ApiError ? err : null
      setEntries((es) => es.map((e) => (e.id === id ? { ...e, status: 'error', error: api?.message, unreachable: api?.unreachable } : e)))
    } finally {
      abortControllers.current.delete(id)
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

  const handleSelectSuggested = (q: string) => {
    if (chosen.length === 0) {
      setPrefillQuery(q)
      return
    }
    ask(q)
  }

  const picker = <DocPicker onUpload={() => setUploadOpen(true)} />
  const noDocs = !loading && documents.length === 0
  const hint = chosen.length === 0 && !noDocs ? 'Select at least one document to ask a question.' : undefined

  return (
    <div className="mx-auto flex w-full max-w-[1520px] flex-1 min-h-[calc(100dvh-3.5rem)] px-3 sm:px-6">
      {/* ========================================================
          Left Pane: Corpus Selector (IDE-style sidebar)
          ======================================================== */}
      <aside
        aria-label="Corpus Selector"
        className="sticky top-14 hidden h-[calc(100dvh-3.5rem)] w-72 xl:w-80 shrink-0 overflow-y-auto overflow-x-hidden border-r border-line/70 py-6 pr-5 pl-1 lg:block"
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex size-6 items-center justify-center rounded bg-accent-soft text-accent">
              <Layers className="size-3.5" />
            </span>
            <h2 className="font-mono text-[12.5px] font-semibold uppercase tracking-wider text-ink">
              Corpus Selector
            </h2>
          </div>
          <span className="font-mono text-[11px] text-muted rounded bg-sunken px-2 py-0.5 border border-line/40">
            {chosen.length} active
          </span>
        </div>
        {picker}
      </aside>

      {/* ========================================================
          Center Pane: Floating Command Dock & Answer Canvas
          ======================================================== */}
      <section aria-label="Research Console" className="min-w-0 flex-1 px-3 sm:px-8 py-6">
        <div className="mx-auto max-w-3xl">
          {/* Top Bar on Mobile or Toggle on Desktop */}
          <div className="mb-5 flex items-center justify-between lg:hidden gap-2">
            <Button
              size="sm"
              icon={<FileText aria-hidden className="size-3.5" />}
              onClick={() => setPickerOpen(true)}
            >
              Corpus{chosen.length ? ` (${chosen.length})` : ''}
            </Button>
            <Button
              size="sm"
              icon={<Cpu aria-hidden className="size-3.5 text-accent" />}
              onClick={() => setTelemetryOpen(true)}
            >
              OS RAM Desk
            </Button>
          </div>

          {/* Desktop Right Inspector Toggle Button */}
          <div className="hidden lg:flex justify-end mb-3">
            <button
              type="button"
              onClick={() => setRightPanelVisible(!rightPanelVisible)}
              className="flex items-center gap-1.5 text-xs font-mono text-muted hover:text-ink px-2.5 py-1 rounded-md bg-sunken/60 hover:bg-sunken border border-line/50 transition-all"
              title={rightPanelVisible ? 'Collapse OS Memory Desk' : 'Expand OS Memory Desk'}
            >
              {rightPanelVisible ? (
                <>
                  <PanelRightClose className="size-3.5 text-accent" />
                  <span>Hide Inspector</span>
                </>
              ) : (
                <>
                  <PanelRightOpen className="size-3.5 text-accent" />
                  <span>Show OS Memory Desk</span>
                </>
              )}
            </button>
          </div>

          {/* Floating Command Dock */}
          {noDocs ? (
            <div className="glass-card rounded-2xl border border-line p-8">
              <EmptyState
                title="No indexed documents yet."
                body="Upload your first document to populate the hybrid retrieval corpus."
                action={
                  <Button variant="primary" onClick={() => setUploadOpen(true)}>
                    Upload document
                  </Button>
                }
              />
            </div>
          ) : (
            <Composer
              disabled={chosen.length === 0}
              busy={busy}
              hint={hint}
              initialQuery={prefillQuery}
              onAsk={ask}
              onPause={() => pause()}
            />
          )}

          {/* Empty-State Starter Suggestions when no conversation is active */}
          {entries.length === 0 && !noDocs && (
            <div className="mt-10 space-y-4">
              <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-muted">
                <Sparkles className="size-3.5 text-accent" />
                <span>Suggested Technical Queries</span>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {SUGGESTED_QUERIES.map((item) => (
                  <button
                    key={item.query}
                    type="button"
                    onClick={() => handleSelectSuggested(item.query)}
                    className="glass-card group text-left rounded-xl border border-line/70 p-4 transition-all duration-200 hover:border-accent/50 hover:bg-sunken/70 hover:shadow-[0_0_20px_rgba(45,212,191,0.06)]"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-mono text-accent bg-accent-soft px-2 py-0.5 rounded font-medium">
                        {item.topic}
                      </span>
                      <ArrowRight className="size-3.5 text-muted group-hover:text-accent group-hover:translate-x-0.5 transition-all" />
                    </div>
                    <p className="text-[13.5px] font-medium text-ink group-hover:text-accent transition-colors leading-snug">
                      "{item.query}"
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Answer Conversation Entries Stream */}
          <div className="mt-8 space-y-6" aria-live="polite">
            {entries.map((e, i) => (
              <ResearchEntry
                key={e.id}
                entry={e}
                defaultOpen={i === 0}
                onOpenSource={setSource}
                onRetry={() => void run(e.id, e.query, reqs.current.get(e.id) ?? [])}
                onPause={() => pause(e.id)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ========================================================
          Right Pane: Live "OS Working Memory Desk" & Telemetry
          ======================================================== */}
      {rightPanelVisible && (
        <aside
          aria-label="OS Working Memory Desk"
          className="sticky top-14 hidden h-[calc(100dvh-3.5rem)] w-80 xl:w-[340px] shrink-0 overflow-y-auto overflow-x-hidden border-l border-line/70 py-6 pl-5 pr-1 lg:block"
        >
          <SystemTelemetryCard
            workingMemory={systemTelemetry?.workingMemory}
            lastTelemetry={systemTelemetry?.lastTelemetry}
            collapsible={false}
          />
        </aside>
      )}

      {/* Mobile Overlays */}
      <Overlay
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        placement="left"
        title="Corpus Selector"
        footer={<Button onClick={() => setPickerOpen(false)}>Done</Button>}
      >
        {picker}
      </Overlay>

      <Overlay
        open={telemetryOpen}
        onClose={() => setTelemetryOpen(false)}
        placement="right"
        title="OS Working Memory Desk"
        footer={<Button onClick={() => setTelemetryOpen(false)}>Close</Button>}
      >
        <SystemTelemetryCard
          workingMemory={systemTelemetry?.workingMemory}
          lastTelemetry={systemTelemetry?.lastTelemetry}
          collapsible={false}
        />
      </Overlay>

      <SourceDrawer source={source} onClose={() => setSource(null)} />
      <UploadDialog open={uploadOpen} onClose={() => setUploadOpen(false)} />
    </div>
  )
}
