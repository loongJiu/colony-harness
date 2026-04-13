import { mkdir, appendFile } from 'node:fs/promises'
import path from 'node:path'
import type { CompletedTrace, TraceExporter } from 'colony-harness'

export interface FileTraceExporterOptions {
  filePath: string
  pretty?: boolean
}

export class FileTraceExporter implements TraceExporter {
  constructor(private readonly options: FileTraceExporterOptions) {}

  async export(trace: CompletedTrace): Promise<void> {
    const target = this.options.filePath
    await mkdir(path.dirname(target), { recursive: true })

    const payload = this.options.pretty
      ? `${JSON.stringify(trace, null, 2)}\n`
      : `${JSON.stringify(trace)}\n`

    await appendFile(target, payload, 'utf8')
  }
}
