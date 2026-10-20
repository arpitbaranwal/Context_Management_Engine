import { adapter } from './index'
import type { ResearchRequest } from './types'

export const askQuestion = (req: ResearchRequest) => adapter.research.ask(req)
export const checkHealth = () => adapter.health()
