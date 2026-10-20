import { Children, cloneElement, isValidElement, useId, useState, type ReactElement, type ReactNode } from 'react'
import { motion, useReducedMotion, type Transition } from 'motion/react'
import { cn } from '../../lib/cn'

/**
 * Motion Primitives "AnimatedBackground": a single highlight that glides
 * between children carrying a `data-id`. Used only for small local tabs.
 */
interface Props {
  children: ReactNode
  value?: string
  defaultValue?: string
  onValueChange?: (id: string) => void
  className?: string
  transition?: Transition
}

export function AnimatedBackground({ children, value, defaultValue, onValueChange, className, transition }: Props) {
  const [inner, setInner] = useState(defaultValue ?? null)
  const uid = useId()
  const reduce = useReducedMotion()
  const active = value ?? inner

  const t: Transition = reduce ? { duration: 0 } : (transition ?? { type: 'spring', bounce: 0.05, duration: 0.25 })

  return (
    <>
      {Children.map(children, (child) => {
        if (!isValidElement(child)) return child
        const el = child as ReactElement<{ 'data-id'?: string; className?: string; onClick?: (e: unknown) => void; children?: ReactNode }>
        const id = el.props['data-id']
        if (!id) return child
        const current = active === id
        return cloneElement(
          el,
          {
            className: cn('relative', el.props.className),
            onClick: (e: unknown) => {
              el.props.onClick?.(e)
              setInner(id)
              onValueChange?.(id)
            },
            ...({ 'data-checked': current } as object),
          },
          <>
            {current && <motion.span layoutId={`ab-${uid}`} className={cn('absolute inset-0', className)} transition={t} />}
            <span className="relative z-10 inline-flex items-center gap-1.5">{el.props.children}</span>
          </>,
        )
      })}
    </>
  )
}
