#!/usr/bin/env node

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { readdir } from 'node:fs/promises'
import path from 'node:path'
import { spawnSync, execSync } from 'node:child_process'
import process from 'node:process'

const ROOT = process.cwd()
const PACKAGES_DIR = path.join(ROOT, 'packages')
const ROOT_PACKAGE_JSON = path.join(ROOT, 'package.json')
const CHANGELOG_PATH = path.join(ROOT, 'CHANGELOG.md')

const SEMVER_REGEX =
  /^\d+\.\d+\.\d+(?:-[0-9A-Za-z-.]+)?(?:\+[0-9A-Za-z-.]+)?$/

const usage = `
Usage:
  node scripts/release.mjs [options]

Options:
  --version <x.y.z>         Release specific version
  --bump <patch|minor|major>  Bump from current version (default: patch)
  --tag <npm-tag>           npm dist-tag (default: latest)
  --skip-checks             Skip build/typecheck/test checks
  --no-publish              Only update versions/changelog, do not publish
  --git-tag                 Create git tag v<version>
  --allow-dirty             Allow running with dirty git working tree
  --dry-run                 Show plan only (no file changes, no publish)
  -h, --help                Show this message

Examples:
  node scripts/release.mjs --bump patch
  node scripts/release.mjs --version 0.2.0 --tag next
  node scripts/release.mjs --bump minor --dry-run
`

function log(message) {
  console.log(`[release] ${message}`)
}

function fail(message) {
  console.error(`[release] ERROR: ${message}`)
  process.exit(1)
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: ROOT,
    stdio: 'inherit',
    ...options,
  })

  if (result.status !== 0) {
    fail(`Command failed: ${command} ${args.join(' ')}`)
  }
}

function parseArgs(argv) {
  const options = {
    version: undefined,
    bump: 'patch',
    tag: 'latest',
    skipChecks: false,
    noPublish: false,
    gitTag: false,
    allowDirty: false,
    dryRun: false,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]

    if (arg === '--') {
      continue
    }

    if (arg === '--version') {
      options.version = argv[index + 1]
      index += 1
      continue
    }

    if (arg === '--bump') {
      options.bump = argv[index + 1]
      index += 1
      continue
    }

    if (arg === '--tag') {
      options.tag = argv[index + 1]
      index += 1
      continue
    }

    if (arg === '--skip-checks') {
      options.skipChecks = true
      continue
    }

    if (arg === '--no-publish') {
      options.noPublish = true
      continue
    }

    if (arg === '--git-tag') {
      options.gitTag = true
      continue
    }

    if (arg === '--allow-dirty') {
      options.allowDirty = true
      continue
    }

    if (arg === '--dry-run') {
      options.dryRun = true
      continue
    }

    if (arg === '--help' || arg === '-h') {
      console.log(usage)
      process.exit(0)
    }

    fail(`Unknown argument: ${arg}`)
  }

  if (options.version && !SEMVER_REGEX.test(options.version)) {
    fail(`Invalid --version value: ${options.version}`)
  }

  if (!['patch', 'minor', 'major'].includes(options.bump)) {
    fail(`Invalid --bump value: ${options.bump}`)
  }

  if (!options.tag) {
    fail('--tag must not be empty')
  }

  return options
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'))
}

