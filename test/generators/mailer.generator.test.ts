import fs from 'fs'
import os from 'os'
import path from 'path'
import { afterEach, describe, expect, it } from 'vitest'
import { createContext } from '../../src/context'
import { MailerGenerator } from '../../src/generators/mailer.generator'
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

function generator(cwd: string, logger: Logger = silentLogger): MailerGenerator {
  return new MailerGenerator(createContext({ cwd, logger }))
}

afterEach(() => {
  for (const dir of dirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

describe('MailerGenerator', () => {
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
