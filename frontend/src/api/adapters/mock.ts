import { ApiError } from '../client'
import { SAMPLE_PASSAGES, SEED_DOCUMENTS } from '../mock/fixtures'
import type {
  ApiAdapter, AuthSession, Chunk, Document, DocumentType, ResearchResponse, RetrievalCandidate, User,
} from '../types'

/**
 * MOCK ADAPTER — development only. Nothing here comes from try.py or a model.
 * Documents are fixtures, "answers" are excerpts, rankings are naive word overlap.
 * The UI shows a persistent "Demo data" marker while this adapter is active.
 */

const USERS_KEY = 'cme.mock.users'
const SESSION_KEY = 'cme.mock.session'
const DOCS_KEY = 'cme.mock.docs'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('')
}

interface StoredUser extends User { hash: string }
const readUsers = (): StoredUser[] => JSON.parse(localStorage.getItem(USERS_KEY) ?? '[]')

function makeChunks(source: string, passages: number[], pages: number | null, startId: number): Chunk[] {
  return passages.map((p, i) => ({
    id: startId + i,
    source,
    text: SAMPLE_PASSAGES[p % SAMPLE_PASSAGES.length],
    page: pages ? Math.min(pages, 1 + Math.floor((i / passages.length) * pages)) : undefined,
  }))
}

function seed(): Document[] {
  let next = 1
  return SEED_DOCUMENTS.map((d, i) => {
    const chunks = makeChunks(d.name, d.passages, d.pages, next)
    next += chunks.length
    return {
      id: `demo-${i + 1}`, name: d.name, type: d.type, size: d.size,
      uploadedAt: new Date(Date.now() - (i + 1) * 3_600_000 * 5).toISOString(),
      status: 'ready' as const, chunksCount: chunks.length, chunks,
      extractedChars: chunks.reduce((n, c) => n + c.text.length, 0), pagesCount: d.pages, processingMs: d.ms,
    }
  })
}

function readDocs(): Document[] {
  const raw = localStorage.getItem(DOCS_KEY)
  if (raw) return JSON.parse(raw)
  const docs = seed()
  localStorage.setItem(DOCS_KEY, JSON.stringify(docs))
  return docs
}
const writeDocs = (d: Document[]) => localStorage.setItem(DOCS_KEY, JSON.stringify(d))

const words = (s: string) => s.toLowerCase().match(/[a-z0-9]+/g) ?? []
const STOP = new Set(['the', 'a', 'an', 'is', 'are', 'of', 'to', 'in', 'what', 'how', 'does', 'do', 'and', 'for', 'with'])

function overlap(query: string[], text: string): number {
  const t = new Set(words(text))
  return query.reduce((n, w) => n + (t.has(w) ? 1 : 0), 0)
}

const ref = (c: Chunk, score?: number): RetrievalCandidate => ({ chunkId: c.id, source: c.source, page: c.page, score })

export const mockAdapter: ApiAdapter = {
  mode: 'mock',

  async health() {
    return { ok: true, engineLoaded: false }
  },

  auth: {
    async login(email, password) {
      await sleep(350)
      const u = readUsers().find((x) => x.email === email.toLowerCase())
      if (!u || u.hash !== (await sha256(password))) throw new ApiError('Incorrect email or password.', 401)
      const user = { id: u.id, name: u.name, email: u.email }
      localStorage.setItem(SESSION_KEY, user.id)
      return { user, token: `mock-${user.id}` } satisfies AuthSession
    },
    async register(name, email, password) {
      await sleep(450)
      const users = readUsers()
      if (users.some((x) => x.email === email.toLowerCase())) throw new ApiError('An account with this email already exists.', 409)
      const u: StoredUser = { id: crypto.randomUUID(), name, email: email.toLowerCase(), hash: await sha256(password) }
      localStorage.setItem(USERS_KEY, JSON.stringify([...users, u]))
      localStorage.setItem(SESSION_KEY, u.id)
      return { user: { id: u.id, name: u.name, email: u.email }, token: `mock-${u.id}` }
    },
    async logout() {
      localStorage.removeItem(SESSION_KEY)
    },
    async getCurrentUser() {
      const id = localStorage.getItem(SESSION_KEY)
      const u = readUsers().find((x) => x.id === id)
      return u ? { id: u.id, name: u.name, email: u.email } : null
    },
  },

  documents: {
    async list() {
      await sleep(250)
      return readDocs()
    },
    async upload(file, handlers) {
      for (let p = 0; p <= 1; p += 0.25) {
        handlers?.onStage?.('uploading', p)
        await sleep(120)
      }
      handlers?.onStage?.('processing')
      const t0 = performance.now()
      await sleep(1100 + Math.random() * 900)
      const ext = (file.name.split('.').pop() ?? 'pdf').toLowerCase()
      const type = (['pdf', 'png', 'jpg', 'jpeg'].includes(ext) ? ext : 'pdf') as DocumentType
      const docs = readDocs()
      const nextId = docs.reduce((m, d) => Math.max(m, ...d.chunks.map((c) => c.id), 0), 0) + 1
      const count = 5 + (file.size % 6)
      const pages = type === 'pdf' ? Math.max(2, Math.ceil(count / 2)) : null
      const chunks = makeChunks(file.name, Array.from({ length: count }, (_, i) => (file.size + i * 3) % SAMPLE_PASSAGES.length), pages, nextId)
      const doc: Document = {
        id: `demo-${Date.now()}`, name: file.name, type, size: file.size, uploadedAt: new Date().toISOString(),
        status: 'ready', chunksCount: chunks.length, chunks, extractedChars: chunks.reduce((n, c) => n + c.text.length, 0),
        pagesCount: pages ?? undefined, processingMs: Math.round(performance.now() - t0),
      }
      writeDocs([doc, ...docs])
      return doc
    },
    async remove(id) {
      await sleep(150)
      writeDocs(readDocs().filter((d) => d.id !== id))
    },
  },

  research: {
    async ask({ query, documentIds, topK = 5 }): Promise<ResearchResponse> {
      const t0 = performance.now()
      await sleep(900 + Math.random() * 700)
      const docs = readDocs().filter((d) => documentIds.includes(d.id))
      const chunks = docs.flatMap((d) => d.chunks)
      if (!chunks.length) throw new ApiError('No documents indexed in engine.', 400)
      const q = words(query).filter((w) => !STOP.has(w))
      const ranked = chunks
        .map((c) => ({ c, s: overlap(q, c.text) }))
        .sort((a, b) => b.s - a.s)
      const top = ranked.slice(0, topK)
      const hasHit = top.some((r) => r.s > 0)
      const context = hasHit ? top.filter((r) => r.s > 0).map((r) => r.c) : []
      const answer = hasHit
        ? `Demo answer (not model-generated). The most relevant excerpts from the selected documents say:\n\n${context.slice(0, 2).map((c) => c.text).join('\n\n')}`
        : 'The information is not provided.'
      return {
        answer,
        grounded: hasHit,
        latencyMs: Math.round(performance.now() - t0),
        sources: context.map((c, i) => ({ label: `S${i + 1}`, chunkId: c.id, documentName: c.source, page: c.page, text: c.text })),
        retrieval: {
          bm25: { candidates: top.map((r) => ref(r.c, r.s)), queryTokens: q },
          faiss: { candidates: [] },
          context: { chunks: context.map((c) => ref(c)) },
        },
      }
    },
  },
}
