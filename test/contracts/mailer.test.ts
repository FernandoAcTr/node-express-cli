import crypto from 'crypto'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { afterEach, describe, expect, it } from 'vitest'
import { createContext } from '../../src/context'
import { SpecGenerator } from '../../src/installers'
import { mailerSpec } from '../../src/installers/specs/mailer.spec'
import { run } from '../../src/run'
import { FakeShell, listFiles, scaffoldProject, silentLogger } from '../helpers/project'

const dirs: string[] = []

function tmpRoot(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nec-mailer-contract-'))
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

describe('mailer contract', () => {
  it('installs the email and notification classes without ORM, push or socket', async () => {
    const project = await scaffoldProject({
      root: tmpRoot(),
      installOrm: false,
      installAuth: false,
      installMailer: true,
      logger: silentLogger,
    })

    for (const file of [
      'src/utils/mailer.ts',
      'src/notifications/registry.ts',
      'src/notifications/emails/mailable.ts',
      'src/notifications/emails/welcome.email.ts',
      'src/notifications/notifications/notifiable.ts',
      'src/notifications/notifications/welcome.notification.ts',
      'src/templates/notification/notification.hbs',
      'src/templates/emails/welcome.hbs',
    ]) {
      expect(fs.existsSync(path.join(project, file)), file).toBe(true)
    }

    expect(fs.existsSync(path.join(project, 'src/entities/notification.entity.ts'))).toBe(false)
    expect(fs.existsSync(path.join(project, 'src/modules/notifications'))).toBe(false)
    expect(fs.existsSync(path.join(project, 'src/socket.ts'))).toBe(false)
    expect(read(project, 'src/config/index.ts')).toContain('MAILER:')
    expect(read(project, '.env.example')).toContain('MAIL_HOST=')
    expect(features(project)).toContain('mailer')
    expect(placeholders(project)).toEqual([])
  })

  it('is idempotent', async () => {
    const project = await scaffoldProject({
      root: tmpRoot(),
      installOrm: false,
      installAuth: false,
      installMailer: true,
      logger: silentLogger,
    })
    const before = snapshot(project)
    const ctx = createContext({ cwd: project, logger: silentLogger, shell: new FakeShell() as never })

    await run(new SpecGenerator(ctx, mailerSpec), { ctx, feature: 'mailer' })

    expect(snapshot(project)).toEqual(before)
  })
})
