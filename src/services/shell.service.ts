import shell from 'shelljs'
import { CliError } from '../errors'
import { Logger, consoleLogger } from '../logger'

export interface ShellResult {
  code: number
  stdout: string
  stderr: string
}

export interface ShellServiceOptions {
  /** En `--dry-run` solo registra el comando, no lo ejecuta. */
  dryRun?: boolean
  logger?: Logger
}

export class ShellService {
  private readonly dryRun: boolean
  private readonly logger: Logger

  constructor(options: ShellServiceOptions = {}) {
    this.dryRun = options.dryRun ?? false
    this.logger = options.logger ?? consoleLogger
  }

  public execAsync(command: string, cwd?: string): Promise<string> {
    if (this.dryRun) {
      this.report(command, cwd)
      return Promise.resolve('')
    }

    return new Promise((resolve, reject) => {
      const options: shell.ExecOptions = { async: true }
      if (cwd) options.cwd = cwd
      shell.exec(command, options, (code, stdout, stderr) => {
        if (code === 0) {
          resolve(String(stdout ?? ''))
        } else {
          const details = String(stderr ?? '').trim()
          reject(
            new CliError(`Command failed (exit ${code}): ${command}`, {
              hint: details || undefined,
            })
          )
        }
      })
    })
  }

  /**
   * Ejecuta de forma síncrona. No lanza: devuelve el exit code y avisa por
   * consola cuando el comando falla, para no romper flujos que toleran fallos.
   */
  public exec(command: string, cwd?: string): ShellResult {
    if (this.dryRun) {
      this.report(command, cwd)
      return { code: 0, stdout: '', stderr: '' }
    }

    const options: shell.ExecOptions = {}
    if (cwd) options.cwd = cwd

    const result = shell.exec(command, options) as unknown as ShellResult
    const code = Number(result.code ?? 0)
    const stdout = String(result.stdout ?? '')
    const stderr = String(result.stderr ?? '')

    if (code !== 0) {
      console.warn(`Command failed (exit ${code}): ${command}`)
      if (stderr.trim()) console.warn(stderr.trim())
    }

    return { code, stdout, stderr }
  }

  private report(command: string, cwd?: string): void {
    this.logger.info(`[dry-run] would run: ${command}${cwd ? ` (in ${cwd})` : ''}`)
  }
}
