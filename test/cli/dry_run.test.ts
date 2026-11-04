import fs from 'fs'
import os from 'os'
import path from 'path'
import { afterEach, describe, expect, it } from 'vitest'
import { executeCommand, findCommand } from '../../src/cli'
import { createContext } from '../../src/context'
import { BaseGenerator } from '../../src/generators/base.generator'
import { Logger } from '../../src/logger'
import { NonInteractivePrompter } from '../../src/prompts'
import { ShellService } from '../../src/services/shell.service'
import { PackageManager } from '../../src/types'
import { silentLogger } from '../helpers/project'

const dirs: string[] = []

function tmpDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nec-dry-run-'))
  dirs.push(dir)
  return dir
}

afterEach(() => {
  for (const dir of dirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

describe('--dry-run', () => {
  it('is read from ctx.args and keeps writes in memory', () => {
    const cwd = tmpDir()
    const ctx = createContext({
      cwd,
      logger: silentLogger,
      args: { positionals: [], flags: { 'dry-run': true } },
    })

    expect(ctx.dryRun).toBe(true)
    expect(ctx.force).toBe(false)

    const result = ctx.project.write('src/example.ts', 'export const value = 1\n')

    expect(result.status).toBe('created')
    expect(ctx.project.exists('src/example.ts')).toBe(true)
    expect(ctx.project.read('src/example.ts')).toBe('export const value = 1\n')
    expect(fs.readdirSync(cwd)).toEqual([])
  })

  it('does not write cli.config.json or package.json', () => {
    const cwd = tmpDir()
    const ctx = createContext({
      cwd,
      logger: silentLogger,
      args: { positionals: [], flags: { 'dry-run': true } },
    })

    ctx.config.writeConfig({ package_manger: PackageManager.NPM })
    ctx.project.write('package.json', JSON.stringify({ name: 'app' }))
    ctx.config.setPackageName('demo')

    expect(fs.readdirSync(cwd)).toEqual([])
    expect(ctx.config.getConfig().package_manger).toBe('npm')
    expect(JSON.parse(ctx.project.read('package.json')).name).toBe('demo')
  })

  it('runs init end to end without creating the project', async () => {
    const cwd = tmpDir()
    const messages: string[] = []
    const logger: Logger = {
      ...silentLogger,
      info: (message: string) => messages.push(message),
    }
    const flags = {
      name: 'app',
      'package-manager': 'npm',
      'file-based-routing': false,
      'dry-run': true,
    }
    const ctx = createContext({
      cwd,
      logger,
      args: { positionals: [], flags },
      prompter: new NonInteractivePrompter(flags),
    })
    const generator = new BaseGenerator(ctx)

    await generator.pre()
    await generator.createDirectories()
    await generator.copyFiles()
    await generator.installDependencies()
    await generator.post()

    expect(fs.readdirSync(cwd)).toEqual([])
    expect(messages.some((message) => message.startsWith('[dry-run] would run:'))).toBe(true)
    expect(messages.some((message) => message.startsWith('[dry-run] would write'))).toBe(true)
  })

  it('runs an install command without touching the project', async () => {
    const cwd = tmpDir()
    fs.writeFileSync(
      path.join(cwd, 'cli.config.json'),
      JSON.stringify({ fileBasedRouting: false, package_manger: PackageManager.NPM, features: [] })
    )
    fs.writeFileSync(path.join(cwd, 'package.json'), JSON.stringify({ name: 'app', scripts: {} }))
    const args = { positionals: ['install:prettier'], flags: { 'dry-run': true, 'no-interaction': true } }
    const ctx = createContext({ cwd, logger: silentLogger, args })

    await executeCommand(findCommand('install:prettier')!, ctx, args)

    expect(fs.readdirSync(cwd).sort()).toEqual(['cli.config.json', 'package.json'])
    expect(JSON.parse(fs.readFileSync(path.join(cwd, 'package.json'), 'utf-8')).scripts).toEqual({})
    expect(JSON.parse(fs.readFileSync(path.join(cwd, 'cli.config.json'), 'utf-8')).features).toEqual([])
  })

  it('logs shell commands without executing them', async () => {
    const cwd = tmpDir()
    const messages: string[] = []
    const shell = new ShellService({
      dryRun: true,
      logger: { ...silentLogger, info: (message: string) => messages.push(message) },
    })

    await shell.execAsync('touch created-by-shell', cwd)

    expect(fs.existsSync(path.join(cwd, 'created-by-shell'))).toBe(false)
    expect(messages.join('\n')).toContain('[dry-run] would run: touch created-by-shell')
  })

  it('reads --force from ctx.args', () => {
    const cwd = tmpDir()
    const ctx = createContext({
      cwd,
      logger: silentLogger,
      args: { positionals: [], flags: { force: true } },
    })

    ctx.project.write('created.txt', 'first')

    expect(ctx.force).toBe(true)
    expect(ctx.project.write('created.txt', 'second', 'create').status).toBe('overwritten')
  })
})
