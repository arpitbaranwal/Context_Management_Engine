import { useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { ArrowUp } from 'lucide-react'
import { Button } from '../../components/ui/Button'

interface Props {
  disabled: boolean
  busy: boolean
  hint?: string
  onAsk: (q: string) => void
}

export function Composer({ disabled, busy, hint, onAsk }: Props) {
  const [text, setText] = useState('')
  const ref = useRef<HTMLTextAreaElement>(null)

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
    <form onSubmit={submit}>
      <div className="rounded-xl border border-line-strong bg-surface focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/25">
        <label htmlFor="question" className="sr-only">Ask a question about your documents</label>
        <textarea
          id="question"
          ref={ref}
          rows={2}
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            e.target.style.height = 'auto'
            e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`
          }}
          onKeyDown={onKey}
          placeholder="What would you like to know?"
          className="block w-full resize-none rounded-xl bg-transparent px-4 pb-1 pt-3.5 text-[15px] placeholder:text-muted/70 focus:outline-none"
        />
        <div className="flex items-center justify-between gap-3 px-3 pb-2.5">
          <p className="min-w-0 truncate text-[12.5px] text-muted">{hint ?? 'Enter to ask · Shift+Enter for a new line'}</p>
          <Button type="submit" variant="primary" size="sm" disabled={disabled || busy || !text.trim()} icon={<ArrowUp aria-hidden className="size-4" />}>Ask</Button>
        </div>
      </div>
    </form>
  )
}
