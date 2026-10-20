import { useId, type InputHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  hint?: string
}

export function Field({ label, error, hint, className, ...rest }: Props) {
  const id = useId()
  const msg = error ?? hint
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[13px] font-medium">{label}</label>
      <input
        id={id}
        aria-invalid={!!error}
        aria-describedby={msg ? `${id}-msg` : undefined}
        className={cn(
          'h-10 w-full rounded-control border bg-surface px-3 text-sm placeholder:text-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25',
          error ? 'border-danger' : 'border-line-strong',
          className,
        )}
        {...rest}
      />
      {msg && <p id={`${id}-msg`} className={cn('mt-1.5 text-[12.5px]', error ? 'text-danger' : 'text-muted')}>{msg}</p>}
    </div>
  )
}
