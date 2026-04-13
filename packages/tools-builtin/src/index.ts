import { spawn } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { z } from 'zod'
import type { ToolDefinition } from 'colony-harness'

interface SafetyPathOptions {
  baseDir?: string
  allowOutsideBaseDir?: boolean
}

const resolveSafePath = (inputPath: string, options: SafetyPathOptions = {}): string => {
  const baseDir = path.resolve(options.baseDir ?? process.cwd())
  const resolved = path.resolve(baseDir, inputPath)

  if (!options.allowOutsideBaseDir && !resolved.startsWith(baseDir)) {
    throw new Error(`Path is outside base dir: ${inputPath}`)
  }

  return resolved
}

const asRecord = (value: unknown): Record<string, unknown> | null => {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

const parseJsonPath = (query: string): Array<string | number> => {
  const normalized = query.trim().replace(/^\$\.?/, '')
  if (!normalized) return []

  const tokens: Array<string | number> = []
  for (const segment of normalized.split('.')) {
    const regex = /([^[\]]+)|(\[(\d+)\])/g
    let match: RegExpExecArray | null
    while ((match = regex.exec(segment)) !== null) {
      if (match[1]) {
        tokens.push(match[1])
      } else if (match[3]) {
        tokens.push(Number(match[3]))
      }
    }
  }

  return tokens
}

const queryJson = (data: unknown, query: string): unknown => {
  const tokens = parseJsonPath(query)
  let current: unknown = data

  for (const token of tokens) {
    if (typeof token === 'number') {
      if (!Array.isArray(current)) return undefined
      current = current[token]
      continue
    }

    const record = asRecord(current)
    if (!record) return undefined
    current = record[token]
  }

  return current
}

const interpolateTemplate = (template: string, data: unknown): string => {
  return template.replace(/\{\{\s*([\w.$\[\]]+)\s*\}\}/g, (_full, key) => {
    const value = queryJson(data, String(key))
    if (value === undefined || value === null) return ''
    return typeof value === 'string' ? value : JSON.stringify(value)
  })
}

const headersToRecord = (headers: Headers): Record<string, string> => {
  const result: Record<string, string> = {}
  headers.forEach((value, key) => {
    result[key] = value
  })
  return result
}

const calculatorInputSchema = z.object({
  expression: z.string().min(1),
})

const jsonValueSchema: z.ZodType<unknown> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonValueSchema),
    z.record(jsonValueSchema),
  ]),
)

export const calculatorTool: ToolDefinition<{ expression: string }, { value: number }> = {
  id: 'calculator',
  description: 'Evaluate a math expression with + - * / % ^ and parentheses',
  inputSchema: calculatorInputSchema,
  outputSchema: z.object({ value: z.number() }),
  execute: async ({ expression }) => {
    const normalized = expression.replace(/\^/g, '**').trim()

    if (!/^[\d+\-*/%().\s*]+$/.test(normalized)) {
      throw new Error('Expression contains unsupported characters')
    }

    // Expression is strictly filtered to arithmetic characters before evaluation.
    const fn = new Function(`"use strict"; return (${normalized});`)
    const result = fn()

    if (typeof result !== 'number' || Number.isNaN(result) || !Number.isFinite(result)) {
      throw new Error('Expression did not evaluate to a finite number')
    }

    return { value: result }
  },
}

const jsonQueryInputSchema = z.object({
  data: jsonValueSchema,
  query: z.string().min(1),
})

export const jsonQueryTool: ToolDefinition = {
  id: 'json_query',
  description: 'Query JSON data by a simple JSONPath-like syntax such as $.a.b[0].c',
  inputSchema: jsonQueryInputSchema,
  outputSchema: z.object({
    value: jsonValueSchema.nullable(),
    found: z.boolean(),
  }),
  execute: async (rawInput) => {
    const { data, query } = jsonQueryInputSchema.parse(rawInput)
    const value = queryJson(data, query)
    return {
      value: value === undefined ? null : value,
      found: value !== undefined,
    }
  },
}

const templateRenderInputSchema = z.object({
  template: z.string(),
  data: jsonValueSchema,
})

