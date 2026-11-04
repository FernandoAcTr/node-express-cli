import { Logger } from './logger'
import { PatchResult } from './patch/anchor'

/** Contrato uniforme para operaciones que modifican un proyecto. */
export interface OperationResult {
  changed: string[]
  skipped: string[]
  warnings: string[]
}

export function createResult(): OperationResult {
  return { changed: [], skipped: [], warnings: [] }
}

/**
 * Acumula el resultado de un generador y lo imprime de forma consistente.
 * Los generadores mantienen su API de lifecycle (`Promise<void>`); el reporter
 * es la pieza que estandariza cómo se comunican los cambios.
 */
export class Reporter {
  private readonly result: OperationResult = createResult()

  constructor(
    private readonly logger: Logger,
    private readonly skippedSuffix: string = 'is already up to date'
  ) {}

  changed(file: string): void {
    this.result.changed.push(file)
    this.logger.success(`Updated ${file}`)
  }

  skipped(file: string): void {
    this.result.skipped.push(file)
    this.logger.success(`${file} ${this.skippedSuffix}`)
  }

  warn(message: string): void {
    this.result.warnings.push(message)
    this.logger.warn(message)
  }

  add(result: OperationResult): void {
    result.changed.forEach((file) => this.changed(file))
    result.skipped.forEach((file) => this.skipped(file))
    result.warnings.forEach((message) => this.warn(message))
  }

  /** Resume una lista de parches aplicados al mismo archivo. */
  patches(file: string, patches: PatchResult[]): void {
    let changed = false
    let skipped = 0
    let failed = false
    const warnings = new Set<string>()

    for (const patch of patches) {
      if (patch.status === 'changed') {
        changed = true
      } else if (patch.status === 'skipped') {
        skipped++
      } else {
        failed = true
        const message = patch.message ?? `Could not patch ${file} (${patch.status})`

        if (!warnings.has(message)) {
          warnings.add(message)
          this.warn(message)
        }
      }
    }

    if (changed) {
      this.changed(file)
    } else if (!failed && skipped === patches.length) {
      this.skipped(file)
    }
  }

  summary(): OperationResult {
    return {
      changed: [...this.result.changed],
      skipped: [...this.result.skipped],
      warnings: [...this.result.warnings],
    }
  }
}
