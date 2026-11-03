import fs from 'fs'
import { AnchorName, anchorComment } from './anchors'

export type PatchStatus = 'changed' | 'skipped' | 'anchor-missing' | 'file-missing'

export interface PatchResult {
  file: string
  anchor: AnchorName
  status: PatchStatus
  message?: string
}

export interface PatchOptions {
  /** Text used to detect an already-applied patch. Defaults to the snippet. */
  dedupeKey?: string
  /** Insert before or after the anchor line. Defaults to after. */
  position?: 'before' | 'after'
  /** Sort the contiguous block after the anchor. Only for single-line imports. */
  sort?: boolean
}

/**
 * Inserta `snippet` junto al anchor `// @nec:<anchor>` de un archivo existente.
 * Es idempotente: si el dedupeKey ya aparece, no toca el archivo.
 */
export function patchAtAnchor(
  file: string,
  anchor: AnchorName,
  snippet: string,
  options: PatchOptions = {}
): PatchResult {
  if (!fs.existsSync(file)) {
    return {
      file,
      anchor,
      status: 'file-missing',
      message: `Could not find ${file}; add the ${anchor} block manually.`,
    }
  }

  const content = fs.readFileSync(file, 'utf-8')
  const dedupeKey = options.dedupeKey ?? snippet

  if (content.includes(dedupeKey)) {
    return { file, anchor, status: 'skipped' }
  }

  const eol = content.includes('\r\n') ? '\r\n' : '\n'
  const lines = content.split(/\r?\n/)
  const marker = anchorComment(anchor)
  const markerIndex = lines.findIndex((line) => line.trim() === marker)

  if (markerIndex === -1) {
    return {
      file,
      anchor,
      status: 'anchor-missing',
      message: `Could not find ${marker} in ${file}; add the ${anchor} block manually.`,
    }
  }

  const position = options.position ?? 'after'
  const insertAt = position === 'after' ? markerIndex + 1 : markerIndex
  const snippetLines = snippet.replace(/\r\n/g, '\n').replace(/\n$/, '').split('\n')

  lines.splice(insertAt, 0, ...snippetLines)

  if (options.sort) {
    sortImportBlock(lines, markerIndex)
  }

  fs.writeFileSync(file, lines.join(eol))
  return { file, anchor, status: 'changed' }
}

function sortImportBlock(lines: string[], markerIndex: number): void {
  const start = markerIndex + 1
  let end = start

  while (end < lines.length && lines[end].trim() !== '') {
    end++
  }

  const block = lines.slice(start, end)
  if (block.length < 2 || !block.every((line) => line.startsWith('import '))) {
    return
  }

  block.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
  lines.splice(start, block.length, ...block)
}
