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
