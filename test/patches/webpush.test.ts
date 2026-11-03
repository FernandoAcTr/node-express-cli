import fs from 'fs'
import os from 'os'
import path from 'path'
import { afterEach, describe, expect, it } from 'vitest'
import { wirePush } from '../../src/patches/webpush'

const dirs: string[] = []

function project(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nec-webpush-'))
  dirs.push(dir)
  fs.mkdirSync(path.join(dir, 'src/config'), { recursive: true })
  fs.writeFileSync(
    path.join(dir, 'src/main.ts'),
    [
      "import express from 'express'",
      '// @nec:imports',
      '',
      'const app = express()',
      '// @nec:before-listen',
      'export const server = app.listen(3000)',
      '// @nec:after-listen',
      '',
    ].join('\n')
  )
  fs.writeFileSync(path.join(dir, 'src/config/index.ts'), ['export const config = Object.freeze({', '  PORT: 3000,', '})', ''].join('\n'))
  fs.writeFileSync(path.join(dir, '.env.example'), 'PORT=3000\n')
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 'app', scripts: {} }, null, 2))
  return dir
}

function count(content: string, needle: string): number {
  return content.split(needle).length - 1
}

afterEach(() => {
  for (const dir of dirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

describe('wirePush', () => {
  it('wires main.ts, config, env and package.json', () => {
    const cwd = project()

    const result = wirePush({ cwd, packageRunner: 'npx' })

    const main = fs.readFileSync(path.join(cwd, 'src/main.ts'), 'utf-8')
    const config = fs.readFileSync(path.join(cwd, 'src/config/index.ts'), 'utf-8')
    const env = fs.readFileSync(path.join(cwd, '.env.example'), 'utf-8')
    const pkg = JSON.parse(fs.readFileSync(path.join(cwd, 'package.json'), 'utf-8'))

    expect(main).toContain("import webpush from 'web-push'")
    expect(main).toContain('setVapidDetails(')
    expect(config).toContain('VAPID:')
    expect(env).toContain('VAPID_PUBLIC_KEY=')
    expect(pkg.scripts['vapid:generate']).toBe('npx web-push generate-vapid-keys')
    expect(result.changed).toContain(path.join(cwd, 'src/main.ts'))
  })

  it('is idempotent', () => {
    const cwd = project()

    wirePush({ cwd, packageRunner: 'npx' })
    const second = wirePush({ cwd, packageRunner: 'npx' })

    const main = fs.readFileSync(path.join(cwd, 'src/main.ts'), 'utf-8')
    const config = fs.readFileSync(path.join(cwd, 'src/config/index.ts'), 'utf-8')

    expect(count(main, "import webpush from 'web-push'")).toBe(1)
    expect(count(main, 'setVapidDetails(')).toBe(1)
    expect(count(config, 'VAPID:')).toBe(1)
    expect(second.warnings).toEqual([])
  })

  it('warns instead of failing when main.ts has no anchors', () => {
    const cwd = project()
    fs.writeFileSync(path.join(cwd, 'src/main.ts'), 'export const server = null\n')

    const result = wirePush({ cwd })

    expect(result.warnings.length).toBeGreaterThan(0)
    expect(result.warnings[0]).toContain('@nec:imports')
  })

  it('uses the package runner of the selected package manager', () => {
    const cwd = project()

    wirePush({ cwd, packageRunner: 'bunx' })

    const pkg = JSON.parse(fs.readFileSync(path.join(cwd, 'package.json'), 'utf-8'))

    expect(pkg.scripts['vapid:generate']).toBe('bunx web-push generate-vapid-keys')
    expect(JSON.stringify(pkg)).not.toMatch(/\bnpm\b|\bnpx\b/)
  })

  it('updates the runner in an existing .env.example VAPID block', () => {
    const cwd = project()
    const envFile = path.join(cwd, '.env.example')
    fs.writeFileSync(envFile, '# Webpush notifications. Generate keys with: npx web-push generate-vapid-keys\nVAPID_PUBLIC_KEY=\n')

    wirePush({ cwd, packageRunner: 'bunx' })

    expect(fs.readFileSync(envFile, 'utf-8')).toContain('bunx web-push generate-vapid-keys')
  })
})
