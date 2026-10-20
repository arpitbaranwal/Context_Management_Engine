import type { ReactNode } from 'react'
import { AlertCircle, Check, Loader2 } from 'lucide-react'
import { cn } from '../../lib/cn'
import type { DocumentStatus } from '../../api/types'

export const Spinner = ({ className }: { className?: string }) => <Loader2 aria-hidden className={cn('spin size-4', className)} />

export const Skeleton = ({ className }: { className?: string }) => <div aria-hidden className={cn('skeleton h-4', className)} />

export function Notice({ tone = 'danger', children, action }: { tone?: 'danger' | 'warn' | 'neutral'; children: ReactNode; action?: ReactNode }) {
  const tones = { danger: 'bg-danger-soft text-danger', warn: 'bg-warn-soft text-warn', neutral: 'bg-sunken text-muted' }
  return (
    <div role={tone === 'danger' ? 'alert' : 'status'} className={cn('flex items-start gap-2.5 rounded-control px-3.5 py-2.5 text-[13.5px]', tones[tone])}>
      <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0 flex-1">{children}</div>
      {action}
    </div>
  )
}

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="px-6 py-12 text-center">
      <p className="font-serif text-xl">{title}</p>
      {body && <p className="mx-auto mt-1 max-w-sm text-muted">{body}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  )
}

export function StatusMark({ status }: { status: DocumentStatus }) {
  if (status === 'ready')
    return <span className="inline-flex items-center gap-1.5 text-[13px] text-accent"><Check aria-hidden className="size-3.5" strokeWidth={2.5} />Ready</span>
  if (status === 'processing')
    return <span className="inline-flex items-center gap-1.5 text-[13px] text-muted"><Spinner className="size-3.5" />Processing</span>
  return <span className="inline-flex items-center gap-1.5 text-[13px] text-danger"><AlertCircle aria-hidden className="size-3.5" />Failed</span>
}
