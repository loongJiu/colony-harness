export class HarnessError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message)
    this.name = 'HarnessError'
  }
}

export class ToolNotFoundError extends HarnessError {
  constructor(toolName: string) {
    super(`Tool "${toolName}" not found in registry`, 'TOOL_NOT_FOUND')
  }
}

export class ToolInputValidationError extends HarnessError {
  constructor(toolName: string, reason: string) {
    super(`Tool "${toolName}" input validation failed: ${reason}`, 'TOOL_INPUT_VALIDATION_FAILED')
  }
}

export class ToolOutputValidationError extends HarnessError {
  constructor(toolName: string, reason: string) {
    super(`Tool "${toolName}" output validation failed: ${reason}`, 'TOOL_OUTPUT_VALIDATION_FAILED')
  }
}

export class ToolApprovalDeniedError extends HarnessError {
  constructor(toolName: string) {
    super(`Tool "${toolName}" execution denied by approval policy`, 'TOOL_APPROVAL_DENIED')
  }
}

export class LoopMaxIterationsError extends HarnessError {
  constructor(maxIterations: number) {
    super(`Agentic loop reached max iterations: ${maxIterations}`, 'LOOP_MAX_ITERATIONS')
  }
}

export class LoopMaxTokensError extends HarnessError {
  constructor(maxTokens: number) {
    super(`Agentic loop reached max token budget: ${maxTokens}`, 'LOOP_MAX_TOKENS')
  }
}

export class GuardBlockedError extends HarnessError {
  constructor(stage: 'input' | 'output', reason: string) {
    super(`Guard blocked ${stage}: ${reason}`, 'GUARD_BLOCKED')
  }
}

export class MemoryAdapterError extends HarnessError {
  constructor(reason: string) {
    super(`Memory adapter error: ${reason}`, 'MEMORY_ADAPTER_ERROR')
  }
}
