import fs from 'fs'
import os from 'os'
import path from 'path'
import { afterEach, describe, expect, it } from 'vitest'
import { createContext } from '../../src/context'
import { CliError } from '../../src/errors'
import { MigrationGenerator } from '../../src/generators/migration.generator'
import { NonInteractivePrompter } from '../../src/prompts'
import { ShellService } from '../../src/services/shell.service'
import { DbType } from '../../src/types'

const dirs: string[] = []

const silentLogger = {
  info: () => undefined,
  success: () => undefined,
  warn: () => undefined,
  error: () => undefined,
}

function project(orm: DbType): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nec-migration-'))
  dirs.push(dir)
  fs.writeFileSync(path.join(dir, 'cli.config.json'), JSON.stringify({ orm, package_manger: 'npm', fileBasedRouting: false, features: [] }))
  return dir
}

afterEach(() => {
  for (const dir of dirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

describe('MigrationGenerator', () => {
  it('awaits the package script and propagates failures', async () => {
    const cwd = project(DbType.TYPEORM)
    const commands: string[] = []
    const shell = {
      execAsync: async (command: string) => {
        commands.push(command)
        throw new Error('migration failed')
      },
      exec: () => {
        throw new Error('exec should not be used')
      },
    }
    const ctx = createContext({
      cwd,
      shell: shell as unknown as ShellService,
      logger: silentLogger,
      prompter: new NonInteractivePrompter({ name: 'add-users' }),
    })
    const generator = new MigrationGenerator(ctx)

    await generator.pre()

    await expect(generator.post()).rejects.toThrow('migration failed')
    expect(commands).toEqual(['npm run m:create ./src/database/migrations/add-users'])
  })

  it('uses the sequelize migration script', async () => {
    const cwd = project(DbType.SEQUELIZE)
    const commands: string[] = []
    const shell = {
      execAsync: async (command: string) => {
        commands.push(command)
        return ''
      },
      exec: () => {
        throw new Error('exec should not be used')
      },
    }
    const ctx = createContext({
      cwd,
      shell: shell as unknown as ShellService,
      logger: silentLogger,
      prompter: new NonInteractivePrompter({ name: 'add-users' }),
    })
    const generator = new MigrationGenerator(ctx)

    await generator.pre()
    await generator.post()

    expect(commands).toEqual(['npm run db:make:migration add-users'])
  })

  it.each(['', '   ', 'foo bar', 'foo; touch pwned', '$(whoami)', 'foo/bar'])(
    'rejects the invalid migration name "%s" before running shell',
    async (name) => {
      const commands: string[] = []
      const shell = {
        execAsync: async (command: string) => {
          commands.push(command)
          return ''
        },
        exec: () => {
          throw new Error('exec should not be used')
        },
      }
      const ctx = createContext({
        cwd: project(DbType.TYPEORM),
        shell: shell as unknown as ShellService,
        logger: silentLogger,
        prompter: new NonInteractivePrompter({ name }),
      })
      const generator = new MigrationGenerator(ctx)

      await expect(generator.pre()).rejects.toThrow(CliError)
      expect(commands).toEqual([])
    }
  )
})
