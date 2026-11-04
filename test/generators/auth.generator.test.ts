import fs from 'fs'
import os from 'os'
import path from 'path'
import { afterEach, describe, expect, it } from 'vitest'
import { createContext } from '../../src/context'
import { AuthGenerator } from '../../src/generators/auth.generator'
import { Logger } from '../../src/logger'
import { run } from '../../src/run'
import { DbType } from '../../src/types'
import { FakeShell, scaffoldProject } from '../helpers/project'

const dirs: string[] = []

const silentLogger: Logger = {
  info: () => undefined,
  success: () => undefined,
  warn: () => undefined,
  error: () => undefined,
}

function tmpRoot(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nec-auth-'))
  dirs.push(dir)
  return dir
}

function project(orm = 'typeorm'): string {
  const dir = tmpRoot()
  fs.writeFileSync(path.join(dir, 'cli.config.json'), JSON.stringify({ orm, package_manger: 'npm', fileBasedRouting: false, features: [] }))
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 'app' }))
  return dir
}

function count(content: string, needle: string): number {
  return content.split(needle).length - 1
}

function prismaProject(installAuth = false): Promise<string> {
  return scaffoldProject({ root: tmpRoot(), orm: DbType.PRISMA, installAuth, logger: silentLogger })
}

function context(cwd: string, logger: Logger = silentLogger) {
  return createContext({ cwd, logger, shell: new FakeShell() as never })
}

function generator(cwd: string, force = false, logger: Logger = silentLogger): AuthGenerator {
  return new AuthGenerator(createContext({ cwd, force, logger }))
}

function schemaPath(projectDir: string): string {
  return path.join(projectDir, 'src/database/prisma/schema.prisma')
}

function features(projectDir: string): string[] {
  return JSON.parse(fs.readFileSync(path.join(projectDir, 'cli.config.json'), 'utf-8')).features
}

