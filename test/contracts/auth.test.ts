import crypto from 'crypto'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { afterEach, describe, expect, it } from 'vitest'
import { createContext } from '../../src/context'
import { AuthGenerator } from '../../src/generators/auth.generator'
import { run } from '../../src/run'
import { DbType } from '../../src/types'
import { discoverFileRoutes } from '../../src/utils/file_routes'
import { FakeShell, listFiles, scaffoldProject, silentLogger } from '../helpers/project'

const dirs: string[] = []

function tmpRoot(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nec-auth-contract-'))
  dirs.push(dir)
  return dir
}

function read(project: string, file: string): string {
  return fs.readFileSync(path.join(project, file), 'utf-8')
}

function snapshot(project: string): Record<string, string> {
  const result: Record<string, string> = {}

  for (const file of listFiles(project)) {
    result[file] = crypto
      .createHash('sha256')
      .update(fs.readFileSync(path.join(project, file)))
      .digest('hex')
  }

  return result
}

function features(project: string): string[] {
  return JSON.parse(read(project, 'cli.config.json')).features
}

function placeholders(project: string): string[] {
  return listFiles(project).flatMap((file) => {
    const matches = read(project, file).match(/__[A-Za-z][A-Za-z0-9_]*__/g) ?? []

    return matches.map((match) => `${file}: ${match}`)
  })
}

afterEach(() => {
  for (const dir of dirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

describe.each(Object.values(DbType))('auth contract (%s)', (orm) => {
  it('generates the same auth surface with the ORM-specific repository', async () => {
    const project = await scaffoldProject({ root: tmpRoot(), orm, logger: silentLogger })

    for (const file of [
      'src/modules/auth/auth.controller.ts',
      'src/modules/auth/auth.service.ts',
      'src/modules/auth/auth.tokens.ts',
      'src/modules/auth/auth.types.ts',
      'src/modules/auth/auth.validator.ts',
      'src/modules/auth/auth.mailer.ts',
      'src/modules/auth/auth.repository.ts',
      'src/middlewares/passport.ts',
      'src/utils/hash.ts',
      'src/notifications/emails/password_reset.email.ts',
      'src/notifications/emails/verify_email.email.ts',
      'src/templates/auth/password-reset.hbs',
      'src/templates/auth/verify-email.hbs',
    ]) {
      expect(fs.existsSync(path.join(project, file)), file).toBe(true)
    }

    expect(read(project, 'src/modules/auth/auth.mailer.ts')).toContain('Mailable.from')
    expect(read(project, 'src/modules/auth/auth.mailer.ts')).not.toContain('sendNotification')
    expect(read(project, 'src/modules/auth/auth.service.ts')).not.toMatch(/from '(mongoose|typeorm|sequelize|@prisma)/)
    expect(read(project, 'src/modules/auth/auth.repository.ts')).not.toContain('@prisma/client')

    expect(read(project, 'src/config/index.ts')).toContain('FRONTEND_URL:')
    expect(read(project, '.env.example')).toContain('FRONTEND_URL=')
    expect(features(project)).toEqual(expect.arrayContaining(['orm', 'mailer', 'auth']))
    expect(placeholders(project)).toEqual([])
  })

  it('registers every endpoint with module routing', async () => {
    const project = await scaffoldProject({ root: tmpRoot(), orm, logger: silentLogger })
    const routes = read(project, 'src/modules/auth/auth.routes.ts')

    for (const endpoint of [
      "'/register'",
      "'/signup'",
      "'/login'",
      "'/logout'",
      "'/refresh-token'",
      "'/refresh'",
      "'/forgot-password'",
      "'/reset-password'",
      "'/resend-verification'",
      "'/verify-email/:id/:token'",
      "'/me'",
    ]) {
      expect(routes).toContain(endpoint)
    }

    expect(routes).toContain('authenticate')
  })

  it('registers every endpoint with file-based routing', async () => {
    const project = await scaffoldProject({
      root: tmpRoot(),
      orm,
      fileBasedRouting: true,
      logger: silentLogger,
    })
    const routes = discoverFileRoutes(path.join(project, 'src/routes'))

    expect(routes.map((route) => route.url).sort()).toEqual(
      [
        '/healthcheck',
        '/auth/register',
        '/auth/signup',
        '/auth/login',
        '/auth/logout',
        '/auth/refresh-token',
        '/auth/refresh',
        '/auth/forgot-password',
        '/auth/reset-password',
        '/auth/resend-verification',
        '/auth/me',
        '/auth/verify-email/:id/:token',
      ].sort()
    )

    const verify = routes.find((route) => route.url === '/auth/verify-email/:id/:token')
    expect(verify?.methods).toEqual(['GET'])
  })

  it('is idempotent when auth is installed twice', async () => {
    const project = await scaffoldProject({ root: tmpRoot(), orm, logger: silentLogger })
    const before = snapshot(project)
    const ctx = createContext({ cwd: project, logger: silentLogger, shell: new FakeShell() as never })

    await run(new AuthGenerator(ctx), { ctx, feature: 'auth' })

    expect(snapshot(project)).toEqual(before)
  })
})
