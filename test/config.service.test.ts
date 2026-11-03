import fs from 'fs'
import os from 'os'
import path from 'path'
import { afterEach, describe, expect, it } from 'vitest'
import { ConfigService } from '../src/services/config.service'
import { PackageManager } from '../src/types'

const dirs: string[] = []

function tmpDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nec-config-'))
  dirs.push(dir)
  return dir
}

afterEach(() => {
  for (const dir of dirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

describe('ConfigService', () => {
  it('resolves a config service for another directory', () => {
    const root = tmpDir()
    const config = new ConfigService(root)

    expect(config.forDirectory('my-app').cwd).toBe(path.join(root, 'my-app'))
  })

  it('writes and reads cli.config.json for its directory', () => {
    const root = tmpDir()
    const config = new ConfigService(root)

    config.writeConfig({ package_manger: PackageManager.PNPM, fileBasedRouting: true })

    expect(config.getConfig()).toMatchObject({
      package_manger: PackageManager.PNPM,
      fileBasedRouting: true,
    })
  })

  it('writes scripts and is idempotent', () => {
    const root = tmpDir()
    fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ name: 'app' }))
    const config = new ConfigService(root)

    expect(config.setScript('test', 'jest')).toBe(true)
    expect(config.setScript('test', 'jest')).toBe(false)
    expect(JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf-8')).scripts.test).toBe('jest')
  })
})
