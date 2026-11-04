import { describe, expect, it } from 'vitest'
import { run } from '../src/run'
import { Context } from '../src/context'
import { DbType, Feature, FeatureMetadata } from '../src/types'

function fakeContext(marked: Array<[Feature, FeatureMetadata | undefined]>, warnings: string[] = [], installed = false): Context {
  return {
    markInstalled: (feature: Feature, metadata?: FeatureMetadata) => marked.push([feature, metadata]),
    has: () => installed,
    logger: {
      info: () => undefined,
      success: () => undefined,
      warn: (message: string) => warnings.push(message),
      error: () => undefined,
    },
  } as unknown as Context
}

describe('run', () => {
  it('executes phases in the documented order', async () => {
    const calls: string[] = []

    await run({
      pre: async () => {
        calls.push('pre')
      },
      createDirectories: async () => {
        calls.push('createDirectories')
      },
      copyFiles: async () => {
        calls.push('copyFiles')
      },
      installDependencies: async () => {
        calls.push('installDependencies')
      },
      post: async () => {
        calls.push('post')
      },
      run: async () => {
        calls.push('run')
      },
    })

    expect(calls).toEqual(['pre', 'createDirectories', 'copyFiles', 'installDependencies', 'post', 'run'])
  })

  it('skips phases the generator does not implement', async () => {
    const calls: string[] = []

    await run({
      post: async () => {
        calls.push('post')
      },
    })

    expect(calls).toEqual(['post'])
  })

  it('propagates errors from a phase', async () => {
    await expect(
      run({
        pre: async () => {
          throw new Error('boom')
        },
      })
    ).rejects.toThrow('boom')
  })

  it('calls rollback when a phase fails', async () => {
    const calls: string[] = []

    await expect(
      run({
        copyFiles: async () => {
          throw new Error('boom')
        },
        rollback: async () => {
          calls.push('rollback')
        },
      })
    ).rejects.toThrow('boom')

    expect(calls).toEqual(['rollback'])
  })

  it('marks the feature only after every phase succeeds', async () => {
    const marked: Array<[Feature, FeatureMetadata | undefined]> = []

    await run({ post: async () => undefined }, { ctx: fakeContext(marked), feature: 'push' })

    expect(marked).toEqual([['push', undefined]])
  })

  it('does not mark the feature when a phase fails', async () => {
    const marked: Array<[Feature, FeatureMetadata | undefined]> = []

    await expect(
      run(
        {
          copyFiles: async () => {
            throw new Error('boom')
          },
        },
        { ctx: fakeContext(marked), feature: 'push' }
      )
    ).rejects.toThrow('boom')

    expect(marked).toEqual([])
  })

  it('does not mark the feature when post reports wiring warnings', async () => {
    const marked: Array<[Feature, FeatureMetadata | undefined]> = []
    const warnings: string[] = []

    await run(
      {
        post: async () => ({
          changed: [],
          skipped: [],
          warnings: ['Could not find // @nec:imports in src/main.ts; add the block manually.'],
        }),
      },
      { ctx: fakeContext(marked, warnings), feature: 'push' }
    )

    expect(marked).toEqual([])
    expect(warnings.join('\n')).toContain('was not marked as installed')
  })

  it('warns without changing state when an already installed feature has wiring warnings', async () => {
    const marked: Array<[Feature, FeatureMetadata | undefined]> = []
    const warnings: string[] = []

    await run(
      {
        post: async () => ({
          changed: [],
          skipped: [],
          warnings: ['Could not find // @nec:config in src/config/index.ts; add the block manually.'],
        }),
      },
      { ctx: fakeContext(marked, warnings, true), feature: 'mailer' }
    )

    expect(marked).toEqual([])
    expect(warnings.join('\n')).toContain('remains marked as installed')
  })

  it('persists generator metadata together with the feature', async () => {
    const marked: Array<[Feature, FeatureMetadata | undefined]> = []

    await run(
      {
        post: async () => undefined,
        installMetadata: () => ({ orm: DbType.TYPEORM }),
      },
      { ctx: fakeContext(marked), feature: 'orm' }
    )

    expect(marked).toEqual([['orm', { orm: DbType.TYPEORM }]])
  })
})
