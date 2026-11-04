import fsImpl from 'fs'
import { ANCHOR_MARKERS, AnchorName, anchorComment } from './anchors'

export type PatchStatus = 'changed' | 'skipped' | 'anchor-missing' | 'file-missing'

export interface PatchResult {
  file: string
  /** Marker line used by the patch, e.g. `// @nec:imports`. */
  marker: string
  status: PatchStatus
  message?: string
}

export interface PatchOptions {
  /** Text used to detect an already-applied patch. Defaults to the module of an import or the snippet. */
  dedupeKey?: string
  /** Insert before or after the marker line. Defaults to after. */
  position?: 'before' | 'after'
  /** Sort the contiguous import block after the marker when it is safe to do so. */
  sort?: boolean
  /** Disable module-based dedupe for snippets that start with `import`. */
  dedupeByModule?: boolean
}

export interface MarkerPatch {
  marker: string
  snippet: string
  options?: PatchOptions
}

export interface BlockOptions extends PatchOptions {
  /**
   * Marker used to place a new block when the file has no block yet.
   * Use it to keep the block after a template anchor, e.g. `# @nec:env`.
   */
  after?: string
  /** Comment prefix for the block markers. Defaults to `//`. */
  comment?: '//' | '#'
}

/** Minimal filesystem surface so patches can be tested without touching disk. */
export interface PatchFileSystem {
  existsSync(file: string): boolean
  readFileSync(file: string): string
  writeFileSync(file: string, content: string): void
}

export const nodeFileSystem: PatchFileSystem = {
  existsSync: (file) => fsImpl.existsSync(file),
  readFileSync: (file) => fsImpl.readFileSync(file, 'utf-8'),
  writeFileSync: (file, content) => fsImpl.writeFileSync(file, content),
}

/**
 * Acepta tanto un nombre de anchor (`imports`) como un marcador literal
 * (`// @nec:config`). Los generadores nunca escriben `@nec:` directamente:
 * usan `WiringService`, que a su vez pasa nombres de anchor aquí.
 */
export function resolveMarker(marker: string): string {
  if (marker in ANCHOR_MARKERS) {
    return anchorComment(marker as AnchorName)
  }

  return marker
}

/**
 * Devuelve un `PatchResult` por cada marker que falta, sin modificar el archivo.
 * Sirve para abortar un wiring completo antes de aplicar parches parciales.
 */
export function findMissingMarkers(file: string, markers: string[], fs: PatchFileSystem = nodeFileSystem): PatchResult[] {
  const resolved = markers.map(resolveMarker)

  if (!fs.existsSync(file)) {
    return resolved.map((marker) => ({
      file,
      marker,
      status: 'file-missing',
      message: `Could not find ${file}; add the ${marker} block manually.`,
    }))
  }

  const lines = fs.readFileSync(file).split(/\r?\n/)

  return resolved
    .filter((marker) => !hasMarker(lines, marker))
    .map((marker) => ({
      file,
      marker,
      status: 'anchor-missing',
      message: `Could not find ${marker} in ${file}; add the block manually.`,
    }))
}

/** Compatibilidad con el nombre anterior usado por el wiring de `main.ts`. */
export function findMissingAnchors(file: string, anchors: AnchorName[], fs: PatchFileSystem = nodeFileSystem): PatchResult[] {
  return findMissingMarkers(
    file,
    anchors.map((anchor) => anchorComment(anchor)),
    fs
  )
}

/**
 * Aplica un grupo de parches a un archivo de forma atómica: si falta cualquier
 * marker, no se escribe nada. El archivo se lee y escribe una sola vez.
 */
