import path from 'path'
import { AnchorName, anchorComment } from '../patch/anchors'
import {
  BlockOptions,
  MarkerPatch,
  PatchFileSystem,
  PatchResult,
  applyPatches,
  findMissingMarkers,
  nodeFileSystem,
  patchBlock,
} from '../patch/anchor'
import { OperationResult, createResult } from '../report'
import { ConfigService } from '../services/config.service'
import { ProjectService } from '../services/project.service'

export interface WiringServiceOptions {
  cwd: string
  config: ConfigService
  project?: ProjectService
  fs?: PatchFileSystem
}

export interface WireOptions {
  /** Texto que identifica el parche para no duplicarlo. */
  key?: string
  /** Insertar antes o después del anchor. Por defecto, después. */
  position?: 'before' | 'after'
  /** Ordenar el bloque de imports tras insertar. */
  sort?: boolean
}

export interface BlockWireOptions extends WireOptions {
  after?: string
  comment?: '//' | '#'
}

type QueuedOperation =
  { kind: 'patch'; file: string; patch: MarkerPatch } | { kind: 'block'; file: string; marker: string; code: string; options: BlockOptions }

/**
 * Punto único para modificar archivos que ya existen (`main.ts`, config, env,
 * package.json). Los generadores no conocen los markers `@nec:` ni escriben
 * parches a mano: piden operaciones a este servicio.
 *
 * Las operaciones se encolan y se aplican en `commit()`. Si un archivo no tiene
 * los anchors necesarios, se descarta el grupo completo y se devuelve un
 * warning, de modo que nunca queda runtime sin import.
 */
export class WiringService {
  private readonly cwd: string
  private readonly configService: ConfigService
  private readonly project?: ProjectService
  private readonly fs: PatchFileSystem
  private queue: QueuedOperation[] = []
  private blocked = new Set<string>()
  private pendingWarnings: string[] = []

  constructor(options: WiringServiceOptions) {
    this.cwd = path.resolve(options.cwd)
    this.configService = options.config
    this.project = options.project
    this.fs = options.fs ?? nodeFileSystem
  }

  /** Añade un import al bloque `@nec:imports` de `src/main.ts`. */
  public import(statement: string, options: WireOptions = {}): OperationResult {
    return this.stagePatch('src/main.ts', {
      marker: anchorComment('imports'),
      snippet: statement,
      options: {
        dedupeKey: options.key,
        position: options.position ?? 'after',
        sort: options.sort ?? true,
      },
    })
  }

  /** Añade código junto a un anchor de `src/main.ts`. */
  public main(anchor: AnchorName, code: string, options: WireOptions = {}): OperationResult {
    return this.stagePatch('src/main.ts', {
      marker: anchorComment(anchor),
      snippet: code,
      options: {
        dedupeKey: options.key,
        position: options.position ?? 'after',
        sort: options.sort ?? false,
      },
    })
  }

  /** Añade una entrada al objeto `config` de `src/config/index.ts`. */
  public config(code: string, options: WireOptions = {}): OperationResult {
    return this.stagePatch('src/config/index.ts', {
      marker: DEFAULT_CONFIG_MARKER,
      snippet: code,
      options: {
        dedupeKey: options.key,
        position: options.position ?? 'after',
      },
    })
  }

  /** Añade variables a `.env.example`. */
  public env(code: string, options: WireOptions = {}): OperationResult {
    return this.stagePatch('.env.example', {
      marker: DEFAULT_ENV_MARKER,
      snippet: code,
      options: {
        dedupeKey: options.key,
        position: options.position ?? 'after',
      },
    })
  }

  /**
   * Escribe un bloque de variables en `.env.example` usando el anchor
   * `# @nec:env`. El bloque se puede reemplazar en instalaciones posteriores.
   */
  public envBlock(marker: string, code: string, options: WireOptions = {}): OperationResult {
    return this.block('.env.example', marker, code, {
      ...options,
      after: DEFAULT_ENV_MARKER,
      comment: '#',
    })
  }

  /** Escribe un script en `package.json` sin depender de un package manager concreto. */
  public script(name: string, command: string): OperationResult {
    const result = createResult()
    const file = this.path('package.json')

    if (!this.fs.existsSync(file)) {
      result.warnings.push(`Could not find ${file}; add the ${name} script manually.`)
      return result
    }

    if (this.configService.getScript(name) === command) {
      result.skipped.push(file)
      return result
    }

    this.configService.setScript(name, command)
    this.record('package.json')
    result.changed.push(file)
    return result
  }

  /**
   * Sustituye un bloque `@nec:<marker>:start` / `@nec:<marker>:end` de `file`.
   * Si el bloque no existe, se crea después de `after`.
   */
  public block(file: string, marker: string, code: string, options: BlockWireOptions = {}): OperationResult {
    const absolute = this.resolve(file)
    const blockOptions: BlockOptions = {
      dedupeKey: options.key,
      after: options.after,
      comment: options.comment,
    }
    const error = this.validateBlock(absolute, marker, blockOptions)

    if (error) {
      return this.blockFile(absolute, error)
    }

    this.queue.push({ kind: 'block', file: absolute, marker, code, options: blockOptions })

    return { changed: [absolute], skipped: [], warnings: [] }
  }

