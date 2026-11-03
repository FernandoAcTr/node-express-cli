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

  it('declares install:auth as requiring an ORM', () => {
    const auth = commands.find((command) => command.name === 'install:auth')

    expect(auth?.requires).toContain('orm')
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
})
