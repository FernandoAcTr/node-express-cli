import fs from 'fs'
import os from 'os'
import path from 'path'
import { afterEach, describe, expect, it } from 'vitest'
import { Context, createContext } from '../../src/context'
import { PushGenerator } from '../../src/generators/push.generator'
import { SocketsGenerator } from '../../src/generators/sockets.generator'
import { Logger } from '../../src/logger'

const dirs: string[] = []

const silentLogger: Logger = {
  info: () => undefined,
  success: () => undefined,
  warn: () => undefined,
  error: () => undefined,
}

function project(packageManager = 'npm'): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nec-push-'))
  dirs.push(dir)
  fs.writeFileSync(path.join(dir, 'cli.config.json'), JSON.stringify({ package_manger: packageManager, features: [] }))
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 'app', scripts: {} }, null, 2))
  fs.mkdirSync(path.join(dir, 'src/config'), { recursive: true })
  fs.writeFileSync(
    path.join(dir, 'src/main.ts'),
    [
      "import express from 'express'",
      '// @nec:imports',
      '',
      'const app = express()',
      'const CUSTOM_LINE = true',
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

function context(cwd: string, logger: Logger = silentLogger): Context {
  return createContext({ cwd, logger })
}

function count(content: string, needle: string): number {
  return content.split(needle).length - 1
}

afterEach(() => {
  for (const dir of dirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

describe('PushGenerator', () => {
  it('wires main.ts, config, env and package.json', async () => {
    const cwd = project()

    await new PushGenerator(context(cwd)).post()

    const main = fs.readFileSync(path.join(cwd, 'src/main.ts'), 'utf-8')
    const config = fs.readFileSync(path.join(cwd, 'src/config/index.ts'), 'utf-8')
    const env = fs.readFileSync(path.join(cwd, '.env.example'), 'utf-8')
    const pkg = JSON.parse(fs.readFileSync(path.join(cwd, 'package.json'), 'utf-8'))

    expect(main).toContain("import webpush from 'web-push'")
    expect(main).toContain('setVapidDetails(')
    expect(main).toContain('const CUSTOM_LINE = true')
    expect(config).toContain('VAPID:')
    expect(env).toContain('VAPID_PUBLIC_KEY=')
    expect(env).toContain('npx web-push generate-vapid-keys')
    expect(pkg.scripts['vapid:generate']).toBe('npx web-push generate-vapid-keys')
  })

  it('is idempotent', async () => {
    const cwd = project()

    await new PushGenerator(context(cwd)).post()
    await new PushGenerator(context(cwd)).post()

    const main = fs.readFileSync(path.join(cwd, 'src/main.ts'), 'utf-8')
    const config = fs.readFileSync(path.join(cwd, 'src/config/index.ts'), 'utf-8')
    const env = fs.readFileSync(path.join(cwd, '.env.example'), 'utf-8')

    expect(count(main, "import webpush from 'web-push'")).toBe(1)
    expect(count(main, 'setVapidDetails(')).toBe(1)
    expect(count(config, 'VAPID:')).toBe(1)
    expect(count(env, 'VAPID_PUBLIC_KEY=')).toBe(1)
    expect(count(env, '# @nec:webpush:start')).toBe(1)
  })

  it('does not touch anything when main.ts has no anchors', async () => {
    const cwd = project()
    const mainFile = path.join(cwd, 'src/main.ts')
    const configFile = path.join(cwd, 'src/config/index.ts')
    const envFile = path.join(cwd, '.env.example')
    const packageFile = path.join(cwd, 'package.json')
    const originalMain = 'export const server = null\n'
    const originalConfig = fs.readFileSync(configFile, 'utf-8')
    const originalEnv = fs.readFileSync(envFile, 'utf-8')
    const originalPackage = fs.readFileSync(packageFile, 'utf-8')
    const warnings: string[] = []
    fs.writeFileSync(mainFile, originalMain)

    await new PushGenerator(context(cwd, { ...silentLogger, warn: (message: string) => warnings.push(message) })).post()

    expect(warnings.join('\n')).toContain('@nec:imports')
    expect(fs.readFileSync(mainFile, 'utf-8')).toBe(originalMain)
    expect(fs.readFileSync(configFile, 'utf-8')).toBe(originalConfig)
    expect(fs.readFileSync(envFile, 'utf-8')).toBe(originalEnv)
    expect(fs.readFileSync(packageFile, 'utf-8')).toBe(originalPackage)
  })

  it('uses the package runner of the selected package manager', async () => {
    const cwd = project('bun')

    await new PushGenerator(context(cwd)).post()

    const pkg = JSON.parse(fs.readFileSync(path.join(cwd, 'package.json'), 'utf-8'))
    const env = fs.readFileSync(path.join(cwd, '.env.example'), 'utf-8')

    expect(pkg.scripts['vapid:generate']).toBe('bunx web-push generate-vapid-keys')
    expect(env).toContain('bunx web-push generate-vapid-keys')
    expect(JSON.stringify(pkg)).not.toMatch(/\bnpm\b|\bnpx\b/)
  })

  it('produces the same main.ts regardless of install order', async () => {
    const pushFirst = project()
    const socketFirst = project()

    await new PushGenerator(context(pushFirst)).post()
    await new SocketsGenerator(context(pushFirst)).copyFiles()

    await new SocketsGenerator(context(socketFirst)).copyFiles()
    await new PushGenerator(context(socketFirst)).post()

    expect(fs.readFileSync(path.join(pushFirst, 'src/main.ts'), 'utf-8')).toBe(
      fs.readFileSync(path.join(socketFirst, 'src/main.ts'), 'utf-8')
    )
  })
})
