import crypto from 'crypto'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { afterEach, describe, expect, it } from 'vitest'
import { createContext } from '../../src/context'
import { CliError } from '../../src/errors'
import { BaseGenerator } from '../../src/generators/base.generator'
import { NonInteractivePrompter } from '../../src/prompts'
import { Logger } from '../../src/logger'
import { CommandDefinition, commands } from '../../src/registry'
import { run } from '../../src/run'
import { ShellService } from '../../src/services/shell.service'
import { DbType, FEATURES } from '../../src/types'
import { FakeShell, listFiles, readJson, silentLogger } from '../helpers/project'

const dirs: string[] = []
const installCommands = commands.filter((command) => command.name.startsWith('install:'))

interface ProjectConfig {
  orm?: string
  features: string[]
}

function tempRoot(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nec-contract-'))
  dirs.push(root)
  return root
}

/** Genera el proyecto base sin red usando el shell falso. */
async function createProject(orm: DbType = DbType.TYPEORM): Promise<string> {
  const root = tempRoot()
  const shell = new FakeShell()
  const ctx = createContext({
    cwd: root,
    logger: silentLogger,
    shell: shell as unknown as ShellService,
    prompter: new NonInteractivePrompter({
      name: 'app',
      'package-manager': 'npm',
      'file-based-routing': false,
      orm,
    }),
  })
  const base = new BaseGenerator(ctx)

  await base.pre()
  await base.createDirectories()
  await base.copyFiles()
  await base.installDependencies()
  await base.post()

  return path.join(root, 'app')
}

async function runInstall(project: string, command: CommandDefinition, flags: Record<string, unknown> = {}, logger: Logger = silentLogger) {
  const shell = new FakeShell()
  const args = { positionals: [], flags }
  const ctx = createContext({
    cwd: project,
    logger,
    shell: shell as unknown as ShellService,
    prompter: new NonInteractivePrompter({ orm: DbType.TYPEORM, ...flags }),
    args,
  })

  await run(command.create(ctx), { ctx, feature: command.feature })

  return { shell, ctx }
}

/** Instala las dependencias de las que depende el comando, si las declara. */
async function prepare(project: string, command: CommandDefinition): Promise<void> {
  for (const requirement of command.requires ?? []) {
    if (requirement.feature === 'fileBasedRouting') {
      continue
    }

    const dependency = commands.find((candidate) => candidate.name.startsWith('install:') && candidate.feature === requirement.feature)

    if (!dependency || dependency.name === command.name) {
      continue
    }

    await prepare(project, dependency)
    await runInstall(project, dependency, dependency.name === 'install:orm' ? { orm: DbType.TYPEORM } : {})
  }
}

/** Añade líneas que ningún instalador debería perder. */
function addCustomLines(project: string): void {
  const main = path.join(project, 'src/main.ts')
  fs.appendFileSync(main, '\n// contract-custom-main\n')

  const configFile = path.join(project, 'src/config/index.ts')
  fs.writeFileSync(
    configFile,
    fs.readFileSync(configFile, 'utf-8').replace('// @nec:config', "  CUSTOM: 'contract-custom',\n  // @nec:config")
  )

  const envFile = path.join(project, '.env.example')
  fs.writeFileSync(envFile, fs.readFileSync(envFile, 'utf-8').replace('# @nec:env', 'CONTRACT_CUSTOM_ENV=keep-me\n# @nec:env'))
}

function readConfig(project: string): ProjectConfig {
  return readJson<ProjectConfig>(path.join(project, 'cli.config.json'))
}

function readScripts(project: string): Record<string, string> {
  return readJson<{ scripts?: Record<string, string> }>(path.join(project, 'package.json')).scripts ?? {}
}

function readManifest(project: string): { version: number; generated: Record<string, string> } {
  return readJson(path.join(project, '.nec/manifest.json'))
}

