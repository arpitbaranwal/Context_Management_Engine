import { liveAdapter } from './adapters/live'
import { mockAdapter } from './adapters/mock'
import type { ApiAdapter } from './types'

/** Defaults to liveAdapter (routed via Vite proxy or direct base URL), unless VITE_USE_MOCK is explicitly true. */
const useMock = import.meta.env.VITE_USE_MOCK === 'true'
export const adapter: ApiAdapter = useMock ? mockAdapter : liveAdapter
export const isMock = adapter.mode === 'mock'
