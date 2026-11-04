import { spawnSync } from 'child_process'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { afterEach, describe, expect, it } from 'vitest'
import { PackageManager, DbType } from '../../src/types'
import { scaffoldProject } from '../helpers/project'

/**
 * Smoke test real: genera el proyecto, instala dependencias con el package
 * manager configurado y compila con `tsc --noEmit`.
 *
 * Es lento (red + instalación), así que solo corre cuando `NEC_SMOKE=1`.
 * En CI se ejecuta en la matriz `{npm, pnpm} × {fileBasedRouting true,false}`.
 */
const enabled = process.env.NEC_SMOKE === '1' && (process.env.SMOKE_PROFILE ?? 'core') === 'core'
const packageManager = (process.env.SMOKE_PACKAGE_MANAGER ?? PackageManager.NPM) as PackageManager
const fileBasedRouting = process.env.SMOKE_FILE_BASED === 'true'
const orm = (process.env.SMOKE_ORM ?? DbType.TYPEORM) as DbType

const dirs: string[] = []

function tmpRoot(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nec-smoke-'))
  dirs.push(dir)
  return dir
}

afterEach(() => {
  for (const dir of dirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

describe.skipIf(!enabled)('generated project compiles', () => {
  it(
    `passes tsc --noEmit (${packageManager}, fileBasedRouting=${fileBasedRouting})`,
    async () => {
      const project = await scaffoldProject({
        root: tmpRoot(),
        packageManager,
        fileBasedRouting,
        orm,
        installNotifications: true,
        installDependencies: true,
        onProjectCreated: (dir) => {
          if (packageManager === PackageManager.PNPM) {
            // pnpm >= 11 falla al instalar bcrypt si sus build scripts no están
            // permitidos explícitamente. Es una configuración del entorno de
            // prueba, no algo que el CLI escriba en los proyectos generados.
            fs.writeFileSync(path.join(dir, 'pnpm-workspace.yaml'), 'allowBuilds:\n  bcrypt: true\n')
          }

          if (orm === DbType.PRISMA) {
            // prisma.config.ts usa env('DB_URL'); generate no se conecta, pero
            // sí necesita que la variable exista.
            fs.writeFileSync(path.join(dir, '.env'), 'DB_URL=mysql://user:password@localhost:3306/app\n')
          }
        },
      })

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
    10 * 60 * 1000
  )
})