function manifestHash(project: string, file: string): string {
  return `sha256:${crypto
    .createHash('sha256')
    .update(fs.readFileSync(path.join(project, file)))
    .digest('hex')}`
}

/** Hash de cada archivo para comparar el árbol completo entre ejecuciones. */
function snapshot(project: string): Record<string, string> {
  const result: Record<string, string> = {}

  for (const file of listFiles(project)) {
    const content = fs.readFileSync(path.join(project, file))
    result[file] = crypto.createHash('sha256').update(content).digest('hex')
  }

  return result
}

function placeholders(project: string): string[] {
  return listFiles(project).flatMap((file) => {
    const content = fs.readFileSync(path.join(project, file), 'utf-8')
    const matches = content.match(/__[A-Za-z][A-Za-z0-9_]*__/g) ?? []

    return matches.map((match) => `${file}: ${match}`)
  })
}

afterEach(() => {
  for (const dir of dirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

describe.each(installCommands.map((command) => [command.name, command] as const))('%s contract', (_name, command) => {
  it('is idempotent, records its feature and does not reinstall dependencies', async () => {
    const project = await createProject()
    await prepare(project, command)
    addCustomLines(project)

    await runInstall(project, command)
    const firstSnapshot = snapshot(project)
    const firstScripts = readScripts(project)

    expect(readConfig(project).features).toContain(command.feature)

    if (command.feature === 'orm') {
      expect(readConfig(project).orm).toBe(DbType.TYPEORM)
    }

    const second = await runInstall(project, command)

    expect(snapshot(project)).toEqual(firstSnapshot)
    expect(readScripts(project)).toEqual(firstScripts)
    expect(second.shell.commands).toEqual([])
    expect(readConfig(project).features).toContain(command.feature)
  })

  it('preserves custom lines and leaves no placeholders', async () => {
    const project = await createProject()
    await prepare(project, command)
    addCustomLines(project)

    await runInstall(project, command)
    await runInstall(project, command)

    expect(fs.readFileSync(path.join(project, 'src/main.ts'), 'utf-8')).toContain('// contract-custom-main')
    expect(fs.readFileSync(path.join(project, 'src/config/index.ts'), 'utf-8')).toContain("CUSTOM: 'contract-custom'")
    expect(fs.readFileSync(path.join(project, '.env.example'), 'utf-8')).toContain('CONTRACT_CUSTOM_ENV=keep-me')
    expect(placeholders(project)).toEqual([])
  })
})

describe('install command state', () => {
  it('does not persist the ORM when install:orm fails', async () => {
    const project = await createProject()
    const ormCommand = commands.find((command) => command.name === 'install:orm')

    if (!ormCommand) {
      throw new Error('install:orm is not registered')
    }

    const failingShell = {
      execAsync: async () => {
        throw new Error('dependency installation failed')
      },
      exec: () => ({ code: 0, stdout: '', stderr: '' }),
    } as unknown as ShellService
    const ctx = createContext({
      cwd: project,
      logger: silentLogger,
      shell: failingShell,
      prompter: new NonInteractivePrompter({ orm: DbType.TYPEORM }),
    })

    await expect(run(ormCommand.create(ctx), { ctx, feature: 'orm' })).rejects.toThrow('dependency installation failed')

    const config = readConfig(project)

    expect(config.orm).toBeUndefined()
    expect(config.features).not.toContain('orm')
  })

  it('leaves no placeholders when installing Prisma', async () => {
    const project = await createProject(DbType.PRISMA)
    const orm = commands.find((command) => command.name === 'install:orm')

    if (!orm) {
      throw new Error('install:orm is not registered')
    }

    await runInstall(project, orm, { orm: DbType.PRISMA })

    expect(readConfig(project).orm).toBe(DbType.PRISMA)
    expect(placeholders(project)).toEqual([])
  })
})

describe('ORM change policy', () => {
  it('refuses to switch the ORM before touching the project', async () => {
    const project = await createProject()
    const orm = commands.find((command) => command.name === 'install:orm')

    if (!orm) {
      throw new Error('install:orm is not registered')
    }

    await runInstall(project, orm, { orm: DbType.TYPEORM })
    const before = snapshot(project)

    const error = await runInstall(project, orm, { orm: DbType.MONGO }).catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(CliError)
    expect((error as CliError).hint).toContain('new project')
    expect(snapshot(project)).toEqual(before)
  })
})

describe('manifest after install:*', () => {
  it('records the final hashes of cli.config.json and package.json', async () => {
    const project = await createProject()
    const orm = commands.find((command) => command.name === 'install:orm')
    const mailer = commands.find((command) => command.name === 'install:mailer')

    if (!orm || !mailer) {
      throw new Error('install:orm and install:mailer must be registered')
    }

    await runInstall(project, orm, { orm: DbType.TYPEORM })
    await runInstall(project, mailer)

    expect(readManifest(project).generated['cli.config.json']).toBe(manifestHash(project, 'cli.config.json'))
    expect(readManifest(project).generated['package.json']).toBe(manifestHash(project, 'package.json'))

    await runInstall(project, mailer)

    expect(readManifest(project).generated['cli.config.json']).toBe(manifestHash(project, 'cli.config.json'))
    expect(readManifest(project).generated['package.json']).toBe(manifestHash(project, 'package.json'))
  })
})

describe('feature state when the wiring is incomplete', () => {
  it('does not mark install:push when main.ts has no imports anchor', async () => {
    const project = await createProject()
    const push = commands.find((command) => command.name === 'install:push')

    if (!push) {
      throw new Error('install:push is not registered')
    }

    const mainFile = path.join(project, 'src/main.ts')
    const withoutAnchor = fs.readFileSync(mainFile, 'utf-8').replace('// @nec:imports', '// imports anchor removed')
    const warnings: string[] = []

    fs.writeFileSync(mainFile, withoutAnchor)

    await runInstall(project, push, {}, { ...silentLogger, warn: (message) => warnings.push(message) })

    expect(readConfig(project).features).not.toContain('push')
    expect(fs.readFileSync(mainFile, 'utf-8')).toBe(withoutAnchor)
    expect(warnings.join('\n')).toContain('@nec:imports')
    expect(warnings.join('\n')).toContain('was not marked as installed')

    // Al corregir el anchor, el reintento debe completar y marcar la feature.
    fs.writeFileSync(mainFile, withoutAnchor.replace('// imports anchor removed', '// @nec:imports'))
    await runInstall(project, push)

    expect(readConfig(project).features).toContain('push')
  })

  it('does not mark install:mailer when config has no config anchor', async () => {
    const project = await createProject()
    const mailer = commands.find((command) => command.name === 'install:mailer')

    if (!mailer) {
      throw new Error('install:mailer is not registered')
    }

    const configFile = path.join(project, 'src/config/index.ts')
    const withoutAnchor = fs.readFileSync(configFile, 'utf-8').replace('// @nec:config', '// config anchor removed')
    const warnings: string[] = []

    fs.writeFileSync(configFile, withoutAnchor)

    await runInstall(project, mailer, {}, { ...silentLogger, warn: (message) => warnings.push(message) })

    expect(readConfig(project).features).not.toContain('mailer')
    expect(fs.readFileSync(configFile, 'utf-8')).toBe(withoutAnchor)
    expect(warnings.join('\n')).toContain('@nec:config')
    expect(warnings.join('\n')).toContain('was not marked as installed')
  })
})

describe('registry contracts', () => {
  it('has an install command for every declared feature', () => {
    for (const feature of FEATURES) {
      expect(commands.some((command) => command.name === `install:${feature}`)).toBe(true)
    }
  })

  it('declares a valid feature for every install command', () => {
    expect(installCommands.length).toBe(FEATURES.length)

    for (const command of installCommands) {
      expect(command.feature).toBeDefined()
      expect(FEATURES).toContain(command.feature)
    }
  })
})