afterEach(() => {
  for (const dir of dirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

describe('AuthGenerator', () => {
  it('copies the auth files with the overwrite-if-unmodified policy', async () => {
    const cwd = project()

    await generator(cwd).copyFiles()

    expect(fs.existsSync(path.join(cwd, 'src/modules/auth/auth.controller.ts'))).toBe(true)
    expect(fs.existsSync(path.join(cwd, 'src/middlewares/passport.ts'))).toBe(true)
  })

  it('preserves a customized auth.controller.ts', async () => {
    const cwd = project()
    const controller = path.join(cwd, 'src/modules/auth/auth.controller.ts')
    const warnings: string[] = []
    const logger: Logger = {
      ...silentLogger,
      warn: (message: string) => warnings.push(message),
    }

    await generator(cwd).copyFiles()
    fs.writeFileSync(controller, '// custom controller\n')

    await generator(cwd, false, logger).copyFiles()

    expect(fs.readFileSync(controller, 'utf-8')).toBe('// custom controller\n')
    expect(warnings.join('\n')).toContain('auth.controller.ts')
    expect(warnings.join('\n')).toContain('--force')
  })

  it('overwrites the customized controller with --force', async () => {
    const cwd = project()
    const controller = path.join(cwd, 'src/modules/auth/auth.controller.ts')

    await generator(cwd).copyFiles()
    fs.writeFileSync(controller, '// custom controller\n')

    await generator(cwd, true).copyFiles()

    expect(fs.readFileSync(controller, 'utf-8')).not.toBe('// custom controller\n')
  })

  it('merges the Prisma auth models into the schema without replacing it', async () => {
    const cwd = await prismaProject()
    const ctx = context(cwd)

    await run(new AuthGenerator(ctx), { ctx, feature: 'auth' })

    const schema = fs.readFileSync(schemaPath(cwd), 'utf-8')

    expect(count(schema, 'generator client')).toBe(1)
    expect(count(schema, 'datasource db')).toBe(1)
    expect(schema).toContain('// @nec:prisma')
    expect(schema).toContain('// @nec:auth:start')

    for (const model of ['model Role', 'model User', 'model RefreshToken', 'model ResetPasswordToken']) {
      expect(count(schema, `${model} {`)).toBe(1)
    }

    expect(features(cwd)).toContain('auth')
  })

  it('is idempotent when auth is installed twice', async () => {
    const cwd = await prismaProject()
    const first = context(cwd)

    await run(new AuthGenerator(first), { ctx: first, feature: 'auth' })
    const schema = fs.readFileSync(schemaPath(cwd), 'utf-8')

    const second = context(cwd)
    await run(new AuthGenerator(second), { ctx: second, feature: 'auth' })

    expect(fs.readFileSync(schemaPath(cwd), 'utf-8')).toBe(schema)
    expect(count(schema, '// @nec:auth:start')).toBe(1)
  })

  it('warns and leaves an older schema untouched when the Prisma anchor is missing', async () => {
    const cwd = await prismaProject()
    const file = schemaPath(cwd)
    const withoutAnchor = fs.readFileSync(file, 'utf-8').replace('\n// @nec:prisma\n', '\n')
    const warnings: string[] = []
    const ctx = context(cwd, { ...silentLogger, warn: (message) => warnings.push(message) })

    fs.writeFileSync(file, withoutAnchor)

    await run(new AuthGenerator(ctx), { ctx, feature: 'auth' })

    expect(warnings.join('\n')).toContain('@nec:prisma')
    expect(fs.readFileSync(file, 'utf-8')).toBe(withoutAnchor)
    expect(features(cwd)).not.toContain('auth')
  })

  it('merges the models after the anchor is added to an older schema', async () => {
    const cwd = await prismaProject()
    const file = schemaPath(cwd)
    const schema = fs.readFileSync(file, 'utf-8')
    const withoutAnchor = schema.replace('\n// @nec:prisma\n', '\n')

    fs.writeFileSync(file, withoutAnchor)
    const first = context(cwd)
    await run(new AuthGenerator(first), { ctx: first, feature: 'auth' })

    fs.writeFileSync(file, `${withoutAnchor}\n// @nec:prisma\n`)
    const second = context(cwd)
    await run(new AuthGenerator(second), { ctx: second, feature: 'auth' })

    expect(fs.readFileSync(file, 'utf-8')).toContain('// @nec:auth:start')
    expect(features(cwd)).toContain('auth')
  })

  it('aborts an incomplete auth block without touching the schema', async () => {
    const cwd = await prismaProject()
    const file = schemaPath(cwd)
    const broken = `${fs.readFileSync(file, 'utf-8')}\n// @nec:auth:start\nmodel Broken {\n  id Int @id\n}\n`
    const warnings: string[] = []
    const ctx = context(cwd, { ...silentLogger, warn: (message) => warnings.push(message) })

    fs.writeFileSync(file, broken)

    await run(new AuthGenerator(ctx), { ctx, feature: 'auth' })

    expect(warnings.join('\n')).toContain('incomplete')
    expect(fs.readFileSync(file, 'utf-8')).toBe(broken)
    expect(features(cwd)).not.toContain('auth')
  })

  it('returns the wiring warnings instead of pretending the auth module is connected', async () => {
    const cwd = project()
    const mainFile = path.join(cwd, 'src/main.ts')
    const original = 'const app = 1\n'
    const warnings: string[] = []

    fs.mkdirSync(path.dirname(mainFile), { recursive: true })
    fs.writeFileSync(mainFile, original)

    const result = await generator(cwd, false, { ...silentLogger, warn: (message) => warnings.push(message) }).post()

    expect(result?.warnings.length).toBeGreaterThan(0)
    expect(fs.readFileSync(mainFile, 'utf-8')).toBe(original)
    expect(warnings.join('\n')).toContain('@nec:imports')
  })
})
