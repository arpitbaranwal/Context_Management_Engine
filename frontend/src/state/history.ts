import { useCallback, useState } from 'react'

/** Recent questions are kept in this browser only; the backend has no history endpoint. */
export interface HistoryEntry {
  id: string
  query: string
  documentNames: string[]
  at: string
}

const KEY = 'cme.history'
const read = (): HistoryEntry[] => {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '[]') } catch { return [] }
}

export function useHistory() {
  const [entries, setEntries] = useState<HistoryEntry[]>(read)
  const add = useCallback((e: HistoryEntry) => {
    setEntries((prev) => {
      const next = [e, ...prev].slice(0, 20)
      localStorage.setItem(KEY, JSON.stringify(next))
      return next
    })
  }, [])
  return { entries, add }
}
