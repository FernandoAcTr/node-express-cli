import fs from 'fs'
import os from 'os'
import path from 'path'
import { afterEach, describe, expect, it } from 'vitest'
import { ConfigService } from '../src/services/config.service'
import { DbType, PackageManager, ValidationLibrary } from '../src/types'
import { CliError } from '../src/errors'

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

  it('defaults to express-validator when cli.config.json does not exist', () => {
    expect(new ConfigService(tmpDir()).getConfig().validation).toBe(ValidationLibrary.EXPRESS_VALIDATOR)
  })

  it('writes and reads cli.config.json for its directory', () => {
    const root = tmpDir()
    const config = new ConfigService(root)

    config.writeConfig({ package_manger: PackageManager.PNPM, fileBasedRouting: true, validation: ValidationLibrary.ZOD })

    expect(config.getConfig()).toMatchObject({
      package_manger: PackageManager.PNPM,
      fileBasedRouting: true,
      validation: ValidationLibrary.ZOD,
      features: [],
    })
  })

  it('merges new values without losing the existing configuration', () => {
    const root = tmpDir()
    const config = new ConfigService(root)

    config.writeConfig({ package_manger: PackageManager.YARN, fileBasedRouting: true })
    config.writeConfig({ orm: DbType.SEQUELIZE })
    config.writeConfig({ features: ['orm', 'auth'] })

    expect(config.getConfig()).toMatchObject({
      orm: DbType.SEQUELIZE,
      package_manger: PackageManager.YARN,
      fileBasedRouting: true,
      features: ['orm', 'auth'],
    })
  })

  it('marks features idempotently', () => {
    const root = tmpDir()
    const config = new ConfigService(root)

    expect(config.markFeature('push')).toBe(true)
    expect(config.markFeature('push')).toBe(false)
    expect(config.hasFeature('push')).toBe(true)
    expect(config.getConfig().features).toEqual(['push'])
  })

  it('writes feature metadata together with the feature', () => {
    const root = tmpDir()
    const config = new ConfigService(root)

    expect(config.markFeature('orm', { orm: DbType.TYPEORM })).toBe(true)
    expect(config.getConfig()).toMatchObject({
      orm: DbType.TYPEORM,
      features: ['orm'],
    })
  })

  it('updates metadata without duplicating the feature', () => {
    const root = tmpDir()
    const config = new ConfigService(root)

    config.markFeature('orm', { orm: DbType.TYPEORM })

    expect(config.markFeature('orm', { orm: DbType.SEQUELIZE })).toBe(true)
    expect(config.getConfig()).toMatchObject({
      orm: DbType.SEQUELIZE,
      features: ['orm'],
    })
    expect(config.markFeature('orm', { orm: DbType.SEQUELIZE })).toBe(false)
  })

  it('preserves unknown keys when merging', () => {
    const root = tmpDir()
    const file = path.join(root, 'cli.config.json')
    fs.writeFileSync(file, JSON.stringify({ package_manger: 'npm', fileBasedRouting: false, custom: 'keep-me' }))

    new ConfigService(root).writeConfig({ features: ['push'] })

    expect(JSON.parse(fs.readFileSync(file, 'utf-8')).custom).toBe('keep-me')
  })

  it('normalizes invalid values instead of failing the whole command', () => {
    const root = tmpDir()
    fs.writeFileSync(
      path.join(root, 'cli.config.json'),
      JSON.stringify({
        orm: 'not-an-orm',
        package_manger: 'not-a-manager',
        fileBasedRouting: 'yes',
        validation: 'not-a-library',
        features: [1, 'push', 'push', ''],
      })
    )

    expect(new ConfigService(root).getConfig()).toMatchObject({
      orm: undefined,
      package_manger: PackageManager.NPM,
      fileBasedRouting: false,
      validation: ValidationLibrary.EXPRESS_VALIDATOR,
      features: ['push'],
    })
  })

  it('throws a CliError when cli.config.json is not valid JSON', () => {
    const root = tmpDir()
    fs.writeFileSync(path.join(root, 'cli.config.json'), '{ broken')

    expect(() => new ConfigService(root).getConfig()).toThrow(CliError)
  })

  it('sets the package name idempotently', () => {
    const root = tmpDir()
    fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ name: 'newproject', version: '1.0.0' }))
    const config = new ConfigService(root)

    expect(config.setPackageName('app')).toBe(true)
    expect(config.setPackageName('app')).toBe(false)
    expect(JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf-8')).name).toBe('app')
  })

  it('writes scripts and is idempotent', () => {
    const root = tmpDir()
    fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ name: 'app' }))
    const config = new ConfigService(root)

    expect(config.setScript('test', 'jest')).toBe(true)
    expect(config.setScript('test', 'jest')).toBe(false)
    expect(JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf-8')).scripts.test).toBe('jest')
  })

  it('writes several scripts in one pass and reports unchanged ones', () => {
    const root = tmpDir()
    fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ name: 'app', scripts: { test: 'jest' } }))
    const config = new ConfigService(root)

    const result = config.setScripts({ test: 'jest', build: 'tsc', lint: 'eslint .' })

    expect(result).toEqual({ changed: ['build', 'lint'], skipped: ['test'] })
  })

  it('deletes top-level package.json fields', () => {
    const root = tmpDir()
    fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ name: 'app', prisma: { seed: 'x' } }))
    const config = new ConfigService(root)

    expect(config.deletePackageField('prisma')).toBe(true)
    expect(config.deletePackageField('prisma')).toBe(false)
    expect(JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf-8')).prisma).toBeUndefined()
  })
})
