import crypto from 'crypto'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { afterEach, describe, expect, it } from 'vitest'
import { createContext } from '../../src/context'
import { CliError } from '../../src/errors'
import { NotificationsGenerator } from '../../src/generators/notifications.generator'
import { run } from '../../src/run'
import { DbType, ValidationLibrary } from '../../src/types'
import { FakeShell, listFiles, scaffoldProject, silentLogger } from '../helpers/project'

const dirs: string[] = []

function tmpRoot(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nec-notifications-'))
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

function context(project: string) {
  return createContext({ cwd: project, logger: silentLogger, shell: new FakeShell() as never })
}

afterEach(() => {
  for (const dir of dirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

describe.each(Object.values(DbType))('NotificationsGenerator (%s)', (orm) => {
  it('generates the shared module and the ORM-specific persistence', async () => {
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
      'src/modules/notifications/notifications.routes.ts',
      'src/modules/notifications/notifications.repository.ts',
      'src/notifications/channels/database.channel.ts',
      'src/notifications/channels/index.ts',
      'src/notifications/events.ts',
    ]) {
      expect(fs.existsSync(path.join(project, file)), file).toBe(true)
    }

    const repository = read(project, 'src/modules/notifications/notifications.repository.ts')
    expect(repository).toContain('notificationRepository')

    if (orm === DbType.PRISMA) {
      expect(read(project, 'src/database/prisma/schemas/notifications.prisma')).toContain('model Notification')
      expect(read(project, 'src/database/prisma/schema.prisma')).not.toContain('model Notification')
    } else {
      expect(fs.existsSync(path.join(project, 'src/entities/notification.entity.ts'))).toBe(true)
    }

    expect(features(project)).toEqual(expect.arrayContaining(['orm', 'mailer', 'auth', 'notifications']))
  })

  it('is idempotent', async () => {
    const project = await scaffoldProject({
      root: tmpRoot(),
      orm,
      installNotifications: true,
      logger: silentLogger,
    })
    const before = snapshot(project)
    const ctx = context(project)

    await run(new NotificationsGenerator(ctx), { ctx, feature: 'notifications' })

    expect(snapshot(project)).toEqual(before)
  })
})

describe('NotificationsGenerator validation library', () => {
  it('writes zod validators for notifications and push', async () => {
    const project = await scaffoldProject({
      root: tmpRoot(),
      orm: DbType.TYPEORM,
      installNotifications: true,
      installPush: true,
      validation: ValidationLibrary.ZOD,
      logger: silentLogger,
    })

    const notifications = read(project, 'src/modules/notifications/notifications.validator.ts')
    const push = read(project, 'src/modules/notifications/push/push.validator.ts')

    expect(notifications).toContain("import { z } from 'zod'")
    expect(notifications).toContain("validate(notificationIdSchema, 'params')")
    expect(push).toContain("import { z } from 'zod'")
    expect(push).toContain('subscribeSchema')
    expect(notifications).not.toContain('express-validator')
    expect(push).not.toContain('express-validator')
  })
})

describe('NotificationsGenerator channels', () => {
  it('adds push subscriptions and the socket channel when those features exist', async () => {
    const project = await scaffoldProject({
      root: tmpRoot(),
      orm: DbType.TYPEORM,
      installPush: true,
      installSocket: true,
      installNotifications: true,
      logger: silentLogger,
    })

    for (const file of [
      'src/modules/notifications/push/push.service.ts',
      'src/modules/notifications/push/push.controller.ts',
      'src/modules/notifications/push/push.repository.ts',
      'src/entities/push_subscription.entity.ts',
      'src/notifications/channels/push.channel.ts',
      'src/notifications/channels/socket.channel.ts',
    ]) {
      expect(fs.existsSync(path.join(project, file)), file).toBe(true)
    }

    expect(read(project, 'src/notifications/channels/index.ts')).toContain("import './push.channel'")
    expect(read(project, 'src/notifications/channels/index.ts')).toContain("import './socket.channel'")
    expect(read(project, 'src/notifications/events.ts')).toContain('Socket.emitToUser')
    expect(read(project, 'src/socket.ts')).toContain('static emitToUser')
  })

  it('does not copy push or socket files when those features are missing', async () => {
    const project = await scaffoldProject({
      root: tmpRoot(),
      orm: DbType.TYPEORM,
      installNotifications: true,
      logger: silentLogger,
    })

    expect(fs.existsSync(path.join(project, 'src/modules/notifications/push'))).toBe(false)
    expect(fs.existsSync(path.join(project, 'src/entities/push_subscription.entity.ts'))).toBe(false)
    expect(fs.existsSync(path.join(project, 'src/notifications/channels/push.channel.ts'))).toBe(false)
    expect(fs.existsSync(path.join(project, 'src/notifications/channels/socket.channel.ts'))).toBe(false)
    expect(read(project, 'src/notifications/events.ts')).not.toContain('Socket.emitToUser')
  })

  it('falls back to the no-op emitter when the installed socket template is old', async () => {
    const project = await scaffoldProject({
      root: tmpRoot(),
      orm: DbType.TYPEORM,
      installSocket: true,
      installNotifications: false,
      logger: silentLogger,
    })
    const socketFile = path.join(project, 'src/socket.ts')
    const current = fs.readFileSync(socketFile, 'utf-8')
    fs.writeFileSync(socketFile, current.replace(/  static emitToUser[\s\S]*?\n  }\n/, ''))

    const ctx = context(project)
    await run(new NotificationsGenerator(ctx), { ctx, feature: 'notifications' })

    expect(read(project, 'src/notifications/events.ts')).not.toContain('Socket.emitToUser')
    expect(fs.existsSync(path.join(project, 'src/notifications/channels/socket.channel.ts'))).toBe(false)
  })

  it('requires auth before writing anything', async () => {
    const project = await scaffoldProject({
      root: tmpRoot(),
      installAuth: false,
      installMailer: true,
      logger: silentLogger,
    })
    const error = await new NotificationsGenerator(context(project)).pre().catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(CliError)
    expect((error as CliError).hint).toContain('install:auth')
  })
})
