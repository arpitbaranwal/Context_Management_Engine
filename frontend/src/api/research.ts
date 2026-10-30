import { adapter } from './index'
import type { ResearchRequest } from './types'

export const askQuestion = (req: ResearchRequest) => adapter.research.ask(req)
export const fetchTelemetry = () => (adapter.research.getTelemetry ? adapter.research.getTelemetry() : Promise.resolve(null))
export const checkHealth = () => adapter.health()
