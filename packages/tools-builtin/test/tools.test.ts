import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  calculatorTool,
  createReadFileTool,
  createRunCommandTool,
  createWriteFileTool,
  jsonQueryTool,
  templateRenderTool,
} from '../src/index.js'

const fakeContext = {
  taskId: 'task',
  agentId: 'agent',
  messages: [],
  logger: {
    debug() {},
    info() {},
    warn() {},
    error() {},
  },
}

describe('tools-builtin', () => {
  it('evaluates calculator expression', async () => {
    const result = await calculatorTool.execute({ expression: '1 + 2 * (3 + 4)' }, fakeContext)
    expect(result).toEqual({ value: 15 })
  })

  it('queries json path', async () => {
    const result = await jsonQueryTool.execute(
      {
        data: { user: { profile: [{ name: 'alice' }] } },
        query: '$.user.profile[0].name',
      },
      fakeContext,
    )

    expect(result).toEqual({ value: 'alice', found: true })
  })

  it('renders template placeholders', async () => {
    const result = await templateRenderTool.execute(
      {
        template: 'Hello {{user.name}}, role={{user.role}}',
        data: { user: { name: 'Colony', role: 'maintainer' } },
      },
      fakeContext,
    )

    expect(result.output).toContain('Hello Colony')
    expect(result.output).toContain('role=maintainer')
  })

  it('writes and reads file within base dir', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'colony-tools-'))
    const writeTool = createWriteFileTool({ baseDir: dir })
    const readTool = createReadFileTool({ baseDir: dir })

    await writeTool.execute(
      {
        filePath: 'notes/a.txt',
        content: 'hello from tools-builtin',
      },
      fakeContext,
    )

    const readResult = await readTool.execute(
      {
        filePath: 'notes/a.txt',
      },
      fakeContext,
    )

    expect(readResult.content).toBe('hello from tools-builtin')

    const diskContent = await readFile(path.join(dir, 'notes/a.txt'), 'utf8')
    expect(diskContent).toBe('hello from tools-builtin')
  })

  it('blocks non-allowlisted commands by default', async () => {
    const runTool = createRunCommandTool()

    await expect(
      runTool.execute(
        {
          command: 'echo',
          args: ['hello'],
        },
        fakeContext,
      ),
    ).rejects.toThrow('Command is not allowed: echo')
  })

  it('executes command when explicitly allowlisted', async () => {
    const runTool = createRunCommandTool({
      allowedCommands: ['node'],
    })

    const result = await runTool.execute(
      {
        command: 'node',
        args: ['-e', 'process.stdout.write(\"ok\")'],
      },
      fakeContext,
    )

    expect(result).toMatchObject({
      code: 0,
      stdout: 'ok',
    })
    expect((result as { audit?: { riskLevel?: string } }).audit?.riskLevel).toBe('medium')
  })

  it('adds audit metadata and supports approval callback for risky commands', async () => {
    const approvals: Array<{ command: string; riskLevel: string }> = []
    const runTool = createRunCommandTool({
      allowedCommands: ['node'],
      approvalByRisk: {
        requiredFrom: 'medium',
        callback: async ({ command, riskLevel }) => {
          approvals.push({ command, riskLevel })
          return true
        },
      },
    })

    const result = await runTool.execute(
      {
        command: 'node',
        args: ['-e', 'process.stdout.write(\"audit\")'],
      },
      fakeContext,
    )

    expect(approvals).toEqual([{ command: 'node', riskLevel: 'medium' }])
    expect(result).toMatchObject({
      code: 0,
      stdout: 'audit',
    })
    expect((result as { audit?: { command?: string; riskLevel?: string } }).audit).toMatchObject({
      command: 'node',
      riskLevel: 'medium',
    })
  })

  it('rejects command when approval callback denies execution', async () => {
    const runTool = createRunCommandTool({
      allowedCommands: ['node'],
      approvalByRisk: {
        requiredFrom: 'medium',
        callback: async () => false,
      },
    })

    await expect(
      runTool.execute(
        {
          command: 'node',
          args: ['-e', 'process.stdout.write(\"blocked\")'],
        },
        fakeContext,
      ),
    ).rejects.toThrow('Command approval rejected')
  })
})
