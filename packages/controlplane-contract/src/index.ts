export interface TaskEnvelope {
  taskId: string
  capability: string
  input: unknown
  agentId?: string
  sessionId?: string
  constraints?: {
    timeoutMs?: number
  }
  metadata?: Record<string, unknown>
}

export interface TaskCancelSignal {
  taskId: string
  reason?: string
  metadata?: Record<string, unknown>
}

export interface TaskProgressEvent {
  taskId: string
  percent: number
  message?: string
  timestamp?: string
  metadata?: Record<string, unknown>
}

export interface TaskExecutionMetrics {
  durationMs?: number
  inputTokens?: number
  outputTokens?: number
  totalTokens?: number
  iterations?: number
}

export interface TaskErrorEnvelope {
  code: string
  message: string
  retryable: boolean
  metadata?: Record<string, unknown>
}

export interface TaskResultEnvelope {
  taskId: string
  capability: string
  status: 'success' | 'failure'
  output?: unknown
  summary?: string
  metrics?: TaskExecutionMetrics
  error?: TaskErrorEnvelope
  metadata?: Record<string, unknown>
}

export interface HealthStatusEvent {
  state: 'healthy' | 'degraded' | 'unhealthy'
  activeTasks: number
  queueDepth: number
  load: number
  timestamp: string
  metadata?: Record<string, unknown>
}

export type TaskAssignHandler = (task: TaskEnvelope) => Promise<TaskResultEnvelope | void> | TaskResultEnvelope | void

export type TaskCancelHandler = (signal: TaskCancelSignal) => Promise<void> | void

export interface ControlPlanePort {
  start(): Promise<void>
  stop(): Promise<void>
  onTaskAssign(handler: TaskAssignHandler): void
  onTaskCancel(handler: TaskCancelHandler): void
  reportProgress(event: TaskProgressEvent): Promise<void>
  reportResult(result: TaskResultEnvelope): Promise<void>
  reportHealth(status: HealthStatusEvent): Promise<void>
}
