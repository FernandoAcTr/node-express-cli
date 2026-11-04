export interface CliErrorOptions {
  exitCode?: number
  hint?: string
}

/**
 * Error esperado del CLI: se muestra al usuario sin stack trace.
 * Cualquier error no controlado se envuelve en un CliError en handleError.
 */
export class CliError extends Error {
  readonly exitCode: number
  readonly hint?: string

  constructor(message: string, options: CliErrorOptions = {}) {
    super(message)
    this.name = 'CliError'
    this.exitCode = options.exitCode ?? 1
    this.hint = options.hint

    Object.setPrototypeOf(this, new.target.prototype)
  }
}

/**
 * Punto único de salida para errores del CLI. No llama a process.exit para
 * permitir que stdout/stderr se vacíen; solo fija el exit code.
 */
export function handleError(error: unknown): void {
  const cliError = error instanceof CliError ? error : new CliError(error instanceof Error ? error.message : String(error))

  console.error(`\nError: ${cliError.message}`)

  if (cliError.hint) {
    console.error(`Hint: ${cliError.hint}`)
  }

  if (!(error instanceof CliError) && error instanceof Error && error.stack) {
    console.error(error.stack)
  }

  process.exitCode = cliError.exitCode
}
