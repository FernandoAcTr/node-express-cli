import fs from 'fs'
import os from 'os'
import path from 'path'
import { afterEach, describe, expect, it } from 'vitest'
import { createContext } from '../../src/context'
import { BaseGenerator } from '../../src/generators/base.generator'
import { NonInteractivePrompter } from '../../src/prompts'

const dirs: string[] = []

const silentLogger = {
  info: () => undefined,
  success: () => undefined,
  warn: () => undefined,
  error: () => undefined,
}

async function initProject(fileBasedRouting: boolean, packageManager = 'npm'): Promise<string> {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'nec-base-'))
  dirs.push(cwd)

  const prompter = new NonInteractivePrompter({
    name: 'app',
    'package-manager': packageManager,
    'file-based-routing': fileBasedRouting,
  })
  const ctx = createContext({ cwd, prompter, logger: silentLogger })
  const generator = new BaseGenerator(ctx)

  await generator.pre()
  await generator.createDirectories()
  await generator.copyFiles()

  return path.join(cwd, 'app')
}

afterEach(() => {
  for (const dir of dirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

describe('BaseGenerator routing selection', () => {
  it('uses the modules router and removes the routing templates', async () => {
    const project = await initProject(false)
    const routing = fs.readFileSync(path.join(project, 'src/routing/index.ts'), 'utf-8')

    expect(routing).toContain('initRoutes')
    expect(routing).not.toContain('initFileBasedRoutes')
    expect(fs.readdirSync(path.join(project, 'src/routing'))).toEqual(['index.ts'])
    expect(fs.existsSync(path.join(project, 'src/modules/healthcheck/routes.ts'))).toBe(true)
  })

  it('uses the file-based router and copies its extras', async () => {
    const project = await initProject(true)
    const routing = fs.readFileSync(path.join(project, 'src/routing/index.ts'), 'utf-8')

    expect(routing).toContain('initFileBasedRoutes')
    expect(fs.readdirSync(path.join(project, 'src/routing'))).toEqual(['index.ts'])
    expect(fs.existsSync(path.join(project, 'src/routes/healthcheck.ts'))).toBe(true)
    expect(fs.existsSync(path.join(project, 'src/@types/global.d.ts'))).toBe(true)
    expect(fs.existsSync(path.join(project, 'src/modules/healthcheck/routes.ts'))).toBe(false)
  })

  it('writes the anchors used by installers into main.ts', async () => {
    const project = await initProject(false)
    const main = fs.readFileSync(path.join(project, 'src/main.ts'), 'utf-8')

    for (const anchor of ['@nec:imports', '@nec:before-app', '@nec:before-json', '@nec:before-listen', '@nec:after-listen']) {
      expect(main).toContain(anchor)
    }
  })

  it('writes the initial config without pretending an ORM is installed', async () => {
    const project = await initProject(false)
    const config = JSON.parse(fs.readFileSync(path.join(project, 'cli.config.json'), 'utf-8'))

    expect(config.features).toEqual([])
    expect(config.orm).toBeUndefined()
    expect(config.version).toBeDefined()
  })

  it('writes the base scripts for the selected package manager', async () => {
    const project = await initProject(false)
    const pkg = JSON.parse(fs.readFileSync(path.join(project, 'package.json'), 'utf-8'))

    expect(pkg.scripts.dev).toContain('npm run start:compile')
    expect(pkg.scripts.build).toBe('rimraf build && tsc && tsc-alias')
    expect(pkg.scripts['vapid:generate']).toBe('npx web-push generate-vapid-keys')
  })

  it('uses the selected package manager in package.json scripts', async () => {
    const project = await initProject(false, 'bun')
    const pkg = JSON.parse(fs.readFileSync(path.join(project, 'package.json'), 'utf-8'))
    const serialized = JSON.stringify(pkg.scripts)

    expect(serialized).not.toMatch(/\bnpm\b|\bnpx\b/)
    expect(pkg.scripts.dev).toContain('bun run start:compile')
    expect(pkg.scripts['vapid:generate']).toBe('bunx web-push generate-vapid-keys')
  })
})
