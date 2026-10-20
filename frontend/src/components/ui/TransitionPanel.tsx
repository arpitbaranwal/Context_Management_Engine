import { Children, type ReactNode } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { cn } from '../../lib/cn'

/** Motion Primitives "TransitionPanel": cross-fades between related panels. */
export function TransitionPanel({ activeIndex, children, className }: { activeIndex: number; children: ReactNode; className?: string }) {
  const reduce = useReducedMotion()
  const panels = Children.toArray(children)
  return (
    <div className={cn('relative', className)}>
      <AnimatePresence initial={false} mode="wait">
        <motion.div
          key={activeIndex}
          initial={{ opacity: 0, y: reduce ? 0 : 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: reduce ? 0 : -4 }}
          transition={{ duration: reduce ? 0 : 0.16, ease: 'easeOut' }}
        >
          {panels[activeIndex]}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
