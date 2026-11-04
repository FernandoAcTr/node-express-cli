import fs from 'fs'
import os from 'os'
import path from 'path'
import { afterEach, describe, expect, it } from 'vitest'
import { ConfigService } from '../../src/services/config.service'
import { ProjectService } from '../../src/services/project.service'
import { WiringService } from '../../src/wiring'

const dirs: string[] = []

function project(options: { configMarker?: boolean; envMarker?: boolean } = {}): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nec-wiring-'))
  dirs.push(dir)
  fs.writeFileSync(path.join(dir, 'cli.config.json'), JSON.stringify({ package_manger: 'npm', features: [] }))
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
    [
      'export const config = Object.freeze({',
      '  PORT: 3000,',
      ...(options.configMarker === false ? [] : ['  // @nec:config']),
      '})',
      '',
    ].join('\n')
  )
  fs.writeFileSync(path.join(dir, '.env.example'), ['PORT=3000', ...(options.envMarker === false ? [] : ['# @nec:env']), ''].join('\n'))
  return dir
}

function wiring(cwd: string): WiringService {
  return new WiringService({
    cwd,
    config: new ConfigService(cwd),
    project: new ProjectService(cwd),
  })
}

function count(content: string, needle: string): number {
  return content.split(needle).length - 1
}

afterEach(() => {
  for (const dir of dirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

describe('WiringService', () => {
  it('applies imports and main runtime atomically and updates the manifest', () => {
    const cwd = project()
    const service = wiring(cwd)

    const result = service.transaction((wire) => {
      wire.import("import webpush from 'web-push'")
      wire.main('beforeListen', 'webpush.setVapidDetails()', { key: 'setVapidDetails(' })
    })

    const main = fs.readFileSync(path.join(cwd, 'src/main.ts'), 'utf-8')

    expect(result.changed).toContain(path.join(cwd, 'src/main.ts'))
    expect(result.warnings).toEqual([])
    expect(main).toContain("import webpush from 'web-push'")
    expect(main).toContain('webpush.setVapidDetails()')
    expect(main).toContain('const CUSTOM_LINE = true')
    expect(fs.existsSync(path.join(cwd, '.nec/manifest.json'))).toBe(true)
  })

  it('is idempotent', () => {
    const cwd = project()
    const service = wiring(cwd)

    const first = service.transaction((wire) => {
      wire.import("import webpush from 'web-push'")
      wire.main('beforeListen', 'webpush.setVapidDetails()', { key: 'setVapidDetails(' })
    })
    const second = service.transaction((wire) => {
      wire.import("import webpush from 'web-push'")
      wire.main('beforeListen', 'webpush.setVapidDetails()', { key: 'setVapidDetails(' })
    })

    const main = fs.readFileSync(path.join(cwd, 'src/main.ts'), 'utf-8')

    expect(first.changed).toContain(path.join(cwd, 'src/main.ts'))
    expect(second.skipped).toContain(path.join(cwd, 'src/main.ts'))
    expect(count(main, "import webpush from 'web-push'")).toBe(1)
    expect(count(main, 'setVapidDetails(')).toBe(1)
  })

  it('aborts the whole file when an anchor is missing', () => {
    const cwd = project()
    const mainFile = path.join(cwd, 'src/main.ts')
    const original = fs.readFileSync(mainFile, 'utf-8')
    const service = wiring(cwd)

    const result = service.transaction((wire) => {
      wire.import("import webpush from 'web-push'")
      wire.main('beforeApp', 'const socket = new SocketIO(server)', { key: 'new SocketIO(server)' })
    })

    expect(result.changed).toEqual([])
    expect(result.warnings.length).toBeGreaterThan(0)
    expect(fs.readFileSync(mainFile, 'utf-8')).toBe(original)
  })

  it('writes config and env through their anchors', () => {
    const cwd = project()
    const service = wiring(cwd)

    const result = service.transaction((wire) => {
      wire.config('  VAPID: { PUBLIC_KEY: process.env.VAPID_PUBLIC_KEY },', { key: 'VAPID:' })
      wire.env('VAPID_PUBLIC_KEY=', { key: 'VAPID_PUBLIC_KEY' })
    })

    const config = fs.readFileSync(path.join(cwd, 'src/config/index.ts'), 'utf-8')
    const env = fs.readFileSync(path.join(cwd, '.env.example'), 'utf-8')

    expect(result.changed).toHaveLength(2)
    expect(config).toContain('VAPID:')
    expect(config.indexOf('// @nec:config')).toBeLessThan(config.indexOf('VAPID:'))
    expect(env).toContain('VAPID_PUBLIC_KEY=')
    expect(env.indexOf('# @nec:env')).toBeLessThan(env.indexOf('VAPID_PUBLIC_KEY='))

    const second = service.transaction((wire) => {
      wire.config('  VAPID: { PUBLIC_KEY: process.env.VAPID_PUBLIC_KEY },', { key: 'VAPID:' })
      wire.env('VAPID_PUBLIC_KEY=', { key: 'VAPID_PUBLIC_KEY' })
    })

    expect(second.skipped).toHaveLength(2)
    expect(count(fs.readFileSync(path.join(cwd, 'src/config/index.ts'), 'utf-8'), 'VAPID:')).toBe(1)
    expect(count(fs.readFileSync(path.join(cwd, '.env.example'), 'utf-8'), 'VAPID_PUBLIC_KEY=')).toBe(1)
  })

  it('leaves config untouched and warns when the anchor is missing', () => {
    const cwd = project({ configMarker: false })
    const configFile = path.join(cwd, 'src/config/index.ts')
    const original = fs.readFileSync(configFile, 'utf-8')

    const result = wiring(cwd).transaction((wire) => {
      wire.config('  VAPID: {},', { key: 'VAPID:' })
    })

    expect(result.warnings.join('\n')).toContain('@nec:config')
    expect(fs.readFileSync(configFile, 'utf-8')).toBe(original)
  })

  it('replaces an env block when the command changes', () => {
    const cwd = project()
    const service = wiring(cwd)

    service.transaction((wire) => {
      wire.envBlock('webpush', 'VAPID_PUBLIC_KEY=npx', { key: 'VAPID_PUBLIC_KEY' })
    })
    const result = service.transaction((wire) => {
      wire.envBlock('webpush', 'VAPID_PUBLIC_KEY=bunx', { key: 'VAPID_PUBLIC_KEY' })
    })

    const env = fs.readFileSync(path.join(cwd, '.env.example'), 'utf-8')

    expect(result.changed).toContain(path.join(cwd, '.env.example'))
    expect(env).toContain('VAPID_PUBLIC_KEY=bunx')
    expect(env).not.toContain('VAPID_PUBLIC_KEY=npx')
    expect(count(env, '# @nec:webpush:start')).toBe(1)
  })

  it('writes package.json scripts without duplicating them', () => {
    const cwd = project()
    const service = wiring(cwd)

    const first = service.script('vapid:generate', 'npx web-push generate-vapid-keys')
    const second = service.script('vapid:generate', 'npx web-push generate-vapid-keys')

    const pkg = JSON.parse(fs.readFileSync(path.join(cwd, 'package.json'), 'utf-8'))

    expect(first.changed).toContain(path.join(cwd, 'package.json'))
    expect(second.skipped).toContain(path.join(cwd, 'package.json'))
    expect(pkg.scripts['vapid:generate']).toBe('npx web-push generate-vapid-keys')
  })
})
