import fs from 'fs'
import os from 'os'
import path from 'path'
import { afterEach, describe, expect, it } from 'vitest'
import { createContext } from '../../src/context'
import { CliError } from '../../src/errors'
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

function prismaProject(installAuth = false, shell = new FakeShell()): Promise<string> {
  return scaffoldProject({
    root: tmpRoot(),
    orm: DbType.PRISMA,
    installAuth,
    installMailer: true,
    logger: silentLogger,
    shell: shell as never,
  })
}

function context(cwd: string, logger: Logger = silentLogger) {
  return createContext({ cwd, logger, shell: new FakeShell() as never })
}

function generator(cwd: string, force = false, logger: Logger = silentLogger): AuthGenerator {
  return new AuthGenerator(createContext({ cwd, force, logger }))
}

function prismaSchema(projectDir: string): string {
  return 'src/database/prisma/schema.prisma'
}

function authSchema(projectDir: string): string {
  return 'src/database/prisma/schemas/auth.prisma'
}

function read(projectDir: string, file: string): string {
  return fs.readFileSync(path.join(projectDir, file), 'utf-8')
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
  it('copies the shared domain and the ORM-specific repository', async () => {
    const cwd = project()

    await generator(cwd).copyFiles()

    for (const file of [
      'src/modules/auth/auth.service.ts',
      'src/modules/auth/auth.controller.ts',
      'src/modules/auth/auth.tokens.ts',
      'src/modules/auth/auth.types.ts',
      'src/modules/auth/auth.mailer.ts',
      'src/modules/auth/auth.repository.ts',
      'src/middlewares/passport.ts',
      'src/utils/hash.ts',
    ]) {
      expect(fs.existsSync(path.join(cwd, file))).toBe(true)
    }

    expect(read(cwd, 'src/modules/auth/auth.service.ts')).toContain("from './auth.repository'")
    expect(read(cwd, 'src/modules/auth/auth.repository.ts')).toContain("from '@/database/datasources'")
  })

  it('writes the repository that belongs to each ORM', async () => {
    const expectations: Array<[DbType, string]> = [
      [DbType.TYPEORM, "from 'typeorm'"],
      [DbType.SEQUELIZE, "from '@/entities/user.entity'"],
      [DbType.MONGO, "from '@/entities/user.entity'"],
      [DbType.PRISMA, "from '@/database/client'"],
    ]

    for (const [orm, expected] of expectations) {
      const cwd = project(orm)

      await generator(cwd).copyFiles()

      expect(read(cwd, 'src/modules/auth/auth.repository.ts')).toContain(expected)
    }
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

  it('requires the mailer feature before writing anything', async () => {
    const cwd = project()

    const error = await generator(cwd)
      .pre()
      .catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(CliError)
    expect((error as CliError).hint).toContain('install:mailer')
  })

  it('writes the Prisma models in a multi-file schema', async () => {
    const cwd = await prismaProject()
    const ctx = context(cwd)

    await run(new AuthGenerator(ctx), { ctx, feature: 'auth' })

    const models = read(cwd, authSchema(cwd))
    const schema = read(cwd, prismaSchema(cwd))

    expect(schema).toContain('provider     = "prisma-client"')
    expect(schema).toContain('provider = "mysql"')
    expect(schema).not.toContain('model User')

    for (const model of ['model Role', 'model User', 'model RefreshToken', 'model PasswordResetToken']) {
      expect(count(models, `${model} {`)).toBe(1)
    }

    for (const field of ['email', 'email_verified_at', 'refresh_token', 'expires_at']) {
      expect(models).toContain(field)
    }

    expect(models).toMatch(/email\s+String\s+@unique/)

    expect(features(cwd)).toContain('auth')
  })

  it('is idempotent when auth is installed twice with Prisma', async () => {
    const cwd = await prismaProject()
    const first = context(cwd)

    await run(new AuthGenerator(first), { ctx: first, feature: 'auth' })
    const models = read(cwd, authSchema(cwd))
    const schema = read(cwd, prismaSchema(cwd))

    const second = context(cwd)
    await run(new AuthGenerator(second), { ctx: second, feature: 'auth' })

    expect(read(cwd, authSchema(cwd))).toBe(models)
    expect(read(cwd, prismaSchema(cwd))).toBe(schema)
  })

  it('skips prisma generate when DB_URL is missing', async () => {
    const shell = new FakeShell()
    const cwd = await prismaProject(false, shell)
    const ctx = createContext({ cwd, logger: silentLogger, shell: shell as never })

    await run(new AuthGenerator(ctx), { ctx, feature: 'auth' })

    expect(shell.commands.some((command) => command.includes('m:generate'))).toBe(false)
    expect(features(cwd)).toContain('auth')
  })

  it('runs prisma generate when .env provides DB_URL', async () => {
    const shell = new FakeShell()
    const cwd = await prismaProject(false, shell)

    fs.writeFileSync(path.join(cwd, '.env'), 'DB_URL=mysql://user:password@localhost:3306/app\n')

    const ctx = createContext({ cwd, logger: silentLogger, shell: shell as never })
    await run(new AuthGenerator(ctx), { ctx, feature: 'auth' })

    expect(shell.commands.some((command) => command === 'npm run m:generate')).toBe(true)
  })

  it('keeps supporting the legacy Prisma block', async () => {
    const cwd = await prismaProject()
    const file = path.join(cwd, prismaSchema(cwd))
    const schema = read(cwd, prismaSchema(cwd)).replace('// @nec:prisma', '')

    fs.writeFileSync(file, `${schema}\n// @nec:prisma\n// @nec:auth:start\nmodel Legacy {\n  id Int @id\n}\n// @nec:auth:end\n`)

    const ctx = context(cwd)
    await run(new AuthGenerator(ctx), { ctx, feature: 'auth' })

    const updated = read(cwd, prismaSchema(cwd))

    expect(updated).toContain('model RefreshToken {')
    expect(updated).not.toContain('model Legacy {')
    expect(count(updated, '// @nec:auth:start')).toBe(1)
    expect(fs.existsSync(path.join(cwd, authSchema(cwd)))).toBe(false)
  })

  it('warns and leaves an incomplete legacy block untouched', async () => {
    const cwd = await prismaProject()
    const file = path.join(cwd, prismaSchema(cwd))
    const broken = `${read(cwd, prismaSchema(cwd))}\n// @nec:prisma\n// @nec:auth:start\nmodel Broken {\n  id Int @id\n}\n`
    const warnings: string[] = []
    const ctx = context(cwd, { ...silentLogger, warn: (message: string) => warnings.push(message) })

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

    const result = await generator(cwd, false, { ...silentLogger, warn: (message: string) => warnings.push(message) }).post()

    expect(result?.warnings.length).toBeGreaterThan(0)
    expect(fs.readFileSync(mainFile, 'utf-8')).toBe(original)
    expect(warnings.join('\n')).toContain('@nec:imports')
  })
})
