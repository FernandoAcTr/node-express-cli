import fs from 'fs'
import os from 'os'
import path from 'path'
import { afterEach, describe, expect, it } from 'vitest'
import { createContext } from '../src/context'
import { ConfigService } from '../src/services/config.service'
import { DbType } from '../src/types'

const dirs: string[] = []

const silentLogger = {
  info: () => undefined,
  success: () => undefined,
  warn: () => undefined,
  error: () => undefined,
}

function tmpDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nec-context-'))
  dirs.push(dir)
  return dir
}

afterEach(() => {
  for (const dir of dirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

describe('createContext', () => {
  it('reports installed features from cli.config.json', () => {
    const cwd = tmpDir()
    fs.writeFileSync(
      path.join(cwd, 'cli.config.json'),
      JSON.stringify({ orm: 'typeorm', fileBasedRouting: true, package_manger: 'npm', features: ['orm'] })
    )

    const ctx = createContext({ cwd, logger: silentLogger })

    expect(ctx.has('orm')).toBe(true)
    expect(ctx.has('fileBasedRouting')).toBe(true)
  })

  it('falls back to a legacy ORM value and warns only once', () => {
    const cwd = tmpDir()
    fs.writeFileSync(path.join(cwd, 'cli.config.json'), JSON.stringify({ orm: 'typeorm', fileBasedRouting: false, package_manger: 'npm' }))
    const warnings: string[] = []
    const ctx = createContext({
      cwd,
      logger: { ...silentLogger, warn: (message: string) => warnings.push(message) },
    })

    expect(ctx.has('orm')).toBe(true)
    expect(ctx.has('orm')).toBe(true)
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toContain('orm')
  })

  it('uses features as the source of truth for the ORM feature', () => {
    const cwd = tmpDir()
    fs.writeFileSync(
      path.join(cwd, 'cli.config.json'),
      JSON.stringify({ fileBasedRouting: false, package_manger: 'npm', features: ['orm'] })
    )
    const warnings: string[] = []
    const ctx = createContext({
      cwd,
      logger: { ...silentLogger, warn: (message: string) => warnings.push(message) },
    })

    expect(ctx.has('orm')).toBe(true)
    expect(warnings).toEqual([])
  })

  it('reports missing features', () => {
    const cwd = tmpDir()
    fs.writeFileSync(path.join(cwd, 'cli.config.json'), JSON.stringify({ fileBasedRouting: false, package_manger: 'npm' }))

    const ctx = createContext({ cwd })

    expect(ctx.has('orm')).toBe(false)
    expect(ctx.has('fileBasedRouting')).toBe(false)
  })

  it('uses the provided config service', () => {
    const config = new ConfigService(tmpDir())
    const ctx = createContext({ config })

    expect(ctx.config).toBe(config)
    expect(ctx.project.cwd).toBe(config.cwd)
  })

  it('exposes a wiring service scoped to the project', () => {
    const cwd = tmpDir()
    const ctx = createContext({ cwd })

    expect(ctx.wiring).toBeDefined()
    expect(ctx.wiring.missing('src/main.ts', ['imports']).map((patch) => patch.status)).toEqual(['file-missing'])
  })

  it('exposes --force through the context and the project service', () => {
    const cwd = tmpDir()
    const ctx = createContext({ cwd, force: true })

    expect(ctx.force).toBe(true)
    expect(ctx.project.forDirectory('app').write('src/a.ts', 'a\n', 'create').status).toBe('created')
  })

  it('exposes typed args and derives the global flags from them', () => {
    const cwd = tmpDir()
    const args = { positionals: ['route:list'], flags: { force: true, 'dry-run': true } }
    const ctx = createContext({ cwd, args, logger: silentLogger })

    expect(ctx.args).toBe(args)
    expect(ctx.force).toBe(true)
    expect(ctx.dryRun).toBe(true)
  })

  it('defaults args and dry-run to empty values', () => {
    const ctx = createContext({ cwd: tmpDir() })

    expect(ctx.args).toEqual({ positionals: [], flags: {} })
    expect(ctx.force).toBe(false)
    expect(ctx.dryRun).toBe(false)
  })

  it('detects whether the cwd is a generated project', () => {
    const cwd = tmpDir()
    const ctx = createContext({ cwd })

    expect(ctx.project.isProject()).toBe(false)

    fs.writeFileSync(path.join(cwd, 'cli.config.json'), '{}')
    fs.writeFileSync(path.join(cwd, 'package.json'), '{}')

    expect(ctx.project.isProject()).toBe(true)
  })

  it('marks a feature and persists it in cli.config.json', () => {
    const cwd = tmpDir()
    const ctx = createContext({ cwd, logger: silentLogger })

    expect(ctx.has('push')).toBe(false)
    ctx.markInstalled('push')

    expect(ctx.has('push')).toBe(true)
    expect(new ConfigService(cwd).getConfig().features).toEqual(['push'])
  })

  it('persists feature metadata atomically with the feature', () => {
    const cwd = tmpDir()
    const ctx = createContext({ cwd, logger: silentLogger })

    ctx.markInstalled('orm', { orm: DbType.TYPEORM })

    expect(new ConfigService(cwd).getConfig()).toMatchObject({
      orm: DbType.TYPEORM,
      features: ['orm'],
    })
  })
})
