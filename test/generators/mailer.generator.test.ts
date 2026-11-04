import fs from 'fs'
import os from 'os'
import path from 'path'
import { afterEach, describe, expect, it } from 'vitest'
import { createContext } from '../../src/context'
import { SpecGenerator } from '../../src/installers'
import { mailerSpec } from '../../src/installers/specs/mailer.spec'
import { Logger } from '../../src/logger'

const dirs: string[] = []

const silentLogger: Logger = {
  info: () => undefined,
  success: () => undefined,
  warn: () => undefined,
  error: () => undefined,
}

function project(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nec-mailer-'))
  dirs.push(dir)
  fs.writeFileSync(path.join(dir, 'cli.config.json'), JSON.stringify({ package_manger: 'npm', features: [] }))
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 'app' }))
  return dir
}

function generator(cwd: string, logger: Logger = silentLogger): SpecGenerator {
  return new SpecGenerator(createContext({ cwd, logger }), mailerSpec)
}

afterEach(() => {
  for (const dir of dirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

describe('mailer installer', () => {
  it('installs the class-based email and notification system', async () => {
    const cwd = project()

    await generator(cwd).copyFiles()

    for (const file of [
      'src/utils/mailer.ts',
      'src/notifications/registry.ts',
      'src/notifications/index.ts',
      'src/notifications/emails/mailable.ts',
      'src/notifications/emails/welcome.email.ts',
      'src/notifications/notifications/notifiable.ts',
      'src/notifications/notifications/welcome.notification.ts',
      'src/templates/notification/notification.hbs',
      'src/templates/emails/welcome.hbs',
    ]) {
      expect(fs.existsSync(path.join(cwd, file)), file).toBe(true)
    }

    const mailer = fs.readFileSync(path.join(cwd, 'src/utils/mailer.ts'), 'utf-8')
    expect(mailer).toContain('export interface MailOptions')
    expect(mailer).toContain('template?: string')

    const mailable = fs.readFileSync(path.join(cwd, 'src/notifications/emails/mailable.ts'), 'utf-8')
    expect(mailable).toContain('export class Mailable')
    expect(mailable).toContain("import { Mailer, MailOptions } from '@/utils/mailer'")

    const notifiable = fs.readFileSync(path.join(cwd, 'src/notifications/notifications/notifiable.ts'), 'utf-8')
    expect(notifiable).toContain('export class Notifiable')
    expect(notifiable).not.toMatch(/from '@\/(entities|database|modules)/)
  })

  it('is idempotent, including binary templates', async () => {
    const cwd = project()
    const warnings: string[] = []
    const logger: Logger = { ...silentLogger, warn: (message: string) => warnings.push(message) }

    await generator(cwd).copyFiles()
    const firstLogo = fs.readFileSync(path.join(cwd, 'src/templates/notification/logo.png'))

    await generator(cwd, logger).copyFiles()
    const secondLogo = fs.readFileSync(path.join(cwd, 'src/templates/notification/logo.png'))

    expect(secondLogo.equals(firstLogo)).toBe(true)
    expect(warnings).toEqual([])
  })

  it('does not overwrite a custom mailer.ts', async () => {
    const cwd = project()
    const mailer = path.join(cwd, 'src/utils/mailer.ts')

    await generator(cwd).copyFiles()
    fs.writeFileSync(mailer, '// custom mailer\n')

    await generator(cwd).copyFiles()

    expect(fs.readFileSync(mailer, 'utf-8')).toBe('// custom mailer\n')
  })
})