export function applyPatches(file: string, patches: MarkerPatch[], fs: PatchFileSystem = nodeFileSystem): PatchResult[] {
  const resolved = patches.map((patch) => ({ ...patch, markerLine: resolveMarker(patch.marker) }))

  if (!fs.existsSync(file)) {
    return resolved.map((patch) => ({
      file,
      marker: patch.markerLine,
      status: 'file-missing',
      message: `Could not find ${file}; add the ${patch.markerLine} block manually.`,
    }))
  }

  const content = fs.readFileSync(file)
  const eol = content.includes('\r\n') ? '\r\n' : '\n'
  const lines = content.split(/\r?\n/)
  const missing = resolved.filter((patch) => !hasMarker(lines, patch.markerLine))

  // Un wiring parcial deja `main.ts` con runtime sin import. Si falta cualquier
  // marker del grupo, se abandonan todos los parches del archivo.
  if (missing.length > 0) {
    const missingMarkers = missing.map((patch) => patch.markerLine).join(', ')

    return resolved.map((patch) => {
      if (!hasMarker(lines, patch.markerLine)) {
        return {
          file,
          marker: patch.markerLine,
          status: 'anchor-missing',
          message: `Could not find ${patch.markerLine} in ${file}; add the block manually.`,
        }
      }

      return {
        file,
        marker: patch.markerLine,
        status: 'anchor-missing',
        message: `Could not patch ${file}: aborted because ${missingMarkers} is missing.`,
      }
    })
  }

  const results: PatchResult[] = []
  let changed = false
  let shouldSort = false

  for (const patch of resolved) {
    if (patch.options?.sort) {
      shouldSort = true
    }

    if (alreadyApplied(lines.join(eol), patch)) {
      results.push({ file, marker: patch.markerLine, status: 'skipped' })
      continue
    }

    const markerIndex = lines.findIndex((line) => line.trim() === patch.markerLine)
    const position = patch.options?.position ?? 'after'
    const insertAt = position === 'after' ? markerIndex + 1 : markerIndex

    lines.splice(insertAt, 0, ...snippetLines(patch.snippet))
    results.push({ file, marker: patch.markerLine, status: 'changed' })
    changed = true
  }

  if (changed) {
    if (shouldSort) {
      sortImportBlocks(lines)
    }

    fs.writeFileSync(file, lines.join(eol))
  }

  return results
}

/** Inserta `snippet` junto a un marker literal o a un anchor conocido. */
export function patchAtMarker(
  file: string,
  marker: string,
  snippet: string,
  options: PatchOptions = {},
  fs: PatchFileSystem = nodeFileSystem
): PatchResult {
  return applyPatches(file, [{ marker, snippet, options }], fs)[0]
}

/** Inserta `snippet` junto al anchor `// @nec:<anchor>`. */
export function patchAtAnchor(
  file: string,
  anchor: AnchorName,
  snippet: string,
  options: PatchOptions = {},
  fs: PatchFileSystem = nodeFileSystem
): PatchResult {
  return patchAtMarker(file, anchorComment(anchor), snippet, options, fs)
}

/**
 * Reescribe un bloque delimitado por `@nec:<marker>:start` y
 * `@nec:<marker>:end`. Si el bloque no existe, se crea después de `after`
 * (o al final del archivo). Es la forma segura de sustituir un bloque entero
 * sin tocar el resto del archivo.
 */
