import shell from 'shelljs'
import { CliError } from '../errors'

export interface ShellResult {
  code: number
  stdout: string
  stderr: string
}

export class ShellService {
  public execAsync(command: string, cwd?: string): Promise<string> {
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
}
