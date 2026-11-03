import { describe, expect, it } from 'vitest'
import { Context } from '../../src/context'
import { ModuleGenerator } from '../../src/generators/module.generator'
import { NonInteractivePrompter } from '../../src/prompts'

describe('generators receive a Context', () => {
  it('instantiates a generator with a fake context', async () => {
    const ctx = {
      prompter: new NonInteractivePrompter({}, ['user-profile']),
    } as unknown as Context

    const generator = new ModuleGenerator(ctx)
    await generator.pre()

    expect((generator as any).moduleName).toBe('user-profile')
  })
})
