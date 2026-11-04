import crypto from 'crypto'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { afterEach, describe, expect, it } from 'vitest'
import { createContext } from '../../src/context'
import { NotificationsGenerator } from '../../src/generators/notifications.generator'
import { run } from '../../src/run'
import { DbType } from '../../src/types'
import { discoverFileRoutes } from '../../src/utils/file_routes'
import { FakeShell, listFiles, scaffoldProject, silentLogger } from '../helpers/project'

const dirs: string[] = []

function tmpRoot(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nec-notifications-contract-'))
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

describe.each(Object.values(DbType))('notifications contract (%s)', (orm) => {
  it('generates the shared module with the ORM-specific repository', async () => {
    const project = await scaffoldProject({
      root: tmpRoot(),
      orm,
      installNotifications: true,
      logger: silentLogger,
    })

    for (const file of [
      'src/modules/notifications/notifications.types.ts',
      'src/modules/notifications/notifications.store.ts',
      'src/modules/notifications/notifications.service.ts',
      'src/modules/notifications/notifications.controller.ts',
      'src/modules/notifications/notifications.validator.ts',
      'src/modules/notifications/notifications.repository.ts',
      'src/notifications/channels/database.channel.ts',
      'src/notifications/channels/index.ts',
      'src/notifications/events.ts',
    ]) {
      expect(fs.existsSync(path.join(project, file)), file).toBe(true)
    }

    expect(read(project, 'src/modules/notifications/notifications.service.ts')).toContain('Notifiable.from')
    expect(read(project, 'src/notifications/notifications/notifiable.ts')).toContain('requireStore')
    expect(read(project, 'src/modules/notifications/notifications.repository.ts')).toContain('notificationRepository')
    expect(read(project, 'src/notifications/channels/index.ts')).toContain('registerNotificationStore')

    expect(read(project, 'src/config/index.ts')).toContain('FRONTEND_URL:')
    expect(features(project)).toEqual(expect.arrayContaining(['orm', 'mailer', 'auth', 'notifications']))
    expect(placeholders(project)).toEqual([])
  })

  it('registers every endpoint with module routing', async () => {
    const project = await scaffoldProject({
      root: tmpRoot(),
      orm,
      installNotifications: true,
      logger: silentLogger,
    })
    const routes = read(project, 'src/modules/notifications/notifications.routes.ts')

    for (const endpoint of ["'/'", "'/count'", "'/:id'", "'/read'", "'/:id/read'"]) {
      expect(routes).toContain(endpoint)
    }

    expect(routes).toContain('authenticate')
  })

  it('registers every endpoint with file-based routing', async () => {
    const project = await scaffoldProject({
      root: tmpRoot(),
      orm,
      fileBasedRouting: true,
      installNotifications: true,
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
        '/notifications',
        '/notifications/count',
        '/notifications/read',
        '/notifications/:id',
        '/notifications/:id/read',
      ].sort()
    )

    const detail = routes.find((route) => route.url === '/notifications/:id')
    expect(detail?.methods.sort()).toEqual(['DELETE', 'GET'])
  })

  it('is idempotent', async () => {
    const project = await scaffoldProject({
      root: tmpRoot(),
      orm,
      installNotifications: true,
      logger: silentLogger,
    })
    const before = snapshot(project)
    const ctx = createContext({ cwd: project, logger: silentLogger, shell: new FakeShell() as never })

    await run(new NotificationsGenerator(ctx), { ctx, feature: 'notifications' })

    expect(snapshot(project)).toEqual(before)
  })
})

describe('notifications with push and socket', () => {
  it('registers push and socket routes and channels', async () => {
    const project = await scaffoldProject({
      root: tmpRoot(),
      orm: DbType.TYPEORM,
      fileBasedRouting: true,
      installPush: true,
      installSocket: true,
      installNotifications: true,
      logger: silentLogger,
    })
    const routes = discoverFileRoutes(path.join(project, 'src/routes'))

    expect(routes.map((route) => route.url)).toEqual(
      expect.arrayContaining(['/notifications/push/key', '/notifications/push/subscribe', '/notifications/push/unsubscribe'])
    )

    expect(read(project, 'src/notifications/channels/index.ts')).toContain("import './push.channel'")
    expect(read(project, 'src/notifications/channels/index.ts')).toContain("import './socket.channel'")
  })
})
