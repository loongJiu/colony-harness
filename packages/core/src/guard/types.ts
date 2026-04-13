export interface GuardContext {
  agentId: string
  taskId: string
  capability: string
}

export interface Guard {
  name: string
  checkInput?: (input: string, ctx: GuardContext) => Promise<string | null>
  checkOutput?: (output: string, ctx: GuardContext) => Promise<string | null>
}
