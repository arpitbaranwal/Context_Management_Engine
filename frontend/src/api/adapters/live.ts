import { ApiError, request, tokenStore, uploadForm } from '../client'
import type {
  ApiAdapter, AuthSession, Chunk, Document, DocumentType, ResearchResponse, RetrievalDetails, SystemTelemetry, TelemetryData, User,
} from '../types'

/**
 * Live adapter. Talks to the existing backend_bridge.py shapes
 * (see API_CONTRACT.md) plus the optional fields listed in FRONTEND_API.md.
 */

interface RawChunk { id: number; source: string; text: string; page?: number }
interface RawDocument {
  id: string; name: string; size: number; type: string; uploadedAt: string; status: Document['status']
  chunksCount: number; chunks?: RawChunk[]; extractedChars?: number
  pagesCount?: number; processingMs?: number; error?: string
}
interface RawQueryResponse {
  answer: string
  relevantChunks: RawChunk[]
  latencyMs?: number
  grounded?: boolean
  retrieval?: RetrievalDetails
  telemetry?: TelemetryData
}

const toChunk = (c: RawChunk): Chunk => ({ id: c.id, source: c.source, text: c.text, page: c.page })

function toDocument(d: RawDocument): Document {
  return {
    id: d.id,
    name: d.name,
    type: (['pdf', 'png', 'jpg', 'jpeg'].includes(d.type) ? d.type : 'pdf') as DocumentType,
    size: d.size,
    uploadedAt: d.uploadedAt,
    status: d.status,
    chunksCount: d.chunksCount,
    chunks: (d.chunks ?? []).map(toChunk),
    extractedChars: d.extractedChars,
    pagesCount: d.pagesCount,
    processingMs: d.processingMs,
    error: d.error,
  }
}

export const liveAdapter: ApiAdapter = {
  mode: 'live',

  async health() {
    try {
      const h = await request<{ status: string; engineLoaded?: boolean }>('/api/health')
      return { ok: h.status === 'healthy', engineLoaded: h.engineLoaded }
    } catch {
      return { ok: false }
    }
  },

  auth: {
    async login(email, password) {
      const s = await request<AuthSession>('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })
      tokenStore.set(s.token)
      return s
    },
    async register(name, email, password) {
      const s = await request<AuthSession>('/api/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password }) })
      tokenStore.set(s.token)
      return s
    },
    async logout() {
      try {
        await request<void>('/api/auth/logout', { method: 'POST' })
      } finally {
        tokenStore.clear()
      }
    },
    async getCurrentUser(): Promise<User | null> {
      if (!tokenStore.get()) return null
      try {
        return await request<User>('/api/auth/me')
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) {
          tokenStore.clear()
          return null
        }
        throw e
      }
    },
  },

  documents: {
    async list() {
      return (await request<RawDocument[]>('/api/documents')).map(toDocument)
    },
    async upload(file, handlers) {
      handlers?.onStage?.('uploading', 0)
      const form = new FormData()
      form.append('files', file)
      const docs = await uploadForm<RawDocument[]>(
        '/api/documents/upload',
        form,
        (f) => handlers?.onStage?.('uploading', f),
        () => handlers?.onStage?.('processing'),
      )
      const doc = docs[0]
      if (!doc) throw new ApiError('The server did not return the processed document.')
      return toDocument(doc)
    },
    async remove(id) {
      await request(`/api/documents/${encodeURIComponent(id)}`, { method: 'DELETE' })
    },
  },

  research: {
    async ask(req): Promise<ResearchResponse> {
      const r = await request<RawQueryResponse>('/api/research/query', {
        method: 'POST',
        body: JSON.stringify({
          query: req.query,
          documentIds: req.documentIds,
          topK: req.topK ?? 5,
          history: req.history,
        }),
        signal: req.signal,
      })
      // Sources are the chunks that were sent to the model. The bridge's
      // `citations` array is not used: its page numbers are placeholders.
      return {
        answer: r.answer,
        sources: r.relevantChunks.map((c, i) => ({
          label: `S${i + 1}`, chunkId: c.id, documentName: c.source, page: c.page, text: c.text,
        })),
        grounded: r.grounded,
        latencyMs: r.latencyMs,
        retrieval: r.retrieval,
        telemetry: r.telemetry,
      }
    },
    async getTelemetry(): Promise<SystemTelemetry> {
      return await request<SystemTelemetry>('/api/telemetry')
    },
  },
}
