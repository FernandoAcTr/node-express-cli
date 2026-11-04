import { IFileSystemGenerator, IInstallerGenerator, IPostGenerator } from '../interfaces/generator.interface'
import { Context } from '../context'
import { Reporter } from '../report'

export class SocketsGenerator implements IInstallerGenerator, IFileSystemGenerator, IPostGenerator {
  constructor(private readonly ctx: Context) {}

  async createDirectories(): Promise<void> {}

  async copyFiles(): Promise<void> {
    // Las copias se hacen en `post()` junto al wiring: si `main.ts` no tiene
    // los anchors, no interesa dejar archivos de socket sin conectar.
  }

  async post(): Promise<void> {
    const reporter = new Reporter(this.ctx.logger, 'already has the socket configuration')
    const result = this.ctx.wiring.transaction((wiring) => {
      wiring.import("import SocketIO from './socket'")
      wiring.main('afterListen', 'const socket = new SocketIO(server)', {
        key: 'new SocketIO(server)',
      })
    })

    reporter.add(result)

    if (result.warnings.length > 0) {
      return
    }

    const policy = 'overwrite-if-unmodified' as const
    this.ctx.project.copy('src/socket.ts', 'generator/common/socketio/socket.ts', policy)
    this.ctx.project.copy('src/socket.controller.ts', 'generator/common/socketio/socket.controller.ts', policy)
  }

  async installDependencies(): Promise<void> {
    if (this.ctx.has('socket')) {
      this.ctx.logger.info('Socket.io is already installed; skipping dependency installation')
      return
    }

    this.ctx.logger.info('================= Installing Socket.io =================')
    await this.ctx.shell.execAsync(`${this.ctx.config.getInstallCommand()} socket.io`, this.ctx.cwd)
  }
}
