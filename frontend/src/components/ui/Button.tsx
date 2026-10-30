import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '../../lib/cn'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

const styles: Record<Variant, string> = {
  primary: 'bg-accent text-accent-ink hover:brightness-110 active:scale-[0.99] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.25),0_4px_12px_-2px_rgba(45,212,191,0.4)] disabled:hover:brightness-100 disabled:shadow-none',
  secondary: 'border border-line-strong/80 bg-surface text-ink hover:bg-sunken hover:border-line-strong active:scale-[0.99] shadow-xs',
  ghost: 'text-muted hover:text-ink hover:bg-sunken/60',
  danger: 'border border-line-strong bg-surface text-danger hover:bg-danger-soft active:scale-[0.99]',
}

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  loading?: boolean
  icon?: ReactNode
  size?: 'sm' | 'md'
}

export function Button({ variant = 'secondary', loading, icon, size = 'md', className, children, disabled, type = 'button', ...rest }: Props) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cn(
        'inline-flex shrink-0 items-center justify-center gap-2 rounded-control font-medium transition-[background-color,filter,color] disabled:cursor-not-allowed disabled:opacity-50',
        size === 'md' ? 'h-9 px-3.5 text-sm' : 'h-8 px-2.5 text-[13px]',
        styles[variant],
        className,
      )}
      {...rest}
    >
      {loading ? <Loader2 className="spin size-4" aria-hidden /> : icon}
      {children}
    </button>
  )
}