  /** Aplica todo lo encolado y devuelve el resultado definitivo. */
  public commit(): OperationResult {
    const result = createResult()
    const patches = new Map<string, MarkerPatch[]>()
    const blocks: Array<Extract<QueuedOperation, { kind: 'block' }>> = []

    for (const operation of this.queue) {
      if (this.blocked.has(operation.file)) {
        continue
      }

      if (operation.kind === 'patch') {
        const list = patches.get(operation.file) ?? []
        list.push(operation.patch)
        patches.set(operation.file, list)
      } else {
        blocks.push(operation)
      }
    }

    for (const [file, filePatches] of patches) {
      this.merge(result, file, applyPatches(file, filePatches, this.fs))
    }

    for (const operation of blocks) {
      if (this.blocked.has(operation.file)) {
        continue
      }

      const patch = patchBlock(operation.file, operation.marker, operation.code, operation.options, this.fs)
      this.merge(result, operation.file, [patch])
    }

    for (const message of this.pendingWarnings) {
      if (!result.warnings.includes(message)) {
        result.warnings.push(message)
      }
    }

    this.reset()
    return result
  }

  /** Descarta lo encolado sin tocar archivos (útil si `pre()` falla). */
  public discard(): void {
    this.reset()
  }

  /** Ejecuta varias operaciones y las aplica de forma atómica al final. */
  public transaction(wire: (wiring: WiringService) => void): OperationResult {
    this.discard()
    wire(this)

    return this.commit()
  }

  /** Comprueba markers sin modificar nada. */
  public missing(file: string, markers: string[]): PatchResult[] {
    return findMissingMarkers(this.resolve(file), markers, this.fs)
  }

  /** True si hay warnings pendientes de un staging fallido. */
  public hasWarnings(): boolean {
    return this.pendingWarnings.length > 0
  }

  private stagePatch(relative: string, patch: MarkerPatch): OperationResult {
    const absolute = this.resolve(relative)
    const missing = findMissingMarkers(absolute, [patch.marker], this.fs)

    if (missing.length > 0) {
      return this.blockFile(absolute, missing[0].message ?? `Could not patch ${absolute}.`)
    }

    this.queue.push({ kind: 'patch', file: absolute, patch })
    return { changed: [absolute], skipped: [], warnings: [] }
  }

  private validateBlock(file: string, marker: string, options: BlockOptions): string | undefined {
    if (!this.fs.existsSync(file)) {
      return `Could not find ${file}; add the ${marker} block manually.`
    }

    const content = this.fs.readFileSync(file)
    const comment = options.comment ?? '//'
    const start = `${comment} @nec:${marker}:start`
    const end = `${comment} @nec:${marker}:end`
    const lines = content.split(/\r?\n/)
    const hasStart = lines.some((line) => line.trim() === start)
    const hasEnd = lines.some((line) => line.trim() === end)

    if (hasStart !== hasEnd) {
      return `Found an incomplete ${marker} block in ${file}; add ${start} and ${end} manually.`
    }

    if (hasStart && hasEnd) {
      return undefined
    }

    if (options.dedupeKey && content.includes(options.dedupeKey)) {
      return undefined
    }

    if (options.after) {
      const afterMarker = options.after
      const afterExists = lines.some((line) => line.trim() === afterMarker)

      if (!afterExists) {
        return `Could not find ${afterMarker} in ${file}; add the block manually.`
      }
    }

    return undefined
  }

  private blockFile(file: string, message: string): OperationResult {
    this.blocked.add(file)
    this.pendingWarnings.push(message)
    return { changed: [], skipped: [], warnings: [message] }
  }

  private merge(result: OperationResult, file: string, patches: PatchResult[]): void {
    let changed = false
    let skipped = 0
    let failed = false

    for (const patch of patches) {
      if (patch.status === 'changed') {
        changed = true
      } else if (patch.status === 'skipped') {
        skipped++
      } else {
        failed = true
        const message = patch.message ?? `Could not patch ${file} (${patch.status})`

        if (!result.warnings.includes(message)) {
          result.warnings.push(message)
        }
      }
    }

    if (changed) {
      pushUnique(result.changed, file)
      this.record(this.relative(file))
    } else if (!failed && skipped === patches.length) {
      pushUnique(result.skipped, file)
    }
  }

  private record(relative: string): void {
    this.project?.record(relative)
  }

  private resolve(file: string): string {
    return path.isAbsolute(file) ? file : this.path(file)
  }

  private path(file: string): string {
    return this.project?.path(file) ?? path.join(this.cwd, file)
  }

  private relative(file: string): string {
    return path.relative(this.cwd, file).split(path.sep).join('/')
  }

  private reset(): void {
    this.queue = []
    this.blocked = new Set()
    this.pendingWarnings = []
  }
}

const DEFAULT_CONFIG_MARKER = '// @nec:config'
const DEFAULT_ENV_MARKER = '# @nec:env'

function pushUnique(list: string[], value: string): void {
  if (!list.includes(value)) {
    list.push(value)
  }
}
