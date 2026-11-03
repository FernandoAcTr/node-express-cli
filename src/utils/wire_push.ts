import fs from 'fs'
import { configService } from '../services/config.service'

export interface WirePushOptions {
  main?: boolean
  config?: boolean
  env?: boolean
  script?: boolean
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

function insertAfterLastImport(content: string, line: string): string {
  const lines = content.split('\n')
  let lastImport = -1

  lines.forEach((current, index) => {
    const trimmed = current.trim()
    if (trimmed.startsWith('import ') && (trimmed.includes(' from ') || /^import\s+['"]/.test(trimmed))) {
      lastImport = index
    }
  })

  if (lastImport === -1) {
    return `${line}\n${content}`
  }

  lines.splice(lastImport + 1, 0, line)
  return lines.join('\n')
}

export function hasWebPushDependency(): boolean {
  if (!fs.existsSync('./package.json')) {
    return false
  }

  try {
    const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf-8'))
    return Boolean(packageJson.dependencies?.['web-push'] || packageJson.devDependencies?.['web-push'])
  } catch {
    return false
  }
}

function wireMain(result: WirePushResult): void {
  const mainFile = './src/main.ts'

  if (!fs.existsSync(mainFile)) {
    result.warnings.push(`Could not find ${mainFile}; the webpush configuration was not added.`)
    return
  }

  let content = fs.readFileSync(mainFile, 'utf-8')
  let changed = false

  if (!content.includes("from 'web-push'")) {
    content = insertAfterLastImport(content, WEB_PUSH_IMPORT)
    changed = true
  }

  if (!content.includes('setVapidDetails(')) {
    const listenAnchor = 'export const server = app.listen('
    const index = content.indexOf(listenAnchor)

    if (index === -1) {
      result.warnings.push(`Could not find "${listenAnchor}" in ${mainFile}; add the webpush block manually.`)
      return
    }

    content = `${content.slice(0, index)}${VAPID_RUNTIME}\n\n${content.slice(index)}`
    changed = true
  }

  if (changed) {
    fs.writeFileSync(mainFile, content)
    result.changed.push(mainFile)
  } else {
    result.skipped.push(mainFile)
  }
}

function wireConfig(result: WirePushResult): void {
  const configFile = './src/config/index.ts'

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

function wireEnv(result: WirePushResult): void {
  const envFile = './.env.example'

  if (!fs.existsSync(envFile)) {
    result.warnings.push(`Could not find ${envFile}; add VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY manually.`)
    return
  }

  const content = fs.readFileSync(envFile, 'utf-8')

  if (content.includes('VAPID_PUBLIC_KEY')) {
    result.skipped.push(envFile)
    return
  }

  const runner = configService.getPackageRunnerCommand()
  const block = VAPID_ENV.replace('<runner>', runner)
  const separator = content.endsWith('\n') ? '' : '\n'

  fs.writeFileSync(envFile, `${content}${separator}${block}`)
  result.changed.push(envFile)
}

function wireScript(result: WirePushResult): void {
  const packageFile = './package.json'

  if (!fs.existsSync(packageFile)) {
    result.warnings.push(`Could not find ${packageFile}; add the vapid:generate script manually.`)
    return
  }

  try {
    const content = fs.readFileSync(packageFile, 'utf-8')
    const packageJson = JSON.parse(content)
    const command = `${configService.getPackageRunnerCommand()} web-push generate-vapid-keys`

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
 * be executed again (for example after install:socket replaces main.ts).
 */
export function wirePush(options: WirePushOptions = {}): WirePushResult {
  const { main = true, config = true, env = true, script = true } = options
  const result: WirePushResult = { changed: [], skipped: [], warnings: [] }

  if (main) wireMain(result)
  if (config) wireConfig(result)
  if (env) wireEnv(result)
  if (script) wireScript(result)

  return result
}
