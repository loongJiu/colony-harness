import { GuardBlockedError } from '../errors/index.js'
import type { Guard, GuardContext } from './types.js'

export class Guardrails {
  constructor(private readonly guards: Guard[] = []) {}

  async checkInput(input: string, ctx: GuardContext): Promise<void> {
    for (const guard of this.guards) {
      if (!guard.checkInput) continue
      const reason = await guard.checkInput(input, ctx)
      if (reason) {
        throw new GuardBlockedError('input', `[${guard.name}] ${reason}`)
      }
    }
  }

  async checkOutput(output: string, ctx: GuardContext): Promise<string> {
    let nextOutput = output

    for (const guard of this.guards) {
      if (!guard.checkOutput) continue
      const result = await guard.checkOutput(nextOutput, ctx)
      if (result === null) {
        throw new GuardBlockedError('output', `[${guard.name}] output rejected`)
      }
      nextOutput = result
    }

    return nextOutput
  }
}
