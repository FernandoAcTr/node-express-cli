import fs from 'fs'
import os from 'os'
import path from 'path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createContext } from '../../src/context'
import { RouteListCommand } from '../../src/commands/route_list.command'

const dirs: string[] = []

function project(fileBasedRouting: boolean): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nec-route-list-'))
  dirs.push(dir)
  fs.writeFileSync(path.join(dir, 'cli.config.json'), JSON.stringify({ fileBasedRouting, package_manger: 'npm', features: [] }))
  return dir
}

function captureConsole(): string[] {
  const output: string[] = []
  vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
    output.push(args.map(String).join(' '))
  })
  return output
}

afterEach(() => {
  vi.restoreAllMocks()
  for (const dir of dirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

describe('route:list', () => {
  it('does not report methods that only appear in comments', async () => {
    const cwd = project(true)
    const routes = path.join(cwd, 'src', 'routes')
    fs.mkdirSync(routes, { recursive: true })
    fs.writeFileSync(
      path.join(routes, 'healthcheck.ts'),
      ['// POST should not appear', 'export default { GET: () => undefined } satisfies RestController', ''].join('\n')
    )

    const output = captureConsole()
    await new RouteListCommand(createContext({ cwd })).run()
    const printed = output.join('\n')

    expect(printed).toContain('GET')
    expect(printed).toContain('/healthcheck')
    expect(printed).not.toContain('POST')
  })

  it('lists module routes from the project directory', async () => {
    const cwd = project(false)
    const modules = path.join(cwd, 'src', 'modules', 'users')
    fs.mkdirSync(modules, { recursive: true })
    fs.writeFileSync(
      path.join(modules, 'routes.ts'),
      [
        "import { Router } from 'express'",
        'const router = Router()',
        "export const PREFIX = '/users'",
        'router.get("/", () => undefined)',
        'export default router',
        '',
      ].join('\n')
    )

    const output = captureConsole()
    await new RouteListCommand(createContext({ cwd })).run()
    const printed = output.join('\n')

    expect(printed).toContain('GET')
    expect(printed).toContain('/api/users')
  })

  it('reads --omit from ctx.args and keeps groups sorted', async () => {
    const cwd = project(false)

    for (const name of ['zebra', 'alpha']) {
      const modules = path.join(cwd, 'src', 'modules', name)
      fs.mkdirSync(modules, { recursive: true })
      fs.writeFileSync(
        path.join(modules, 'routes.ts'),
        [
          "import { Router } from 'express'",
          'const router = Router()',
          `export const PREFIX = '/${name}'`,
          'router.get("/", () => undefined)',
          'export default router',
          '',
        ].join('\n')
      )
    }

    const output = captureConsole()
    const ctx = createContext({ cwd, args: { positionals: ['route:list'], flags: { omit: '/api' } } })

    await new RouteListCommand(ctx).run()

    const printed = output.join('\n').replace(/\u001b\[[0-9;]*m/g, '')

    expect(printed).toContain('/alpha')
    expect(printed).toContain('/zebra')
    expect(printed).not.toContain('/api/alpha')
    expect(printed.indexOf('ALPHA')).toBeLessThan(printed.indexOf('ZEBRA'))
  })

  it('uses --prefix for module routes', async () => {
    const cwd = project(false)
    const modules = path.join(cwd, 'src', 'modules', 'users')
    fs.mkdirSync(modules, { recursive: true })
    fs.writeFileSync(
      path.join(modules, 'routes.ts'),
      [
        "import { Router } from 'express'",
        'const router = Router()',
        "export const PREFIX = '/users'",
        'router.get("/", () => undefined)',
        'export default router',
        '',
      ].join('\n')
    )

    const output = captureConsole()
    const ctx = createContext({ cwd, args: { positionals: ['route:list'], flags: { prefix: '/v1' } } })

    await new RouteListCommand(ctx).run()

    const printed = output.join('\n').replace(/\u001b\[[0-9;]*m/g, '')

    expect(printed).toContain('/v1/users')
    expect(printed).not.toContain('/api/users')
  })

  it('normalizes a prefix without a leading slash', async () => {
    const cwd = project(false)
    const modules = path.join(cwd, 'src', 'modules', 'users')
    fs.mkdirSync(modules, { recursive: true })
    fs.writeFileSync(
      path.join(modules, 'routes.ts'),
      [
        "import { Router } from 'express'",
        'const router = Router()',
        "export const PREFIX = '/users'",
        'router.get("/", () => undefined)',
        'export default router',
        '',
      ].join('\n')
    )

    const output = captureConsole()
    const ctx = createContext({ cwd, args: { positionals: ['route:list'], flags: { prefix: 'v2/' } } })

    await new RouteListCommand(ctx).run()

    expect(output.join('\n')).toContain('/v2/users')
  })

  it('combines --prefix with --omit', async () => {
    const cwd = project(false)
    const modules = path.join(cwd, 'src', 'modules', 'users')
    fs.mkdirSync(modules, { recursive: true })
    fs.writeFileSync(
      path.join(modules, 'routes.ts'),
      [
        "import { Router } from 'express'",
        'const router = Router()',
        "export const PREFIX = '/users'",
        'router.get("/", () => undefined)',
        'export default router',
        '',
      ].join('\n')
    )

    const output = captureConsole()
    const ctx = createContext({ cwd, args: { positionals: ['route:list'], flags: { prefix: '/v1', omit: '/v1' } } })

    await new RouteListCommand(ctx).run()

    const printed = output.join('\n').replace(/\u001b\[[0-9;]*m/g, '')

    expect(printed).toContain('GET      /users')
    expect(printed).not.toContain('/v1/users')
  })
})
