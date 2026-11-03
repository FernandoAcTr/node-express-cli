import { IFileSystemGenerator, IInstallerGenerator } from '../interfaces/generator.interface'
import { Context } from '../context'
import fs from 'fs'
import path from 'path'
import { PatchResult, patchAtAnchor } from '../patch/anchor'

export class SocketsGenerator implements IInstallerGenerator, IFileSystemGenerator {
  constructor(private readonly ctx: Context) {}

  async createDirectories(): Promise<void> {}

  async copyFiles(): Promise<void> {
    const mainFile = path.join(this.ctx.cwd, 'src/main.ts')

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
      this.report(mainFile, [importPatch])
      return
    }

    const listenPatch = patchAtAnchor(mainFile, 'afterListen', 'const socket = new SocketIO(server)', {
      dedupeKey: 'new SocketIO(server)',
    })

    this.report(mainFile, [importPatch, listenPatch])
  }

  private report(file: string, patches: PatchResult[]): void {
    let changed = false
    let skipped = 0
    let failed = false

    for (const patch of patches) {
      if (patch.status === 'changed') {
        changed = true
      } else if (patch.status === 'skipped') {
        skipped++
      } else {
        failed = true
        this.ctx.logger.warn(patch.message ?? `Could not patch ${patch.file}`)
      }
    }

    if (changed) {
      this.ctx.logger.success(`Updated ${file}`)
    } else if (!failed && skipped === patches.length) {
      this.ctx.logger.success(`${file} already has the socket configuration`)
    }
  }

  async installDependencies(): Promise<void> {
    this.ctx.logger.info('================= Installing Socket.io =================')
    await this.ctx.shell.execAsync(`${this.ctx.config.getInstallCommand()} socket.io`)
  }
}
