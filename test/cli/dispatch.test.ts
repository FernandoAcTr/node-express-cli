import fs from 'fs'
import os from 'os'
import path from 'path'
import { afterEach, describe, expect, it } from 'vitest'
import { assertCommandCanRun, findCommand, resolveCommandName, splitArgs } from '../../src/cli'
import { createContext } from '../../src/context'
import { CliError } from '../../src/errors'
import { commands } from '../../src/registry'
import { ParsedArgv } from '../../src/types'
import { silentLogger } from '../helpers/project'

const dirs: string[] = []

function tmpDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nec-dispatch-'))
  dirs.push(dir)
  return dir
}

function project(features: string[] = []): string {
  const cwd = tmpDir()
  fs.writeFileSync(path.join(cwd, 'cli.config.json'), JSON.stringify({ fileBasedRouting: false, package_manger: 'npm', features }))
  fs.writeFileSync(path.join(cwd, 'package.json'), JSON.stringify({ name: 'app' }))
  return cwd
}

afterEach(() => {
  for (const dir of dirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

describe('command dispatch', () => {
  it('splits positionals and flags', () => {
    const raw = { _: ['make:module', 'users'], name: 'users', force: true, $0: 'nec' } as ParsedArgv

    expect(splitArgs(raw)).toEqual({
      positionals: ['make:module', 'users'],
      flags: { name: 'users', force: true },
    })
  })

  it('resolves commands given as positionals, flags or aliases', () => {
    expect(resolveCommandName({ positionals: ['make:module'], flags: {} })).toBe('make:module')
    expect(resolveCommandName({ positionals: [], flags: { init: true } })).toBe('init')
    expect(resolveCommandName({ positionals: [], flags: { i: true } })).toBe('init')
    expect(resolveCommandName({ positionals: [], flags: {} })).toBeUndefined()
  })

  it('finds commands by alias', () => {
    expect(findCommand('init')?.name).toBe('init')
    expect(findCommand('i')?.name).toBe('init')
    expect(findCommand('missing')).toBeUndefined()
  })

  it('rejects commands outside a project without creating files', () => {
    const cwd = tmpDir()
    const ctx = createContext({ cwd, logger: silentLogger })
    const makeModule = findCommand('make:module')!

    expect(() => assertCommandCanRun(makeModule, ctx)).toThrow(CliError)
    expect(fs.readdirSync(cwd)).toEqual([])
  })

  it('allows init outside a project', () => {
    const cwd = tmpDir()
    const ctx = createContext({ cwd, logger: silentLogger })

    expect(() => assertCommandCanRun(findCommand('init')!, ctx)).not.toThrow()
  })

  it('reports the hint declared by the command for unmet requirements', () => {
    const ctx = createContext({ cwd: project(), logger: silentLogger })
    const auth = findCommand('install:auth')!

    try {
      assertCommandCanRun(auth, ctx)
      throw new Error('expected assertCommandCanRun to throw')
    } catch (error) {
      expect(error).toBeInstanceOf(CliError)
      expect((error as CliError).message).toContain('orm')
      expect((error as CliError).hint).toContain('install:orm')
    }
  })

  it('accepts a command when its requirements are installed', () => {
    const ctx = createContext({ cwd: project(['orm']), logger: silentLogger })

    expect(() => assertCommandCanRun(findCommand('install:auth')!, ctx)).not.toThrow()
  })

  it('has a project guard for every command except init', () => {
    expect(commands.find((command) => command.name === 'init')?.requiresProject).toBe(false)
    expect(commands.filter((command) => command.name !== 'init').every((command) => command.requiresProject)).toBe(true)
  })
})
