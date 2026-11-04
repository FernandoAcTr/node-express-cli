import { describe, expect, it } from 'vitest'
import { findCommand } from '../../src/cli'
import { buildCli, commandOptions, helpText } from '../../src/utils/yargs'

describe('--help', () => {
  it('matches the documented snapshot', async () => {
    expect(await helpText()).toMatchSnapshot()
  })

  it('keeps global options small and documented', async () => {
    const help = await helpText()
    const options = help.slice(help.indexOf('\nOptions:\n'))

    expect(options).toContain('--force')
    expect(options).toContain('--dry-run')
    expect(options).toContain('--no-interaction')
    expect(options).not.toContain('--omit')
    expect(options).not.toContain('--name')
  })

  it('registers command-specific options only for their command', () => {
    expect(commandOptions(findCommand('route:list')!)).toHaveProperty('omit')
    expect(commandOptions(findCommand('make:module')!)).toHaveProperty('name')
    expect(commandOptions(findCommand('install:orm')!)).toHaveProperty('orm')
    expect(commandOptions(findCommand('install:auth')!)).toEqual({})
  })

  it('parses global and command flags together', () => {
    const argv = buildCli(['route:list', '--omit', '/api', '--dry-run', '--force']).parse()

    expect(argv._).toEqual(['route:list'])
    expect(argv.omit).toBe('/api')
    expect(argv['dry-run']).toBe(true)
    expect(argv.force).toBe(true)
  })
})
