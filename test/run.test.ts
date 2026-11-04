import { describe, expect, it } from 'vitest'
import { run } from '../src/run'
import { Context } from '../src/context'

function fakeContext(marked: string[]): Context {
  return {
    markInstalled: (feature: string) => marked.push(feature),
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
    const marked: string[] = []

    await run({ post: async () => undefined }, { ctx: fakeContext(marked), feature: 'push' })

    expect(marked).toEqual(['push'])
  })

  it('does not mark the feature when a phase fails', async () => {
    const marked: string[] = []

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
})
