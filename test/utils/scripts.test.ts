import fs from 'fs'
import os from 'os'
import path from 'path'
import { afterEach, describe, expect, it } from 'vitest'
import { ConfigService } from '../../src/services/config.service'
import { DbType, PackageManager } from '../../src/types'
import { baseScripts, ormScripts } from '../../src/utils/scripts'

const dirs: string[] = []

function configFor(packageManager: PackageManager): ConfigService {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nec-scripts-'))
  dirs.push(dir)
  fs.writeFileSync(
    path.join(dir, 'cli.config.json'),
    JSON.stringify({ package_manger: packageManager, fileBasedRouting: false, features: [] })
  )
  return new ConfigService(dir)
}

afterEach(() => {
  for (const dir of dirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

describe('scripts', () => {
  it('never uses npm or npx for bun projects', () => {
    const config = configFor(PackageManager.BUN)
    const scripts = { ...baseScripts(config), ...ormScripts(DbType.TYPEORM, config) }
    const serialized = JSON.stringify(scripts)

    expect(serialized).not.toMatch(/\bnpm\b|\bnpx\b/)
    expect(scripts.dev).toContain('bun run start:compile')
    expect(scripts['vapid:generate']).toBeUndefined()
    expect(scripts['prettier:fix']).toBeUndefined()
    expect(scripts['m:run']).toContain('bun run build')
  })

  it('keeps npm and npx for npm projects', () => {
    const config = configFor(PackageManager.NPM)
    const scripts = { ...baseScripts(config), ...ormScripts(DbType.TYPEORM, config) }

    expect(scripts.dev).toContain('npm run start:compile')
    expect(scripts['vapid:generate']).toBeUndefined()
    expect(scripts['m:create']).toContain('npx typeorm migration:create')
  })

  it('builds the migration scripts for every ORM', () => {
    const config = configFor(PackageManager.PNPM)
    const prisma = ormScripts(DbType.PRISMA, config)

    expect(ormScripts(DbType.SEQUELIZE, config)['db:make:migration']).toContain('pnpm dlx sequelize-cli')
    expect(prisma['m:generate']).toBe('pnpm dlx prisma generate')
    expect(prisma['m:run']).toContain('prisma migrate dev')
    expect(prisma['m:run']).toContain('prisma generate')
    expect(prisma['m:run:deploy']).toContain('prisma generate')
    expect(prisma['db:seed']).toBe('pnpm dlx prisma db seed')
    expect(ormScripts(DbType.MONGO, config)).toEqual({
      'db:seed': 'pnpm run build && node build/database/seeder.js',
    })
  })
})
