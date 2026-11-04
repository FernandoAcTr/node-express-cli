import fs from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'
import { createContext } from '../../src/context'
import { SpecGenerator } from '../../src/installers'
import { commands } from '../../src/registry'

const src = path.resolve(__dirname, '../../src')
const sourceRoots = [path.join(src, 'generators'), path.join(src, 'installers')]

/** `BaseGenerator` necesita `fs` para comprobar/eliminar el proyecto en init. */
const DIRECT_FS_ALLOWLIST = new Set(['generators/base.generator.ts'])

/** Instaladores con lógica propia que no pasan por `installer(spec)`. */
const CUSTOM_INSTALLERS = new Set(['orm', 'auth'])

const PACKAGE_MANAGER_PATTERN = /\b(?:npm|npx|pnpm|yarn|bunx)\b/
const DIRECT_FS_PATTERN = /from\s+['"](?:fs|fs-extra)['"]/
const DIRECT_WRITE_PATTERN = /\b(?:writeFileSync|copyFileSync)\b/
const PROCESS_CWD_PATTERN = /process\.cwd\(/

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(dir, entry.name)

    if (entry.isDirectory()) {
      return sourceFiles(absolute)
    }

    return entry.name.endsWith('.ts') ? [absolute] : []
  })
}

function relative(file: string): string {
  return path.relative(src, file).split(path.sep).join('/')
}

function offenders(pattern: RegExp, allowlist = new Set<string>()): string[] {
  return sourceRoots.flatMap(sourceFiles).flatMap((file) => {
    const name = relative(file)

    if (allowlist.has(name)) {
      return []
    }

    return pattern.test(fs.readFileSync(file, 'utf-8')) ? [name] : []
  })
}

describe('generator boundaries', () => {
  it('does not let generators know about @nec markers', () => {
    const generators = sourceFiles(path.join(src, 'generators'))
    const matches = generators.filter((file) => fs.readFileSync(file, 'utf-8').includes('@nec:')).map(relative)

    expect(matches).toEqual([])
  })

  it('does not write files directly from generators or installers', () => {
    expect(offenders(DIRECT_WRITE_PATTERN)).toEqual([])
  })

  it('does not read process.cwd() from generators or installers', () => {
    expect(offenders(PROCESS_CWD_PATTERN)).toEqual([])
  })

  it('does not hardcode package manager commands in generators or installers', () => {
    expect(offenders(PACKAGE_MANAGER_PATTERN)).toEqual([])
  })

  it('only imports fs directly in the documented allowlist', () => {
    expect(offenders(DIRECT_FS_PATTERN, DIRECT_FS_ALLOWLIST)).toEqual([])
  })

  it('routes every install command through installer(spec) or the custom allowlist', () => {
    const ctx = createContext({ cwd: path.resolve(__dirname, '../..') })
    const custom = commands
      .filter((command) => command.name.startsWith('install:'))
      .filter((command) => !(command.create(ctx) instanceof SpecGenerator))
      .map((command) => command.feature)

    expect(custom.sort()).toEqual([...CUSTOM_INSTALLERS].sort())
  })
})
