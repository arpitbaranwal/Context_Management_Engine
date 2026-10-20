import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'

/** Which documents are used as research context. Survives page changes. */
interface Sel {
  selected: Set<string>
  toggle: (id: string) => void
  set: (ids: string[]) => void
  /** Applies a default selection once, and never after the user has chosen. */
  init: (ids: string[]) => void
}
const Ctx = createContext<Sel | null>(null)

export function SelectionProvider({ children }: { children: ReactNode }) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const touched = useRef(false)

  const toggle = useCallback((id: string) => {
    touched.current = true
    setSelected((s) => { const n = new Set(s); if (!n.delete(id)) n.add(id); return n })
  }, [])
  const set = useCallback((ids: string[]) => { touched.current = true; setSelected(new Set(ids)) }, [])
  const init = useCallback((ids: string[]) => {
    if (touched.current || !ids.length) return
    touched.current = true
    setSelected(new Set(ids))
  }, [])

  const value = useMemo(() => ({ selected, toggle, set, init }), [selected, toggle, set, init])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useSelection() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useSelection outside SelectionProvider')
  return c
}
