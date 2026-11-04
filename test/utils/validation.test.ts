import { describe, expect, it } from 'vitest'
import { CliError } from '../../src/errors'
import { validateProjectName } from '../../src/utils/validation'

describe('validateProjectName', () => {
  it('accepts a valid npm package name', () => {
    expect(validateProjectName('my-app')).toBe('my-app')
    expect(validateProjectName('app2')).toBe('app2')
    expect(validateProjectName('my.app')).toBe('my.app')
    expect(validateProjectName('  my-app  ')).toBe('my-app')
  })

  it.each([
    '',
    '   ',
    '../evil',
    'foo/bar',
    'foo\\bar',
    '.hidden',
    '_private',
    'node_modules',
    'favicon.ico',
    'MyApp',
    'my app',
  ])('rejects "%s"', (name) => {
    expect(() => validateProjectName(name)).toThrow(CliError)
  })

  it('rejects names longer than 214 characters', () => {
    expect(() => validateProjectName('a'.repeat(215))).toThrow(CliError)
  })
})
