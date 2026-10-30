/**
 * Typed contract between the React UI and the backend.
 * Optional fields are things try.py does not produce today; the UI renders
 * them only when the backend actually supplies them.
 */

export interface User {
  id: string
  name: string
  email: string
}

export interface AuthSession {
  user: User
  token: string
}

export type DocumentStatus = 'processing' | 'ready' | 'failed'
export type DocumentType = 'pdf' | 'png' | 'jpg' | 'jpeg'

export interface Chunk {
  id: number
  source: string
  text: string
  /** Not produced by try.py. Shown only when present. */
  page?: number
}

export interface Document {
  id: string
  name: string
  type: DocumentType
  size: number
  uploadedAt: string
  status: DocumentStatus
  chunksCount: number
  chunks: Chunk[]
  extractedChars?: number
  /** Exact page count. Omit if the backend cannot report it exactly. */
  pagesCount?: number
  /** Wall-clock extract + chunk + index time, measured by the backend. */
  processingMs?: number
  error?: string
}

/** The backend does extraction, chunking and indexing in one request, so the UI tracks two real phases. */
export type UploadStage = 'uploading' | 'processing'

export interface UploadHandlers {
  onStage?: (stage: UploadStage, progress?: number) => void
}

export interface ChatHistoryMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ResearchRequest {
  query: string
  documentIds: string[]
  topK?: number
  history?: ChatHistoryMessage[]
  signal?: AbortSignal
}

export interface Source {
  /** "S1", "S2", ... in context order. */
  label: string
  chunkId: number
  documentName: string
  page?: number
  text: string
}

export interface RetrievalCandidate {
  chunkId: number
  source: string
  page?: number
  /** BM25 score. Present only when the backend reports it. */
  score?: number
  /** FAISS L2 distance. Present only when the backend reports it. */
  distance?: number
}

export interface RetrievalDetails {
  bm25: { candidates: RetrievalCandidate[]; queryTokens?: string[] }
  faiss: { candidates: RetrievalCandidate[] }
  /** Chunks actually sent to the model (union of both lists). */
  context: { chunks: RetrievalCandidate[] }
  latencyMs?: number
}

export interface TelemetryDecision {
  status: 'PROCEED' | 'ABSTAIN_LOW_CONFIDENCE' | string
  confidenceScore: number
  reason?: string
}

export interface TelemetryActiveSlot {
  chunkId: string
  page?: number
  header?: string
  isPinned?: boolean
  tokenCount?: number
  source?: string
}

export interface TelemetryWorkingMemory {
  usedTokens: number
  maxTokens: number
  activeSlotsCount: number
  evictionsCount: number
  activeSlots?: TelemetryActiveSlot[]
}

export interface TelemetryRetrieval {
  latencyMs: number
  selectedChunksCount: number
  originalQuery: string
  expandedQuery?: string
  subQueries?: string[]
}

export interface TelemetryData {
  decision: TelemetryDecision
  retrieval: TelemetryRetrieval
  workingMemory: TelemetryWorkingMemory
}

export interface SystemTelemetry {
  workingMemory: TelemetryWorkingMemory
  lastTelemetry?: TelemetryData | null
}

export interface ResearchResponse {
  answer: string
  sources: Source[]
  /** false when the model replied that the information is not provided. */
  grounded?: boolean
  latencyMs?: number
  retrieval?: RetrievalDetails
  telemetry?: TelemetryData
}

export interface HealthStatus {
  ok: boolean
  engineLoaded?: boolean
}

/** Every method the UI needs. Mock and live adapters both implement this. */
export interface ApiAdapter {
  mode: 'mock' | 'live'
  health(): Promise<HealthStatus>
  auth: {
    login(email: string, password: string): Promise<AuthSession>
    register(name: string, email: string, password: string): Promise<AuthSession>
    logout(): Promise<void>
    getCurrentUser(): Promise<User | null>
  }
  documents: {
    list(): Promise<Document[]>
    upload(file: File, handlers?: UploadHandlers): Promise<Document>
    remove(id: string): Promise<void>
  }
  research: {
    ask(req: ResearchRequest): Promise<ResearchResponse>
    getTelemetry?(): Promise<SystemTelemetry>
  }
}
