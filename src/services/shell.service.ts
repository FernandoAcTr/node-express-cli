import shell from 'shelljs'

export class ShellService {
  public execAsync(command: string, cwd?: string) {
    return new Promise((resolve, reject) => {
      const options: shell.ExecOptions = { async: true }
      if (cwd) options.cwd = cwd
      shell.exec(command, options, (code, stdout, stderr) => {
        if (code === 0) {
          resolve(stdout)
        } else {
          reject(stderr)
        }
      })
    })
  }

  public exec(command: string, cwd?: string) {
    const options: shell.ExecOptions = {}
    if (cwd) options.cwd = cwd
    shell.exec(command, options)
  }
}

export const shellService = new ShellService()
