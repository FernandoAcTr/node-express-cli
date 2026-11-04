import { describe, expect, it } from 'vitest'
import { commands } from '../src/registry'

describe('command registry', () => {
  it('has unique command names', () => {
    const names = commands.map((command) => command.name)

    expect(new Set(names).size).toBe(names.length)
  })

  it('documents every command', () => {
    for (const command of commands) {
      expect(command.description.length).toBeGreaterThan(0)
    }
  })

  it('declares install:auth as requiring an ORM and mailer with hints', () => {
    const auth = commands.find((command) => command.name === 'install:auth')
    const requirements = auth?.requires?.map((requirement) => requirement.feature) ?? []

    expect(requirements).toContain('orm')
    expect(requirements).toContain('mailer')
    expect(auth?.requires?.every((requirement) => requirement.hint.length > 0)).toBe(true)
  })

  it('declares install:notifications as requiring auth with a hint', () => {
    const notifications = commands.find((command) => command.name === 'install:notifications')
    const requirements = notifications?.requires?.map((requirement) => requirement.feature) ?? []

    expect(requirements).toContain('auth')
    expect(notifications?.requires?.every((requirement) => requirement.hint.length > 0)).toBe(true)
  })

  it('declares an ORM requirement for the commands that generate ORM code', () => {
    for (const name of ['make:entity', 'make:migration', 'make:seeder', 'make:factory']) {
      const command = commands.find((candidate) => candidate.name === name)

      expect(command?.requires?.map((requirement) => requirement.feature)).toContain('orm')
      expect(command?.requires?.every((requirement) => requirement.hint.length > 0)).toBe(true)
    }
  })

  it('requires an explicit project decision for every command', () => {
    const init = commands.find((command) => command.name === 'init')

    expect(init?.requiresProject).toBe(false)
    expect(commands.filter((command) => command.name !== 'init').every((command) => command.requiresProject === true)).toBe(true)
  })

  it('declares valid option types', () => {
    const validTypes = ['string', 'boolean', 'number']

    for (const command of commands) {
      for (const option of Object.values(command.options ?? {})) {
        expect(validTypes).toContain(option.type ?? 'string')
      }
    }
  })

  it('exposes the route:list --omit option', () => {
    const routeList = commands.find((command) => command.name === 'route:list')

    expect(routeList?.options?.['omit']).toBeDefined()
  })

  it('declares the feature for every install command', () => {
    const expected: Record<string, string> = {
      'install:orm': 'orm',
      'install:auth': 'auth',
      'install:socket': 'socket',
      'install:push': 'push',
      'install:mailer': 'mailer',
      'install:notifications': 'notifications',
      'install:tests': 'tests',
      'install:prettier': 'prettier',
      'install:eslint': 'eslint',
    }

    for (const [name, feature] of Object.entries(expected)) {
      expect(commands.find((command) => command.name === name)?.feature).toBe(feature)
    }

    const installs = commands.filter((command) => command.name.startsWith('install:'))
    expect(installs.every((command) => command.feature !== undefined)).toBe(true)
  })
})
