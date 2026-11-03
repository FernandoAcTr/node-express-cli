import { IFileSystemGenerator, IInstallerGenerator } from '../interfaces/generator.interface'
import { Context } from '../context'
import fs from 'fs'
import path from 'path'
import { patchAtAnchor } from '../patch/anchor'
import { Reporter } from '../report'

export class SocketsGenerator implements IInstallerGenerator, IFileSystemGenerator {
  constructor(private readonly ctx: Context) {}

  async createDirectories(): Promise<void> {}

  async copyFiles(): Promise<void> {
    const mainFile = path.join(this.ctx.cwd, 'src/main.ts')
    const reporter = new Reporter(this.ctx.logger, 'already has the socket configuration')

    fs.copyFileSync(
      path.resolve(__dirname, '../../templates/generator/common/socketio/socket.ts'),
      path.join(this.ctx.cwd, 'src/socket.ts')
    )
    fs.copyFileSync(
      path.resolve(__dirname, '../../templates/generator/common/socketio/socket.controller.ts'),
      path.join(this.ctx.cwd, 'src/socket.controller.ts')
    )

    const importPatch = patchAtAnchor(mainFile, 'imports', "import SocketIO from './socket'", {
      sort: true,
    })

    if (importPatch.status === 'file-missing') {
      reporter.patches(mainFile, [importPatch])
      return
    }

    const listenPatch = patchAtAnchor(mainFile, 'afterListen', 'const socket = new SocketIO(server)', {
      dedupeKey: 'new SocketIO(server)',
    })

    reporter.patches(mainFile, [importPatch, listenPatch])
  }

  async installDependencies(): Promise<void> {
    if (this.ctx.has('socket')) {
      this.ctx.logger.info('Socket.io is already installed; skipping dependency installation')
      return
    }

    this.ctx.logger.info('================= Installing Socket.io =================')
    await this.ctx.shell.execAsync(`${this.ctx.config.getInstallCommand()} socket.io`)
  }
}
