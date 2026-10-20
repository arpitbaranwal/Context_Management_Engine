import { useEffect, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '../../lib/cn'

/**
 * Accessible overlay on the native <dialog>: focus trap, Escape to close,
 * and focus restoration are provided by the browser.
 */
interface Props {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  /** 'center' for dialogs, 'left' / 'right' for drawers. */
  placement?: 'center' | 'left' | 'right'
  footer?: ReactNode
}

export function Overlay({ open, onClose, title, children, placement = 'center', footer }: Props) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])

  const pos = {
    center: 'm-auto w-[min(32rem,calc(100vw-2rem))] rounded-xl',
    left: 'mr-auto ml-0 h-dvh max-h-dvh w-[min(22rem,92vw)] rounded-r-xl',
    right: 'ml-auto mr-0 h-dvh max-h-dvh w-[min(30rem,94vw)] rounded-l-xl',
  }[placement]

  return (
    <dialog
      ref={ref}
      aria-label={title}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className={cn('flex-col overflow-hidden border border-line bg-surface p-0 text-ink shadow-xl backdrop:bg-black/40 open:flex', pos)}
    >
      <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
        <h2 className="font-serif text-lg">{title}</h2>
        <button type="button" onClick={onClose} aria-label="Close" className="rounded-md p-1 text-muted hover:bg-sunken hover:text-ink">
          <X aria-hidden className="size-4" />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
      {footer && <div className="flex justify-end gap-2 border-t border-line px-5 py-3">{footer}</div>}
    </dialog>
  )
}
