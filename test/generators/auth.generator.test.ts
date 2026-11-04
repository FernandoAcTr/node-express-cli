import fs from 'fs'
import os from 'os'
import path from 'path'
import { afterEach, describe, expect, it } from 'vitest'
import { createContext } from '../../src/context'
import { AuthGenerator } from '../../src/generators/auth.generator'
import { Logger } from '../../src/logger'

const dirs: string[] = []

const silentLogger: Logger = {
  info: () => undefined,
  success: () => undefined,
  warn: () => undefined,
  error: () => undefined,
}

function project(orm = 'typeorm'): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nec-auth-'))
  dirs.push(dir)
  fs.writeFileSync(
    path.join(dir, 'cli.config.json'),
    JSON.stringify({ orm, package_manger: 'npm', fileBasedRouting: false, features: [] })
  )
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 'app' }))
  return dir
}

function generator(cwd: string, force = false, logger: Logger = silentLogger): AuthGenerator {
  return new AuthGenerator(createContext({ cwd, force, logger }))
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

  it('never overwrites an existing Prisma schema without --force', async () => {
    const cwd = project('prisma')
    const schema = path.join(cwd, 'src/database/prisma/schema.prisma')
    fs.mkdirSync(path.dirname(schema), { recursive: true })
    fs.writeFileSync(schema, 'model User {\n  id Int @id\n}\n')

    await generator(cwd).copyFiles()

    expect(fs.readFileSync(schema, 'utf-8')).toBe('model User {\n  id Int @id\n}\n')
  })
})