function writeJson(filePath, value) {
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

function bumpVersion(version, bumpType) {
  const [majorRaw, minorRaw, patchRaw] = version.split('.')
  const major = Number(majorRaw)
  const minor = Number(minorRaw)
  const patch = Number(patchRaw)

  if (Number.isNaN(major) || Number.isNaN(minor) || Number.isNaN(patch)) {
    fail(`Cannot bump invalid version: ${version}`)
  }

  if (bumpType === 'major') {
    return `${major + 1}.0.0`
  }

  if (bumpType === 'minor') {
    return `${major}.${minor + 1}.0`
  }

  return `${major}.${minor}.${patch + 1}`
}

function ensureCleanGit() {
  const status = execSync('git status --porcelain', {
    cwd: ROOT,
    encoding: 'utf8',
  }).trim()

  if (status) {
    fail('Working tree is dirty. Commit or stash changes, or pass --allow-dirty.')
  }
}

async function getPublishablePackages() {
  const entries = await readdir(PACKAGES_DIR, { withFileTypes: true })
  const result = []

  for (const entry of entries) {
    if (!entry.isDirectory()) continue

    const packageJsonPath = path.join(PACKAGES_DIR, entry.name, 'package.json')
    if (!existsSync(packageJsonPath)) continue

    const pkg = readJson(packageJsonPath)
    if (pkg.private) continue

    result.push({
      name: pkg.name,
      dir: path.dirname(packageJsonPath),
      packageJsonPath,
      json: pkg,
    })
  }

  result.sort((left, right) => {
    if (left.name === 'colony-harness') return -1
    if (right.name === 'colony-harness') return 1
    return left.name.localeCompare(right.name)
  })

  return result
}

function updateChangelog(targetVersion) {
  const today = new Date().toISOString().slice(0, 10)
  const sectionTitle = `## [${targetVersion}] - ${today}`
  const template = `${sectionTitle}\n\n### Changed\n\n- TBD\n\n`

  if (!existsSync(CHANGELOG_PATH)) {
    writeFileSync(CHANGELOG_PATH, `# Changelog\n\n${template}`, 'utf8')
    return
  }

  const current = readFileSync(CHANGELOG_PATH, 'utf8')
  if (current.includes(sectionTitle)) {
    return
  }

  const markerIndex = current.indexOf('## [')

  if (markerIndex === -1) {
    writeFileSync(CHANGELOG_PATH, `${current.trimEnd()}\n\n${template}`, 'utf8')
    return
  }

  const next = `${current.slice(0, markerIndex)}${template}${current.slice(markerIndex)}`
  writeFileSync(CHANGELOG_PATH, next, 'utf8')
}

function updateRootVersion(targetVersion) {
  const rootPkg = readJson(ROOT_PACKAGE_JSON)
  rootPkg.version = targetVersion
  writeJson(ROOT_PACKAGE_JSON, rootPkg)
}

function updateWorkspaceVersions(packages, targetVersion) {
  for (const pkg of packages) {
    const content = readJson(pkg.packageJsonPath)
    content.version = targetVersion
    writeJson(pkg.packageJsonPath, content)
  }
}

function publishPackages(packages, tag, targetVersion) {
  for (const pkg of packages) {
    log(`Publishing ${pkg.name}@${targetVersion} with tag '${tag}'`)
    run('pnpm', [
      '--filter',
      pkg.name,
      'publish',
      '--access',
      'public',
      '--tag',
      tag,
      '--no-git-checks',
    ])
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  const publishablePackages = await getPublishablePackages()

  if (publishablePackages.length === 0) {
    fail('No publishable package found under packages/*')
  }

  const currentVersion = publishablePackages[0].json.version
  const targetVersion = options.version ?? bumpVersion(currentVersion, options.bump)

  if (targetVersion === currentVersion) {
    fail(`Target version equals current version (${currentVersion}).`)
  }

  if (!options.allowDirty) {
    ensureCleanGit()
  }

  log(`Current version: ${currentVersion}`)
  log(`Target version:  ${targetVersion}`)
  log(`Packages: ${publishablePackages.map((pkg) => pkg.name).join(', ')}`)

  if (options.dryRun) {
    log('Dry-run mode enabled. No file changes or publish actions were performed.')
    return
  }

  if (!options.skipChecks) {
    log('Running release checks: build -> typecheck -> test')
    run('pnpm', ['build'])
    run('pnpm', ['typecheck'])
    run('pnpm', ['test'])
  } else {
    log('Skipping release checks (--skip-checks).')
  }

  log('Updating versions and changelog...')
  updateRootVersion(targetVersion)
  updateWorkspaceVersions(publishablePackages, targetVersion)
  updateChangelog(targetVersion)

  if (!options.noPublish) {
    publishPackages(publishablePackages, options.tag, targetVersion)
  } else {
    log('Skipping npm publish (--no-publish).')
  }

  if (options.gitTag) {
    const tagName = `v${targetVersion}`
    log(`Creating git tag: ${tagName}`)
    run('git', ['tag', tagName])
  }

  log('Release script finished successfully.')
  log('Next steps: review changed files, commit, push, and create GitHub Release if needed.')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
