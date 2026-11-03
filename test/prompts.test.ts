import { describe, expect, it } from 'vitest'
import { CliError } from '../src/errors'
import { NonInteractivePrompter, isNonInteractive } from '../src/prompts'

describe('NonInteractivePrompter', () => {
  it('reads input from a positional argument', async () => {
    const prompter = new NonInteractivePrompter({}, ['users'])

    await expect(prompter.input({ message: 'Name' })).resolves.toBe('users')
  })

  it('prefers a named flag over the positional', async () => {
    const prompter = new NonInteractivePrompter({ name: 'custom' }, ['users'])

    await expect(prompter.input({ message: 'Name', name: 'name' })).resolves.toBe('custom')
  })

  it('uses the default when no value is provided', async () => {
    const prompter = new NonInteractivePrompter({})

    await expect(prompter.input({ message: 'Name', default: 'app' })).resolves.toBe('app')
  })

  it('throws when input has no value', async () => {
    const prompter = new NonInteractivePrompter({})

    await expect(prompter.input({ message: 'Name', name: 'name' })).rejects.toBeInstanceOf(CliError)
  })

  it('selects a choice by value', async () => {
    const prompter = new NonInteractivePrompter({ orm: 'typeorm' })

    const value = await prompter.select({
      message: 'ORM',
      name: 'orm',
      choices: [
        { name: 'TypeORM', value: 'typeorm' },
        { name: 'Prisma', value: 'prisma' },
      ],
    })

    expect(value).toBe('typeorm')
  })

  it('selects a boolean choice', async () => {
    const prompter = new NonInteractivePrompter({ 'file-based-routing': true })

    const value = await prompter.select({
      message: 'File based routing?',
      name: 'file-based-routing',
      choices: [
        { name: 'Yes', value: true },
        { name: 'No', value: false },
      ],
    })

    expect(value).toBe(true)
  })

  it('rejects an invalid choice', async () => {
    const prompter = new NonInteractivePrompter({ orm: 'unknown' })

    await expect(
      prompter.select({ message: 'ORM', name: 'orm', choices: [{ name: 'TypeORM', value: 'typeorm' }] })
    ).rejects.toBeInstanceOf(CliError)
  })

  it('confirms with --yes', async () => {
    const prompter = new NonInteractivePrompter({ yes: true })

    await expect(prompter.confirm({ message: 'Continue?', name: 'yes' })).resolves.toBe(true)
  })

  it('falls back to the default for confirmations', async () => {
    const prompter = new NonInteractivePrompter({})

    await expect(prompter.confirm({ message: 'Continue?', default: true })).resolves.toBe(true)
  })
})

describe('isNonInteractive', () => {
  it('detects the yargs negation form', () => {
    expect(isNonInteractive({ interaction: false })).toBe(true)
  })

  it('detects dashed and camelCase flags', () => {
    expect(isNonInteractive({ 'no-interaction': true })).toBe(true)
    expect(isNonInteractive({ noInteraction: true })).toBe(true)
  })

  it('detects --ci', () => {
    expect(isNonInteractive({ ci: true })).toBe(true)
  })

  it('is false by default', () => {
    expect(isNonInteractive({})).toBe(false)
  })
})
