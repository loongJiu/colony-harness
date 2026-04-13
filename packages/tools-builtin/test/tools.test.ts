import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  calculatorTool,
  createReadFileTool,
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
})
