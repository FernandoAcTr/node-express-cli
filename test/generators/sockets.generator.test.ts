import fs from 'fs'
import os from 'os'
import path from 'path'
import { afterEach, describe, expect, it } from 'vitest'
import { createContext } from '../../src/context'
import { SocketsGenerator } from '../../src/generators/sockets.generator'

const dirs: string[] = []

const silentLogger = {
  info: () => undefined,
  success: () => undefined,
  warn: () => undefined,
  error: () => undefined,
}

function project(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nec-socket-'))
  dirs.push(dir)
  fs.mkdirSync(path.join(dir, 'src'), { recursive: true })
  fs.writeFileSync(
    path.join(dir, 'src/main.ts'),
    [
      "import express from 'express'",
      '// @nec:imports',
      '',
      'const app = express()',
      'const CUSTOM_LINE = true',
      '// @nec:before-listen',
      'export const server = app.listen(3000)',
      '// @nec:after-listen',
      '',
    ].join('\n')
  )
  return dir
}

afterEach(() => {
  for (const dir of dirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

describe('SocketsGenerator', () => {
  it('patches main.ts instead of replacing it', async () => {
    const cwd = project()
    const ctx = createContext({ cwd, logger: silentLogger })
    const generator = new SocketsGenerator(ctx)

    await generator.copyFiles()

    const main = fs.readFileSync(path.join(cwd, 'src/main.ts'), 'utf-8')

    expect(main).toContain('const CUSTOM_LINE = true')
    expect(main).toContain("import SocketIO from './socket'")
    expect(main).toContain('const socket = new SocketIO(server)')
    expect(fs.existsSync(path.join(cwd, 'src/socket.ts'))).toBe(true)
    expect(fs.existsSync(path.join(cwd, 'src/socket.controller.ts'))).toBe(true)
  })

  it('is idempotent', async () => {
    const cwd = project()
    const ctx = createContext({ cwd, logger: silentLogger })
    const generator = new SocketsGenerator(ctx)

    await generator.copyFiles()
    await generator.copyFiles()

    const main = fs.readFileSync(path.join(cwd, 'src/main.ts'), 'utf-8')

    expect(main.match(/import SocketIO/g)).toHaveLength(1)
    expect(main.match(/new SocketIO\(server\)/g)).toHaveLength(1)
  })
})