export function patchBlock(
  file: string,
  marker: string,
  snippet: string,
  options: BlockOptions = {},
  fs: PatchFileSystem = nodeFileSystem
): PatchResult {
  const comment = options.comment ?? '//'
  const startLine = `${comment} @nec:${marker}:start`
  const endLine = `${comment} @nec:${marker}:end`

  if (!fs.existsSync(file)) {
    return {
      file,
      marker: startLine,
      status: 'file-missing',
      message: `Could not find ${file}; add the ${startLine} block manually.`,
    }
  }

  const content = fs.readFileSync(file)
  const eol = content.includes('\r\n') ? '\r\n' : '\n'
  const lines = content.split(/\r?\n/)
  const start = lines.findIndex((line) => line.trim() === startLine)
  const end = lines.findIndex((line) => line.trim() === endLine)
  const block = snippetLines(snippet)

  if (start !== -1 && end !== -1 && end > start) {
    const current = lines.slice(start + 1, end)

    if (current.join(eol) === block.join(eol)) {
      return { file, marker: startLine, status: 'skipped' }
    }

    lines.splice(start + 1, end - start - 1, ...block)
    fs.writeFileSync(file, lines.join(eol))
    return { file, marker: startLine, status: 'changed' }
  }

  if (start !== -1 || end !== -1) {
    return {
      file,
      marker: startLine,
      status: 'anchor-missing',
      message: `Found an incomplete ${marker} block in ${file}; add ${startLine} and ${endLine} manually.`,
    }
  }

  // Proyectos anteriores a este wiring pueden tener ya el contenido sin las
  // marcas del bloque. No duplicamos: se respeta lo que escribió el usuario.
  if (options.dedupeKey && content.includes(options.dedupeKey)) {
    return { file, marker: startLine, status: 'skipped' }
  }

  const blockLines = [startLine, ...block, endLine]
  let insertAt = lines.length

  if (options.after) {
    const afterMarker = resolveMarker(options.after)
    const afterIndex = lines.findIndex((line) => line.trim() === afterMarker)

    if (afterIndex === -1) {
      return {
        file,
        marker: startLine,
        status: 'anchor-missing',
        message: `Could not find ${afterMarker} in ${file}; add the block manually.`,
      }
    }

    insertAt = afterIndex + 1
  }

  const before = lines.slice(0, insertAt)
  const after = lines.slice(insertAt)

  while (before.length > 0 && before[before.length - 1].trim() === '') {
    before.pop()
  }
  while (after.length > 0 && after[0].trim() === '') {
    after.shift()
  }

  const next = [...before, '', ...blockLines, ...(after.length > 0 ? ['', ...after] : [])]
  fs.writeFileSync(file, next.join(eol))
  return { file, marker: startLine, status: 'changed' }
}

function hasMarker(lines: string[], marker: string): boolean {
  return lines.some((line) => line.trim() === marker)
}

function snippetLines(snippet: string): string[] {
  return snippet.replace(/\r\n/g, '\n').replace(/\n$/, '').split('\n')
}

function alreadyApplied(content: string, patch: MarkerPatch & { markerLine: string }): boolean {
  if (patch.options?.dedupeKey) {
    return content.includes(patch.options.dedupeKey)
  }

  if (patch.options?.dedupeByModule !== false) {
    const moduleName = importModule(patch.snippet)

    if (moduleName) {
      return importedModules(content).has(moduleName)
    }
  }

  return content.includes(patch.snippet)
}

const IMPORT_MODULE_PATTERN = /^\s*import\b\s*(?:type\s+)?(?:[^'"]*?\bfrom\s*)?['"]([^'"]+)['"]/
const IMPORT_PATTERN = new RegExp(IMPORT_MODULE_PATTERN.source, 'gm')

function importModule(statement: string): string | undefined {
  const match = statement.trim().match(IMPORT_MODULE_PATTERN)
  return match?.[1]
}

function importedModules(content: string): Set<string> {
  const modules = new Set<string>()

  for (const match of content.matchAll(IMPORT_PATTERN)) {
    modules.add(match[1])
  }

  return modules
}

/**
 * Ordena solo bloques de imports de una línea. Si el bloque contiene imports
 * multilínea, comentarios o código, se deja intacto para no romper sintaxis.
 */
function sortImportBlocks(lines: string[]): void {
  const marker = anchorComment('imports')

  for (let index = 0; index < lines.length; index++) {
    if (lines[index].trim() === marker) {
      sortImportBlock(lines, index)
    }
  }
}

function sortImportBlock(lines: string[], markerIndex: number): void {
  const start = markerIndex + 1
  let end = start

  while (end < lines.length && lines[end].trim() !== '') {
    end++
  }

  const block = lines.slice(start, end)

  if (block.length < 2 || !block.every(isSingleLineImport)) {
    return
  }

  block.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
  lines.splice(start, block.length, ...block)
}

function isSingleLineImport(line: string): boolean {
  const trimmed = line.trim()

  if (trimmed.startsWith('//')) {
    return false
  }

  return /^import\s+(?:type\s+)?(?:[^'"]*?\sfrom\s+)?['"][^'"]+['"];?$/.test(trimmed)
}
