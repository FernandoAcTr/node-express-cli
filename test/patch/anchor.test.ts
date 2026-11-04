import fs from 'fs'
import os from 'os'
import path from 'path'
import { afterEach, describe, expect, it } from 'vitest'
import { findMissingAnchors, patchAtAnchor } from '../../src/patch/anchor'

const dirs: string[] = []

const BASE_MAIN = [
  "import express from 'express'",
  '// @nec:imports',
  '',
  'const app = express()',
  '// @nec:before-listen',
  'export const server = app.listen(3000)',
  '// @nec:after-listen',
  '',
].join('\n')

function tmpDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nec-patch-'))
  dirs.push(dir)
  return dir
}

function mainFile(content = BASE_MAIN): string {
  const file = path.join(tmpDir(), 'main.ts')
  fs.writeFileSync(file, content)
  return file
}

function applyPush(file: string): void {
  patchAtAnchor(file, 'imports', "import webpush from 'web-push'", { sort: true })
  patchAtAnchor(file, 'beforeListen', "webpush.setVapidDetails('subject', 'public', 'private')", {
    dedupeKey: 'setVapidDetails(',
  })
}

function applySocket(file: string): void {
  patchAtAnchor(file, 'imports', "import SocketIO from './socket'", { sort: true })
  patchAtAnchor(file, 'afterListen', 'const socket = new SocketIO(server)', {
    dedupeKey: 'new SocketIO(server)',
  })
}

afterEach(() => {
  for (const dir of dirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

describe('patchAtAnchor', () => {
  it('inserts a snippet after the anchor', () => {
    const file = mainFile()

    const result = patchAtAnchor(file, 'imports', "import webpush from 'web-push'")

    expect(result.status).toBe('changed')
    expect(fs.readFileSync(file, 'utf-8')).toContain("import webpush from 'web-push'")
  })

  it('is idempotent', () => {
    const file = mainFile()

    expect(patchAtAnchor(file, 'imports', "import webpush from 'web-push'").status).toBe('changed')
    expect(patchAtAnchor(file, 'imports', "import webpush from 'web-push'").status).toBe('skipped')
    expect(fs.readFileSync(file, 'utf-8').match(/import webpush/g)).toHaveLength(1)
  })

  it('reports an anchor that does not exist and leaves the file untouched', () => {
    const file = mainFile('const app = 1\n')

    const result = patchAtAnchor(file, 'imports', "import webpush from 'web-push'")

    expect(result.status).toBe('anchor-missing')
    expect(result.message).toContain('@nec:imports')
    expect(fs.readFileSync(file, 'utf-8')).toBe('const app = 1\n')
  })

  it('reports a missing file', () => {
    const result = patchAtAnchor(path.join(tmpDir(), 'missing.ts'), 'imports', 'import x from "x"')

    expect(result.status).toBe('file-missing')
  })

  it('finds missing anchors without modifying the file', () => {
    const file = mainFile('const app = 1\n')
    const content = fs.readFileSync(file, 'utf-8')

    const missing = findMissingAnchors(file, ['imports', 'beforeListen'])

    expect(missing.map((patch) => patch.status)).toEqual(['anchor-missing', 'anchor-missing'])
    expect(fs.readFileSync(file, 'utf-8')).toBe(content)
  })

  it('returns no missing anchors when every anchor exists', () => {
    expect(findMissingAnchors(mainFile(), ['imports', 'afterListen'])).toEqual([])
  })

  it('reports every anchor as missing when the file does not exist', () => {
    const missing = findMissingAnchors(path.join(tmpDir(), 'missing.ts'), ['imports', 'beforeListen'])

    expect(missing.map((patch) => patch.status)).toEqual(['file-missing', 'file-missing'])
  })

  it('produces the same file regardless of install order', () => {
    const pushFirst = mainFile()
    const socketFirst = mainFile()

    applyPush(pushFirst)
    applySocket(pushFirst)

    applySocket(socketFirst)
    applyPush(socketFirst)

    expect(fs.readFileSync(pushFirst, 'utf-8')).toBe(fs.readFileSync(socketFirst, 'utf-8'))
  })

  it('places runtime blocks around the listen block', () => {
    const file = mainFile()

    applyPush(file)
    applySocket(file)

    const content = fs.readFileSync(file, 'utf-8')

    expect(content.indexOf('setVapidDetails')).toBeLessThan(content.indexOf('app.listen'))
    expect(content.indexOf('new SocketIO(server)')).toBeGreaterThan(content.indexOf('app.listen'))
  })
})
