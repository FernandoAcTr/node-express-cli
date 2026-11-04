import { spawnSync } from 'child_process'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { afterEach, describe, expect, it } from 'vitest'
import { ShellService } from '../../src/services/shell.service'
import { FEATURES, PackageManager } from '../../src/types'
import { installAllFeatures, readJson, scaffoldProject, silentLogger } from '../helpers/project'

/**
 * Smoke "full": instala todas las features sobre un mismo proyecto, compila con
 * `tsc --noEmit` y comprueba que `cli.config.json` las registra todas.
 *
 * Cubre el criterio de la Fase 6: cada feature instalable se compila al menos
 * una vez. Es lento, así que solo corre con `SMOKE_PROFILE=all` y `NEC_SMOKE=1`.
 */
const enabled = process.env.NEC_SMOKE === '1' && process.env.SMOKE_PROFILE === 'all'
const packageManager = (process.env.SMOKE_PACKAGE_MANAGER ?? PackageManager.NPM) as PackageManager
const fileBasedRouting = process.env.SMOKE_FILE_BASED === 'true'

const dirs: string[] = []

function tmpRoot(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nec-smoke-all-'))
  dirs.push(dir)
  return dir
}

afterEach(() => {
  for (const dir of dirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

describe.skipIf(!enabled)('generated project with every feature compiles', () => {
  it(
    `passes tsc --noEmit (${packageManager}, fileBasedRouting=${fileBasedRouting})`,
    async () => {
      const project = await scaffoldProject({
        root: tmpRoot(),
        packageManager,
        fileBasedRouting,
        installDependencies: true,
        onProjectCreated: (dir) => {
          if (packageManager === PackageManager.PNPM) {
            // pnpm >= 11 exige permitir los build scripts de bcrypt.
            fs.writeFileSync(path.join(dir, 'pnpm-workspace.yaml'), 'allowBuilds:\n  bcrypt: true\n')
          }
        },
      })

      await installAllFeatures(project, {
        shell: new ShellService({ logger: silentLogger }),
        logger: silentLogger,
      })

      const config = readJson<{ features: string[] }>(path.join(project, 'cli.config.json'))

      expect([...config.features].sort()).toEqual([...FEATURES].sort())

      const tsc = path.join(project, 'node_modules', '.bin', 'tsc')
      expect(fs.existsSync(tsc)).toBe(true)

      const result = spawnSync(tsc, ['--noEmit'], {
        cwd: project,
        encoding: 'utf-8',
        env: { ...process.env, CI: '1' },
      })

      const output = [result.stdout, result.stderr].filter(Boolean).join('\n')

      expect(result.status, output).toBe(0)
    },
    20 * 60 * 1000
  )
})
