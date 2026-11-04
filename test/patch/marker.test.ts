import { describe, expect, it } from 'vitest'
import { PatchFileSystem, applyPatches, patchAtMarker, patchBlock } from '../../src/patch/anchor'

function fakeFs(files: Record<string, string>): PatchFileSystem & { writes: Array<{ file: string; content: string }> } {
  const writes: Array<{ file: string; content: string }> = []

  return {
    writes,
    existsSync: (file) => file in files,
    readFileSync: (file) => files[file],
    writeFileSync: (file, content) => {
      files[file] = content
      writes.push({ file, content })
    },
  }
}

describe('patchAtMarker', () => {
  it('dedupes imports by module instead of by exact text', () => {
    const fs = fakeFs({
      '/project/src/main.ts': ['import webpush from "web-push"', '// @nec:imports', ''].join('\n'),
    })

    const result = patchAtMarker('/project/src/main.ts', 'imports', "import webpush from 'web-push'", {}, fs)

    expect(result.status).toBe('skipped')
    expect(fs.writes).toEqual([])
  })

  it('dedupes imports with different spacing and quotes', () => {
    const fs = fakeFs({
      '/project/src/main.ts': ['import {  a,b }   from "pkg"', '// @nec:imports', ''].join('\n'),
    })

    const result = patchAtMarker('/project/src/main.ts', 'imports', "import { a, b } from 'pkg'", {}, fs)

    expect(result.status).toBe('skipped')
  })

  it('dedupes imports without spaces around from', () => {
    const fs = fakeFs({
      '/project/src/main.ts': ['import{a}from"pkg"', '// @nec:imports', ''].join('\n'),
    })

    const result = patchAtMarker('/project/src/main.ts', 'imports', "import { a } from 'pkg'", {}, fs)

    expect(result.status).toBe('skipped')
  })

  it('does not sort a block that contains multiline imports', () => {
    const fs = fakeFs({
      '/project/src/main.ts': ['// @nec:imports', 'import {', '  a,', "} from 'a'", "import b from 'b'", ''].join('\n'),
    })

    const result = patchAtMarker('/project/src/main.ts', 'imports', "import c from 'c'", { sort: true }, fs)

    expect(result.status).toBe('changed')
    expect(fs.readFileSync('/project/src/main.ts').split('\n').slice(0, 6)).toEqual([
      '// @nec:imports',
      "import c from 'c'",
      'import {',
      '  a,',
      "} from 'a'",
      "import b from 'b'",
    ])
  })

  it('leaves the file untouched when any marker in the group is missing', () => {
    const fs = fakeFs({
      '/project/src/main.ts': ['// @nec:imports', "import express from 'express'", ''].join('\n'),
    })
    const original = fs.readFileSync('/project/src/main.ts')

    const results = applyPatches(
      '/project/src/main.ts',
      [
        { marker: 'imports', snippet: "import webpush from 'web-push'" },
        { marker: 'beforeListen', snippet: 'webpush.setVapidDetails()' },
      ],
      fs
    )

    expect(results.map((result) => result.status)).toEqual(['anchor-missing', 'anchor-missing'])
    expect(fs.readFileSync('/project/src/main.ts')).toBe(original)
    expect(fs.writes).toEqual([])
  })

  it('accepts a fake filesystem', () => {
    const fs = fakeFs({ '/project/main.ts': '// @nec:imports\n' })

    const result = patchAtMarker('/project/main.ts', 'imports', "import a from 'a'", {}, fs)

    expect(result.status).toBe('changed')
    expect(fs.writes).toHaveLength(1)
  })
})

describe('patchBlock', () => {
  it('creates, replaces and dedupes a delimited block', () => {
    const fs = fakeFs({ '/project/.env.example': 'PORT=3000\n# @nec:env\n' })

    const created = patchBlock(
      '/project/.env.example',
      'webpush',
      'VAPID_PUBLIC_KEY=npx',
      {
        after: '# @nec:env',
        comment: '#',
      },
      fs
    )

    expect(created.status).toBe('changed')
    expect(fs.readFileSync('/project/.env.example')).toContain('# @nec:webpush:start')
    expect(fs.readFileSync('/project/.env.example')).toContain('VAPID_PUBLIC_KEY=npx')
    expect(fs.readFileSync('/project/.env.example')).toContain('# @nec:webpush:end')
    expect(fs.readFileSync('/project/.env.example').indexOf('# @nec:env')).toBeLessThan(
      fs.readFileSync('/project/.env.example').indexOf('# @nec:webpush:start')
    )

    const second = patchBlock(
      '/project/.env.example',
      'webpush',
      'VAPID_PUBLIC_KEY=npx',
      {
        after: '# @nec:env',
        comment: '#',
      },
      fs
    )
    expect(second.status).toBe('skipped')

    const replaced = patchBlock(
      '/project/.env.example',
      'webpush',
      'VAPID_PUBLIC_KEY=bunx',
      {
        after: '# @nec:env',
        comment: '#',
      },
      fs
    )
    expect(replaced.status).toBe('changed')
    expect(fs.readFileSync('/project/.env.example')).toContain('VAPID_PUBLIC_KEY=bunx')
    expect(fs.readFileSync('/project/.env.example')).not.toContain('VAPID_PUBLIC_KEY=npx')
  })

  it('does not create the block when the anchor is missing', () => {
    const fs = fakeFs({ '/project/.env.example': 'PORT=3000\n' })
    const original = fs.readFileSync('/project/.env.example')

    const result = patchBlock(
      '/project/.env.example',
      'webpush',
      'VAPID_PUBLIC_KEY=',
      {
        after: '# @nec:env',
        comment: '#',
      },
      fs
    )

    expect(result.status).toBe('anchor-missing')
    expect(fs.readFileSync('/project/.env.example')).toBe(original)
  })
})
