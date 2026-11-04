import crypto from 'crypto'
import path from 'path'
import fs from 'fs-extra'
import { CliError } from '../errors'
import { Logger, consoleLogger } from '../logger'
import { FileSystem } from './file-system'

/**
 * Política de escritura de un archivo del proyecto.
 *
 * - `create`: falla si el archivo ya existe (`make:*`).
 * - `skip`: no toca el archivo si existe.
 * - `overwrite`: solo sobrescribe con `--force`.
 * - `overwrite-if-unmodified`: sobrescribe si el hash coincide con el manifest;
 *   si el usuario lo modificó, se omite.
 */
export type WritePolicy = 'create' | 'skip' | 'overwrite' | 'overwrite-if-unmodified'

export type WriteStatus = 'created' | 'overwritten' | 'skipped'

export interface WriteResult {
  /** Ruta absoluta del archivo. */
  path: string
  /** Ruta relativa al proyecto, siempre con separadores POSIX. */
  relative: string
  status: WriteStatus
  /** Motivo del skip, para mensajes y tests. */
  reason?: string
}

export interface ProjectServiceOptions {
  /** Si es true, las políticas que lo requieren sobrescriben sin preguntar. */
  force?: boolean
  fs?: FileSystem
  logger?: Logger
}

interface Manifest {
  version: 1
  generated: Record<string, string>
}

const MANIFEST_FILE = '.nec/manifest.json'
const DEFAULT_POLICY: WritePolicy = 'overwrite-if-unmodified'

/**
 * Punto único de escritura de archivos generados.
 *
 * Mantiene `.nec/manifest.json` con el hash de cada archivo que el CLI creó para
 * poder distinguir "archivo generado y sin tocar" de "archivo modificado por el
 * usuario". Ningún generador debería usar `fs.writeFileSync` directamente.
 */
export class ProjectService {
  readonly cwd: string
  private readonly force: boolean
  private readonly fsImpl: FileSystem
  private readonly logger: Logger
  private manifest?: Manifest

  constructor(cwd: string = process.cwd(), options: ProjectServiceOptions = {}) {
    this.cwd = path.resolve(cwd)
    this.force = options.force ?? false
    this.fsImpl = options.fs ?? fs
    this.logger = options.logger ?? consoleLogger
  }

  /** Devuelve un servicio apuntando a otro directorio (p. ej. el proyecto recién creado). */
  public forDirectory(directory: string): ProjectService {
    return new ProjectService(path.resolve(this.cwd, directory), {
      force: this.force,
      fs: this.fsImpl,
      logger: this.logger,
    })
  }

  /** Ruta absoluta dentro del proyecto. */
  public path(...parts: string[]): string {
    return path.join(this.cwd, ...parts)
  }

  /** Ruta absoluta de un archivo de `templates/`. */
  public template(...parts: string[]): string {
    return path.resolve(__dirname, '../../templates', ...parts)
  }

  /** Lee un archivo del proyecto como texto. */
  public read(relative: string): string {
    return this.fsImpl.readFileSync(this.path(relative), 'utf-8')
  }

  /** True si el archivo o directorio existe dentro del proyecto. */
  public exists(relative: string): boolean {
    return this.fsImpl.existsSync(this.path(relative))
  }

  /** True si el directorio parece un proyecto generado por el CLI. */
  public isProject(): boolean {
    return this.exists('cli.config.json') && this.exists('package.json')
  }

  /** Crea un directorio (y sus padres) dentro del proyecto. */
  public ensureDir(relative: string): void {
    this.fsImpl.mkdirSync(this.path(relative), { recursive: true })
  }

  /**
   * Escribe un archivo aplicando la política indicada. El manifest se actualiza
   * solo cuando el contenido escrito es el que queda en disco.
   */
  public write(relative: string, content: string | Buffer, policy: WritePolicy = DEFAULT_POLICY): WriteResult {
    const normalized = normalizeRelative(relative)
    const absolute = this.path(normalized)
    const manifest = this.readManifest()
    const incoming = Buffer.isBuffer(content) ? content : Buffer.from(content)
    const incomingHash = hashContent(incoming)

    if (!this.fsImpl.existsSync(absolute)) {
      this.fsImpl.mkdirSync(path.dirname(absolute), { recursive: true })
      this.fsImpl.writeFileSync(absolute, incoming)
      this.setManifestEntry(manifest, normalized, incomingHash)

      return { path: absolute, relative: normalized, status: 'created' }
    }

    if (policy === 'create') {
      if (this.force) {
        return this.overwrite(absolute, normalized, incoming, incomingHash, manifest)
      }

      throw new CliError(`${normalized} already exists`, {
        hint: 'Run the command again with --force to overwrite it.',
      })
    }

    const current = this.fsImpl.readFileSync(absolute)
    const currentHash = hashContent(current)

    // El contenido ya es el esperado: no hay nada que escribir, pero adoptamos
    // el archivo en el manifest para que futuras ejecuciones lo reconozcan.
    if (current.equals(incoming)) {
      this.setManifestEntry(manifest, normalized, incomingHash)
      return { path: absolute, relative: normalized, status: 'skipped', reason: 'up-to-date' }
    }

    if (policy === 'skip') {
      return { path: absolute, relative: normalized, status: 'skipped', reason: 'exists' }
    }

    if (policy === 'overwrite') {
      if (this.force) {
        return this.overwrite(absolute, normalized, incoming, incomingHash, manifest)
      }

      this.logger.warn(`${normalized} already exists; use --force to overwrite it.`)
      return { path: absolute, relative: normalized, status: 'skipped', reason: 'force-required' }
    }

    const knownHash = manifest.generated[normalized]
    const isKnown = Boolean(knownHash)
    const isUnmodified = knownHash === currentHash

    if (isUnmodified) {
      return this.overwrite(absolute, normalized, incoming, incomingHash, manifest)
    }

    if (this.force) {
      return this.overwrite(absolute, normalized, incoming, incomingHash, manifest)
    }

    const reason = isKnown ? 'modified by the user' : 'not generated by the CLI'
    this.logger.warn(`Skipped ${normalized}: ${reason}. Use --force to overwrite it.`)

    return { path: absolute, relative: normalized, status: 'skipped', reason }
  }

