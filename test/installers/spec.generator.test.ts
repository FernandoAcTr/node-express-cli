import fs from 'fs'
import os from 'os'
import path from 'path'
import { afterEach, describe, expect, it } from 'vitest'
import { Context, createContext } from '../../src/context'
import { InstallerSpec, SpecGenerator } from '../../src/installers'
import { mailerSpec } from '../../src/installers/specs/mailer.spec'
import { eslintSpec } from '../../src/installers/specs/eslint.spec'
import { commands, installer } from '../../src/registry'
import { Feature, FEATURES } from '../../src/types'
import { FakeShell } from '../helpers/project'

const dirs: string[] = []

const silentLogger = {
  info: () => undefined,
  success: () => undefined,
  warn: () => undefined,
  error: () => undefined,
}

function project(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nec-installer-'))
  dirs.push(dir)
  fs.writeFileSync(path.join(dir, 'cli.config.json'), JSON.stringify({ package_manger: 'npm', features: [] }))
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 'app', scripts: {} }, null, 2))
  fs.mkdirSync(path.join(dir, 'src/config'), { recursive: true })
  fs.writeFileSync(
    path.join(dir, 'src/main.ts'),
    [
      "import express from 'express'",
      '// @nec:imports',
      '',
      'const app = express()',
      '// @nec:before-listen',
      'export const server = app.listen(3000)',
      '// @nec:after-listen',
      '',
    ].join('\n')
  )
  fs.writeFileSync(
    path.join(dir, 'src/config/index.ts'),
    ['export const config = Object.freeze({', '  PORT: 3000,', '  // @nec:config', '})', ''].join('\n')
  )
  fs.writeFileSync(path.join(dir, '.env.example'), 'PORT=3000\n# @nec:env\n')
  return dir
}

function context(cwd: string): Context {
  return createContext({ cwd, logger: silentLogger, shell: new FakeShell() as never })
}

function filesIn(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(dir, entry.name)
    return entry.isDirectory() ? filesIn(absolute) : [absolute]
  })
}

afterEach(() => {
  for (const dir of dirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

describe('SpecGenerator', () => {
  it('keeps optional features out of templates/base', () => {
    const base = path.resolve(__dirname, '../../templates/base')
    const offenders = filesIn(base).filter((file) => {
      if (file.endsWith('.png')) {
        return false
      }

      return /MAILER|VAPID|MAIL_|DB_|prettier:fix|vapid:generate/.test(fs.readFileSync(file, 'utf-8'))
    })

    expect(offenders).toEqual([])
  })

  it('defines a simple install command from one spec', async () => {
    const cwd = project()
    const cacheSpec: InstallerSpec = {
      feature: 'cache' as Feature,
      description: 'Add a cache layer',
      dirs: ['src/cache'],
      files: [{ from: 'generator/common/prettier/.prettierrc.json', to: '.cache.json' }],
      scripts: { cache: 'node cache.js' },
      success: ['Cache is ready'],
    }
    const definition = installer(cacheSpec)

    expect(definition.name).toBe('install:cache')
    expect(definition.feature).toBe('cache')

    const generator = definition.create(context(cwd))
    const lifecycle = generator as SpecGenerator

    await lifecycle.createDirectories()
    await lifecycle.copyFiles()
    await lifecycle.post()

    const pkg = JSON.parse(fs.readFileSync(path.join(cwd, 'package.json'), 'utf-8'))

    expect(fs.existsSync(path.join(cwd, '.cache.json'))).toBe(true)
    expect(pkg.scripts.cache).toBe('node cache.js')
  })

  it('wires config and env from a spec', async () => {
    const cwd = project()

    await new SpecGenerator(context(cwd), mailerSpec).post()

    const config = fs.readFileSync(path.join(cwd, 'src/config/index.ts'), 'utf-8')
    const env = fs.readFileSync(path.join(cwd, '.env.example'), 'utf-8')

    expect(config).toContain('MAILER:')
    expect(env).toContain('MAIL_HOST=')
    expect(env).toContain('# @nec:mailer:start')
  })

  it('ships a flat ESLint config with lint scripts', async () => {
    const cwd = project()

    expect(eslintSpec.requires).toEqual([{ feature: 'prettier', hint: expect.stringContaining('install:prettier') }])
    expect(eslintSpec.devDeps).toEqual(
      expect.arrayContaining(['eslint@^10', '@eslint/js@^10', 'typescript-eslint@^8', 'eslint-config-prettier@^10'])
    )
    expect(eslintSpec.scripts).toEqual({
      lint: 'eslint "src/**/*.ts"',
      'lint:fix': 'eslint "src/**/*.ts" --fix',
    })

    await new SpecGenerator(context(cwd), eslintSpec).copyFiles()

    const config = fs.readFileSync(path.join(cwd, 'eslint.config.mjs'), 'utf-8')

    expect(fs.existsSync(path.join(cwd, '.eslintrc.js'))).toBe(false)
    expect(config).toContain("from 'typescript-eslint'")
    expect(config).toContain("from 'eslint-config-prettier'")
    expect(config).toContain("ignores: ['build/**'")
  })

  it('has an install command for every feature', () => {
    for (const feature of FEATURES) {
      expect(commands.some((command) => command.name === `install:${feature}`)).toBe(true)
    }
  })
})
