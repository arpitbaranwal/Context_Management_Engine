import { useRef, useState, useEffect, type FormEvent, type KeyboardEvent } from 'react'
import { ArrowUp, Square, Cpu, ShieldCheck, Binary } from 'lucide-react'
import { Button } from '../../components/ui/Button'

interface Props {
  disabled: boolean
  busy: boolean
  hint?: string
  initialQuery?: string
  onAsk: (q: string) => void
  onPause?: () => void
}

export function Composer({ disabled, busy, hint, initialQuery, onAsk, onPause }: Props) {
  const [text, setText] = useState('')
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (initialQuery) {
      setText(initialQuery)
      if (ref.current) {
        ref.current.focus()
        ref.current.style.height = 'auto'
        ref.current.style.height = `${Math.min(ref.current.scrollHeight, 200)}px`
      }
    }
  }, [initialQuery])

  const submit = (e?: FormEvent) => {
    e?.preventDefault()
    const q = text.trim()
    if (!q || disabled || busy) return
    onAsk(q)
    setText('')
    if (ref.current) ref.current.style.height = ''
  }

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) submit(e)
  }

  return (
    <form onSubmit={submit} className="relative z-10">
      <div className="glass-card rounded-2xl border border-line-strong/80 p-1.5 shadow-2xl transition-all duration-300 focus-within:border-accent/80 focus-within:ring-2 focus-within:ring-accent/25 focus-within:shadow-[0_0_24px_rgba(45,212,191,0.15)]">
        {/* Engine mode badges bar */}
        <div className="flex flex-wrap items-center gap-1.5 px-3 pt-2 pb-1 text-[11px] font-mono select-none">
          <span className="inline-flex items-center gap-1 rounded-md bg-accent-soft/80 px-2 py-0.5 text-accent border border-accent/25 font-medium">
            <Binary className="size-3" />
            BM25F + FAISS RRF
          </span>
          <span className="inline-flex items-center gap-1 rounded-md bg-sunken/80 px-2 py-0.5 text-muted border border-line/60">
            <ShieldCheck className="size-3 text-accent" />
            Reflective Gate: Active
          </span>
          <span className="hidden sm:inline-flex items-center gap-1 rounded-md bg-sunken/80 px-2 py-0.5 text-muted border border-line/60">
            <Cpu className="size-3 text-muted" />
            2000w RAM Desk
          </span>
        </div>

        {/* Text Input */}
        <label htmlFor="question" className="sr-only">Ask a question about your documents</label>
        <textarea
          id="question"
          ref={ref}
          rows={2}
          value={text}
          disabled={busy}
          onChange={(e) => {
            setText(e.target.value)
            e.target.style.height = 'auto'
            e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`
          }}
          onKeyDown={onKey}
          placeholder={busy ? 'Generating grounded answer… Click Pause to cancel' : 'What would you like to know from your documents?'}
          className="block w-full resize-none rounded-xl bg-transparent px-3.5 pt-2 pb-1 text-[15px] leading-relaxed text-ink placeholder:text-muted/60 focus:outline-none disabled:opacity-60"
        />

        {/* Bottom bar with status & button */}
        <div className="flex items-center justify-between gap-3 px-3 pb-2 pt-1">
          <p className="min-w-0 truncate text-[12px] text-muted font-mono">
            {busy ? (
              <span className="flex items-center gap-1.5 text-amber-400">
                <span className="size-1.5 rounded-full bg-amber-400 animate-pulse" />
                Generation in progress · Click Pause to stop
              </span>
            ) : (
              hint ?? 'Shift+Enter for newline'
            )}
          </p>

          <div className="flex items-center gap-2">
            {busy ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={onPause}
                icon={<Square aria-hidden className="size-3 fill-current text-amber-400" />}
                className="border-amber-500/30 text-amber-300 hover:border-amber-500/60 hover:bg-amber-500/10 shadow-xs"
              >
                Pause
              </Button>
            ) : (
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={disabled || !text.trim()}
                className="gap-2 px-3.5"
              >
                <span>Ask</span>
                <kbd className="hidden sm:inline-flex items-center justify-center rounded bg-accent-ink/20 px-1 py-0.2 text-[10px] font-mono text-accent-ink">
                  ↵
                </kbd>
                <ArrowUp aria-hidden className="size-3.5 sm:hidden" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </form>
  )
}
