import { Dirent } from 'fs'
import path from 'path'
import fs from 'fs-extra'
import { Logger } from '../logger'

/**
 * Superficie mínima de filesystem que usan los servicios. Permite inyectar una
 * implementación en memoria para `--dry-run` sin cambiar los generadores.
 */
export interface FileSystem {
  existsSync(file: string): boolean
  readFileSync(file: string): Buffer
  readFileSync(file: string, encoding: BufferEncoding): string
  writeFileSync(file: string, content: string | Buffer): void
  mkdirSync(file: string, options?: { recursive?: boolean }): void
  rmSync(file: string, options?: { recursive?: boolean; force?: boolean }): void
  readdirSync(file: string, options: { withFileTypes: true }): Dirent[]
}

/**
 * FS de `--dry-run`: las lecturas van al disco real, las escrituras se guardan
 * en memoria. Así el lifecycle completo puede ejecutarse (incluido leer lo que
 * acaba de "escribir" un generador) sin tocar el proyecto.
 */
export class VirtualFileSystem implements FileSystem {
  private readonly files = new Map<string, Buffer | null>()

  constructor(
    private readonly base: FileSystem = fs,
    private readonly logger?: Logger,
    private readonly cwd?: string
  ) {}

  public existsSync(file: string): boolean {
    if (this.files.has(file)) {
      return this.files.get(file) !== null
    }

    return this.base.existsSync(file)
  }

  public readFileSync(file: string): Buffer
  public readFileSync(file: string, encoding: BufferEncoding): string
  public readFileSync(file: string, encoding?: BufferEncoding): Buffer | string {
    if (this.files.has(file)) {
      const content = this.files.get(file)

      if (content === null || content === undefined) {
        throw new Error(`ENOENT: no such file or directory, open '${file}'`)
      }

      return encoding ? content.toString(encoding) : Buffer.from(content)
    }

    return encoding ? this.base.readFileSync(file, encoding) : this.base.readFileSync(file)
  }

  public writeFileSync(file: string, content: string | Buffer): void {
    this.files.set(file, Buffer.isBuffer(content) ? Buffer.from(content) : Buffer.from(content))
    this.report('write', file)
  }

  /** En memoria no hacen falta directorios: las escrituras crean sus padres. */
  public mkdirSync(): void {}

  public rmSync(file: string): void {
    this.files.set(file, null)

    for (const key of this.files.keys()) {
      if (key.startsWith(`${file}${path.sep}`)) {
        this.files.set(key, null)
      }
    }

    this.report('remove', file)
  }

  public readdirSync(file: string, options: { withFileTypes: true }): Dirent[] {
    return this.base.readdirSync(file, options)
  }

  private report(action: 'write' | 'remove', file: string): void {
    if (!this.logger) {
      return
    }

    const relative = this.cwd ? this.relative(file) : file
    this.logger.info(`[dry-run] would ${action} ${relative}`)
  }

  private relative(file: string): string {
    const relative = this.cwd ? path.relative(this.cwd, file) : file
    return relative.split(path.sep).join('/') || '.'
  }
}
