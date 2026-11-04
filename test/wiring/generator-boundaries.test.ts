import fs from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'

const generators = path.resolve(__dirname, '../../src/generators')

describe('generator boundaries', () => {
  it('does not let generators know about @nec markers', () => {
    const files = fs.readdirSync(generators).filter((file) => file.endsWith('.ts'))
    const offenders = files.filter((file) => fs.readFileSync(path.join(generators, file), 'utf-8').includes('@nec:'))

    expect(offenders).toEqual([])
  })
})
