import fs from 'fs'
import os from 'os'
import path from 'path'
import { afterEach, describe, expect, it } from 'vitest'
import { createContext } from '../../src/context'
import { CliError } from '../../src/errors'
import { OrmGenerator } from '../../src/generators/orm.generator'
import { NonInteractivePrompter } from '../../src/prompts'
import { DbType } from '../../src/types'
import { scaffoldProject, silentLogger } from '../helpers/project'

const dirs: string[] = []

function project(orm?: DbType): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nec-orm-'))
  dirs.push(dir)
  fs.writeFileSync(path.join(dir, 'cli.config.json'), JSON.stringify({ orm, package_manger: 'npm', fileBasedRouting: false, features: [] }))
  return dir
}

afterEach(() => {
  for (const dir of dirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

describe('OrmGenerator', () => {
  it('keeps the configured ORM as the non-interactive default', async () => {
    const ctx = createContext({
      cwd: project(DbType.MONGO),
      logger: silentLogger,
      prompter: new NonInteractivePrompter({}),
    })
    const generator = new OrmGenerator(ctx)

    await generator.pre()

    expect(generator.installMetadata()).toEqual({ orm: DbType.MONGO })
  })

  it('falls back to TypeORM when the project has no ORM yet', async () => {
    const ctx = createContext({
      cwd: project(),
      logger: silentLogger,
      prompter: new NonInteractivePrompter({}),
    })
    const generator = new OrmGenerator(ctx)

    await generator.pre()

    expect(generator.installMetadata()).toEqual({ orm: DbType.TYPEORM })
  })

  it('refuses to switch the ORM of an existing project before writing anything', async () => {
    const cwd = project(DbType.TYPEORM)
    const before = fs.readdirSync(cwd).sort()
    const configBefore = fs.readFileSync(path.join(cwd, 'cli.config.json'), 'utf-8')
    const ctx = createContext({
      cwd,
      logger: silentLogger,
      prompter: new NonInteractivePrompter({ orm: DbType.MONGO }),
    })
    const generator = new OrmGenerator(ctx)

    const error = await generator.pre().catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(CliError)
    expect((error as CliError).hint).toContain('new project')
    expect(fs.readdirSync(cwd).sort()).toEqual(before)
    expect(fs.readFileSync(path.join(cwd, 'cli.config.json'), 'utf-8')).toBe(configBefore)
  })

  it('allows repeating the install with the same ORM', async () => {
    const ctx = createContext({
      cwd: project(DbType.MONGO),
      logger: silentLogger,
      prompter: new NonInteractivePrompter({ orm: DbType.MONGO }),
    })
    const generator = new OrmGenerator(ctx)

    await expect(generator.pre()).resolves.toBeUndefined()
    expect(generator.installMetadata()).toEqual({ orm: DbType.MONGO })
  })

  it('writes the Prisma 7 configuration with the mariadb adapter', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nec-orm-prisma-'))
    dirs.push(root)

    const cwd = await scaffoldProject({ root, orm: DbType.PRISMA, installAuth: false, logger: silentLogger })
    const read = (file: string) => fs.readFileSync(path.join(cwd, file), 'utf-8')

    expect(read('src/database/prisma/schema.prisma')).toContain('provider     = "prisma-client"')
    expect(read('src/database/prisma/schema.prisma')).toContain('provider = "mysql"')
    expect(read('src/database/prisma/schema.prisma')).not.toContain('url      = env')

    expect(read('prisma.config.ts')).toContain("schema: './src/database/prisma'")
    expect(read('prisma.config.ts')).toContain("url: env('DB_URL')")

    expect(read('src/database/client.ts')).toContain("from '@prisma/adapter-mariadb'")
    expect(read('src/database/client.ts')).toContain("from './prisma/generated/client'")

    const scripts = JSON.parse(read('package.json')).scripts
    expect(scripts['m:run']).toContain('prisma migrate dev && npx prisma generate')
    expect(scripts['db:seed']).toBe('npx prisma db seed')
  })
})
