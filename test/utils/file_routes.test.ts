import fs from 'fs'
import os from 'os'
import path from 'path'
import { afterEach, describe, expect, it } from 'vitest'
import { buildURLPath, discoverFileRoutes, extractFileRouteMethods } from '../../src/utils/file_routes'

const dirs: string[] = []

function tmpDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nec-routes-'))
  dirs.push(dir)
  return dir
}

afterEach(() => {
  for (const dir of dirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

describe('file routes', () => {
  it('builds static and dynamic paths', () => {
    expect(buildURLPath(['users', '[id]'])).toBe('/users/:id')
    expect(buildURLPath(['users', 'index'])).toBe('/users/index')
    expect(buildURLPath(['index'])).toBe('/index')
  })

  it('detects methods from the exported object and ignores comments and strings', () => {
    const code = `
      // GET POST DELETE
      const note = 'PATCH'
      const handler = () => note
      export default {
        GET: handler,
        POST: handler,
      } satisfies RestController
    `

    expect(extractFileRouteMethods(code)).toEqual(['GET', 'POST'])
  })

  it('detects named exports', () => {
    const code = `
      export const GET = handler
      export function DELETE() {}
      export const notAMethod = 1
    `

    expect(extractFileRouteMethods(code)).toEqual(['GET', 'DELETE'])
  })

  it('discovers route files with their URL and methods', () => {
    const root = tmpDir()
    const routes = path.join(root, 'src', 'routes')
    fs.mkdirSync(path.join(routes, 'users'), { recursive: true })
    fs.writeFileSync(path.join(routes, 'healthcheck.ts'), `export default { GET: () => undefined } satisfies RestController\n`)
    fs.writeFileSync(
      path.join(routes, 'users', '[id].ts'),
      [
        '// POST should be ignored because it is only a comment',
        'export default {',
        '  GET: () => undefined,',
        '  PUT: () => undefined,',
        '} satisfies RestController',
        '',
      ].join('\n')
    )

    expect(discoverFileRoutes(routes)).toEqual([
      { file: path.join(routes, 'healthcheck.ts'), url: '/healthcheck', methods: ['GET'] },
      { file: path.join(routes, 'users', '[id].ts'), url: '/users/:id', methods: ['GET', 'PUT'] },
    ])
  })
})
