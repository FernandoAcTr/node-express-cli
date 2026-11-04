import fs from 'fs'
import os from 'os'
import path from 'path'
import { afterEach, describe, expect, it } from 'vitest'
import { Context, createContext } from '../../src/context'
import { CliError } from '../../src/errors'
import { EntityGenerator } from '../../src/generators/entity.generator'
import { FactoryGenerator } from '../../src/generators/factory.generator'
import { ModuleGenerator } from '../../src/generators/module.generator'
import { SeederGenerator } from '../../src/generators/seeder.generator'
import { NonInteractivePrompter } from '../../src/prompts'

const dirs: string[] = []

const silentLogger = {
  info: () => undefined,
  success: () => undefined,
  warn: () => undefined,
  error: () => undefined,
}

function project(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nec-name-'))
  dirs.push(dir)
  fs.writeFileSync(
    path.join(dir, 'cli.config.json'),
    JSON.stringify({ orm: 'typeorm', package_manger: 'npm', fileBasedRouting: false, features: ['orm'] })
  )
  return dir
}

type GeneratorFactory = (ctx: Context) => { pre(): Promise<void> }

const generators: Array<[string, GeneratorFactory]> = [
  ['make:module', (ctx) => new ModuleGenerator(ctx)],
  ['make:entity', (ctx) => new EntityGenerator(ctx)],
  ['make:seeder', (ctx) => new SeederGenerator(ctx)],
  ['make:factory', (ctx) => new FactoryGenerator(ctx)],
]

afterEach(() => {
  for (const dir of dirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

describe.each(generators)('%s name validation', (_name, create) => {
  it('rejects names that normalize to an empty identifier before writing', async () => {
    const cwd = project()
    const ctx = createContext({
      cwd,
      logger: silentLogger,
      prompter: new NonInteractivePrompter({ name: '!!!' }),
    })

    await expect(create(ctx).pre()).rejects.toBeInstanceOf(CliError)
    expect(fs.readdirSync(cwd)).toEqual(['cli.config.json'])
  })
})
