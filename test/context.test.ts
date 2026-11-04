import fs from 'fs'
import os from 'os'
import path from 'path'
import { afterEach, describe, expect, it } from 'vitest'
import { createContext } from '../src/context'
import { ConfigService } from '../src/services/config.service'

const dirs: string[] = []

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
    fs.writeFileSync(path.join(cwd, 'cli.config.json'), JSON.stringify({ orm: 'typeorm', fileBasedRouting: true, package_manger: 'npm' }))

    const ctx = createContext({ cwd })

    expect(ctx.has('orm')).toBe(true)
    expect(ctx.has('fileBasedRouting')).toBe(true)
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
    const ctx = createContext({ cwd })

    expect(ctx.has('push')).toBe(false)
    ctx.markInstalled('push')

    expect(ctx.has('push')).toBe(true)
    expect(new ConfigService(cwd).getConfig().features).toEqual(['push'])
  })
})
