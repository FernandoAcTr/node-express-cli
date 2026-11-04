import fs from 'fs'
import os from 'os'
import path from 'path'
import { afterEach, describe, expect, it } from 'vitest'
import { Context, createContext } from '../../src/context'
import { CliError } from '../../src/errors'
import { ModuleGenerator } from '../../src/generators/module.generator'
import { NonInteractivePrompter } from '../../src/prompts'

const dirs: string[] = []

const silentLogger = {
  info: () => undefined,
  success: () => undefined,
  warn: () => undefined,
  error: () => undefined,
}

function project(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nec-module-'))
  dirs.push(dir)
  fs.writeFileSync(path.join(dir, 'cli.config.json'), JSON.stringify({ fileBasedRouting: false, package_manger: 'npm', features: [] }))
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 'app' }))
  return dir
}

function generator(cwd: string, force = false): ModuleGenerator {
  const ctx = createContext({
    cwd,
    logger: silentLogger,
    force,
    prompter: new NonInteractivePrompter({ name: 'users' }),
  })

  return new ModuleGenerator(ctx)
}

async function generate(cwd: string, force = false): Promise<void> {
  const module = generator(cwd, force)
  await module.pre()
  await module.createDirectories()
  await module.copyFiles()
}

afterEach(() => {
  for (const dir of dirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

describe('generators receive a Context', () => {
  it('instantiates a generator with a fake context', async () => {
    const ctx = {
      prompter: new NonInteractivePrompter({}, ['user-profile']),
    } as unknown as Context

    const generator = new ModuleGenerator(ctx)
    await generator.pre()

    expect((generator as any).moduleName).toBe('user-profile')
  })
})

describe('ModuleGenerator', () => {
  it('writes the module inside ctx.cwd', async () => {
    const cwd = project()

    await generate(cwd)

    const dir = path.join(cwd, 'src/modules/users')
    expect(fs.existsSync(path.join(dir, 'users.controller.ts'))).toBe(true)
    expect(fs.existsSync(path.join(dir, 'users.service.ts'))).toBe(true)
    expect(fs.existsSync(path.join(dir, 'users.validator.ts'))).toBe(true)
    expect(fs.existsSync(path.join(dir, 'users.routes.ts'))).toBe(true)
  })

  it('fails when the module already exists and suggests --force', async () => {
    const cwd = project()
    await generate(cwd)

    await expect(generate(cwd)).rejects.toBeInstanceOf(CliError)

    try {
      await generate(cwd)
    } catch (error) {
      expect((error as CliError).hint).toContain('--force')
    }
  })

  it('fails before writing when only one generated file is missing', async () => {
    const cwd = project()
    await generate(cwd)

    const dir = path.join(cwd, 'src/modules/users')
    const validator = path.join(dir, 'users.validator.ts')
    const service = path.join(dir, 'users.service.ts')
    const serviceBefore = fs.readFileSync(service, 'utf-8')

    fs.rmSync(validator)

    await expect(generate(cwd)).rejects.toBeInstanceOf(CliError)
    expect(fs.existsSync(validator)).toBe(false)
    expect(fs.readFileSync(service, 'utf-8')).toBe(serviceBefore)
  })

  it('overwrites the whole set with --force', async () => {
    const cwd = project()
    await generate(cwd)

    const validator = path.join(cwd, 'src/modules/users/users.validator.ts')
    fs.writeFileSync(validator, '// custom\n')

    await generate(cwd, true)

    expect(fs.readFileSync(validator, 'utf-8')).not.toBe('// custom\n')
  })

  it('rejects a name that normalizes to an empty identifier before creating files', async () => {
    const cwd = project()
    const ctx = createContext({
      cwd,
      logger: silentLogger,
      prompter: new NonInteractivePrompter({ name: '!!!' }),
    })
    const module = new ModuleGenerator(ctx)

    await expect(module.pre()).rejects.toBeInstanceOf(CliError)
    expect(fs.existsSync(path.join(cwd, 'src'))).toBe(false)
  })

  it('overwrites user changes with --force', async () => {
    const cwd = project()
    await generate(cwd)

    const controller = path.join(cwd, 'src/modules/users/users.controller.ts')
    fs.writeFileSync(controller, '// custom\n')

    await generate(cwd, true)

    expect(fs.readFileSync(controller, 'utf-8')).not.toBe('// custom\n')
  })
})
