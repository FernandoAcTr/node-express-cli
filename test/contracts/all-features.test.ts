import crypto from 'crypto'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { afterEach, describe, expect, it } from 'vitest'
import { FEATURES } from '../../src/types'
import { installAllFeatures, listFiles, scaffoldProject, silentLogger } from '../helpers/project'

const dirs: string[] = []

function tempRoot(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nec-all-features-'))
  dirs.push(root)
  return root
}

function snapshot(project: string): Record<string, string> {
  const result: Record<string, string> = {}

  for (const file of listFiles(project)) {
    const content = fs.readFileSync(path.join(project, file))
    result[file] = crypto.createHash('sha256').update(content).digest('hex')
  }

  return result
}

function placeholders(project: string): string[] {
  return listFiles(project).flatMap((file) => {
    const content = fs.readFileSync(path.join(project, file), 'utf-8')
    const matches = content.match(/__[A-Za-z][A-Za-z0-9_]*__/g) ?? []

    return matches.map((match) => `${file}: ${match}`)
  })
}

afterEach(() => {
  for (const dir of dirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

describe('all installable features together', () => {
  it('installs every feature into one project without losing wiring', async () => {
    const project = await scaffoldProject({ root: tempRoot() })
    const warnings: string[] = []
    const ctx = await installAllFeatures(project, {
      logger: {
        ...silentLogger,
        warn: (message: string) => warnings.push(message),
      },
    })

    expect([...ctx.config.getConfig().features].sort()).toEqual([...FEATURES].sort())
    expect(warnings.filter((message) => message.includes('Could not patch'))).toEqual([])

    const main = fs.readFileSync(path.join(project, 'src/main.ts'), 'utf-8')
    expect(main).toContain("import webpush from 'web-push'")
    expect(main).toContain("import SocketIO from './socket'")
    expect(main).toContain('webpush.setVapidDetails')
    expect(main).toContain('new SocketIO(server)')

    const config = fs.readFileSync(path.join(project, 'src/config/index.ts'), 'utf-8')
    for (const entry of ['DB:', 'MAILER:', 'VAPID:']) {
      expect(config).toContain(entry)
    }

    const env = fs.readFileSync(path.join(project, '.env.example'), 'utf-8')
    for (const entry of ['DB_USER=', 'MAIL_HOST=', 'VAPID_PUBLIC_KEY=']) {
      expect(env).toContain(entry)
    }

    expect(placeholders(project)).toEqual([])
  })

  it('produces the same tree when the whole set runs twice', async () => {
    const project = await scaffoldProject({ root: tempRoot() })

    await installAllFeatures(project)
    const first = snapshot(project)

    await installAllFeatures(project, { force: true })

    expect(snapshot(project)).toEqual(first)
  })
})