export const templateRenderTool: ToolDefinition = {
  id: 'template_render',
  description: 'Render a template with {{path}} placeholders from JSON data',
  inputSchema: templateRenderInputSchema,
  outputSchema: z.object({ output: z.string() }),
  execute: async (rawInput) => {
    const { template, data } = templateRenderInputSchema.parse(rawInput)
    return {
      output: interpolateTemplate(template, data),
    }
  },
}

export interface FileToolOptions extends SafetyPathOptions {}

const createReadFileInputSchema = () =>
  z.object({
    filePath: z.string().min(1),
    encoding: z.string().default('utf8'),
  })

export const createReadFileTool = (options: FileToolOptions = {}): ToolDefinition => ({
  id: 'read_file',
  description: 'Read local file content',
  inputSchema: createReadFileInputSchema(),
  execute: async (input) => {
    const parsed = createReadFileInputSchema().parse(input)
    const filePath = resolveSafePath(parsed.filePath, options)
    const content = await readFile(filePath, parsed.encoding as BufferEncoding)
    return {
      filePath,
      content,
      size: Buffer.byteLength(content),
    }
  },
})

const createWriteFileInputSchema = () =>
  z.object({
    filePath: z.string().min(1),
    content: z.string(),
    append: z.boolean().default(false),
    createDir: z.boolean().default(true),
  })

export const createWriteFileTool = (options: FileToolOptions = {}): ToolDefinition => ({
  id: 'write_file',
  description: 'Write content to local file',
  inputSchema: createWriteFileInputSchema(),
  execute: async (input) => {
    const parsed = createWriteFileInputSchema().parse(input)
    const filePath = resolveSafePath(parsed.filePath, options)

    if (parsed.createDir) {
      await mkdir(path.dirname(filePath), { recursive: true })
    }

    if (parsed.append) {
      const existing = await readFile(filePath, 'utf8').catch(() => '')
      await writeFile(filePath, `${existing}${parsed.content}`, 'utf8')
    } else {
      await writeFile(filePath, parsed.content, 'utf8')
    }

    return {
      filePath,
      bytesWritten: Buffer.byteLength(parsed.content),
      append: parsed.append,
    }
  },
})

export interface RunCommandToolOptions {
  allowShell?: boolean
  allowedCommands?: string[]
  blockedCommands?: string[]
  defaultTimeoutMs?: number
}

const runCommandInputSchema = z.object({
  command: z.string().min(1),
  args: z.array(z.string()).default([]),
  cwd: z.string().optional(),
  timeoutMs: z.number().int().positive().max(120_000).default(15_000),
  env: z.record(z.string()).optional(),
})

export const createRunCommandTool = (
  options: RunCommandToolOptions = {},
): ToolDefinition => ({
  id: 'run_command',
  description: 'Run shell command in a constrained process',
  inputSchema: runCommandInputSchema,
  execute: async (rawInput) => {
    const input = runCommandInputSchema.parse(rawInput)
    const blocked = new Set([...(options.blockedCommands ?? ['rm', 'mkfs', 'shutdown'])])

    if (blocked.has(input.command)) {
      throw new Error(`Command is blocked: ${input.command}`)
    }

    if (options.allowedCommands?.length && !options.allowedCommands.includes(input.command)) {
      throw new Error(`Command is not allowed: ${input.command}`)
    }

    return new Promise((resolve, reject) => {
      const child = spawn(input.command, input.args, {
        cwd: input.cwd ? path.resolve(input.cwd) : process.cwd(),
        shell: options.allowShell ?? false,
        env: {
          ...process.env,
          ...(input.env ?? {}),
        },
      })

      let stdout = ''
      let stderr = ''

      child.stdout.on('data', (chunk: Buffer) => {
        stdout += chunk.toString('utf8')
      })

      child.stderr.on('data', (chunk: Buffer) => {
        stderr += chunk.toString('utf8')
      })

      const timeout = setTimeout(() => {
        child.kill('SIGTERM')
        reject(new Error(`Command timed out after ${input.timeoutMs}ms`))
      }, input.timeoutMs || options.defaultTimeoutMs || 15_000)

      child.on('error', (error) => {
        clearTimeout(timeout)
        reject(error)
      })

      child.on('close', (code) => {
        clearTimeout(timeout)
        resolve({
          code: code ?? -1,
          stdout,
          stderr,
        })
      })
    })
  },
})

