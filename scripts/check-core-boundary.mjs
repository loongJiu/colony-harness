import { readdir, readFile } from 'node:fs/promises'
import { dirname, extname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(__dirname, '..')
const corePackageJsonPath = join(repoRoot, 'packages/core/package.json')
const coreSrcPath = join(repoRoot, 'packages/core/src')

const forbiddenDependencyPatterns = [
  /^colony-bee-sdk$/,
  /^@colony-harness\/controlplane-/,
]

const forbiddenImportPatterns = [
  /^colony-bee-sdk$/,
  /^@colony-harness\/controlplane-/,
]

const isForbidden = (patterns, value) => patterns.some((pattern) => pattern.test(value))

const collectFiles = async (dir) => {
  const entries = await readdir(dir, { withFileTypes: true })
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = join(dir, entry.name)
      if (entry.isDirectory()) return collectFiles(fullPath)
      if (!['.ts', '.tsx', '.js', '.mjs'].includes(extname(entry.name))) return []
      return [fullPath]
    }),
  )
  return files.flat()
}

const readPackageDependencies = (pkg) => ({
  ...pkg.dependencies,
  ...pkg.peerDependencies,
  ...pkg.optionalDependencies,
  ...pkg.devDependencies,
})

const importPattern = /(?:import|export)\s+(?:[^'"]*?\s+from\s+)?['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g

const main = async () => {
  const failures = []

  const corePackageJson = JSON.parse(await readFile(corePackageJsonPath, 'utf8'))
  const dependencies = readPackageDependencies(corePackageJson)

  for (const depName of Object.keys(dependencies)) {
    if (isForbidden(forbiddenDependencyPatterns, depName)) {
      failures.push(`forbidden dependency in packages/core/package.json: ${depName}`)
    }
  }

  const sourceFiles = await collectFiles(coreSrcPath)
  for (const filePath of sourceFiles) {
    const content = await readFile(filePath, 'utf8')
    for (const match of content.matchAll(importPattern)) {
      const specifier = match[1] ?? match[2]
      if (!specifier) continue
      if (isForbidden(forbiddenImportPatterns, specifier)) {
        failures.push(`forbidden import in ${filePath.replace(`${repoRoot}/`, '')}: ${specifier}`)
      }
    }
  }

  if (failures.length > 0) {
    console.error('[check:core-boundary] failed')
    for (const failure of failures) {
      console.error(`- ${failure}`)
    }
    process.exit(1)
  }

  console.log('[check:core-boundary] passed')
}

await main()
