import { zodToJsonSchema } from 'zod-to-json-schema'
import type { ZodError } from 'zod'
import {
  ToolApprovalDeniedError,
  ToolInputValidationError,
  ToolNotFoundError,
  ToolOutputValidationError,
} from '../errors/index.js'
import { withTimeout } from '../utils/timeout.js'
import type { ApprovalCallback, ToolDefinition, ToolExecutionContext, ToolSchema } from './types.js'

const zodErrorToMessage = (error: ZodError): string =>
  error.issues.map((issue) => `${issue.path.join('.') || '<root>'}: ${issue.message}`).join('; ')

export class ToolRegistry {
  private tools = new Map<string, ToolDefinition<any, any>>()
  private approvalCallback?: ApprovalCallback

  register<TInput, TOutput>(tool: ToolDefinition<TInput, TOutput>): this {
    if (this.tools.has(tool.id)) {
      throw new Error(`Tool "${tool.id}" already registered`)
    }

    if (!tool.inputSchema || !tool.description) {
      throw new Error(`Tool "${tool.id}" must include inputSchema and description`)
    }

    this.tools.set(tool.id, tool as ToolDefinition<any, any>)
    return this
  }

  registerMany(tools: ToolDefinition<any, any>[]): this {
    for (const tool of tools) {
      this.register(tool)
    }
    return this
  }

  setApprovalCallback(callback: ApprovalCallback): this {
    this.approvalCallback = callback
    return this
  }

  async invoke(name: string, rawInput: unknown, ctx: ToolExecutionContext): Promise<unknown> {
    const tool = this.tools.get(name)
    if (!tool) {
      throw new ToolNotFoundError(name)
    }

    const parsed = tool.inputSchema.safeParse(rawInput)
    if (!parsed.success) {
      throw new ToolInputValidationError(name, zodErrorToMessage(parsed.error))
    }

    if (tool.requiresApproval && this.approvalCallback) {
      const approved = await this.approvalCallback(name, parsed.data)
      if (!approved) {
        throw new ToolApprovalDeniedError(name)
      }
    }

    const timeout = tool.timeout ?? 30_000
    const output = await withTimeout(
      () => tool.execute(parsed.data, ctx),
      timeout,
      `Tool "${name}" timed out after ${timeout}ms`,
    )

    if (tool.outputSchema) {
      const outResult = tool.outputSchema.safeParse(output)
      if (!outResult.success) {
        throw new ToolOutputValidationError(name, zodErrorToMessage(outResult.error))
      }
    }

    return output
  }

  getSchemas(filter?: { tags?: string[]; accessLevel?: string }): ToolSchema[] {
    return Array.from(this.tools.values())
      .filter((tool) => {
        if (!filter) {
          return true
        }

        if (filter.accessLevel && tool.accessLevel !== filter.accessLevel) {
          return false
        }

        if (filter.tags?.length) {
          const tags = tool.tags ?? []
          return filter.tags.every((tag) => tags.includes(tag))
        }

        return true
      })
      .map((tool) => {
        const schema = zodToJsonSchema(tool.inputSchema, {
          target: 'jsonSchema7',
        }) as {
          properties?: Record<string, unknown>
          required?: string[]
        }

        return {
          name: tool.id,
          description: tool.description,
          parameters: {
            type: 'object',
            properties: schema.properties ?? {},
            required: schema.required ?? [],
          },
        }
      })
  }

  has(name: string): boolean {
    return this.tools.has(name)
  }
}