const httpRequestInputSchema = z.object({
  url: z.string().url(),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']).default('GET'),
  headers: z.record(z.string()).optional(),
  body: z.union([z.string(), z.record(z.unknown())]).optional(),
  timeoutMs: z.number().int().positive().max(120_000).default(20_000),
  maxBodyChars: z.number().int().positive().max(1_000_000).default(10_000),
})

export const httpRequestTool: ToolDefinition = {
  id: 'http_request',
  description: 'Make an HTTP request and return status, headers, and response body',
  inputSchema: httpRequestInputSchema,
  execute: async (rawInput) => {
    const input = httpRequestInputSchema.parse(rawInput)
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), input.timeoutMs)

    try {
      const bodyValue =
        typeof input.body === 'string'
          ? input.body
          : input.body
            ? JSON.stringify(input.body)
            : undefined

      const response = await fetch(input.url, {
        method: input.method,
        headers: {
          ...(input.body && typeof input.body !== 'string' ? { 'content-type': 'application/json' } : {}),
          ...(input.headers ?? {}),
        },
        body: bodyValue,
        signal: controller.signal,
      })

      const text = await response.text()
      const limitedBody = text.length > input.maxBodyChars ? `${text.slice(0, input.maxBodyChars)}...` : text
      const contentType = response.headers.get('content-type') || ''

      let json: unknown = undefined
      if (contentType.includes('application/json')) {
        try {
          json = JSON.parse(limitedBody)
        } catch {
          json = undefined
        }
      }

      return {
        status: response.status,
        ok: response.ok,
        headers: headersToRecord(response.headers),
        body: limitedBody,
        json,
      }
    } finally {
      clearTimeout(timer)
    }
  },
}

export interface SearchResult {
  title: string
  url: string
  snippet?: string
}

export interface SearchWebProvider {
  search(query: string, limit: number): Promise<SearchResult[]>
}

export class DuckDuckGoProvider implements SearchWebProvider {
  async search(query: string, limit: number): Promise<SearchResult[]> {
    const url = new URL('https://api.duckduckgo.com/')
    url.searchParams.set('q', query)
    url.searchParams.set('format', 'json')
    url.searchParams.set('no_html', '1')
    url.searchParams.set('skip_disambig', '1')

    const response = await fetch(url.toString())
    if (!response.ok) {
      throw new Error(`DuckDuckGo request failed: ${response.status}`)
    }

    const payload = (await response.json()) as {
      Heading?: string
      AbstractURL?: string
      AbstractText?: string
      RelatedTopics?: Array<{ Text?: string; FirstURL?: string }>
    }

    const results: SearchResult[] = []

    if (payload.AbstractURL && payload.AbstractText) {
      results.push({
        title: payload.Heading || 'DuckDuckGo Result',
        url: payload.AbstractURL,
        snippet: payload.AbstractText,
      })
    }

    for (const topic of payload.RelatedTopics ?? []) {
      if (!topic.FirstURL) continue
      results.push({
        title: topic.Text?.slice(0, 80) || 'Related Topic',
        url: topic.FirstURL,
        snippet: topic.Text,
      })

      if (results.length >= limit) break
    }

    return results.slice(0, limit)
  }
}

const searchWebInputSchema = z.object({
  query: z.string().min(1),
  limit: z.number().int().positive().max(10).default(5),
})

export const createSearchWebTool = (provider: SearchWebProvider = new DuckDuckGoProvider()): ToolDefinition => ({
  id: 'search_web',
  description: 'Search the web and return relevant results',
  inputSchema: searchWebInputSchema,
  execute: async (rawInput) => {
    const input = searchWebInputSchema.parse(rawInput)
    const results = await provider.search(input.query, input.limit)
    return {
      query: input.query,
      results,
    }
  },
})

export const createBuiltinTools = (options?: {
  file?: FileToolOptions
  runCommand?: RunCommandToolOptions
  searchProvider?: SearchWebProvider
}): Array<ToolDefinition<any, unknown>> => [
  httpRequestTool,
  createReadFileTool(options?.file),
  createWriteFileTool(options?.file),
  createRunCommandTool(options?.runCommand),
  createSearchWebTool(options?.searchProvider),
  calculatorTool,
  jsonQueryTool,
  templateRenderTool,
]
