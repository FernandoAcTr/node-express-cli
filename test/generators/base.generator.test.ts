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

async function initProject(fileBasedRouting: boolean): Promise<string> {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'nec-base-'))
  dirs.push(cwd)

  const prompter = new NonInteractivePrompter({
    name: 'app',
    'package-manager': 'npm',
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
})
