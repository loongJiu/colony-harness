import type { AgenticLoopConfig } from '../loop/types.js'
import type { MemoryManagerConfig } from '../memory/types.js'

export interface HarnessConfig {
  loop: AgenticLoopConfig
  memory: MemoryManagerConfig
  defaultSystemPrompt: string
}
