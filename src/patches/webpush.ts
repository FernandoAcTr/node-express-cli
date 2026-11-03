import fs from 'fs'
import path from 'path'
import { PatchResult, patchAtAnchor } from '../patch/anchor'

export interface WirePushOptions {
  main?: boolean
  config?: boolean
  env?: boolean
  script?: boolean
  /** Package runner used inside the generated scripts, e.g. npx, pnpm dlx. */
  packageRunner?: string
  /** Project root. Defaults to process.cwd(). */
  cwd?: string
}

export interface WirePushResult {
  changed: string[]
  skipped: string[]
  warnings: string[]
}

const WEB_PUSH_IMPORT = "import webpush from 'web-push'"

const VAPID_CONFIG = `  VAPID: {
    PUBLIC_KEY: process.env.VAPID_PUBLIC_KEY,
    PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY,
    SUBJECT: process.env.VAPID_SUBJECT || 'mailto:support@example.com',
  },
`

const VAPID_RUNTIME = `// webpush
if (config.VAPID.PRIVATE_KEY && config.VAPID.PUBLIC_KEY) {
  webpush.setVapidDetails(config.VAPID.SUBJECT, config.VAPID.PUBLIC_KEY, config.VAPID.PRIVATE_KEY)
} else {
  logger.warn('VAPID keys not configured — push notifications disabled')
}`

const VAPID_ENV = `
# Webpush notifications. Generate keys with: <runner> web-push generate-vapid-keys
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:support@example.com
`

function wireMain(result: WirePushResult, cwd: string): void {
  const mainFile = path.resolve(cwd, 'src/main.ts')

  const importPatch = patchAtAnchor(mainFile, 'imports', WEB_PUSH_IMPORT, { sort: true })
  if (importPatch.status === 'file-missing') {
    result.warnings.push(importPatch.message!)
    return
  }

  const runtimePatch = patchAtAnchor(mainFile, 'beforeListen', VAPID_RUNTIME, {
    dedupeKey: 'setVapidDetails(',
  })

  recordPatches(result, mainFile, [importPatch, runtimePatch])
}

function recordPatches(result: WirePushResult, file: string, patches: PatchResult[]): void {
  let changed = false
  let skipped = 0
  let failed = false

  for (const patch of patches) {
    if (patch.status === 'changed') {
      changed = true
    } else if (patch.status === 'skipped') {
      skipped++
    } else {
      failed = true
      result.warnings.push(patch.message ?? `Could not patch ${file} (${patch.status})`)
    }
  }

  if (changed) {
    result.changed.push(file)
  } else if (!failed && skipped === patches.length) {
    result.skipped.push(file)
  }
}

function wireConfig(result: WirePushResult, cwd: string): void {
  const configFile = path.resolve(cwd, 'src/config/index.ts')

  if (!fs.existsSync(configFile)) {
    result.warnings.push(`Could not find ${configFile}; the VAPID configuration was not added.`)
    return
  }

  const content = fs.readFileSync(configFile, 'utf-8')

  if (/VAPID\s*:/.test(content)) {
    result.skipped.push(configFile)
    return
  }

  const closingIndex = content.lastIndexOf('})')

  if (closingIndex === -1) {
    result.warnings.push(`Could not find the config object in ${configFile}; add the VAPID block manually.`)
    return
  }

  const separator = content[closingIndex - 1] === '\n' ? '' : '\n'
  fs.writeFileSync(configFile, `${content.slice(0, closingIndex)}${separator}${VAPID_CONFIG}${content.slice(closingIndex)}`)
  result.changed.push(configFile)
}

function wireEnv(result: WirePushResult, runner: string, cwd: string): void {
  const envFile = path.resolve(cwd, '.env.example')

  if (!fs.existsSync(envFile)) {
    result.warnings.push(`Could not find ${envFile}; add VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY manually.`)
    return
  }

  const content = fs.readFileSync(envFile, 'utf-8')

  if (content.includes('VAPID_PUBLIC_KEY')) {
    result.skipped.push(envFile)
    return
  }

  const block = VAPID_ENV.replace('<runner>', runner)
  const separator = content.endsWith('\n') ? '' : '\n'

  fs.writeFileSync(envFile, `${content}${separator}${block}`)
  result.changed.push(envFile)
}

function wireScript(result: WirePushResult, runner: string, cwd: string): void {
  const packageFile = path.resolve(cwd, 'package.json')

  if (!fs.existsSync(packageFile)) {
    result.warnings.push(`Could not find ${packageFile}; add the vapid:generate script manually.`)
    return
  }

  try {
    const content = fs.readFileSync(packageFile, 'utf-8')
    const packageJson = JSON.parse(content)
    const command = `${runner} web-push generate-vapid-keys`

    packageJson.scripts = packageJson.scripts || {}

    if (packageJson.scripts['vapid:generate'] === command) {
      result.skipped.push(packageFile)
      return
    }

    packageJson.scripts['vapid:generate'] = command
    fs.writeFileSync(packageFile, `${JSON.stringify(packageJson, null, 2)}\n`)
    result.changed.push(packageFile)
  } catch {
    result.warnings.push(`Could not update ${packageFile}; add the vapid:generate script manually.`)
  }
}

/**
 * Wires web-push into an existing project. Every step is idempotent, so it can
 * be executed again safely.
 */
export function wirePush(options: WirePushOptions = {}): WirePushResult {
  const {
    main = true,
    config = true,
    env = true,
    script = true,
    packageRunner = 'npx',
    cwd = process.cwd(),
  } = options
  const result: WirePushResult = { changed: [], skipped: [], warnings: [] }

  if (main) wireMain(result, cwd)
  if (config) wireConfig(result, cwd)
  if (env) wireEnv(result, packageRunner, cwd)
  if (script) wireScript(result, packageRunner, cwd)

  return result
}
