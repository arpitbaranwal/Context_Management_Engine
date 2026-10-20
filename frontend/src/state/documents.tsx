import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ApiError } from '../api/client'
import { listDocuments, removeDocument, uploadDocument } from '../api/documents'
import type { Document, UploadStage } from '../api/types'

export interface UploadItem {
  key: string
  fileName: string
  size: number
  stage: UploadStage | 'ready' | 'failed'
  progress: number
  error?: string
  document?: Document
}

interface DocsState {
  documents: Document[]
  loading: boolean
  error: string | null
  uploads: UploadItem[]
  refresh: () => Promise<void>
  upload: (files: File[]) => void
  dismissUpload: (key: string) => void
  remove: (id: string) => Promise<void>
}
const Ctx = createContext<DocsState | null>(null)

export function DocumentsProvider({ children }: { children: ReactNode }) {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [uploads, setUploads] = useState<UploadItem[]>([])
  const queue = useRef<Promise<void>>(Promise.resolve())

  const refresh = useCallback(async () => {
    try {
      setError(null)
      setDocuments(await listDocuments())
    } catch (e) {
      setError(e instanceof ApiError && e.unreachable ? 'Unable to connect to the research engine.' : 'Could not load documents.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void refresh() }, [refresh])

  const patch = (key: string, p: Partial<UploadItem>) =>
    setUploads((u) => u.map((x) => (x.key === key ? { ...x, ...p } : x)))

  const upload = useCallback((files: File[]) => {
    const items: UploadItem[] = files.map((f) => ({
      key: `${f.name}-${f.size}-${crypto.randomUUID()}`, fileName: f.name, size: f.size, stage: 'uploading', progress: 0,
    }))
    setUploads((u) => [...items, ...u])
    // One file at a time: try.py re-indexes the whole corpus on every upload.
    files.forEach((file, i) => {
      const key = items[i].key
      queue.current = queue.current.then(async () => {
        try {
          const doc = await uploadDocument(file, {
            onStage: (stage, progress) => patch(key, { stage, progress: progress ?? 0 }),
          })
          patch(key, { stage: 'ready', progress: 1, document: doc })
          setDocuments((d) => [doc, ...d.filter((x) => x.id !== doc.id)])
        } catch (e) {
          patch(key, { stage: 'failed', error: e instanceof Error ? e.message : 'Upload failed.' })
        }
      })
    })
  }, [])

  const dismissUpload = useCallback((key: string) => setUploads((u) => u.filter((x) => x.key !== key)), [])

  const remove = useCallback(async (id: string) => {
    await removeDocument(id)
    setDocuments((d) => d.filter((x) => x.id !== id))
  }, [])

  const value = useMemo(
    () => ({ documents, loading, error, uploads, refresh, upload, dismissUpload, remove }),
    [documents, loading, error, uploads, refresh, upload, dismissUpload, remove],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useDocuments() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useDocuments outside DocumentsProvider')
  return c
}
