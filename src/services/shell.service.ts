import shell from 'shelljs'

export class ShellService {
  public execAsync(command: string) {
    return new Promise((resolve, reject) => {
      shell.exec(command, { async: true }, (code, stdout, stderr) => {
        if (code === 0) {
          resolve(stdout)
        } else {
          reject(stderr)
        }
      })
    })
  }

  public exec(command: string) {
    shell.exec(command)
  }
}

export const shellService = new ShellService()
