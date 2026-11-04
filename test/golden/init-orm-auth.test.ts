import fs from 'fs'
import os from 'os'
import path from 'path'
import { afterEach, describe, expect, it } from 'vitest'
import { PackageManager } from '../../src/types'
import { listFiles, readJson, scaffoldProject } from '../helpers/project'

const dirs: string[] = []

function tmpRoot(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nec-golden-'))
  dirs.push(dir)
  return dir
}

afterEach(() => {
  for (const dir of dirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

/**
 * Golden test de `init` + `install:orm` + `install:auth`.
 *
 * Falla si cambia el árbol de archivos generado, `main.ts` o la configuración
 * que deja el CLI. Actualiza con `npm test -- -u` cuando el cambio sea
 * intencional.
 */
describe('generated project (init + orm + auth)', () => {
  it('produces a stable file tree, main.ts and cli.config.json', async () => {
    const project = await scaffoldProject({ root: tmpRoot() })

    expect(listFiles(project)).toMatchSnapshot('file-tree')
    expect(fs.readFileSync(path.join(project, 'src/main.ts'), 'utf-8')).toMatchSnapshot('main.ts')
    expect(readJson(path.join(project, 'cli.config.json'))).toMatchSnapshot('cli.config.json')
  })

  it('also produces the expected tree with file-based routing', async () => {
    const project = await scaffoldProject({ root: tmpRoot(), fileBasedRouting: true, installAuth: true })

    expect(listFiles(project)).toMatchSnapshot('file-tree-file-based')
    expect(fs.readFileSync(path.join(project, 'src/routing/index.ts'), 'utf-8')).toMatchSnapshot('routing-file-based.ts')
  })

  it('keeps npm/npx out of bun projects', async () => {
    const project = await scaffoldProject({ root: tmpRoot(), packageManager: PackageManager.BUN })

    const scripts = readJson<{ scripts: Record<string, string> }>(path.join(project, 'package.json')).scripts

    expect(JSON.stringify(scripts)).not.toMatch(/\bnpm\b|\bnpx\b/)
  })
})
