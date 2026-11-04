import fs from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'
import { version } from '../src/version'

describe('version', () => {
  it('keeps package.json and src/version.ts in sync', () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../package.json'), 'utf-8')) as { version: string }

    expect(version).toBe(pkg.version)
  })
})
