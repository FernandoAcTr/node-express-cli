import { describe, expect, it } from 'vitest'
import { run } from '../src/run'

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
})
