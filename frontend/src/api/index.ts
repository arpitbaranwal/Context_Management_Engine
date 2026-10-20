import { API_BASE_URL } from './client'
import { liveAdapter } from './adapters/live'
import { mockAdapter } from './adapters/mock'
import type { ApiAdapter } from './types'

/** Live when VITE_API_BASE_URL is set, otherwise the development mock. */
export const adapter: ApiAdapter = API_BASE_URL ? liveAdapter : mockAdapter
export const isMock = adapter.mode === 'mock'
