import { describe, expect, it } from 'vitest'
import { CliError } from '../../src/errors'
import { validateCommandName, validateIdentifier, validateProjectName } from '../../src/utils/validation'

describe('validateProjectName', () => {
  it('accepts a valid npm package name', () => {
    expect(validateProjectName('my-app')).toBe('my-app')
    expect(validateProjectName('app2')).toBe('app2')
    expect(validateProjectName('my.app')).toBe('my.app')
    expect(validateProjectName('  my-app  ')).toBe('my-app')
  })

  it.each(['', '   ', '../evil', 'foo/bar', 'foo\\bar', '.hidden', '_private', 'node_modules', 'favicon.ico', 'MyApp', 'my app'])(
    'rejects "%s"',
    (name) => {
      expect(() => validateProjectName(name)).toThrow(CliError)
    }
  )

  it('rejects names longer than 214 characters', () => {
    expect(() => validateProjectName('a'.repeat(215))).toThrow(CliError)
  })
})

describe('validateCommandName', () => {
  it('accepts letters, numbers, hyphens and underscores', () => {
    expect(validateCommandName('add-users')).toBe('add-users')
    expect(validateCommandName('2026_11_03_users')).toBe('2026_11_03_users')
    expect(validateCommandName('  add-users  ')).toBe('add-users')
  })

  it.each(['', '   ', 'foo bar', 'foo; touch pwned', '$(whoami)', 'foo/bar', '../evil', 'foo.bar'])('rejects "%s"', (name) => {
    expect(() => validateCommandName(name, 'Migration name')).toThrow(CliError)
  })

  it('rejects names longer than 120 characters', () => {
    expect(() => validateCommandName('a'.repeat(121))).toThrow(CliError)
  })
})

describe('validateIdentifier', () => {
  it('accepts names that normalize to a usable identifier', () => {
    expect(validateIdentifier('user profile')).toBe('user profile')
    expect(validateIdentifier('UserProfile')).toBe('UserProfile')
    expect(validateIdentifier('  user-profile  ')).toBe('user-profile')
  })

  it.each(['', '   ', '!!!', '---', '../evil', 'foo/bar', 'foo\\bar'])('rejects "%s"', (name) => {
    expect(() => validateIdentifier(name, 'Module name')).toThrow(CliError)
  })

  it('rejects names longer than 80 characters', () => {
    expect(() => validateIdentifier('a'.repeat(81))).toThrow(CliError)
  })
})