  /** Copia un archivo de `templates/` al proyecto. */
  public copy(relative: string, templatePath: string, policy: WritePolicy = DEFAULT_POLICY): WriteResult {
    const source = path.isAbsolute(templatePath) ? templatePath : this.template(templatePath)

    if (!this.fsImpl.existsSync(source)) {
      throw new CliError(`Template not found: ${source}`, {
        hint: 'This is a bug in the CLI; reinstall node-express-cli.',
      })
    }

    return this.write(relative, this.fsImpl.readFileSync(source), policy)
  }

  /** Copia recursivamente un directorio de `templates/` al proyecto. */
  public copyDir(relative: string, templatePath: string, policy: WritePolicy = DEFAULT_POLICY): WriteResult[] {
    const source = path.isAbsolute(templatePath) ? templatePath : this.template(templatePath)

    if (!this.fsImpl.existsSync(source)) {
      throw new CliError(`Template directory not found: ${source}`, {
        hint: 'This is a bug in the CLI; reinstall node-express-cli.',
      })
    }

    return this.copyDirectory(relative, source, policy)
  }

  /** Borra un archivo y su entrada del manifest. */
  public remove(relative: string): void {
    const normalized = normalizeRelative(relative)
    const manifest = this.readManifest()

    this.fsImpl.rmSync(this.path(normalized), { force: true })
    delete manifest.generated[normalized]
    this.writeManifest(manifest)
  }

  /** Actualiza el hash de un archivo ya existente (p. ej. tras editar package.json). */
  public record(relative: string): void {
    const normalized = normalizeRelative(relative)
    const manifest = this.readManifest()

    if (!this.fsImpl.existsSync(this.path(normalized))) {
      delete manifest.generated[normalized]
      this.writeManifest(manifest)
      return
    }

    const content = this.fsImpl.readFileSync(this.path(normalized))
    this.setManifestEntry(manifest, normalized, hashContent(content))
  }

  private copyDirectory(relative: string, source: string, policy: WritePolicy): WriteResult[] {
    const results: WriteResult[] = []

    for (const entry of this.fsImpl.readdirSync(source, { withFileTypes: true })) {
      const childRelative = joinRelative(relative, entry.name)
      const childSource = path.join(source, entry.name)

      if (entry.isDirectory()) {
        results.push(...this.copyDirectory(childRelative, childSource, policy))
      } else if (entry.isFile()) {
        results.push(this.copy(childRelative, childSource, policy))
      }
    }

    return results
  }

  private overwrite(absolute: string, relative: string, content: Buffer, hash: string, manifest: Manifest): WriteResult {
    this.fsImpl.mkdirSync(path.dirname(absolute), { recursive: true })
    this.fsImpl.writeFileSync(absolute, content)
    this.setManifestEntry(manifest, relative, hash)

    return { path: absolute, relative, status: 'overwritten' }
  }

  private readManifest(): Manifest {
    if (this.manifest) {
      return this.manifest
    }

    const file = this.path(MANIFEST_FILE)

    if (!this.fsImpl.existsSync(file)) {
      this.manifest = { version: 1, generated: {} }
      return this.manifest
    }

    try {
      const parsed = JSON.parse(this.fsImpl.readFileSync(file, 'utf-8')) as Partial<Manifest>

      if (typeof parsed !== 'object' || parsed === null || typeof parsed.generated !== 'object' || parsed.generated === null) {
        throw new Error('invalid manifest')
      }

      this.manifest = { version: 1, generated: parsed.generated }
      return this.manifest
    } catch {
      throw new CliError(`Could not parse ${file}`, {
        hint: `Delete ${MANIFEST_FILE} and run the command again; the CLI will regenerate it.`,
      })
    }
  }

  private setManifestEntry(manifest: Manifest, relative: string, hash: string): void {
    manifest.generated[relative] = hash
    this.writeManifest(manifest)
  }

  private writeManifest(manifest: Manifest): void {
    const file = this.path(MANIFEST_FILE)
    this.fsImpl.mkdirSync(path.dirname(file), { recursive: true })
    this.fsImpl.writeFileSync(file, `${JSON.stringify(manifest, null, 2)}\n`)
  }
}

function hashContent(content: string | Buffer): string {
  return `sha256:${crypto.createHash('sha256').update(content).digest('hex')}`
}

function normalizeRelative(relative: string): string {
  const normalized = path.posix.normalize(relative.replace(/\\/g, '/')).replace(/^\.\/+/, '')

  if (normalized === '.' || normalized === '..' || normalized.startsWith('../') || path.posix.isAbsolute(normalized)) {
    throw new CliError(`Invalid project path "${relative}"`, {
      hint: 'Files must be written inside the project directory.',
    })
  }

  return normalized
}

function joinRelative(base: string, name: string): string {
  const joined = path.posix.join(base.replace(/\\/g, '/'), name).replace(/^\.\/+/, '')
  return joined === '.' ? '' : joined
}
